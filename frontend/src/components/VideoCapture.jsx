import React, { useRef, useEffect, useState } from 'react';

const MAX_WIDTH = 640; // Max width for video frame
const MAX_HEIGHT = 480; // Max height for video frame
const FRAME_INTERVAL = 5000; // Send frame every 5 seconds (5000ms)

function VideoCapture({ isConnected, connectToSSE, clientId }) {
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
    
    // Immediately capture first frame
    setTimeout(() => {
      captureAndSendFrame();
    }, 500);
    
    // Set interval for subsequent frames
    intervalRef.current = setInterval(() => {
      captureAndSendFrame();
    }, FRAME_INTERVAL);
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
    const imageData = canvas.toDataURL('image/jpeg', 0.6); // Lower quality for faster transfer
    
    console.log('Sending frame to process...');
    
    // Send frame to server with client ID
    fetch('http://localhost:8000/process-frame', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'client-id': clientId
      },
      body: JSON.stringify({
        frame: imageData,
        timestamp: new Date().toISOString()
      }),
    })
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      return response.json();
    })
    .then(data => console.log("Frame processed:", data))
    .catch(err => {
      console.error('Error sending frame:', err);
    });
  };

  return (
    <div className="container mx-auto px-4 py-6 flex flex-col items-center">
      <div className="w-full max-w-2xl mb-6">
        <video 
          ref={videoRef}
          autoPlay 
          playsInline
          muted
          onCanPlay={() => setHasPermissions(true)}
          className="rounded-lg shadow-lg border-2 border-purple-300 w-full"
        />
        <canvas ref={canvasRef} className="hidden" />
      </div>
      
      <div className="flex justify-center mt-4">
        {!hasPermissions && (
          <button 
            onClick={startCamera}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-6 rounded-full shadow-md transition-colors duration-300"
          >
            Enable Camera
          </button>
        )}
        
        {hasPermissions && !isStreaming ? (
          <button 
            onClick={startStreaming} 
            className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:from-indigo-600 hover:via-purple-600 hover:to-pink-600 text-white font-medium py-3 px-8 rounded-full shadow-md transition-all duration-300"
          >
            Start Vision Assistant
          </button>
        ) : hasPermissions && (
          <button 
            onClick={stopStreaming} 
            className="bg-red-500 hover:bg-red-600 text-white font-medium py-3 px-8 rounded-full shadow-md transition-colors duration-300"
          >
            Stop Vision Assistant
          </button>
        )}
      </div>
    </div>
  );
}

export default VideoCapture;