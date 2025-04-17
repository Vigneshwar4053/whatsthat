import React, { useRef, useState } from 'react';

const App = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [playing, setPlaying] = useState(false);
  let [stream, setStream] = useState(null);

  const startCamera = async () => {
    try {
      const tmp_stream = await navigator.mediaDevices.getUserMedia({ video: true });
      setStream(tmp_stream);
      if (videoRef.current) {
        videoRef.current.srcObject = tmp_stream;
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
    }
    setPlaying(true);
  };

  const stopCamera = async () => {
    try{
      setPlaying(false);
      stream.getTracks().forEach((track) => track.stop());
      stream.getVideoTracks()[0].enabled = !video;
    } catch(err){
      console.error("Error accessing camera:", err);
    }
};

  const captureImage = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageData = canvas.toDataURL('image/png');
    setCapturedImage(imageData);
  };

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <h1 className="text-2xl font-bold">Camera Capture App</h1>
      <video ref={videoRef} autoPlay className="w-full max-w-md border rounded-lg" />
      <canvas ref={canvasRef} className="hidden" />

      <div className="flex gap-4">
        <button
          onClick={playing ? stopCamera:startCamera}
          className={playing?`px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600`:
                            `px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600`}
        >
          {playing?'Stop':'Start'}
        </button>

        <button
          onClick={captureImage}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
        >
          Capture
        </button>
      </div>

      {capturedImage && (
        <div>
          <h2 className="mt-4 text-lg font-semibold">Captured Image:</h2>
          <img src={capturedImage} alt="Captured" className="mt-2 border rounded-lg" />
        </div>
      )}
    </div>
  );
};

export default App;
