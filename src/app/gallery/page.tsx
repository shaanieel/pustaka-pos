"use client";
export const dynamic = "force-dynamic";
export const runtime = "edge";

import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, Plus, Trash2, Loader2, ImageIcon, MoveUp, MoveDown, Upload, X, Check } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

type GalleryType = "testimoni" | "amanah";

interface GalleryItem {
  id: string;
  type: GalleryType;
  image_url: string;
  caption: string | null;
  sort_order: number;
  created_at: string;
}

interface PendingFile {
  file: File;
  preview: string;
  caption: string;
  uploading: boolean;
  done: boolean;
  error?: string;
}

const TABS: { key: GalleryType; label: string; desc: string }[] = [
  { key: "testimoni", label: "Testimoni", desc: "Foto testimoni pelanggan" },
  { key: "amanah", label: "Amanah", desc: "Foto pengiriman & kepercayaan" },
];

export default function GalleryAdminPage() {
  const [activeTab, setActiveTab] = useState<GalleryType>("testimoni");
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingAll, setUploadingAll] = useState(false);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("gallery_items")
        .select("*")
        .eq("type", activeTab)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      setItems(data || []);
    } catch (err: any) {
      toast.error(err.message || "Gagal memuat galeri");
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  // Handle file select — add to pending list
  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const newPending: PendingFile[] = files.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
      caption: "",
      uploading: false,
      done: false,
    }));

    setPendingFiles((prev) => [...prev, ...newPending]);
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  // Remove pending file
  function removePending(index: number) {
    setPendingFiles((prev) => {
      const next = [...prev];
      URL.revokeObjectURL(next[index].preview);
      next.splice(index, 1);
      return next;
    });
  }

  // Update caption for pending file
  function updatePendingCaption(index: number, caption: string) {
    setPendingFiles((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], caption };
      return next;
    });
  }

  // Upload ALL pending files
  async function uploadAll() {
    if (pendingFiles.filter((p) => !p.done).length === 0) {
      toast.error("Tidak ada foto baru untuk diupload");
      return;
    }

    setUploadingAll(true);
    const maxOrder = items.reduce((max, item) => Math.max(max, item.sort_order), -1);

    for (let i = 0; i < pendingFiles.length; i++) {
      if (pendingFiles[i].done) continue;

      // Mark as uploading
      setPendingFiles((prev) => {
        const next = [...prev];
        next[i] = { ...next[i], uploading: true };
        return next;
      });

      try {
        const pf = pendingFiles[i];
        const ext = pf.file.name.split(".").pop();

        // Upload via API route (pake service key — bypass RLS)
        const formData = new FormData();
        formData.append("file", pf.file);
        formData.append("type", activeTab);
        formData.append("caption", pf.caption.trim());
        formData.append("sort_order", String(maxOrder + i + 1));

        const uploadRes = await fetch("/api/upload-gallery", {
          method: "POST",
          body: formData,
        });

        if (!uploadRes.ok) {
          const errData = await uploadRes.json().catch(() => ({}));
          throw new Error(errData.error || errData.detail || `HTTP ${uploadRes.status}`);
        }

        const result = await uploadRes.json();

        // Mark as done
        setPendingFiles((prev) => {
          const next = [...prev];
          next[i] = { ...next[i], uploading: false, done: true };
          return next;
        });
      } catch (err: any) {
        setPendingFiles((prev) => {
          const next = [...prev];
          next[i] = { ...next[i], uploading: false, error: err.message || "Gagal upload" };
          return next;
        });
      }
    }

    setUploadingAll(false);

    // Count success
    const doneCount = pendingFiles.filter((p) => p.done).length + 
      pendingFiles.filter((p, idx) => {
        // re-count after state updates
        return false;
      }).length;

    toast.success("Upload selesai! Refresh daftar...");
    // Clear done files after a delay
    setTimeout(() => {
      setPendingFiles((prev) => prev.filter((p) => !p.done));
    }, 1500);
    fetchItems();
  }

  // Clear all pending
  function clearPending() {
    pendingFiles.forEach((p) => URL.revokeObjectURL(p.preview));
    setPendingFiles([]);
  }

  async function handleDelete(id: string, imageUrl: string) {
    if (!confirm("Hapus foto ini?")) return;
    try {
      const pathMatch = imageUrl.match(/gallery\/(testimoni|amanah)\/[^?]+/);
      if (pathMatch) {
        try { await supabase.storage.from("gallery").remove([pathMatch[0]]); } catch {}
      }

      const { error } = await supabase.from("gallery_items").delete().eq("id", id);
      if (error) throw error;

      toast.success("Foto dihapus");
      fetchItems();
    } catch (err: any) {
      toast.error(err.message || "Gagal hapus foto");
    }
  }

  async function handleMoveUp(index: number, item: GalleryItem) {
    if (index <= 0) return;
    const newItems = [...items];
    const temp = newItems[index].sort_order;
    newItems[index].sort_order = newItems[index - 1].sort_order;
    newItems[index - 1].sort_order = temp;
    [newItems[index], newItems[index - 1]] = [newItems[index - 1], newItems[index]];
    setItems(newItems);

    await supabase.from("gallery_items").upsert([
      { id: newItems[index].id, sort_order: newItems[index].sort_order },
      { id: newItems[index - 1].id, sort_order: newItems[index - 1].sort_order },
    ]);
  }

  async function handleMoveDown(index: number, item: GalleryItem) {
    if (index >= items.length - 1) return;
    await handleMoveUp(index + 1, items[index + 1]);
  }

  return (
    <div className="max-w-3xl mx-auto space-y-4 pb-6">
      {/* Header */}
      <div className="flex items-center gap-3 sticky top-0 bg-white/95 backdrop-blur-sm z-10 py-2 -mx-2 px-2">
        <Link href="/" className="btn-ghost p-2 -ml-2 shrink-0">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold text-brand-900">Galeri Website</h1>
          <p className="text-xs text-brand-400 truncate">Kelola foto Testimoni & Amanah Terpercaya</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              activeTab === tab.key
                ? "bg-brand-600 text-white shadow-sm"
                : "bg-brand-50 text-brand-600 hover:bg-brand-100"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Upload Area */}
      <div className="card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-brand-800">
            <Upload className="w-4 h-4 text-brand-600" />
            Tambah Foto
          </div>
          <span className="text-[10px] text-brand-400">Pilih banyak sekaligus</span>
        </div>

        {/* Drop zone */}
        <label 
          className="flex flex-col items-center justify-center gap-2 px-4 py-6 rounded-xl border-2 border-dashed border-brand-300 hover:border-brand-500 bg-brand-50/30 hover:bg-brand-50 cursor-pointer transition-all active:scale-[0.98]"
        >
          <ImageIcon className="w-8 h-8 text-brand-400" />
          <span className="text-sm font-medium text-brand-600">Ketuk untuk pilih foto</span>
          <span className="text-[10px] text-brand-400">JPG, PNG, WebP — bisa pilih banyak</span>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
        </label>

        {/* Pending files preview */}
        {pendingFiles.length > 0 && (
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-brand-700">
                {pendingFiles.length} foto siap upload
              </span>
              <div className="flex gap-2">
                <button
                  onClick={clearPending}
                  className="text-xs text-red-500 hover:text-red-700 font-medium"
                >
                  Batal Semua
                </button>
                <button
                  onClick={uploadAll}
                  disabled={uploadingAll}
                  className="px-3 py-1.5 rounded-lg bg-brand-600 text-white text-xs font-semibold hover:bg-brand-700 disabled:opacity-50 flex items-center gap-1"
                >
                  {uploadingAll ? (
                    <><Loader2 className="w-3 h-3 animate-spin" /> Upload...</>
                  ) : (
                    <><Upload className="w-3 h-3" /> Upload Semua</>
                  )}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {pendingFiles.map((pf, index) => (
                <div
                  key={index}
                  className={`relative rounded-lg overflow-hidden border-2 ${
                    pf.done ? "border-green-400" : pf.error ? "border-red-300" : pf.uploading ? "border-brand-400 animate-pulse" : "border-brand-200"
                  }`}
                >
                  <img
                    src={pf.preview}
                    alt={`Preview ${index + 1}`}
                    className="w-full aspect-square object-cover"
                  />
                  {pf.uploading && (
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                      <Loader2 className="w-5 h-5 text-white animate-spin" />
                    </div>
                  )}
                  {pf.done && (
                    <div className="absolute inset-0 bg-green-500/30 flex items-center justify-center">
                      <Check className="w-5 h-5 text-white" />
                    </div>
                  )}
                  {pf.error && (
                    <div className="absolute inset-0 bg-red-500/30 flex items-center justify-center">
                      <X className="w-5 h-5 text-white" />
                    </div>
                  )}
                  {!pf.done && (
                    <button
                      onClick={() => removePending(index)}
                      className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-red-500 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Caption inputs for pending */}
            <div className="space-y-1.5 max-h-32 overflow-y-auto">
              {pendingFiles.filter((p) => !p.done).map((pf, index) => (
                <input
                  key={index}
                  type="text"
                  value={pf.caption}
                  onChange={(e) => updatePendingCaption(index, e.target.value)}
                  placeholder={`Keterangan foto #${index + 1}...`}
                  className="input-field text-xs py-1.5"
                  disabled={pf.uploading}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Item List */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 text-brand-400 animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="card p-10 text-center text-brand-400">
          <ImageIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">Belum ada foto</p>
          <p className="text-xs mt-1">Pilih foto di atas untuk mulai</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item, index) => (
            <div
              key={item.id}
              className="card p-2.5 flex items-center gap-3 active:bg-brand-50/60"
            >
              {/* Move buttons */}
              <div className="flex flex-col gap-0.5">
                <button
                  onClick={() => handleMoveUp(index, item)}
                  disabled={index === 0}
                  className="p-0.5 disabled:opacity-20 hover:text-brand-600"
                >
                  <MoveUp className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleMoveDown(index, item)}
                  disabled={index >= items.length - 1}
                  className="p-0.5 disabled:opacity-20 hover:text-brand-600"
                >
                  <MoveDown className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Thumbnail */}
              <div className="w-14 h-14 rounded-lg overflow-hidden bg-brand-50 shrink-0">
                <img
                  src={item.image_url}
                  alt={item.caption || ""}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-brand-800 truncate">
                  {item.caption || "Tanpa keterangan"}
                </p>
                <p className="text-[10px] text-brand-400">
                  #{item.sort_order + 1} · {new Date(item.created_at).toLocaleDateString("id-ID")}
                </p>
              </div>

              {/* Delete */}
              <button
                onClick={() => handleDelete(item.id, item.image_url)}
                className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all active:scale-90"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
