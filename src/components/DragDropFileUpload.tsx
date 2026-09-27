import React, { useState, useRef } from 'react';
import clsx from 'clsx';
import { UploadCloud } from 'lucide-react';
import s from './DragDropFileUpload.module.css';

interface DragDropFileUploadProps {
  onFilesSelected: (files: FileList | null) => void;
  multiple?: boolean;
  accept?: string;
  disabled?: boolean;
  icon?: React.ReactNode;
  text?: React.ReactNode;
  subText?: React.ReactNode;
  containerStyle?: React.CSSProperties;
  /** A custom class renders only `text` inside it (a compact trigger); omit it for the standard drop zone. */
  className?: string;
}

/** Click-or-drop file picker. The invisible native input covers the area, so it works with keyboard and touch too. */
export default function DragDropFileUpload({
  onFilesSelected,
  multiple = false,
  accept = "*",
  disabled = false,
  icon,
  text = <span>Upload files</span>,
  subText,
  containerStyle,
  className,
}: DragDropFileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const isDropzone = !className;

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
      className={clsx(isDropzone ? s.dropzone : className, s.root, isDragging && s.dragging, disabled && s.disabled)}
      style={containerStyle}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isDropzone ? (
        <>
          <span className={s.icon} aria-hidden="true">{icon ?? <UploadCloud />}</span>
          <span className={s.text}>
            <span className={s.primary}>{text}</span>
            <span className={s.secondary}>
              {isDragging ? 'Drop to add' : 'Drag and drop, or click to browse'}
              {subText && <> · {subText}</>}
            </span>
          </span>
        </>
      ) : (
        <>{text}</>
      )}
      <input
        ref={inputRef}
        type="file"
        className={s.input}
        multiple={multiple}
        accept={accept}
        onChange={handleChange}
        disabled={disabled}
      />
    </div>
  );
}
