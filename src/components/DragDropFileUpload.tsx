import React, { useState, useRef } from 'react';

interface DragDropFileUploadProps {
  onFilesSelected: (files: FileList | null) => void;
  multiple?: boolean;
  accept?: string;
  disabled?: boolean;
  icon?: React.ReactNode;
  text?: React.ReactNode;
  subText?: React.ReactNode;
  containerStyle?: React.CSSProperties;
  className?: string;
}

export default function DragDropFileUpload({
  onFilesSelected,
  multiple = false,
  accept = "*",
  disabled = false,
  icon = "+",
  text = <span>Upload files</span>,
  subText,
  containerStyle = {},
  className = "upload-area",
}: DragDropFileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      e.dataTransfer.dropEffect = 'copy';
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      // Create a new DataTransfer object to simulate a FileList
      const dt = new DataTransfer();
      if (multiple) {
        Array.from(e.dataTransfer.files).forEach(file => dt.items.add(file));
      } else {
        dt.items.add(e.dataTransfer.files[0]);
      }
      
      onFilesSelected(dt.files);
      
      // Reset input value to allow selecting the same file again if needed
      if (inputRef.current) {
        inputRef.current.files = dt.files;
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;
    onFilesSelected(e.target.files);
  };

  return (
    <div
      className={`${className} ${isDragging ? 'dragging' : ''}`}
      style={{
        position: 'relative',
        transition: 'all 0.2s ease',
        borderColor: isDragging ? 'var(--primary)' : undefined,
        backgroundColor: isDragging ? 'rgba(37, 99, 235, 0.05)' : undefined,
        opacity: disabled ? 0.6 : 1,
        pointerEvents: disabled ? 'none' : 'auto',
        ...containerStyle,
      }}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {className === 'upload-area' ? (
        <>
          <div className="upload-icon">{icon}</div>
          <div className="upload-text">
            {text} {subText && <span style={{ color: 'var(--muted)', fontSize: '0.9em' }}>{subText}</span>}
          </div>
        </>
      ) : (
        <>{text}</>
      )}
      <input
        ref={inputRef}
        type="file"
        multiple={multiple}
        accept={accept}
        onChange={handleChange}
        disabled={disabled}
        style={{
          opacity: 0,
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          cursor: disabled ? 'default' : 'pointer',
        }}
      />
    </div>
  );
}
