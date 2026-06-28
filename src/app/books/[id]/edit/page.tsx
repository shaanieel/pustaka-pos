"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Save, Trash2 } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import { ConfirmModal } from "@/components/ConfirmModal";

export default function EditBookPage() {
  const router = useRouter();
  const params = useParams();
  const bookId = params.id as string;

  const [form, setForm] = useState({
    title: "",
    author: "",
    isbn: "",
    price: "",
    stock: "",
    category: "",
    publisher: "",
    cover_url: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

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
        });
      }
    } catch (err: any) {
      toast.error("Buku tidak ditemukan");
      router.push("/books");
    } finally {
      setLoading(false);
    }
  }

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
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
        <button onClick={() => setShowDelete(true)} className="btn-ghost text-red-500 hover:bg-red-50">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="card p-6 space-y-5">
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
            <label className="label">ISBN</label>
            <input type="text" className="input-field" value={form.isbn}
              onChange={(e) => updateField("isbn", e.target.value)} />
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
            <label className="label">Kategori</label>
            <select className="input-field" value={form.category}
              onChange={(e) => updateField("category", e.target.value)}>
              <option value="">Pilih Kategori</option>
              <option value="Fiksi">Fiksi</option><option value="Non-Fiksi">Non-Fiksi</option>
              <option value="Pendidikan">Pendidikan</option><option value="Anak">Anak</option>
              <option value="Komik">Komik</option><option value="Referensi">Referensi</option>
              <option value="Agama">Agama</option><option value="Lainnya">Lainnya</option>
            </select>
          </div>
          <div>
            <label className="label">Penerbit</label>
            <input type="text" className="input-field" value={form.publisher}
              onChange={(e) => updateField("publisher", e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <label className="label">URL Cover (opsional)</label>
            <input type="url" className="input-field" value={form.cover_url}
              onChange={(e) => updateField("cover_url", e.target.value)} />
          </div>
        </div>
        <div className="flex gap-3 pt-2">
          <Link href="/books" className="btn-secondary flex-1">Batal</Link>
          <button type="submit" disabled={saving} className="btn-primary flex-1">
            <Save className="w-4 h-4" />
            {saving ? "Menyimpan..." : "Simpan"}
          </button>
        </div>
      </form>

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
