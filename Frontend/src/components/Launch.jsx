import { useState, useEffect, useRef } from "react";
import VoiceBox from "./VoiceBox";
import CameraControl from "./CaptureImage";
import TextBox from "./PromptBox";

export default function Launch() {
  const [capturedImage, setCapturedImage] = useState(null);
  const fileInputRef = useRef(null);
  const lastTap = useRef(0);

  // Global double-tap / double-click camera trigger
  useEffect(() => {
    const openCamera = () => {
      const utter = new SpeechSynthesisUtterance("Opening camera...");
      utter.lang = "en-US";
      window.speechSynthesis.speak(utter);

      if (fileInputRef.current) {
        fileInputRef.current.click();
      }
    };

    const handleClick = (e) => {
      if (e.detail === 2) {
        // Desktop double-click
        openCamera();
      }
    };

    const handleTouch = (e) => {
      // Mobile double-tap
      const now = Date.now();
      if (now - lastTap.current < 300) {
        openCamera();
      }
      lastTap.current = now;
    };

    document.addEventListener("click", handleClick);
    document.addEventListener("touchstart", handleTouch);

    return () => {
      document.removeEventListener("click", handleClick);
      document.removeEventListener("touchstart", handleTouch);
    };
  }, []);

  return (
    <div className="app-container">
      <header className="ribbon">
        <h1>LightVision</h1>
      </header>

      <main className="launch-area">
        <div className="content-box">
          <VoiceBox onCaptureImage={(file) => setCapturedImage(file)} fileInputRef={fileInputRef} />
          <CameraControl capturedImage={capturedImage} />
          <TextBox />
        </div>

        {/* Hidden global camera input */}
        <input
          type="file"
          accept="image/*"
          capture="environment"
          style={{ display: "none" }}
          ref={fileInputRef}
          onChange={(e) => setCapturedImage(e.target.files[0])}
        />
      </main>
    </div>
  );
}
