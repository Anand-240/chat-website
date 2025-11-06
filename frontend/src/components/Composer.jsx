import React, { useRef, useState } from "react";

export default function Composer({ onSend }) {
  const [text, setText] = useState("");
  const [file, setFile] = useState(null);
  const inputRef = useRef(null);

  function submit(e) {
    e.preventDefault();
    const payload = { text: text.trim() || undefined, file: file || undefined };
    if (!payload.text && !payload.file) return;
    onSend(payload);
    setText("");
    setFile(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <form onSubmit={submit} className="p-3 bg-white border-t border-(--border)">
      <div className="flex items-center gap-2 bg-[#f6f7fb] rounded-full px-4 py-2.5">
        <label htmlFor="chat-file" className="cursor-pointer select-none text-lg">📎</label>
        <input ref={inputRef} id="chat-file" type="file" accept="image/*" className="hidden" onChange={(e)=>setFile(e.target.files?.[0] || null)} />
        <input
          className="flex-1 bg-transparent outline-none text-[15px]"
          placeholder="Your message"
          value={text}
          onChange={(e)=>setText(e.target.value)}
        />
        <button className="rounded-full px-4 py-2 bg-(--primary) text-white text-sm font-medium">Send</button>
      </div>
      {file && (
        <div className="mt-2 text-xs text-[#6b7280] flex items-center justify-between">
          <span className="truncate">{file.name}</span>
          <button type="button" onClick={()=>{ setFile(null); if (inputRef.current) inputRef.current.value=""; }} className="text-(--primary)">
            remove
          </button>
        </div>
      )}
    </form>
  );
}
