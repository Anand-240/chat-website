import React, { useEffect, useState } from "react";

export default function ImagePreview({ file, onClear }) {
  const [src, setSrc] = useState(null);

  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  if (!file) return null;

  return (
    <div className="absolute bottom-20 right-4 bg-white border rounded-xl p-2 shadow">
      <div className="text-xs mb-1 opacity-70">Image to send</div>
      <img src={src} alt="preview" className="w-40 h-40 object-cover rounded-lg" />
      <div className="flex justify-end mt-2">
        <button type="button" onClick={onClear} className="text-xs px-2 py-1 rounded bg-gray-200">
          Remove
        </button>
      </div>
    </div>
  );
}
