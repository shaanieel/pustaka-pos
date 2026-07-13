"use client";

import { useState, useRef, useCallback } from "react";
import { Camera, Upload, X, Loader2, Sparkles, CheckCircle2, Edit3 } from "lucide-react";
import toast from "react-hot-toast";
import { compressImage, deleteCoverFromR2 } from "@/lib/compress";
import { CoverEditor } from "./CoverEditor";

interface CoverUploaderProps {
  currentCover: string;
  onCoverChange: (url: string, isUploading: boolean) => void;
  filename?: string;
}

type Stage = "idle" | "compressing" | "processing" | "uploading" | "done" | "error";

export function CoverUploader({
  currentCover,
  onCoverChange,
  filename,
}: CoverUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [stage, setStage] = useState<Stage>("idle");
  const [stageMsg, setStageMsg] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Editor state
  const [editorFile, setEditorFile] = useState<File | Blob | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [fileKey, setFileKey] = useState(0);

  // Handle file after editor
  const handleEditedFile = useCallback(
    (blob: Blob) => {
      setShowEditor(false);
      setEditorFile(null);
      uploadToR2(blob, "edited");
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentCover, filename, onCoverChange]
  );

  const uploadToR2 = useCallback(
    async (file: File | Blob, source: string) => {
      if (!file.type.startsWith("image/")) {
        toast.error("File harus gambar (JPG, PNG, WebP)");
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error("Ukuran gambar maksimal 10MB");
        return;
      }

      setUploading(true);
      setStage("compressing");
      setStageMsg("Mengompres gambar...");
      onCoverChange(currentCover, true);

      try {
        // 1. Kompres gambar (maks 200KB)
        const compressed = await compressImage(file, 200);

        // 2. Hapus foto lama dari R2 (kalau ada)
        if (currentCover && currentCover.startsWith("/api/cover/")) {
          await deleteCoverFromR2(currentCover);
        }

        // 3. Kirim ke server — AI pipeline + upload R2
        setStage("processing");
        setStageMsg("Mengompres gambar...");

        const formData = new FormData();
        formData.append("file", compressed, "cover.jpg");
        if (filename) formData.append("filename", filename);

        const res = await fetch("/api/upload-cover", {
          method: "POST",
          body: formData,
        });

        const data = await res.json();

        if (!res.ok || data.error) {
          throw new Error(data.error || `HTTP ${res.status}`);
        }

        if (data.url) {
          setStage("uploading");
          setStageMsg("Selesai — cover siap!");
          const kb = Math.round(compressed.size / 1024);
          console.log(
            `Upload selesai: ${kb}KB dari ${Math.round(file.size / 1024)}KB` +
              (data.processed ? " (AI processed)" : " (direct)")
          );
          onCoverChange(data.url, false);
          setStage("done");
          setTimeout(() => setStage("idle"), 2000);
          toast.success(`Cover dari ${source} siap!`);
        } else {
          throw new Error("Gagal mendapatkan URL");
        }
      } catch (e: any) {
        setStage("error");
        toast.error(e.message || "Gagal upload cover");
        onCoverChange(currentCover, false);
        setTimeout(() => setStage("idle"), 2000);
      } finally {
        setUploading(false);
      }
    },
    [currentCover, filename, onCoverChange]
  );

  // Open editor with file
  const openEditor = useCallback((file: File | Blob) => {
    setEditorFile(file);
    setFileKey(k => k + 1);
    setShowEditor(true);
  }, []);

  // Handle hapus cover (X button)
  const handleClear = useCallback(async () => {
    if (currentCover && currentCover.startsWith("/api/cover/")) {
      await deleteCoverFromR2(currentCover);
    }
    onCoverChange("", false);
  }, [currentCover, onCoverChange]);

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
            openEditor(file);
          }
          return;
        }
      }
    },
    [openEditor]
  );

  // Handle file drop
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files?.[0];
      if (file) openEditor(file);
    },
    [openEditor]
  );

  // Handle file picker
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) openEditor(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Handle camera capture
  const handleCamera = () => {
    if (fileInputRef.current) {
      fileInputRef.current.setAttribute("capture", "environment");
      fileInputRef.current.click();
      setTimeout(() => {
        fileInputRef.current?.removeAttribute("capture");
      }, 1000);
    }
  };

  // Re-edit existing cover
  const handleEditExisting = async () => {
    if (!currentCover) return;
    // Download current cover to re-edit
    try {
      toast.loading("Memuat cover untuk diedit...", { id: "load-edit" });
      const res = await fetch(currentCover);
      const blob = await res.blob();
      toast.dismiss("load-edit");
      openEditor(blob);
    } catch {
      toast.error("Gagal memuat cover");
    }
  };

  const getStageIndicator = () => {
    const stages: { key: Stage; label: string }[] = [
      { key: "compressing", label: "Mengompres" },
      { key: "processing", label: "Mengompres" },
      { key: "uploading", label: "Upload R2" },
    ];

    const currentIdx = stages.findIndex((s) => s.key === stage);

    return (
      <div className="flex flex-col gap-1.5 w-full px-1">
        {stages.map((s, i) => {
          let icon = <div className="w-2 h-2 rounded-full bg-brand-200" />;
          let textClass = "text-brand-400";
          let barColor = "bg-brand-200";

          if (stage === s.key || stage === "done") {
            icon = <div className="w-2 h-2 rounded-full bg-brand-500" />;
            textClass = "text-brand-700 font-medium";
            barColor = "bg-brand-500";
          }
          if (i < currentIdx || stage === "done") {
            icon = <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />;
            barColor = "bg-green-500";
          }

          return (
            <div key={s.key} className="flex items-center gap-2 text-xs">
              <div className="flex flex-col items-center gap-0.5">
                {icon}
                {i < stages.length - 1 && (
                  <div className={`w-0.5 h-3 ${i < currentIdx || stage === "done" ? "bg-green-500" : "bg-brand-200"}`} />
                )}
              </div>
              <span className={textClass}>{s.label}</span>
            </div>
          );
        })}
      </div>
    );
  };

  // Show editor modal
  if (showEditor && editorFile) {
    return (
      <div className="space-y-3">
        <label className="label">Edit Cover Buku</label>
        <div className="card p-4">
          <CoverEditor
            key={fileKey}
            imageFile={editorFile}
            onSave={handleEditedFile}
            onCancel={() => {
              setShowEditor(false);
              setEditorFile(null);
            }}
          />
        </div>
      </div>
    );
  }

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
            {/* Edit + Clear buttons */}
            <div className="absolute top-2 right-2 flex gap-1">
              <button
                type="button"
                onClick={handleEditExisting}
                className="bg-black/60 hover:bg-black/80 text-white rounded-full p-1 transition"
                title="Edit cover"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleClear}
                className="bg-black/60 hover:bg-black/80 text-white rounded-full p-1 transition"
                title="Hapus cover"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-brand-400">
            {uploading ? (
              <div className="flex flex-col items-center gap-1">
                <div className="flex items-center gap-1">
                  <Sparkles className="w-4 h-4 text-brand-500 animate-pulse" />
                  <span className="text-xs font-medium text-brand-700">
                    {stageMsg}
                  </span>
                </div>
                {getStageIndicator()}
              </div>
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

        {/* Upload loading overlay — ringkas */}
        {uploading && currentCover && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <div className="flex flex-col items-center gap-1">
              <Sparkles className="w-5 h-5 animate-pulse text-white" />
              <span className="text-[10px] text-white/90">{stageMsg}</span>
            </div>
          </div>
        )}
      </div>

      {/* Stage progress bar — horizontal (visible when uploading) */}
      {uploading && stage !== "done" && (
        <div className="flex items-center gap-2 max-w-[200px]">
          <div className="flex-1 h-1.5 bg-brand-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-brand-500 rounded-full transition-all duration-500"
              style={{
                width:
                  stage === "compressing"
                    ? "20%"
                    : stage === "processing"
                      ? "60%"
                      : "90%",
              }}
            />
          </div>
          <span className="text-[10px] text-brand-500 font-medium whitespace-nowrap">
            {stage === "compressing"
              ? "Mengompres..."
              : stage === "processing"
                ? "AI Processing..."
                : "Selesai..."}
          </span>
        </div>
      )}

      {stage === "done" && (
        <div className="flex items-center gap-1.5 max-w-[200px]">
          <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
          <span className="text-xs text-green-600 font-medium">Cover siap!</span>
        </div>
      )}

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
        {currentCover && (
          <button
            type="button"
            onClick={handleEditExisting}
            disabled={uploading}
            className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1"
          >
            <Edit3 className="w-3.5 h-3.5" />
            Edit
          </button>
        )}
        {uploading && (
          <span className="text-xs text-brand-500 self-center ml-auto flex items-center gap-1">
            <Loader2 className="w-3 h-3 animate-spin" />
            {stageMsg}
          </span>
        )}
        {!uploading && !currentCover && (
          <span className="text-xs text-brand-400 self-center ml-auto">
            📋 Paste dari clipboard
          </span>
        )}
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
