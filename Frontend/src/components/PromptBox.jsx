import { useState } from "react";

export default function TextBox() {
  const [text, setText] = useState("");

  const speakText = () => {
    if (!window.speechSynthesis) return;
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = "en-US";
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utter);
  };

  return (
    <div className="text-box">
      <textarea
        value={text}
        placeholder="Type your prompt..."
        onChange={(e) => setText(e.target.value)}
        className="prompt-box"
      />
      {text.trim() && (
        <button className="secondary-btn" onClick={speakText}>
          🔊 Listen Text
        </button>
      )}
    </div>
  );
}
