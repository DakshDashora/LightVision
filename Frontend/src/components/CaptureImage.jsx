import { useEffect, useRef, useState } from "react";

export default function CameraControl({ onImageCaptured }) {
  const inputRef = useRef(null);
  const lastTapRef = useRef(0);
  const [preview, setPreview] = useState(null);

  // Text-to-speech helper
  const speak = (text) => {
    if (!window.speechSynthesis) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

  // Double-tap anywhere to open camera
  useEffect(() => {
    const handleTap = () => {
      const now = Date.now();
      if (now - lastTapRef.current < 300) {
        speak("Opening camera");
        inputRef.current?.click();
      }
      lastTapRef.current = now;
    };

    document.addEventListener("touchend", handleTap);
    document.addEventListener("dblclick", handleTap); // laptop support

    return () => {
      document.removeEventListener("touchend", handleTap);
      document.removeEventListener("dblclick", handleTap);
    };
  }, []);

  // Handle image capture
  const handleImage = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    setPreview(url);

    speak("Image captured");

    if (onImageCaptured) {
      onImageCaptured(file);
    }
  };

  return (
    <>
      {/* Hidden camera input */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleImage}
        style={{ display: "none" }}
      />

      {/* Preview */}
      {preview && (
        <div
          style={{
            marginTop: "1.5rem",
            display: "flex",
            justifyContent: "center",
          }}
        >
          <img
            src={preview}
            alt="Captured preview"
            style={{
              maxWidth: "90%",
              borderRadius: "14px",
              boxShadow: "0 0 20px rgba(0,0,0,0.4)",
            }}
          />
        </div>
      )}
    </>
  );
}
