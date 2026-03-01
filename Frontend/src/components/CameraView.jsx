import { useRef, useState, useEffect } from "react";

function CameraView() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const recognitionRef = useRef(null);

  const isProcessingRef = useRef(false);
  const isSpeakingRef = useRef(false);

  const [isCameraOn, setIsCameraOn] = useState(false);
  const [response, setResponse] = useState("Camera is off.");

  const BACKEND_URL = "https://solid-system-r4pwrwj7qw64fppjv-8000.app.github.dev/"; // your backend base URL

  /* =========================
     TEXT TO SPEECH
  ========================== */
  const speak = (text) => {
    if (!text) return;

    // Stop recognition while speaking
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

      // Restart recognition only if camera is on
      if (isCameraOn && recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch {}
      }
    };

    speechSynthesis.speak(utterance);
  };

  /* =========================
     CAMERA CONTROL
  ========================== */
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });

      streamRef.current = stream;
      videoRef.current.srcObject = stream;

      setIsCameraOn(true);
      setResponse("Camera started. Listening...");
      speak("Camera started. You can speak now.");

      startListening();
    } catch (error) {
      setResponse("Camera access denied.");
      speak("Camera access denied.");
    }
  };

  const stopCamera = () => {
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

    setIsCameraOn(false);
    setResponse("Camera stopped.");
  };

  /* =========================
     FRAME CAPTURE
  ========================== */
  const captureFrame = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return null;

    const ctx = canvas.getContext("2d");

    canvas.width = 640;
    canvas.height = 480;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    return canvas.toDataURL("image/jpeg", 0.6);
  };

  /* =========================
     BACKEND CALL
  ========================== */
  const sendToBackend = async (base64Image, transcript) => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;

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

      const data = await res.json();

      if (Array.isArray(data.response)) {
        const finalText = data.response.join(" ");
        setResponse(finalText);

        // Speak response, recognition restarts after speech ends
        speak(finalText);
      } else {
        setResponse("Invalid response format.");
        speak("Invalid response from server.");
      }
    } catch (error) {
      setResponse("Backend connection error.");
      speak("Backend connection error.");
    } finally {
      isProcessingRef.current = false;
    }
  };

  /* =========================
     SPEECH RECOGNITION
  ========================== */
  const startListening = () => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setResponse("Speech recognition not supported in this browser.");
      return;
    }

    // If recognition already exists, just start it
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
      } catch {}
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true; // very important
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onstart = () => {
      console.log("Listening started...");
    };

    recognition.onresult = async (event) => {
      if (isSpeakingRef.current || isProcessingRef.current) return;

      const transcript =
        event.results[event.results.length - 1][0].transcript;

      console.log("User said:", transcript);
      setResponse(`You said: ${transcript}`);

      const image = captureFrame();
      if (image) {
        await sendToBackend(image, transcript);
      }
    };

    recognition.onerror = (event) => {
      console.log("Speech error:", event.error);
      if (event.error === "not-allowed") {
        setResponse("Microphone permission denied.");
      }
    };

    recognition.onend = () => {
      // Safe restart if camera on and not speaking
      if (isCameraOn && !isSpeakingRef.current) {
        setTimeout(() => {
          try {
            recognition.start();
          } catch (e) {
            console.log("Recognition restart failed:", e);
          }
        }, 500);
      }
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch {}
  };

  /* =========================
     CLEANUP
  ========================== */
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  /* =========================
     UI
  ========================== */
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
    </div>
  );
}

export default CameraView;
