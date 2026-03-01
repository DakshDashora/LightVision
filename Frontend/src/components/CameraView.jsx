import { useRef, useState, useEffect } from "react";

function CameraView() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const recognitionRef = useRef(null);
  const isCameraOnRef = useRef(false);
  const isProcessingRef = useRef(false);
  const isSpeakingRef = useRef(false);
  const transcriptBufferRef = useRef("");
  const silenceTimerRef = useRef(null);

  const [isCameraOn, setIsCameraOn] = useState(false);
  const [response, setResponse] = useState("Camera is off.");
  const [heardText, setHeardText] = useState("");

  const BACKEND_URL = "https://solid-system-r4pwrwj7qw64fppjv-8000.app.github.dev/";

  const clearSilenceTimer = () => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  };

  const speak = (text) => {
    if (!text) return;

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }

    speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1;
    isSpeakingRef.current = true;

    utterance.onend = () => {
      isSpeakingRef.current = false;
      if (isCameraOnRef.current && recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch {}
      }
    };

    speechSynthesis.speak(utterance);
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });

      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      isCameraOnRef.current = true;
      setIsCameraOn(true);
      setResponse("Camera started. Listening...");
      speak("Camera started. You can speak now.");

      startListening();
    } catch {
      setResponse("Camera access denied.");
      speak("Camera access denied.");
    }
  };

  const stopCamera = () => {
    clearSilenceTimer();
    transcriptBufferRef.current = "";

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (recognitionRef.current) {
      recognitionRef.current.onend = null;
      try {
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
    }

    speechSynthesis.cancel();

    isCameraOnRef.current = false;
    setIsCameraOn(false);
    setHeardText("");
    setResponse("Camera stopped.");
  };

  const captureFrame = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return null;

    const hasVideoFrame =
      video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0;
    if (!hasVideoFrame) return null;

    const ctx = canvas.getContext("2d");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    return canvas.toDataURL("image/jpeg", 0.7);
  };

  const sendToBackend = async (base64Image, transcript) => {
    if (isProcessingRef.current) return;
    if (!transcript || !base64Image) return;

    isProcessingRef.current = true;
    setResponse("Processing...");

    try {
      const payload = {
        user_text: transcript,
        user_image_url: base64Image,
        session_id: "default_session",
      };

      const res = await fetch(BACKEND_URL + "query/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Backend error ${res.status}: ${errorText}`);
      }

      const data = await res.json();

      if (Array.isArray(data.response)) {
        const finalText = data.response.join(" ").trim();
        setResponse(finalText || "No response from backend.");
        speak(finalText || "No response from backend.");
      } else {
        setResponse("Invalid response format.");
        speak("Invalid response from server.");
      }
    } catch (error) {
      setResponse("Backend connection error.");
      speak("Backend connection error.");
      console.error(error);
    } finally {
      isProcessingRef.current = false;
    }
  };

  const flushTranscriptAndSend = async () => {
    if (isProcessingRef.current || isSpeakingRef.current || !isCameraOnRef.current) {
      return;
    }

    const transcript = transcriptBufferRef.current.trim();
    transcriptBufferRef.current = "";

    if (!transcript) return;

    const image = captureFrame();
    if (!image) {
      setResponse("Camera frame is not ready yet. Please speak again.");
      return;
    }

    await sendToBackend(image, transcript);
  };

  const startListening = () => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setResponse("Speech recognition not supported in this browser.");
      return;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
      } catch {}
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event) => {
      if (isSpeakingRef.current || isProcessingRef.current) return;

      let mergedText = "";
      for (let i = 0; i < event.results.length; i += 1) {
        mergedText += `${event.results[i][0].transcript} `;
      }

      const cleanText = mergedText.trim();
      if (!cleanText) return;

      transcriptBufferRef.current = cleanText;
      setHeardText(cleanText);
      setResponse(`You said: ${cleanText}`);

      clearSilenceTimer();
      silenceTimerRef.current = setTimeout(() => {
        flushTranscriptAndSend();
      }, 1200);
    };

    recognition.onerror = (event) => {
      console.log("Speech error:", event.error);
      if (event.error === "not-allowed") {
        setResponse("Microphone permission denied.");
      }
    };

    recognition.onend = () => {
      if (isCameraOnRef.current && !isSpeakingRef.current) {
        setTimeout(() => {
          try {
            recognition.start();
          } catch (error) {
            console.log("Recognition restart failed:", error);
          }
        }, 300);
      }
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch {}
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <div className="camera-container">
      <div className="video-wrapper">
        <video ref={videoRef} autoPlay playsInline muted />
      </div>

      <canvas ref={canvasRef} style={{ display: "none" }} />

      <div className="controls">
        {!isCameraOn ? (
          <button className="start-btn" onClick={startCamera}>
            Start Camera
          </button>
        ) : (
          <button className="stop-btn" onClick={stopCamera}>
            Stop Camera
          </button>
        )}
      </div>

      <div className="response-box">{response}</div>
      {heardText && <div className="response-box">Heard: {heardText}</div>}
    </div>
  );
}

export default CameraView;
