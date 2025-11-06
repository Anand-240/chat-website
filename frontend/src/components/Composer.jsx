import React, { useRef, useState } from "react";

export default function Composer({ onSend }) {
  const [text, setText] = useState("");
  const fileRef = useRef(null);

  function submit(e) {
    e.preventDefault();
    const t = text.trim();
    if (!t) return;
    onSend({ text: t });
    setText("");
  }

  function pickImage() {
    fileRef.current?.click();
  }

  async function onFileChange(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    onSend({ file: f });
    e.target.value = "";
  }

  function onDrop(e) {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (!f) return;
    if (!f.type.startsWith("image/")) return;
    onSend({ file: f });
  }

  function onPaste(e) {
    const f = e.clipboardData.files?.[0];
    if (!f) return;
    if (!f.type.startsWith("image/")) return;
    onSend({ file: f });
  }

  return (
    <form onSubmit={submit} className="p-3 bg-white border-t border-(--border)">
      <div
        className="flex items-center gap-2 bg-[#f6f7fb] rounded-full px-3 py-2.5"
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
        onPaste={onPaste}
      >
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={onFileChange}
        />
        <button type="button" onClick={pickImage} className="rounded-full px-3 py-2 bg-[#e9ebf5] text-sm">
          📷
        </button>
        <input
          className="flex-1 bg-transparent outline-none text-[15px]"
          placeholder="Type a message or pick an image"
          value={text}
          onChange={(e)=>setText(e.target.value)}
        />
        <button className="rounded-full px-4 py-2 bg-(--primary) text-white text-sm font-medium">
          Send
        </button>
      </div>
    </form>
  );
}
