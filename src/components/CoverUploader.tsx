"use client";

import { useState, useRef, useCallback } from "react";
import { Camera, Upload, ClipboardPaste, X, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

interface CoverUploaderProps {
  currentCover: string; // current cover_url
  onCoverChange: (url: string, isUploading: boolean) => void;
  filename?: string; // base filename for R2
}

export function CoverUploader({ currentCover, onCoverChange, filename }: CoverUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadFile = useCallback(
    async (file: File, source: string) => {
      if (!file.type.startsWith("image/")) {
        toast.error("File harus gambar (JPG, PNG, WebP)");
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error("Ukuran gambar maksimal 10MB");
        return;
      }

      setUploading(true);
      onCoverChange(currentCover, true);

      try {
        const formData = new FormData();
        formData.append("file", file);
        if (filename) formData.append("filename", filename);

        const res = await fetch("/api/upload-cover", {
          method: "POST",
          body: formData,
        });
        const data = await res.json();
        if (res.ok && data.url) {
          onCoverChange(data.url, false);
          toast.success(`Cover dari ${source} diupload!`);
        } else {
          throw new Error(data.error || "Upload gagal");
        }
      } catch (e: any) {
        toast.error(e.message || "Gagal upload cover");
        onCoverChange(currentCover, false);
      } finally {
        setUploading(false);
      }
    },
    [currentCover, filename, onCoverChange]
  );

  const uploadBase64 = useCallback(
    async (base64: string) => {
      setUploading(true);
      onCoverChange(currentCover, true);
      try {
        const res = await fetch("/api/upload-cover", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ base64, filename }),
        });
        const data = await res.json();
        if (res.ok && data.url) {
          onCoverChange(data.url, false);
          toast.success("Cover dari clipboard diupload!");
        } else {
          throw new Error(data.error || "Upload gagal");
        }
      } catch (e: any) {
        toast.error(e.message || "Gagal upload cover");
        onCoverChange(currentCover, false);
      } finally {
        setUploading(false);
      }
    },
    [currentCover, filename, onCoverChange]
  );

  // Handle paste from clipboard
  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith("image/")) {
          e.preventDefault();
          const file = items[i].getAsFile();
          if (file) {
            const reader = new FileReader();
            reader.onload = () => {
              if (typeof reader.result === "string") {
                uploadBase64(reader.result);
              }
            };
            reader.readAsDataURL(file);
          }
          return;
        }
      }
    },
    [uploadBase64]
  );

  // Handle file drop
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files?.[0];
      if (file) uploadFile(file, "drag & drop");
    },
    [uploadFile]
  );

  // Handle file picker
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file, "file picker");
    // Reset so same file can be picked again
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Handle camera capture
  const handleCamera = () => {
    if (fileInputRef.current) {
      fileInputRef.current.setAttribute("capture", "environment");
      fileInputRef.current.click();
      // Reset capture attribute after click
      setTimeout(() => {
        fileInputRef.current?.removeAttribute("capture");
      }, 1000);
    }
  };

  return (
    <div className="space-y-3" onPaste={handlePaste}>
      <label className="label">Cover Buku</label>

      {/* Cover Preview + Upload Zone */}
      <div
        className={`relative w-full aspect-[2/3] max-w-[200px] rounded-xl border-2 border-dashed transition-colors overflow-hidden ${
          dragOver
            ? "border-brand-500 bg-brand-50"
            : currentCover
            ? "border-transparent"
            : "border-brand-200 bg-brand-50/50"
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        {currentCover ? (
          <>
            <img
              src={currentCover}
              alt="Cover Buku"
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
            {/* Clear button */}
            <button
              type="button"
              onClick={() => onCoverChange("", false)}
              className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white rounded-full p-1 transition"
              title="Hapus cover"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-brand-400">
            {uploading ? (
              <>
                <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
                <span className="text-xs">Mengupload...</span>
              </>
            ) : (
              <>
                <Upload className="w-8 h-8 text-brand-300" />
                <span className="text-xs text-center px-2">
                  📋 Paste / 📸 Kamera / 📁 Pilih
                </span>
              </>
            )}
          </div>
        )}

        {/* Upload loading overlay */}
        {uploading && currentCover && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-white" />
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleCamera}
          disabled={uploading}
          className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1"
        >
          <Camera className="w-3.5 h-3.5" />
          Kamera
        </button>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1"
        >
          <Upload className="w-3.5 h-3.5" />
          Pilih File
        </button>
        <span className="text-xs text-brand-400 self-center ml-auto">
          📋 Paste dari clipboard
        </span>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}
