import React, { useState, useEffect, useRef } from 'react';
import VideoCapture from './VideoCapture';
import AudioFeedback from './AudioFeedback';

function Demo() {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);
  const eventSourceRef = useRef(null);
  const [descriptionText, setDescriptionText] = useState("");
  const [clientId, setClientId] = useState("");

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
      // Generate a client ID if not exists
      const cid = clientId || `client-${Date.now()}`;
      setClientId(cid);
      
      // Create EventSource with client ID in header
      const eventSource = new EventSource(`http://localhost:8000/stream`);
      eventSourceRef.current = eventSource;
      
      // Handle connection open
      eventSource.onopen = () => {
        setIsConnected(true);
        setError(null);
        console.log("SSE connection established");
      };
      
      // Handle different event types
      eventSource.addEventListener('connected', (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log("Connected event:", data);
          setClientId(data.client_id);
        } catch (err) {
          console.error('Error parsing connected event data:', err);
        }
      });
      
      eventSource.addEventListener('description', (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log("Description event:", data);
          if (data.text) {
            setDescriptionText(data.text);
          }
        } catch (err) {
          console.error('Error parsing description event data:', err);
        }
      });
      
      eventSource.addEventListener('error', (event) => {
        try {
          const data = JSON.parse(event.data);
          console.error("Error event:", data);
          setError(data.error);
        } catch (err) {
          console.error('Error parsing error event data:', err);
        }
      });
      
      // Handle general errors
      eventSource.onerror = (err) => {
        console.error('SSE connection error:', err);
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
        <VideoCapture 
          isConnected={isConnected} 
          connectToSSE={connectToSSE} 
          clientId={clientId}
        />
        <AudioFeedback descriptionText={descriptionText} />
        
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