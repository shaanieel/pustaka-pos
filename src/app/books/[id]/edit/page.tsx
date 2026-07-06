"use client";

export const dynamic = "force-dynamic";
export const runtime = "edge";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Save, Trash2, ScanLine, Hash, Barcode } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import { BarcodeLabel } from "@/components/BarcodeLabel";
import { ConfirmModal } from "@/components/ConfirmModal";
import { ScannerButton } from "@/components/ScannerButton";
import { CoverUploader } from "@/components/CoverUploader";
import { CategoryPicker } from "@/components/CategoryPicker";
import { deleteCoverFromR2 } from "@/lib/compress";
import { getCategoryPrefix } from "@/lib/categories";

export default function EditBookPage() {
  const router = useRouter();
  const params = useParams();
  const bookId = params.id as string;

  const [form, setForm] = useState({
    title: "", author: "", isbn: "", price: "", stock: "",
    category: "", publisher: "", cover_url: "", year: "", book_code: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [coverUploading, setCoverUploading] = useState(false);

  useEffect(() => {
    loadBook();
  }, [bookId]);

  async function loadBook() {
    try {
      const { data, error } = await supabase
        .from("books").select("*").eq("id", bookId).single();
      if (error) throw error;
      if (data) {
        setForm({
          title: data.title || "",
          author: data.author || "",
          isbn: data.isbn || "",
          price: String(data.price || ""),
          stock: String(data.stock || ""),
          category: data.category || "",
          publisher: data.publisher || "",
          cover_url: data.cover_url || "",
          year: data.year ? String(data.year) : "",
          book_code: data.book_code || "",
        });
      }
    } catch (err: any) {
      toast.error("Buku tidak ditemukan");
      router.push("/books");
    } finally {
      setLoading(false);
    }
  }

  // ── SCAN BARCODE HANDLER (Model 1: Edit Buku) ──
  const handleScannedISBN = useCallback(async (isbn: string) => {
    toast.loading(`Mencari buku ISBN: ${isbn}...`, { id: "scan-search" });
    try {
      const res = await fetch(`/api/search-books?isbn=${encodeURIComponent(isbn)}`);
      const data = await res.json();
      toast.dismiss("scan-search");

      const result = data.results?.[0];
      if (result) {
        toast.success(`${result.title} — data dari Google Books diterapkan!`);

        let r2CoverUrl = result.coverUrl || "";
        if (result.coverUrl) {
          try {
            const upRes = await fetch("/api/upload-cover", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ imageUrl: result.coverUrl, filename: isbn }),
            });
            if (upRes.ok) {
              const upData = await upRes.json();
              if (upData.url) r2CoverUrl = upData.url;
            }
          } catch {}
        }

        setForm((prev) => ({
          ...prev,
          title: result.title,
          author: result.author,
          isbn: result.isbn || isbn,
          publisher: result.publisher || prev.publisher,
          cover_url: r2CoverUrl || prev.cover_url,
          year: result.year?.toString() || prev.year,
        }));
      } else {
        toast("Buku tidak ditemukan di Google Books. ISBN tetap terdaftar.", {
          icon: "📚",
          duration: 5000,
        });
        setForm((prev) => ({ ...prev, isbn: isbn }));
      }
    } catch {
      toast.dismiss("scan-search");
      toast.error("Gagal mencari buku. Coba lagi.");
      setForm((prev) => ({ ...prev, isbn: isbn }));
    }
  }, []);

  // ── AUTO-GENERATE BOOK CODE dari kategori ──
  async function generateBookCode(category: string) {
    if (!category) return;
    const prefix = getCategoryPrefix(category);
    try {
      const { data } = await supabase
        .from("books")
        .select("book_code")
        .like("book_code", `${prefix}%`);

      let maxNum = 0;
      if (data) {
        for (const row of data) {
          if (!row.book_code) continue;
          const numStr = row.book_code.replace(prefix, "");
          const num = parseInt(numStr) || 0;
          if (num > maxNum) maxNum = num;
        }
      }
      const nextNum = maxNum + 1;
      updateField("book_code", `${prefix}${String(nextNum).padStart(4, "0")}`);
    } catch {
      // silent
    }
  }

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (field === "category") {
      // Only auto-generate if book_code is currently empty or starts with old prefix
      const prefix = getCategoryPrefix(value);
      if (!value) return;
      generateBookCode(value);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const { error } = await supabase
        .from("books")
        .update({
          title: form.title.trim(),
          author: form.author.trim(),
          isbn: form.isbn.trim() || null,
          price: parseFloat(form.price),
          stock: parseInt(form.stock) || 0,
          category: form.category.trim() || null,
          publisher: form.publisher.trim() || null,
          cover_url: form.cover_url.trim() || null,
          year: form.year ? parseInt(form.year) : null,
          book_code: form.book_code.trim() || null,
        })
        .eq("id", bookId);
      if (error) throw error;
      toast.success("Buku berhasil diperbarui!");
      router.push("/books");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    try {
      // Hapus cover dari R2 dulu
      if (form.cover_url) await deleteCoverFromR2(form.cover_url);

      const { error } = await supabase.from("books").delete().eq("id", bookId);
      if (error) throw error;
      toast.success("Buku dihapus");
      router.push("/books");
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  if (loading) {
    return (
      <div className="max-w-lg mx-auto">
        <div className="card p-6 h-96 animate-pulse bg-brand-50/50" />
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/books" className="btn-ghost p-2 -ml-2">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className="page-title">Edit Buku</h1>
          <p className="page-subtitle">Perbarui informasi buku</p>
        </div>
        <ScannerButton onScan={handleScannedISBN} label="Scan ISBN" size="sm" />
        <button onClick={() => setShowDelete(true)} className="btn-ghost text-red-500 hover:bg-red-50">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="card p-6 space-y-5">
        {/* Cover Uploader */}
        <CoverUploader
          currentCover={form.cover_url}
          filename={form.isbn || form.title.replace(/[^a-zA-Z0-9]/g, "-").slice(0, 40)}
          onCoverChange={(url, isUploading) => {
            updateField("cover_url", url);
            setCoverUploading(isUploading);
          }}
        />

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="label">Judul Buku *</label>
            <input type="text" className="input-field" value={form.title}
              onChange={(e) => updateField("title", e.target.value)} required />
          </div>
          <div>
            <label className="label">Penulis *</label>
            <input type="text" className="input-field" value={form.author}
              onChange={(e) => updateField("author", e.target.value)} required />
          </div>
          <div>
            <label className="label">Tahun Terbit</label>
            <input type="number" className="input-field" min="1000" max="2099" value={form.year}
              onChange={(e) => updateField("year", e.target.value)} />
          </div>
          <div>
            <label className="label">ISBN</label>
            <div className="flex gap-2">
              <input type="text" className="input-field flex-1" value={form.isbn}
                onChange={(e) => updateField("isbn", e.target.value)} />
              <ScannerButton onScan={handleScannedISBN} variant="icon" />
            </div>
          </div>
          <div>
            <label className="label">Harga (Rp) *</label>
            <input type="number" className="input-field" min="0" value={form.price}
              onChange={(e) => updateField("price", e.target.value)} required />
          </div>
          <div>
            <label className="label">Stok</label>
            <input type="number" className="input-field" min="0" value={form.stock}
              onChange={(e) => updateField("stock", e.target.value)} />
          </div>
          <div>
            <label className="label flex items-center gap-1">
              <Hash className="w-3 h-3" />
              Kode Buku
            </label>
            <div className={`input-field flex items-center justify-between ${form.book_code ? "bg-brand-50 font-bold text-brand-700" : "text-brand-400"}`}>
              <span>{form.book_code || "Pilih kategori dulu"}</span>
              {form.book_code && (
                <span className="text-[10px] font-normal text-brand-400 uppercase tracking-wide">auto</span>
              )}
            </div>
          </div>
          <div>
            <CategoryPicker value={form.category} onChange={(v) => updateField("category", v)} />
          </div>
          <div>
            <label className="label">Penerbit</label>
            <input type="text" className="input-field" value={form.publisher}
              onChange={(e) => updateField("publisher", e.target.value)} />
          </div>
        </div>
        <div className="flex gap-3 pt-2">
          <Link href="/books" className="btn-secondary flex-1">Batal</Link>
          <button type="submit" disabled={saving || coverUploading} className="btn-primary flex-1">
            <Save className="w-4 h-4" />
            {saving ? "Menyimpan..." : "Simpan"}
          </button>
        </div>
      </form>

      {/* Barcode Label Section (Code 128 — memanjang) */}
      <div className="card p-6 space-y-4">
        <div>
          <h2 className="font-semibold text-brand-800 flex items-center gap-2">
            <Barcode className="w-4 h-4" />
            Label Barcode Buku
          </h2>
          <p className="text-xs text-brand-400 mt-1">
            Print & tempel di buku — scan di kasir untuk transaksi cepat
          </p>
        </div>
        <BarcodeLabel
          value={form.book_code || bookId}
          label={form.title}
        />
      </div>

      <ConfirmModal
        open={showDelete}
        onClose={() => setShowDelete(false)}
        onConfirm={handleDelete}
        title="Hapus Buku?"
        message="Buku yang dihapus tidak bisa dikembalikan."
        confirmLabel="Hapus"
        variant="danger"
      />
    </div>
  );
}
