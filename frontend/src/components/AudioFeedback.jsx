import React, { useEffect, useState } from 'react';

function AudioFeedback({ descriptionText }) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [lastSpokenText, setLastSpokenText] = useState("");

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
    if (descriptionText && 
        descriptionText !== lastSpokenText && 
        'speechSynthesis' in window) {
      
      // Cancel any ongoing speech
      window.speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(descriptionText);
      
      utterance.rate = 1.2; // Slightly faster than default
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      
      utterance.onstart = () => {
        setIsSpeaking(true);
        setLastSpokenText(descriptionText);
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
  }, [descriptionText, lastSpokenText]);

  return (
    <div className="container mx-auto px-4 py-6 max-w-2xl bg-white rounded-lg shadow-md border border-purple-200">
      <h2 className="text-2xl font-bold mb-4 text-center bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-transparent bg-clip-text">Audio Feedback</h2>
      
      <div className="flex items-center justify-center mb-4 p-2 bg-gray-50 rounded-lg">
        <span className="mr-2 font-medium">Status:</span>
        {isSpeaking ? (
          <span className="flex items-center px-3 py-1 bg-green-100 text-green-800 rounded-full">
            <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
            Speaking
          </span>
        ) : (
          <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full">Idle</span>
        )}
      </div>
      
      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
        <h3 className="text-lg font-semibold text-purple-700 mb-2">Current Description:</h3>
        <p className="text-gray-700 italic">
          {descriptionText || "Waiting for description..."}
        </p>
      </div>
    </div>
  );
}

export default AudioFeedback;