import React, { useRef, useState } from "react";
import ImagePreview from "./ImagePreview.jsx";

export default function Composer({ onSend }) {
  const [text, setText] = useState("");
  const [file, setFile] = useState(null);
  const inputRef = useRef(null);

  function submit(e) {
    e.preventDefault();
    const payload = {
      text: text.trim() || undefined,
      file: file || undefined,
    };
    if (!payload.text && !payload.file) return;
    onSend(payload);
    setText("");
    setFile(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <form onSubmit={submit} className="flex items-center gap-2 p-2 border-t">
      <input
        className="flex-1 border rounded p-2"
        placeholder="Type a message"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
        id="chat-file"
      />
      <label htmlFor="chat-file" className="cursor-pointer px-3 py-2 rounded bg-gray-200">
        Image
      </label>
      <button className="px-4 py-2 rounded bg-black text-white">Send</button>
      {file && <ImagePreview file={file} onClear={() => { setFile(null); if (inputRef.current) inputRef.current.value=''; }} />}
    </form>
  );
}
