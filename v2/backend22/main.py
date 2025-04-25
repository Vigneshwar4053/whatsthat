import os
import io
import base64
import asyncio
import json
import uuid
import time
import re
import cv2
import numpy as np
from typing import Dict, List, Optional
from datetime import datetime
from fastapi import FastAPI, WebSocket, Request, BackgroundTasks, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sse_starlette.sse import EventSourceResponse
from pydantic import BaseModel
from PIL import Image
from ultralytics import YOLO
from deep_sort_realtime.deepsort_tracker import DeepSort
from dotenv import load_dotenv
from langchain_groq import ChatGroq
from langchain.schema import HumanMessage
import torch

# Load environment variables
load_dotenv()

app = FastAPI(title="Vision Threat Detection")

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global variables
client_connections = {}
model = None
tracker = None
groq_llm = None
last_sent_objects = {}
device = None  # Will be set to 'cuda' or 'cpu' during startup

class FrameData(BaseModel):
    frame: str
    timestamp: str

def setup_device():
    """Determine and setup the best available device (CUDA GPU or CPU)"""
    global device
    if torch.cuda.is_available():
        device = 'cuda'
        print(f"✅ CUDA is available. Using GPU: {torch.cuda.get_device_name(0)}")
        # Additional CUDA optimizations
        torch.backends.cudnn.benchmark = True
        torch.backends.cuda.matmul.allow_tf32 = True
    else:
        device = 'cpu'
        print("❌ CUDA not available. Falling back to CPU.")

@app.on_event("startup")
async def startup_event():
    global model, tracker, groq_llm, device
    
    setup_device()
    
    # Load model with GPU if available
    model = YOLO("yolov8s.pt").to(device)
    print(f"✅ YOLO model loaded on {device.upper()}")
    
    # Initialize tracker
    tracker = DeepSort(max_age=10)
    print("✅ DeepSort tracker initialized")

    # Initialize LLM
    try:
        groq_llm = ChatGroq(
            api_key=os.getenv("GROQ_API_KEY"),
            model_name="llama3-8b-8192",
            temperature=0.2
        )
        print("✅ Groq LLM initialized")
    except Exception as e:
        print(f"❌ Failed to initialize Groq LLM: {str(e)}")

def is_threat_object(label: str, distance: float) -> bool:
    threat_objects = [
        "person", "bicycle", "car", "motorcycle", "bus", "truck", "train",
        "knife", "gun", "weapon", "scissors", "bat", "baseball bat",
        "fire hydrant", "stop sign", "traffic light", "parking meter",
        "dog", "cat", "horse", "bear", "elephant",
        "backpack", "suitcase", "handbag", "briefcase", "bottle"
    ]
    return label.lower() in threat_objects and distance < 10.0

def estimate_distance(box_area: float, image_area: float) -> float:
    """Estimate distance based on relative size in image"""
    # Simple heuristic: object appears larger when closer
    return round(10.0 * (1.0 - (box_area / image_area)), 2)

def determine_position(box_center_x: float, image_width: float) -> str:
    """Determine object's horizontal position in frame"""
    if box_center_x < image_width * 0.33:
        return "left"
    elif box_center_x > image_width * 0.66:
        return "right"
    return "center"

async def generate_threat_assessment(tracked_object: Dict) -> str:
    """Generate threat assessment using LLM"""
    if not groq_llm:
        return "Warning: Security system offline"
    
    prompt = f"""
    You are an AI helping a blind person.They seeing this objects:
    {json.dumps(tracked_object, indent=2)}

    Respond them what they see in less than 6 words.
    """
    try:
        response = groq_llm.invoke([HumanMessage(content=prompt)])
        return response.content
    except Exception as e:
        return f"Assessment Error: {str(e)}"

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    client_id = str(uuid.uuid4())
    print(f"✅ WebSocket connection accepted from {client_id}")
    
    # Initialize last_sent_objects for this connection if needed
    global last_sent_objects
    if last_sent_objects is None:
        last_sent_objects = {}

    try:
        while True:
            try:
                data = await websocket.receive_text()
                if not data.startswith("data:image/"):
                    continue
                    
                # Process frame
                header, encoded = data.split(",", 1)
                img_bytes = base64.b64decode(encoded)
                npimg = np.frombuffer(img_bytes, np.uint8)
                frame = cv2.imdecode(npimg, cv2.IMREAD_COLOR)
                
                if frame is None:
                    await websocket.send_json({"error": "Invalid frame"})
                    continue
                
                # Get frame dimensions
                height, width = frame.shape[:2]
                image_area = height * width
                
                # Run YOLO detection
                with torch.no_grad():
                    results = model(frame, device=device, verbose=False)[0]
                
                # Prepare detections for DeepSort
                detections = []
                for box in results.boxes:
                    x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
                    conf = float(box.conf)
                    cls = int(box.cls)
                    label = model.names[cls]
                    
                    detections.append((
                        [int(x1), int(y1), int(x2-x1), int(y2-y1)],  # bbox (x,y,w,h)
                        conf,
                        label
                    ))
                
                # Update tracker
                tracks = tracker.update_tracks(detections, frame=frame)
                
                # Process tracks
                current_objects = []
                current_threats = []
                current_ids = set()
                
                for track in tracks:
                    if not track.is_confirmed():
                        continue
                    
                    track_id = str(track.track_id)  # Ensure track_id is string
                    ltrb = track.to_ltrb()
                    x1, y1, x2, y2 = map(int, ltrb)
                    box_area = (x2 - x1) * (y2 - y1)
                    obj_class = track.get_det_class()
                    position = determine_position((x1 + x2) / 2, width)
                    distance = estimate_distance(box_area, image_area)
                    
                    obj_data = {
                        "id": track_id,
                        "class": obj_class,
                        "position": position,
                        "distance": f"{distance:.2f} meters",
                        "bbox": [x1, y1, x2, y2],
                        "timestamp": datetime.now().isoformat()
                    }
                    
                    current_ids.add(track_id)
                    
                    if is_threat_object(obj_class, distance):
                        if track_id not in last_sent_objects or time.time() - last_sent_objects[track_id] > 30:
                            # Generate threat assessment
                            obj_data["threat_level"] = "high" if distance < 3 else "medium"
                            obj_data["assessment"] = await generate_threat_assessment(obj_data)
                            current_threats.append(obj_data)
                            last_sent_objects[track_id] = time.time()
                    else:
                        current_objects.append(obj_data)
                
                # Send response
                response = {
                    "timestamp": datetime.now().isoformat(),
                    "objects": current_objects,
                    "threats": current_threats,
                    "device": device,
                    "inference_speed": f"{results.speed['inference']:.1f}ms"
                }
                
                await websocket.send_json(response)
                
            except WebSocketDisconnect:
                break
            except Exception as e:
                print(f"⚠️ Processing error for {client_id}: {str(e)}")
                await websocket.send_json({"error": str(e)})
                continue
                
    except Exception as e:
        print(f"❌ WebSocket error for {client_id}: {str(e)}")
        await websocket.send_json({"error": str(e)})
    finally:
        await websocket.close()
        print(f"❌ WebSocket closed for {client_id}")

@app.post("/process-frame")
async def process_frame(frame_data: FrameData, background_tasks: BackgroundTasks):
    """Alternative endpoint for non-websocket frame processing"""
    client_id = str(uuid.uuid4())
    background_tasks.add_task(process_frame_async, frame_data, client_id)
    return {"status": "processing", "client_id": client_id}

async def process_frame_async(frame_data: FrameData, client_id: str):
    """Background task for frame processing"""
    try:
        # Similar processing logic as websocket endpoint
        # ... (implementation omitted for brevity)
        pass
    except Exception as e:
        print(f"Error processing frame for {client_id}: {str(e)}")

@app.get("/system-status")
async def get_system_status():
    """Check system and GPU status"""
    status = {
        "device": device,
        "gpu_available": torch.cuda.is_available(),
        "gpu_name": torch.cuda.get_device_name(0) if torch.cuda.is_available() else None,
        "model_loaded": model is not None,
        "tracker_loaded": tracker is not None,
        "llm_loaded": groq_llm is not None,
        "active_connections": len(client_connections)
    }
    return status

@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    client_connections.clear()
    if torch.cuda.is_available():
        torch.cuda.empty_cache()
    print("🛑 System shutdown complete")