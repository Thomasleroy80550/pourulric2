"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Trash2, UploadCloud, Image as ImageIcon, Video as VideoIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface HousekeepingMediaUploaderProps {
  files: File[];
  onChange: (files: File[]) => void;
  className?: string;
}

const HousekeepingMediaUploader: React.FC<HousekeepingMediaUploaderProps> = ({ files, onChange, className }) => {
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = e.target.files;
    if (!list) return;
    const newFiles = Array.from(list);
    onChange([...(files || []), ...newFiles]);
    // Clear input value to allow re-selecting same file names
    if (inputRef.current) inputRef.current.value = "";
  };

  const removeFile = (index: number) => {
    const next = [...files];
    next.splice(index, 1);
    onChange(next);
  };

  const clearAll = () => {
    onChange([]);
  };

  const isVideo = (file: File) => file.type.startsWith("video/");
  const isImage = (file: File) => file.type.startsWith("image/");

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
          <UploadCloud className="h-4 w-4" />
          <span>Importer des photos ou vidéos (jpeg, png, mp4...)</span>
        </div>
        {files.length > 0 && (
          <Button type="button" variant="ghost" size="sm" onClick={clearAll} className="h-auto px-2">
            <Trash2 className="h-4 w-4 mr-1" />
            Tout retirer
          </Button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        onChange={handleFileSelect}
        className="block w-full text-sm text-muted-foreground file:mr-4 file:rounded-md file:border-0 file:bg-primary file:px-4 file:py-2 file:text-primary-foreground hover:file:bg-primary/90"
      />

      {files.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {files.map((file, idx) => (
            <div key={idx} className="relative group border rounded-md overflow-hidden bg-muted">
              <button
                type="button"
                onClick={() => removeFile(idx)}
                className="absolute top-2 right-2 z-10 rounded-full bg-black/50 text-white p-1 opacity-0 group-hover:opacity-100 transition"
                aria-label="Supprimer"
              >
                <Trash2 className="h-4 w-4" />
              </button>
              <div className="aspect-video w-full h-full flex items-center justify-center">
                {isImage(file) && (
                  <img
                    src={URL.createObjectURL(file)}
                    alt={file.name}
                    className="w-full h-full object-cover"
                  />
                )}
                {isVideo(file) && (
                  <video
                    src={URL.createObjectURL(file)}
                    className="w-full h-full object-cover"
                    controls
                    preload="metadata"
                  />
                )}
                {!isImage(file) && !isVideo(file) && (
                  <div className="flex flex-col items-center justify-center text-muted-foreground p-4">
                    <ImageIcon className="h-6 w-6 mb-1" />
                    <VideoIcon className="h-6 w-6" />
                    <span className="text-xs mt-2 truncate max-w-[90%]">{file.name}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default HousekeepingMediaUploader;