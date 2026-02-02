import React, { useCallback, useRef, useState } from "react";
import { IconCloud } from "./Icons.jsx";

export default function Dropzone({ onFiles }) {
  const inputRef = useRef(null);
  const [isOver, setIsOver] = useState(false);

  const pick = () => inputRef.current?.click();

  const handleFiles = useCallback((fileList) => {
    const files = Array.from(fileList || []);
    onFiles?.(files);
  }, [onFiles]);

  return (
    <div
      className="dropzone"
      style={{ background: isOver ? "rgba(255,255,255,0.04)" : "transparent" }}
      onDragOver={(e) => { e.preventDefault(); setIsOver(true); }}
      onDragLeave={() => setIsOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsOver(false);
        handleFiles(e.dataTransfer.files);
      }}
      onClick={pick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") pick(); }}
    >
      <div className="dropzoneInner">
        <div style={{ width: 42, height: 42, opacity: 0.9 }}>
          <IconCloud />
        </div>
        <div style={{ fontWeight: 700 }}>Drag & drop files or click to browse</div>
        <div className="smallText">Maximum file size: 10MB (Multiple files allowed for Java projects)</div>
      </div>
      <input
        ref={inputRef}
        type="file"
        multiple
        style={{ display: "none" }}
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  );
}
