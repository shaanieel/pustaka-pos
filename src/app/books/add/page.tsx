"use client";
export const dynamic = "force-dynamic";
export const runtime = "edge";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

export default function AddBookPage() {
  const router = useRouter();
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
  const [saving, setSaving] = useState(false);

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title || !form.author || !form.price) {
      toast.error("Judul, penulis, dan harga wajib diisi");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from("books").insert({
        title: form.title.trim(),
        author: form.author.trim(),
        isbn: form.isbn.trim() || null,
        price: parseFloat(form.price),
        stock: parseInt(form.stock) || 0,
        category: form.category.trim() || null,
        publisher: form.publisher.trim() || null,
        cover_url: form.cover_url.trim() || null,
      });
      if (error) throw error;
      toast.success("Buku berhasil ditambahkan!");
      router.push("/books");
    } catch (err: any) {
      toast.error(err.message || "Gagal menambahkan buku");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/books" className="btn-ghost p-2 -ml-2">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="page-title">Tambah Buku</h1>
          <p className="page-subtitle">Daftarkan buku baru ke database</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="card p-6 space-y-5">
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="label">Judul Buku *</label>
            <input type="text" className="input-field" placeholder="Contoh: Laut Bercerita"
              value={form.title} onChange={(e) => updateField("title", e.target.value)} required />
          </div>
          <div>
            <label className="label">Penulis *</label>
            <input type="text" className="input-field" placeholder="Contoh: Leila S. Chudori"
              value={form.author} onChange={(e) => updateField("author", e.target.value)} required />
          </div>
          <div>
            <label className="label">ISBN</label>
            <input type="text" className="input-field" placeholder="978-xxx-xxx-xxxx"
              value={form.isbn} onChange={(e) => updateField("isbn", e.target.value)} />
          </div>
          <div>
            <label className="label">Harga (Rp) *</label>
            <input type="number" className="input-field" placeholder="75000" min="0"
              value={form.price} onChange={(e) => updateField("price", e.target.value)} required />
          </div>
          <div>
            <label className="label">Stok</label>
            <input type="number" className="input-field" placeholder="10" min="0"
              value={form.stock} onChange={(e) => updateField("stock", e.target.value)} />
          </div>
          <div>
            <label className="label">Kategori</label>
            <select className="input-field" value={form.category}
              onChange={(e) => updateField("category", e.target.value)}>
              <option value="">Pilih Kategori</option>
              <option value="Fiksi">Fiksi</option>
              <option value="Non-Fiksi">Non-Fiksi</option>
              <option value="Pendidikan">Pendidikan</option>
              <option value="Anak">Anak</option>
              <option value="Komik">Komik</option>
              <option value="Referensi">Referensi</option>
              <option value="Agama">Agama</option>
              <option value="Lainnya">Lainnya</option>
            </select>
          </div>
          <div>
            <label className="label">Penerbit</label>
            <input type="text" className="input-field" placeholder="Contoh: Gramedia"
              value={form.publisher} onChange={(e) => updateField("publisher", e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <label className="label">URL Cover (opsional)</label>
            <input type="url" className="input-field" placeholder="https://..."
              value={form.cover_url} onChange={(e) => updateField("cover_url", e.target.value)} />
          </div>
        </div>
        <div className="flex gap-3 pt-2">
          <Link href="/books" className="btn-secondary flex-1">Batal</Link>
          <button type="submit" disabled={saving} className="btn-primary flex-1">
            <Save className="w-4 h-4" />
            {saving ? "Menyimpan..." : "Simpan Buku"}
          </button>
        </div>
      </form>
    </div>
  );
}
