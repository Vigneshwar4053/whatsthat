import React, { useState, useEffect, useRef } from 'react';
import VideoCapture from './VideoCapture';
import AudioFeedback from './AudioFeedback';

function Demo() {
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

export default Demo;