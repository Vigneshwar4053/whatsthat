import React, { useEffect, useState } from 'react';

function AudioFeedback({ descriptionText }) {
  const [isSpeaking, setIsSpeaking] = useState(false);

  useEffect(() => {
    // Initialize speech synthesis
    if (!('speechSynthesis' in window)) {
      console.error('Speech synthesis not supported in this browser');
      return;
    }

    // Clean up function to cancel any speech when component unmounts
    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  useEffect(() => {
    // When new description text is received, speak it
    if (descriptionText && 'speechSynthesis' in window) {
      // Cancel any ongoing speech
      window.speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(descriptionText);
      
      utterance.rate = 1.2; // Slightly faster than default
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      
      utterance.onstart = () => {
        setIsSpeaking(true);
      };
      
      utterance.onend = () => {
        setIsSpeaking(false);
      };
      
      utterance.onerror = (event) => {
        console.error('Speech synthesis error:', event);
        setIsSpeaking(false);
      };
      
      window.speechSynthesis.speak(utterance);
    }
  }, [descriptionText]);

  return (
    <div className="audio-feedback">
      <h2>Audio Feedback</h2>
      <div className="speech-status">
        Status: {isSpeaking ? 'Speaking' : 'Idle'}
      </div>
      <div className="current-description">
        <h3>Current Description:</h3>
        <p>{descriptionText || 'No description available'}</p>
      </div>
    </div>
  );
}

export default AudioFeedback;