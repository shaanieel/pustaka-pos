"use client";
export const dynamic = "force-dynamic";
export const runtime = "edge";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, Plus, Trash2, GripVertical, Loader2, ImageIcon, MoveUp, MoveDown } from "lucide-react";
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

const TABS: { key: GalleryType; label: string }[] = [
  { key: "testimoni", label: "Testimoni" },
  { key: "amanah", label: "Amanah Terpercaya" },
];

export default function GalleryAdminPage() {
  const [activeTab, setActiveTab] = useState<GalleryType>("testimoni");
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [newCaption, setNewCaption] = useState("");

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

  async function handleUpload(file: File) {
    if (!file) return;

    setUploading(true);
    try {
      // Upload ke Supabase Storage
      const ext = file.name.split(".").pop();
      const fileName = `gallery/${activeTab}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("gallery")
        .upload(fileName, file, {
          cacheControl: "31536000",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("gallery")
        .getPublicUrl(fileName);

      const imageUrl = urlData?.publicUrl || "";

      if (!imageUrl) throw new Error("Gagal mendapatkan URL foto");

      // Simpan ke database
      const maxOrder = items.reduce((max, item) => Math.max(max, item.sort_order), -1);

      const { error: dbError } = await supabase.from("gallery_items").insert({
        type: activeTab,
        image_url: imageUrl,
        caption: newCaption.trim() || null,
        sort_order: maxOrder + 1,
      });

      if (dbError) throw dbError;

      toast.success("Foto berhasil ditambahkan!");
      setNewCaption("");
      fetchItems();
    } catch (err: any) {
      toast.error(err.message || "Gagal upload foto");
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(id: string, imageUrl: string) {
    try {
      // Hapus dari storage
      const pathMatch = imageUrl.match(/gallery\/(testimoni|amanah)\/[^?]+/);
      if (pathMatch) {
        await supabase.storage.from("gallery").remove([pathMatch[0]]);
      }

      // Hapus dari DB
      const { error } = await supabase.from("gallery_items").delete().eq("id", id);
      if (error) throw error;

      toast.success("Foto dihapus");
      fetchItems();
    } catch (err: any) {
      toast.error(err.message || "Gagal hapus foto");
    }
  }

  async function handleMoveUp(index: number) {
    if (index <= 0) return;
    const newItems = [...items];
    // Swap sort_order
    const temp = newItems[index].sort_order;
    newItems[index].sort_order = newItems[index - 1].sort_order;
    newItems[index - 1].sort_order = temp;
    // Swap positions
    [newItems[index], newItems[index - 1]] = [newItems[index - 1], newItems[index]];
    setItems(newItems);

    // Update DB
    const { error } = await supabase.from("gallery_items").upsert([
      { id: newItems[index].id, sort_order: newItems[index].sort_order },
      { id: newItems[index - 1].id, sort_order: newItems[index - 1].sort_order },
    ]);
    if (error) console.error(error);
  }

  async function handleMoveDown(index: number) {
    if (index >= items.length - 1) return;
    await handleMoveUp(index + 1);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
    e.target.value = "";
  }

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/" className="btn-ghost p-2 -ml-2">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className="page-title">Galeri Website</h1>
          <p className="page-subtitle">Kelola foto Testimoni & Amanah Terpercaya</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              activeTab === tab.key
                ? "bg-brand-600 text-white shadow-sm"
                : "bg-brand-50 text-brand-600 hover:bg-brand-100"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Upload Form */}
      <div className="card p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-brand-800">
          <Plus className="w-4 h-4 text-brand-600" />
          Tambah Foto Baru
        </div>
        <input
          type="text"
          value={newCaption}
          onChange={(e) => setNewCaption(e.target.value)}
          placeholder="Keterangan foto (opsional, contoh: Pengiriman ke Ponpes Riau)"
          className="input-field text-sm"
        />
        <label className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed border-brand-300 hover:border-brand-500 bg-brand-50/50 hover:bg-brand-50 cursor-pointer transition-all">
          {uploading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin text-brand-600" />
              <span className="text-sm font-medium text-brand-600">Mengupload...</span>
            </>
          ) : (
            <>
              <ImageIcon className="w-5 h-5 text-brand-600" />
              <span className="text-sm font-medium text-brand-600">Pilih foto untuk diupload</span>
            </>
          )}
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
            disabled={uploading}
          />
        </label>
        <p className="text-[10px] text-brand-400">
          Format: JPG, PNG, WebP. Foto akan otomatis tampil di website store.
        </p>
      </div>

      {/* Item List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 text-brand-400 animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="card p-8 text-center text-brand-400">
          <ImageIcon className="w-10 h-10 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Belum ada foto untuk {activeTab === "testimoni" ? "Testimoni" : "Amanah Terpercaya"}</p>
          <p className="text-xs mt-1">Upload foto di atas untuk memulai</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item, index) => (
            <div
              key={item.id}
              className="card p-3 flex items-center gap-3"
            >
              {/* Drag handle */}
              <div className="flex flex-col gap-0.5 text-brand-300">
                <button
                  onClick={() => handleMoveUp(index)}
                  disabled={index === 0}
                  className="disabled:opacity-20 hover:text-brand-600"
                >
                  <MoveUp className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleMoveDown(index)}
                  disabled={index >= items.length - 1}
                  className="disabled:opacity-20 hover:text-brand-600"
                >
                  <MoveDown className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Thumbnail */}
              <div className="w-16 h-16 rounded-lg overflow-hidden bg-brand-50 shrink-0">
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
                  Urutan: {item.sort_order} · {new Date(item.created_at).toLocaleDateString("id-ID")}
                </p>
              </div>

              {/* Delete */}
              <button
                onClick={() => handleDelete(item.id, item.image_url)}
                className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
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
