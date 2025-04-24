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

class FrameData(BaseModel):
    frame: str
    timestamp: str

@app.on_event("startup")
async def startup_event():
    global model, tracker, groq_llm
    model = YOLO("yolov8n.pt")
    print("✅ YOLO model loaded")
    tracker = DeepSort(max_age=10)
    print("✅ DeepSort tracker initialized")

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
    return label in [
    "person", "bicycle", "car", "motorcycle", "bus", "truck", "train",
    "bench", "chair", "couch", "bed", "dining table",
    "knife", "bottle", "cup", "fork", "spoon", "bowl",
    "fire hydrant", "stop sign", "traffic light", "parking meter",
    "dog", "cat", "horse", "cow", "elephant", "bear",
    "backpack", "umbrella", "suitcase", "skateboard", "stroller",
    "trolley", "refrigerator", "toilet", "sink", "potted plant",
    "laptop", "cell phone", "remote", "microwave", "oven",
    "scissors", "teddy bear", "hair drier", "toothbrush"
] and distance < 10.0

def estimate_distance(box_area: float, image_area: float) -> float:
    return round(10.0 * (1.0 - (box_area / image_area)), 2)

def determine_position(box_center_x: float, image_width: float) -> str:
    if box_center_x < image_width * 0.33:
        return "left"
    elif box_center_x > image_width * 0.66:
        return "right"
    return "center"

async def generate_threat_assessment(tracked_object: Dict) -> str:
    if not groq_llm:
        return "Warning: Security system offline"
    prompt = f"""
    You are an AI security analyst. Assess this potential threat:
    {json.dumps(tracked_object, indent=2)}

    Respond with ONE concise sentence in this format:
    "[Threat Level] Alert: [Description] at [Position] ([Distance])"
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
    print("✅ WebSocket connection accepted")
    global last_sent_objects

    try:
        while True:
            try:
                data_url = await websocket.receive_text()
            except WebSocketDisconnect:
                print(f"🔌 Client disconnected: {client_id}")
                break
            except Exception as e:
                print(f"⚠️ Receive error: {e}")
                continue

            try:
                encoded = data_url.split(",")[-1]
                img_bytes = base64.b64decode(encoded)
                npimg = np.frombuffer(img_bytes, np.uint8)
                frame = cv2.imdecode(npimg, cv2.IMREAD_COLOR)
                if frame is None:
                    continue

                image_area = frame.shape[0] * frame.shape[1]
                results = model(frame)[0]

                detections = [
                    ([int(x1), int(y1), int(x2 - x1), int(y2 - y1)], float(conf), model.names[int(cls)])
                    for x1, y1, x2, y2, conf, cls in
                    [(box.xyxy[0][0], box.xyxy[0][1], box.xyxy[0][2], box.xyxy[0][3], box.conf, box.cls)
                     for box in results.boxes]
                ]

                tracks = tracker.update_tracks(detections, frame=frame)
                threats = []
                objects = []
                current_ids = set()

                for track in tracks:
                    if not track.is_confirmed():
                        continue

                    track_id = track.track_id
                    x1, y1, x2, y2 = map(int, track.to_ltrb())
                    box_area = (x2 - x1) * (y2 - y1)
                    obj_class = track.get_det_class()
                    position = determine_position((x1 + x2) / 2, frame.shape[1])
                    distance = estimate_distance(box_area, image_area)

                    obj = {
                        "id": track_id,
                        "object": obj_class,
                        "position": position,
                        "distance": distance,
                        "box_area": box_area
                    }

                    current_ids.add(track_id)

                    if is_threat_object(obj_class, distance):
                        if track_id not in last_sent_objects:
                            obj["threat_level"] = "high" if distance < 3 else "medium"
                            obj["assessment"] = await generate_threat_assessment(obj)
                            threats.append(obj)
                            last_sent_objects[track_id] = obj_class
                    else:
                        objects.append(obj)

                # Cleanup outdated entries
                last_sent_objects = {
                    tid: label for tid, label in last_sent_objects.items() if tid in current_ids
                }

                await websocket.send_json({
                    "timestamp": datetime.now().isoformat(),
                    "threats": threats,
                    "objects": objects
                })

            except Exception as e:
                print(f"⚠️ Frame processing error: {e}")
                continue

    except Exception as e:
        print(f"❌ WebSocket Error ({client_id}): {e}")
    finally:
        await websocket.close()
        print(f"❌ WebSocket closed for client {client_id}")

@app.post("/process-frame")
async def process_frame_api(frame_data: FrameData, background_tasks: BackgroundTasks):
    client_id = str(uuid.uuid4())
    background_tasks.add_task(process_frame_data, frame_data, client_id)
    return {"status": "processing", "client_id": client_id}

async def process_frame_data(frame_data: FrameData, client_id: str):
    try:
        pass  # Placeholder for non-WebSocket frame processing
    except Exception as e:
        print(f"Processing Error: {str(e)}")

@app.on_event("shutdown")
async def shutdown_event():
    client_connections.clear()
