import React, { useEffect, useState, useRef } from 'react';

function AudioFeedback({ detectedObjects }) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const speakQueueRef = useRef([]);
  const lastSpokenRef = useRef({});

  useEffect(() => {
    // Initialize speech synthesis
    if ('speechSynthesis' in window) {
      // Set up speaking queue system
      console.log('Audio will work');
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