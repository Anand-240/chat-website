import React, { useRef, useState } from "react";

export default function Composer({ onSend }) {
  const [text, setText] = useState("");
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const ref = useRef(null);

  function submit(e) {
    e.preventDefault();
    const t = text.trim();
    if (!t && !file) return;
    if (file) onSend({ file });
    if (t) onSend({ text: t });
    setText("");
    setFile(null);
    setPreview("");
    if (ref.current) ref.current.value = "";
  }

  function onPick() { ref.current?.click(); }
  function onChange(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }
  function clear() {
    setFile(null);
    setPreview("");
    if (ref.current) ref.current.value = "";
  }

  return (
    <form onSubmit={submit} className="p-3 bg-white border-t border-(--border)">
      {preview && (
        <div className="mb-2 flex items-center justify-between gap-3 bg-[#f6f7fb] rounded-xl p-2">
          <img src={preview} alt="" className="h-24 rounded-lg object-cover" />
          <button type="button" onClick={clear} className="rounded-lg px-3 py-2 bg-[#e9ebf5] text-sm">Remove</button>
        </div>
      )}
      <div className="flex items-center gap-2 bg-[#f6f7fb] rounded-full px-3 py-2.5">
        <input ref={ref} type="file" accept="image/*" className="hidden" onChange={onChange} />
        <button type="button" onClick={onPick} className="rounded-full px-3 py-2 bg-[#e9ebf5] text-sm">📷</button>
        <input className="flex-1 bg-transparent outline-none text-[15px]" placeholder="Type a message or pick an image" value={text} onChange={(e)=>setText(e.target.value)} />
        <button className="rounded-full px-4 py-2 bg-(--primary) text-white text-sm font-medium">Send</button>
      </div>
    </form>
  );
}
