import React, { useEffect, useState, useRef } from 'react'
function Search() {
  const width = 320;
  // controls if media input is on or off
  const [playing, setPlaying] = useState(false);

  // controls the current stream value
  const [stream, setStream] = useState(null);
  const [video, setVideo] = useState(false);
  const[imgUrl,setCapturedUrl]=useState("");

  // controls the video DOM element
  const webcamVideo = useRef();

  //canvas object to capture image
  const canvasRef = useRef();

  //output image
  const photo=useRef();

  // get the user's media stream
  const startStream = async () => {
      navigator.mediaDevices
        .getUserMedia({
          video: {facingMode: "environment"} //"environment" for accessing rear camera on mobile
        })
        .then(newStream => {
          webcamVideo.current.srcObject = newStream;
          setStream(newStream);
        });
      setVideo(true);
      setPlaying(true);
  };

  // stops the user's media stream
  const stopStream = async () => {
      stream.getTracks().forEach((track) => track.stop());
      setVideo(!video);
      
      stream.getVideoTracks()[0].enabled = !video;
      setPlaying(false);
  };
  
  const capturePic = () => {
    const video = webcamVideo.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");

    context.drawImage(video,0, 0, video.videoWidth, video.videoHeight);
    const data = canvas.toDataURL("image/png");
    setCapturedUrl(data)
    
  };


  return (
    <div className="container gap-4">
      <video ref={webcamVideo} autoPlay playsInline></video>
      <canvas ref={canvasRef}></canvas>
      <button
          className={playing?`bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded m-2`:
                            `bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded m-2`}
          onClick={playing ? stopStream : startStream}>
          {playing?`Stop`:`Start`}
      </button>

      <button
        className='bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded m-2'
        onClick={capturePic}>Capture Image</button>
        <img src={imgUrl} alt="Output Image Here" />
    </div>
  );
}

export default Search