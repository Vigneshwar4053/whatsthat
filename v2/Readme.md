
```markdown
# Real-Time Object Detection, Tracking, and Descriptive Text Generation

This project integrates multiple AI components to create a real-time system that:

1. Detects Objects using **YOLOv8**
2. Tracks them using **DeepSort**
3. Streams video over **WebSockets**
4. Generates descriptive text using **Groq LLM**
5. Runs efficiently with **CUDA** on GPU for real-time performance

---

## 🚀 Project Features

- Real-time object detection
- Multi-object tracking using unique IDs
- WebSocket-based live video streaming
- Automatic scene description using Groq LLM
- GPU acceleration using CUDA for high speed

---

## 📦 Technologies Used

| Tech            | Purpose                                      |
|-----------------|----------------------------------------------|
| **YOLOv8**      | Real-time person detection                   |
| **DeepSort**    | Multi-object tracking with ID assignment     |
| **FastAPI**     | Web framework + WebSocket endpoints          |
| **OpenCV**      | Video capture and frame preprocessing        |
| **Groq LLM**    | Natural language generation from detections  |
| **CUDA**        | GPU acceleration for fast inference          |
| **Uvicorn**     | ASGI server for FastAPI                      |

---

## 🔧 Setup Instructions

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/real-time-ai-app.git
cd real-time-ai-app
```

### 2. Install Requirements

Make sure you have Python 3.10+ and pip.

```bash
pip install -r requirements.txt
```

### 3. Install GPU Drivers and CUDA

Ensure you have:
- NVIDIA GPU with drivers installed
- CUDA Toolkit and cuDNN configured

YOLOv8 and PyTorch will automatically use CUDA if available:

```python
import torch
print(torch.cuda.is_available())  # Should return True
```

## 🧠 YOLOv8 Detection

YOLOv8 (You Only Look Once) is used to detect objects in frames.

- Trained on COCO dataset
- Returns bounding boxes and class names


```python
from ultralytics import YOLO

model = YOLO('yolov8n.pt')  # Can use yolov8n.pt, yolov8s.pt, etc.
results = model(frame)
```

## 🎯 DeepSort Tracking

After detecting objects, DeepSort assigns a unique ID to each one.

- Maintains identity across frames
- Uses bounding box, appearance, and motion

```python
tracker.update(detections, frame)
```

## 🛰️ WebSocket Streaming (FastAPI)

FastAPI handles a WebSocket connection where:
- The client sends frames
- Backend processes detections and tracking
- Sends annotated frames + description back

```python
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    ...
    await websocket.send_bytes(frame)
```

## ✍️ Groq LLM (Descriptive Generation)

For each frame, we generate a description:
- Count of objects
- Spatial position (left/middle/right)
- Custom prompt sent to Groq's API
- 3–5 word summary returned

**Prompt Example:**
"There are 2 people in the frame, located in the middle. Describe this scene in 3 to 5 words."

## ⚡ CUDA Acceleration

CUDA is used to run YOLOv8 on GPU, drastically reducing inference time:

| Task          | Time on CPU | Time on GPU |
|---------------|-------------|-------------|
| Inference     | ~1.2s/frame | ~0.2s/frame |

YOLO will automatically use CUDA if `torch.cuda.is_available()` is True.

## 🧪 Sample Output (Terminal)

```makefile
0: 480x640 2 persons, 266.8ms
Speed: 1.4ms preprocess, 266.8ms inference, 0.6ms postprocess
```

## ✅ How It Works - End-to-End

1. 📸 Capture frame from webcam/client
2. � YOLOv8 detects objects
3. 🎯 DeepSort assigns ID and tracks
4. 🛰️ FastAPI WebSocket returns annotated frame
5. ✍️ Prompt sent to Groq LLM
6. 💬 3–5 word description is returned and displayed

## 📁 Folder Structure

```bash
.
├── main.py             # FastAPI server
├── detector.py         # YOLOv8 and DeepSort logic
├── prompt.py           # Groq LLM handling
├── requirements.txt
└── README.md
```

## 📝 Future Improvements

- Add face recognition for identification
- Support for multiple object types
- Use edge device like Jetson Nano or Coral
- Add audio generation for narration

## 🙌 Credits

- Ultralytics for YOLOv8
- NVIDIA for CUDA acceleration
- Groq for LLM inference API
- FastAPI + Uvicorn for real-time backend

## 🤝 Contribution

PRs and issues are welcome! Let's build more real-time AI systems!
```
