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
    <div style={{ textAlign: "center" }}>
      <h1>Live Object Detection</h1>
      <video ref={videoRef} width={640} height={480} />
      <canvas
        ref={canvasRef}
        width={640}
        height={480}
        style={{ display: "none" }}
      />
      <pre style={{ textAlign: "left", margin: "1em auto", width: 640 }}>
        {JSON.stringify(detections, null, 2)}
      </pre>
    </div>
  );
}

export default App;
