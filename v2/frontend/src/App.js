import React, { useEffect, useRef, useState } from "react";

function App() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [threats, setThreats] = useState([]);

  useEffect(() => {
    // Access webcam
    navigator.mediaDevices
      .getUserMedia({ video: true })
      .then((stream) => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      });

    const ws = new WebSocket("ws://localhost:8000/ws");

    ws.onopen = () => {
      console.log("✅ WebSocket connected");

      // Start sending frames every 500ms
      const interval = setInterval(() => {
        if (videoRef.current) {
          const canvas = canvasRef.current;
          const ctx = canvas.getContext("2d");
          canvas.width = videoRef.current.videoWidth;
          canvas.height = videoRef.current.videoHeight;
          ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

          const imageData = canvas.toDataURL("image/jpeg");
          ws.send(imageData);
        }
      }, 500);

      return () => clearInterval(interval);
    };

    ws.onmessage = ({ data }) => {
      try {
        const parsed = JSON.parse(data);

        if (parsed.threats && parsed.threats.length > 0) {
          setThreats(parsed.threats.map((t) => t.assessment));

          parsed.threats.forEach((t) => {
            const utterance = new SpeechSynthesisUtterance(t.assessment);
            window.speechSynthesis.speak(utterance);
          });
        }
      } catch (err) {
        console.error("WebSocket parse error", err);
      }
    };

    ws.onerror = (err) => console.error("WebSocket error", err);
    ws.onclose = () => console.log("❌ WebSocket closed");

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, []);

  return (
    <div style={{ textAlign: "center" }}>
      <h1>🔍 Vision Threat Detection</h1>
      <video ref={videoRef} autoPlay muted style={{ width: "640px" }} />
      <canvas ref={canvasRef} style={{ display: "none" }} />
      <div>
        <h2>Threats:</h2>
        <ul>
          {threats.map((t, i) => (
            <li key={i}>{t}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default App;
