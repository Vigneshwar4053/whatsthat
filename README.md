# Vision-to-Audio Assistant

A real-time assistive technology application that helps blind users understand their surroundings by converting camera input into audio descriptions.

## Overview

This application captures video from the user's device camera, sends frames to a backend server for object detection using YOLOv8, enhances the descriptions using a large language model, and converts these descriptions to audio for the user.

![Architectural Diagram](https://placeholder.com/800x400)

## Architecture

### Frontend (React)
- Captures video frames from the device camera
- Establishes an SSE connection with the backend
- Receives descriptions and converts them to speech

### Backend (FastAPI)
- Processes video frames with YOLOv8 for object detection
- Uses Groq's LLM to generate natural language descriptions
- Streams responses back to the client using Server-Sent Events (SSE)

### Data Flow
1. User grants camera access in the React application
2. Video frames are captured and sent to the FastAPI backend
3. Object detection identifies objects, positions, and distances
4. LLM generates a natural language description
5. Description is streamed to the frontend
6. Web Speech API converts the text to audio

## Prerequisites

- Python 3.9+
- Node.js 16+
- Groq API key (https://console.groq.com/)

## Getting Started

### Backend Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/vision-to-audio-assistant.git
   cd vision-to-audio-assistant/backend
   ```

2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Create a `.env` file with your Groq API key:
   ```
   GROQ_API_KEY=your_groq_api_key_here
   ```

5. Start the backend server:
   ```bash
   uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd ../frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm start
   ```

4. Open your browser to http://localhost:3000

## Using the Application

1. Grant camera access when prompted
2. Click "Start Vision Assistant" to begin processing
3. The application will detect objects and provide audio descriptions
4. Click "Stop Vision Assistant" to end the session

## Technical Details

- **Object Detection**: YOLOv8 nano model for real-time performance
- **Position Detection**: Objects are positioned relative to the viewer (left, center, right)
- **Distance Estimation**: Based on object size in the frame (very close, close, medium, far, very far)
- **LLM Integration**: Using llama3-70b-8192 model via Groq for natural language descriptions
- **Real-time Communication**: Server-Sent Events for efficient streaming

## Performance Considerations

- Frame capture occurs every 5 seconds to balance responsiveness with server load
- Images are compressed to JPEG quality 0.6 to reduce bandwidth usage
- Only the top 5 objects (by confidence) are included in descriptions

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.