import os
import io
import base64
import asyncio
import json
import uuid
import time
from typing import Dict, List, Optional
from datetime import datetime
from fastapi import FastAPI, Request, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sse_starlette.sse import EventSourceResponse
from pydantic import BaseModel
from PIL import Image
import numpy as np
from ultralytics import YOLO
import re
from dotenv import load_dotenv
from langchain_groq import ChatGroq
from langchain.schema import HumanMessage

# Load environment variables
load_dotenv()
response=""
# Initialize FastAPI app
app = FastAPI(title="Vision-to-Audio Backend")

# Set up CORS to allow requests from the React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global variables
client_connections = {}
model = None

class FrameData(BaseModel):
    frame: str  # Base64 encoded image
    timestamp: str

# Initialize YOLO model and Groq LLM
@app.on_event("startup")
async def startup_event():
    global model
    # Load YOLOv8 model
    model = YOLO("./yolo_models/yolov8n.pt")  # Using the nano model for speed
    print("YOLO model loaded successfully")

# Function to calculate rough distance estimation based on bounding box size
def estimate_distance(box_area, image_area):
    # Simple heuristic: larger objects appear closer
    ratio = box_area / image_area
    
    if ratio > 0.5:
        return "very close"
    elif ratio > 0.2:
        return "close"
    elif ratio > 0.1:
        return "medium distance"
    elif ratio > 0.02:
        return "far"
    else:
        return "very far"

# Function to determine position relative to viewer
def determine_position(box_center_x, image_width):
    # Divide the image into sections
    left_threshold = image_width * 0.33
    right_threshold = image_width * 0.67
    
    if box_center_x < left_threshold:
        return "left"
    elif box_center_x > right_threshold:
        return "right"
    else:
        return "center"

# Process detected objects with Groq LLM
async def enhance_object_descriptions(objects: List[Dict]):
    try:
        # Skip LLM enhancement if no objects detected
        if not objects:
            return {"text": "No objects detected in view."}
            
        # Initialize Groq client
        llm = ChatGroq(
            api_key=os.getenv("GROQ_API_KEY"),
            model_name="llama3-8b-8192"  # Using Llama 3 8B for speed and efficiency
        )
        print('LLM also configured...')
        # Create a prompt that asks for enhanced descriptions
        objects_json = json.dumps(objects)
        prompt = f"""
        You are an AI assistant for blind people. Here are objects detected in a video frame:
        {objects_json}
        
        Describe what's in the scene in a clear, concise way that would be helpful for a blind person.
        Focus on the most important objects, their positions, and distances.
        Keep it brief and conversational, as this will be converted to speech.
        """
        
        # Get response from Groq
        messages = [HumanMessage(content=prompt)]
        response = llm.invoke(messages)

       

        return {"text": response.content}


            
    except Exception as e:
        print(f"Error in LLM enhancement: {e}")
        return {"text": "Error processing scene description."}  # Return error message

# Process frames and run object detection
async def process_frame_data(frame_data: FrameData, client_id: str):
    try:
        # Decode base64 image
        image_data = re.sub('^data:image/.+;base64,', '', frame_data.frame)
        image_bytes = base64.b64decode(image_data)
        image = Image.open(io.BytesIO(image_bytes))
        
        # Convert to numpy array for YOLOv8
        img_array = np.array(image)
        
        # Run YOLOv8 inference
        results = model(img_array)
        
        # Extract detected objects
        detected_objects = []
        image_area = image.width * image.height
        
        # Process detected objects
        for r in results:
            boxes = r.boxes
            for box in boxes:
                # Get box coordinates
                x1, y1, x2, y2 = box.xyxy[0].tolist()
                
                # Calculate box center
                box_center_x = (x1 + x2) / 2
                
                # Calculate box area
                box_area = (x2 - x1) * (y2 - y1)
                
                # Get class and confidence
                cls = int(box.cls[0])
                conf = float(box.conf[0])
                
                # Get class name
                class_name = r.names[cls]
                
                # Determine position and distance
                position = determine_position(box_center_x, image.width)
                distance = estimate_distance(box_area, image_area)
                
                # Add to detected objects
                detected_objects.append({
                    "name": class_name,
                    "confidence": conf,
                    "position": position,
                    "distance": distance,
                    "timestamp": frame_data.timestamp
                })
        
        # Sort by confidence
        detected_objects.sort(key=lambda x: x["confidence"], reverse=True)
        
        # Take top 5 objects to avoid overwhelming the user
        top_objects = detected_objects[:5]
        
        # Enhance descriptions using Groq LLM
        enhanced_response = await enhance_object_descriptions(top_objects)
        print(enhanced_response)
        # Send to client - only send the text part of the LLM response
        if client_id in client_connections:
            client_connections[client_id]["queue"].append(enhanced_response)
            
    except Exception as e:
        print(f"Error processing frame: {e}")
        # Send error message to client
        if client_id in client_connections:
            client_connections[client_id]["queue"].append({
                "text": f"Error processing frame: {str(e)}",
                "timestamp": frame_data.timestamp
            })

@app.post("/process-frame")
async def receive_frame(frame_data: FrameData, background_tasks: BackgroundTasks):
    # Generate client ID if not provided
    client_id = str(uuid.uuid4())
    
    # Process frame in background
    background_tasks.add_task(process_frame_data, frame_data, client_id)
    print(f"Processing frame with timestamp: {frame_data.timestamp}")
    return {"status": "Frame received for processing"}

# Stream events to client
@app.get("/stream")
async def stream(request: Request):
    client_id = str(uuid.uuid4())
    
    # Initialize event queue for this client
    client_connections[client_id] = {
        "connected": True,
        "queue": ["iam keerthi","7t8hu7i","67t78h7","trfdytgy","tyyyhuhiu","67t78h7","trfdytgy","tyyyhuhiu"]
    }
    
    async def event_generator():
        try:
            # Send initial connection message
            yield {
                "event": "connected",
                "data": json.dumps({"client_id": client_id, "message": "Connected to vision-to-audio service"})
            }
            
            # Send event stream
            while client_connections[client_id]["connected"]:
                # Check if client is still connected
                if await request.is_disconnected():
                    client_connections[client_id]["connected"] = False
                    break
                
                # Check if there are any messages in the queue
                if client_connections[client_id]["queue"]:
                    data = client_connections[client_id]["queue"].pop(0)
                    yield {
                        "event": "description",  # Consistently use "description" for all LLM responses
                        "data": json.dumps(data)
                    }
                else:
                    # Send heartbeat every 3 seconds
                    yield {
                        "event": "heartbeat",
                        "data": json.dumps({"timestamp": datetime.now().isoformat()})
                    }
                
                # Sleep to avoid overloading
                await asyncio.sleep(0.3)
                
        except Exception as e:
            print(f"Stream error: {e}")
            # Send error to client
            yield {
                "event": "error",
                "data": json.dumps({"error": str(e)})
            }
        finally:
            # Clean up when client disconnects
            if client_id in client_connections:
                client_connections[client_id]["connected"] = False
                client_connections.pop(client_id, None)
    
    return EventSourceResponse(event_generator())

@app.get("/test")
async def test():
    return {"status": "API is working"}

@app.on_event("shutdown")
async def shutdown_event():
    # Clean up resources
    client_connections.clear()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
