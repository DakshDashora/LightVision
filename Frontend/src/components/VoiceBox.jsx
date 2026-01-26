import { useState, useRef } from "react";

export default function VoiceBox({ onCaptureImage }) {
  const [transcript, setTranscript] = useState("");
  const [status, setStatus] = useState("idle"); // idle, listening, received
  const recognitionRef = useRef(null);
  const fileInputRef = useRef(null);

  const speak = (text) => {
    if (!window.speechSynthesis) return;
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = "en-US";
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utter);
  };

  const startListening = () => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Speech recognition not supported on this device");
      return;
    }

    if (!recognitionRef.current) {
      const recognition = new SpeechRecognition();
      recognition.lang = "en-US";
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => setStatus("listening");

      recognition.onresult = (event) => {
        const spokenText = event.results[0][0].transcript;
        setTranscript(spokenText);
        setStatus("received");

        // Handle voice commands
        if (spokenText.toLowerCase().includes("capture image")) {
          // trigger camera automatically
          if (fileInputRef.current) {
            fileInputRef.current.click();
          }
        }
      };

      recognition.onerror = (e) => {
        console.error(e);
        alert("Speech recognition error: " + e.error);
        setStatus("idle");
      };

      recognitionRef.current = recognition;
    }

    recognitionRef.current.start();
  };

  const relisten = () => {
    if (transcript) speak(transcript);
  };

  return (
    <div className="voice-box">
      <button className="primary-btn" onClick={startListening}>
        🎤 Speak
      </button>

      <p className="status-text">
        {status === "listening" && "Listening..."}
        {status === "received" && "Message received"}
      </p>

      {status === "received" && (
        <button className="secondary-btn" onClick={relisten}>
          🔊 Relisten
        </button>
      )}

      {/* Hidden file input to open camera */}
      <input
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: "none" }}
        ref={fileInputRef}
        onChange={(e) => onCaptureImage(e.target.files[0])}
      />

      <div className="transcript-display">{transcript}</div>
    </div>
  );
}
