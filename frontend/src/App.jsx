import React, { useEffect, useRef, useState } from "react";

function App() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [detections, setDetections] = useState([]);

  useEffect(() => {
    // 1) open native WebSocket to FastAPI
    const ws = new WebSocket("ws://localhost:8000/ws");
    ws.onopen = () => console.log("WS connected");
    ws.onmessage = ({ data }) => {
      const parsed = JSON.parse(data);
      setDetections(parsed);
    };
    ws.onclose = () => console.log("WS closed");
    
    // 2) get webcam stream
    navigator.mediaDevices.getUserMedia({ video: true }).then((stream) => {
      const video = videoRef.current;
      video.srcObject = stream;
      video.play();
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      
      // 3) every 500ms: grab a frame, convert to base64, send
      const interval = setInterval(() => {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            ws.send(reader.result); // e.g. data:image/jpeg;base64,...
          };
          reader.readAsDataURL(blob);
        }, "image/jpeg");
      }, 500);
      
      // cleanup
      return () => clearInterval(interval);
    });
    
    // cleanup on unmount
    return () => {
      ws.close();
    };
  }, []);

  return (
    <div className="container mx-auto px-4 py-8 flex flex-col items-center">
      <h1 className="text-3xl font-bold mb-6 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-transparent bg-clip-text">Live Object Detection</h1>
      
      <div className="relative mb-6">
        <video 
          ref={videoRef} 
          width={640} 
          height={480} 
          className="rounded-lg shadow-lg border-2 border-purple-300"
        />
        <canvas
          ref={canvasRef}
          width={640}
          height={480}
          className="hidden"
        />
      </div>

      <div className="w-full max-w-2xl bg-gray-50 p-4 rounded-lg shadow-md border border-purple-200">
        <h2 className="text-lg font-semibold text-purple-700 mb-2">Detection Results</h2>
        <pre className="text-left bg-gray-100 p-3 rounded overflow-auto max-h-64 text-sm">
          {JSON.stringify(detections, null, 2)}
        </pre>
      </div>
    </div>
  );
}

export default App;