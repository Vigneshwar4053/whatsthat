from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
import base64
import cv2
import numpy as np
from ultralytics import YOLO
from deep_sort_realtime.deepsort_tracker import DeepSort
from io import BytesIO
from PIL import Image

# Initialize FastAPI
app = FastAPI()

# Allow CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For testing. Use frontend URL in production.
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load YOLOv8 and DeepSort
model = YOLO("yolov8n.pt")  # Path to your YOLOv8 model
tracker = DeepSort(max_age=10)

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    while True:
        data_url = await websocket.receive_text()
        encoded = data_url.split(",")[1]  # Extract base64 string
        img_bytes = base64.b64decode(encoded)  # Decode the base64 string
        npimg = np.frombuffer(img_bytes, np.uint8)  # Convert to numpy array
        frame = cv2.imdecode(npimg, cv2.IMREAD_COLOR)  # Decode the image

        # Run object detection using YOLOv8
        results = model(frame)[0]
        
        # Prepare the detections for tracking
        detections = [
            ([int(x1), int(y1), int(x2 - x1), int(y2 - y1)], float(conf), model.names[int(cls)])
            for x1, y1, x2, y2, conf, cls in 
            [(box.xyxy[0][0], box.xyxy[0][1], box.xyxy[0][2], box.xyxy[0][3], box.conf, box.cls) 
             for box in results.boxes]
        ]

        # Run DeepSort tracking
        tracks = tracker.update_tracks(detections, frame=frame)

        # Create the output for WebSocket
        output = []
        for track in tracks:
            if not track.is_confirmed():
                continue
            x1, y1, x2, y2 = map(int, track.to_ltrb())
            label = track.get_det_class()
            output.append({
                "id": track.track_id,
                "object": label,
                "x1": x1, "y1": y1, "x2": x2, "y2": y2
            })

        # Send detections to frontend
        await websocket.send_json(output)
