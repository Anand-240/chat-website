import React, { useRef, useState } from "react";

export default function Composer({ onSend }) {
  const [text, setText] = useState("");
  const [file, setFile] = useState(null);
  const [previewSrc, setPreviewSrc] = useState("");
  const fileRef = useRef(null);

  function submit(e) {
    e.preventDefault();
    const t = text.trim();
    if (!t && !file) return;
    if (file) onSend({ file });
    if (t) onSend({ text: t });
    setText("");
    setFile(null);
    setPreviewSrc("");
    if (fileRef.current) fileRef.current.value = "";
  }

  function pickImage() {
    fileRef.current?.click();
  }

  function setPreview(f) {
    if (!f) {
      setPreviewSrc("");
      return;
    }
    const url = URL.createObjectURL(f);
    setPreviewSrc(url);
  }

  function onFileChange(e) {
    const f = e.target.files?.[0];
    if (!f || !f.type.startsWith("image/")) return;
    setFile(f);
    setPreview(f);
  }

  function onDrop(e) {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (!f || !f.type.startsWith("image/")) return;
    setFile(f);
    setPreview(f);
  }

  function onPaste(e) {
    const f = e.clipboardData.files?.[0];
    if (!f || !f.type.startsWith("image/")) return;
    setFile(f);
    setPreview(f);
  }

  function clearPreview() {
    setFile(null);
    setPreviewSrc("");
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <form onSubmit={submit} className="bg-white px-4 pt-2 pb-2 flex flex-col gap-2">
      {previewSrc && (
        <div className="flex items-center justify-between gap-3 bg-[#f6f7fb] rounded-xl p-2 mb-1">
          <img src={previewSrc} alt="" className="h-24 rounded-lg object-cover" />
          <button type="button" onClick={clearPreview} className="rounded-lg px-3 py-2 bg-[#e9ebf5] text-sm">Remove</button>
        </div>
      )}
      <div
        className="flex items-center gap-2 bg-[#f6f7fb] rounded-full px-3 py-2 shadow-sm"
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
        onPaste={onPaste}
      >
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFileChange} />
        <button type="button" onClick={pickImage} className="rounded-full px-3 py-2 bg-[#e9ebf5] text-sm">📷</button>
        <input
          className="flex-1 bg-transparent outline-none text-[15px]"
          placeholder="Type a message or pick an image"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button className="rounded-full px-5 py-2 bg-(--primary) hover:opacity-90 transition text-white text-sm font-medium">Send</button>
      </div>
    </form>
  );
}