# Vision-to-Audio Application for Visually Impaired Users

This documentation provides a comprehensive guide to building an assistive technology application that uses computer vision and AI to help blind users understand their surroundings through audio feedback.

## Table of Contents
1. [System Architecture](#system-architecture)
2. [Frontend Implementation](#frontend-implementation)
3. [Backend Implementation](#backend-implementation)
4. [Integration & Communication](#integration--communication)
5. [Testing & Deployment](#testing--deployment)
6. [Accessibility Considerations](#accessibility-considerations)

## System Architecture

![System Architecture]

The application follows this data flow:
1. User's device captures video through web camera
2. Video frames are processed and sent to server
3. Server runs object detection using YOLOv8
4. Detected objects are enriched with Groq LLM via Langchain
5. Structured data is sent back to client using Server-Sent Events (SSE)
6. Client converts information to speech using Web Speech API

## Frontend Implementation

### Setting Up the React Project

```bash
# Create a new React project
npx create-react-app vision-to-audio
cd vision-to-audio
npm install eventsource-parser
```

### Main App Component

Create `App.js`:

```jsx
import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import VideoCapture from './components/VideoCapture';
import AudioFeedback from './components/AudioFeedback';

function App() {
  const [detectedObjects, setDetectedObjects] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);
  const eventSourceRef = useRef(null);

  useEffect(() => {
    // Cleanup function
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  const connectToSSE = () => {
    try {
      const eventSource = new EventSource('http://localhost:8000/stream');
      eventSourceRef.current = eventSource;
      
      eventSource.onopen = () => {
        setIsConnected(true);
        setError(null);
      };
      
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setDetectedObjects(data.objects);
        } catch (err) {
          console.error('Error parsing SSE data:', err);
        }
      };
      
      eventSource.onerror = (err) => {
        console.error('SSE error:', err);
        setIsConnected(false);
        setError('Connection error. Please try again.');
        eventSource.close();
      };
    } catch (err) {
      setError(`Failed to connect: ${err.message}`);
    }
  };

  return (
    <div className="app">
      <header>
        <h1>Vision to Audio Assistant</h1>
        <div className="connection-status">
          Status: {isConnected ? 'Connected' : 'Disconnected'}
        </div>
      </header>
      
      <main>
        <VideoCapture isConnected={isConnected} connectToSSE={connectToSSE} />
        <AudioFeedback detectedObjects={detectedObjects} />
        
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
```

### Video Capture Component

Create `components/VideoCapture.js`:

```jsx
import React, { useRef, useEffect, useState } from 'react';

const FRAME_RATE = 5; // Frames per second to capture
const MAX_WIDTH = 640; // Max width for video frame
const MAX_HEIGHT = 480; // Max height for video frame

function VideoCapture({ isConnected, connectToSSE }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [hasPermissions, setHasPermissions] = useState(false);
  const intervalRef = useRef(null);

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = videoRef.current.srcObject.getTracks();
        tracks.forEach(track => track.stop());
      }
    };
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: {
          facingMode: 'environment',
          width: { ideal: MAX_WIDTH },
          height: { ideal: MAX_HEIGHT }
        }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setHasPermissions(true);
      }
    } catch (err) {
      console.error('Error accessing camera:', err);
      alert('Camera access is required for this application to work.');
    }
  };

  const startStreaming = () => {
    if (!hasPermissions) {
      startCamera();
      return;
    }
    
    setIsStreaming(true);
    connectToSSE();
    
    intervalRef.current = setInterval(() => {
      captureAndSendFrame();
    }, 1000 / FRAME_RATE);
  };

  const stopStreaming = () => {
    setIsStreaming(false);
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const captureAndSendFrame = () => {
    if (!videoRef.current || !canvasRef.current || !isConnected) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    
    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Draw video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Convert canvas to base64 data URL (JPEG format with quality 0.8)
    const imageData = canvas.toDataURL('image/jpeg', 0.8);
    
    // Send frame to server
    fetch('http://localhost:8000/process-frame', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        frame: imageData,
        timestamp: new Date().toISOString()
      }),
    }).catch(err => {
      console.error('Error sending frame:', err);
    });
  };

  return (
    <div className="video-capture">
      <div className="video-container">
        <video 
          ref={videoRef}
          autoPlay 
          playsInline
          muted
          onCanPlay={() => setHasPermissions(true)}
        />
        <canvas ref={canvasRef} style={{ display: 'none' }} />
      </div>
      
      <div className="controls">
        {!hasPermissions && (
          <button onClick={startCamera}>
            Enable Camera
          </button>
        )}
        
        {hasPermissions && !isStreaming ? (
          <button onClick={startStreaming} className="start-button">
            Start Vision Assistant
          </button>
        ) : hasPermissions && (
          <button onClick={stopStreaming} className="stop-button">
            Stop Vision Assistant
          </button>
        )}
      </div>
    </div>
  );
}

export default VideoCapture;
```

### Audio Feedback Component

Create `components/AudioFeedback.js`:

```jsx
import React, { useEffect, useState, useRef } from 'react';

function AudioFeedback({ detectedObjects }) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const speakQueueRef = useRef([]);
  const lastSpokenRef = useRef({});

  useEffect(() => {
    // Initialize speech synthesis
    if ('speechSynthesis' in window) {
      // Set up speaking queue system
      const processSpeakQueue = () => {
        if (speakQueueRef.current.length > 0 && !isSpeaking) {
          setIsSpeaking(true);
          const nextText = speakQueueRef.current.shift();
          const utterance = new SpeechSynthesisUtterance(nextText);
          
          utterance.rate = 1.2; // Slightly faster than default
          utterance.pitch = 1.0;
          utterance.volume = 1.0;
          
          utterance.onend = () => {
            setIsSpeaking(false);
            // Continue with next item in queue
            setTimeout(processSpeakQueue, 300); // Brief pause between utterances
          };
          
          window.speechSynthesis.speak(utterance);
        }
      };
      
      // Start the queue processor
      const queueInterval = setInterval(processSpeakQueue, 500);
      
      return () => {
        clearInterval(queueInterval);
        window.speechSynthesis.cancel(); // Cancel any ongoing speech when unmounting
      };
    } else {
      console.error('Speech synthesis not supported in this browser');
    }
  }, []);

  useEffect(() => {
    if (!detectedObjects || detectedObjects.length === 0) return;
    
    const currentTime = Date.now();
    const newDescriptions = [];
    const cooldownPeriod = 5000; // 5 seconds before repeating the same object type
    
    detectedObjects.forEach(obj => {
      const { name, position, distance, confidence } = obj;
      
      // Check if this object type was recently announced
      const lastTime = lastSpokenRef.current[name];
      if (lastTime && (currentTime - lastTime < cooldownPeriod)) {
        return; // Skip if recently spoken
      }
      
      // Only announce objects with high confidence
      if (confidence > 0.65) {
        // Create more natural description
        let description;
        
        // Different format based on position
        if (position === 'center') {
          description = `${name} directly ahead, ${distance}.`;
        } else {
          description = `${name} to your ${position}, ${distance}.`;
        }
        
        newDescriptions.push(description);
        lastSpokenRef.current[name] = currentTime;
      }
    });
    
    // Add new descriptions to the queue
    if (newDescriptions.length > 0) {
      speakQueueRef.current = [...speakQueueRef.current, ...newDescriptions];
      // Keep queue manageable (max 5 items)
      if (speakQueueRef.current.length > 5) {
        speakQueueRef.current = speakQueueRef.current.slice(-5);
      }
    }
  }, [detectedObjects]);

  return (
    <div className="audio-feedback">
      <h2>Audio Feedback</h2>
      <div className="detected-objects">
        <h3>Recently Detected:</h3>
        <ul>
          {detectedObjects && detectedObjects.map((obj, index) => (
            <li key={index}>
              {obj.name} ({obj.position}, {obj.distance})
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default AudioFeedback;
```

### CSS Styling

Add basic styling in `App.css`:

```css
.app {
  max-width: 100%;
  margin: 0 auto;
  padding: 20px;
  font-family: Arial, sans-serif;
}

header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.connection-status {
  padding: 5px 10px;
  border-radius: 4px;
  background: #f0f0f0;
}

.video-container {
  position: relative;
  width: 100%;
  max-width: 640px;
  margin: 0 auto;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #ccc;
}

video {
  width: 100%;
  height: auto;
  display: block;
}

.controls {
  margin-top: 20px;
  display: flex;
  justify-content: center;
}

.controls button {
  padding: 10px 20px;
  border-radius: 4px;
  font-size: 16px;
  cursor: pointer;
  margin: 0 10px;
}

.start-button {
  background-color: #4CAF50;
  color: white;
  border: none;
}

.stop-button {
  background-color: #f44336;
  color: white;
  border: none;
}

.error-message {
  color: red;
  margin-top: 20px;
  padding: 10px;
  border: 1px solid red;
  border-radius: 4px;
  background-color: rgba(255, 0, 0, 0.1);
}

.audio-feedback {
  margin-top: 30px;
}

.detected-objects {
  margin-top: 10px;
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
  background-color: #f9f9f9;
}

.detected-objects ul {
  list-style-type: none;
  padding: 0;
}

.detected-objects li {
  margin-bottom: 5px;
  padding: 3px 0;
}
```

## Backend Implementation

### Setting Up the FastAPI Server

Create a directory for the backend:

```bash
mkdir backend
cd backend
```

Create a virtual environment and install dependencies:

```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

pip install fastapi uvicorn python-multipart Pillow numpy torch ultralytics langchain-groq python-dotenv sse-starlette
```

### Server Configuration

Create a `.env` file:

```
GROQ_API_KEY=your_groq_api_key_here
```

### Main FastAPI Application

Create `main.py`:

```python
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
    model = YOLO("yolov8n.pt")  # Using the nano model for speed
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
            return objects
            
        # Initialize Groq client
        llm = ChatGroq(
            api_key=os.getenv("GROQ_API_KEY"),
            model_name="llama3-8b-8192"  # Using Llama 3 8B for speed and efficiency
        )
        
        # Create a prompt that asks for enhanced descriptions
        objects_json = json.dumps(objects)
        prompt = f"""
        You are an AI assistant for blind people. Here are objects detected in a video frame:
        {objects_json}
        
        For each object, keep the existing fields but refine the "distance" description to be more 
        meaningful for a blind person, and add more context if needed. Keep the descriptions short 
        and actionable. For example, "coffee cup on the table ahead" is better than just "coffee cup".
        
        Return only the modified JSON array with the same structure but enhanced descriptions.
        """
        
        # Get response from Groq
        messages = [HumanMessage(content=prompt)]
        response = llm.invoke(messages)
        
        # Extract JSON from response
        enhanced_text = response.content
        json_match = re.search(r'\[.*\]', enhanced_text, re.DOTALL)
        
        if json_match:
            enhanced_objects = json.loads(json_match.group(0))
            return enhanced_objects
        else:
            print("Could not extract JSON from LLM response")
            return objects
            
    except Exception as e:
        print(f"Error in LLM enhancement: {e}")
        return objects  # Return original objects on error

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
        enhanced_objects = await enhance_object_descriptions(top_objects)
        
        # Send to client
        if client_id in client_connections:
            client_connections[client_id]["queue"].append({
                "objects": enhanced_objects,
                "timestamp": frame_data.timestamp
            })
            
    except Exception as e:
        print(f"Error processing frame: {e}")

@app.post("/process-frame")
async def receive_frame(frame_data: FrameData, background_tasks: BackgroundTasks):
    # Generate client ID if not provided
    client_id = str(uuid.uuid4())
    
    # Process frame in background
    background_tasks.add_task(process_frame_data, frame_data, client_id)
    
    return {"status": "Frame received for processing"}

# Stream events to client
@app.get("/stream")
async def stream(request: Request):
    client_id = str(uuid.uuid4())
    
    # Initialize event queue for this client
    client_connections[client_id] = {
        "connected": True,
        "queue": []
    }
    
    async def event_generator():
        try:
            # Send initial connection message
            yield {
                "event": "connection",
                "data": json.dumps({"status": "connected", "client_id": client_id})
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
                        "event": "objects",
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
        finally:
            # Clean up when client disconnects
            if client_id in client_connections:
                client_connections[client_id]["connected"] = False
                client_connections.pop(client_id, None)
    
    return EventSourceResponse(event_generator())

@app.on_event("shutdown")
async def shutdown_event():
    # Clean up resources
    client_connections.clear()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
```

### Running the Application

1. Start the backend server:
```bash
cd backend
python main.py
# Or with uvicorn directly:
# uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

2. Start the React frontend:
```bash
cd vision-to-audio  # Navigate to React app directory
npm start
```

## Integration & Communication

### Server-Sent Events Implementation

The application uses Server-Sent Events (SSE) for real-time updates from server to client. This is a simpler alternative to WebSockets for one-way communication and works well for this use case.

Benefits of SSE for this application:
- Built-in reconnection handling
- Text-based protocol (easy to debug)
- Uses standard HTTP connections
- Automatic event parsing in browser

### Data Flow Overview

1. React application captures video frames at 5 FPS
2. Frames are converted to base64 and sent to server via HTTP POST
3. Server processes frames with YOLOv8 for object detection
4. Detected objects are enhanced with Groq LLM
5. Structured data is streamed back to client using SSE
6. Client converts object data to speech using Web Speech API

## Testing & Deployment

### Testing the Application

1. Test with different lighting conditions
2. Verify performance on mobile devices
3. Test with screen readers enabled
4. Check battery and data usage

### Deployment Options

1. **Local Deployment (Development)**
   - Backend: Run with Uvicorn
   - Frontend: Run with npm start

2. **Production Deployment**
   - Backend: Uvicorn with Gunicorn behind Nginx
   - Frontend: Static files served from CDN or Nginx
   - Consider containerization with Docker

3. **Cloud Deployment**
   - Backend: AWS Lambda, Google Cloud Run, or Azure Functions
   - Frontend: Firebase Hosting, Netlify, or Vercel
   - Use environment variables for configuration

## Accessibility Considerations

For an application designed for visually impaired users:

1. **Audio Feedback Quality**
   - Use clear, concise descriptions
   - Implement priority system for important objects
   - Allow user to control speech rate and volume

2. **Interface Design**
   - Use high contrast colors
   - Implement large touch targets
   - Support screen readers
   - Add haptic feedback where possible

3. **Performance Optimization**
   - Minimize battery usage
   - Reduce data consumption
   - Implement offline capabilities where possible

4. **User Customization**
   - Allow users to prioritize certain object types
   - Provide settings for verbosity level
   - Support personalized voice options

5. **Privacy and Security**
   - Implement proper data handling policies
   - Provide clear privacy information
   - Add camera access notifications

## Future Enhancements

1. **Local ML Processing**
   - Implement TensorFlow.js for client-side processing
   - Reduce dependency on network connection

2. **Advanced Features**
   - Face recognition (with proper permissions)
   - Text recognition (OCR)
   - Scene understanding
   - Navigation assistance

3. **Multimodal Feedback**
   - Haptic feedback for proximity alerts
   - Sonification of spatial information
   - Voice commands for control

4. **Offline Support**
   - Cache models for offline use
   - Store frequently encountered objects
