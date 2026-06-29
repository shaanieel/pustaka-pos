"use client";
export const dynamic = "force-dynamic";
export const runtime = "edge";

import { useState, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { BookSearchResult } from "@/types";
import { BookSearchCard } from "@/components/BookSearchCard";
import { ArrowLeft, Save, Search, Loader2, BookOpen, Trash2, Plus } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import { formatRupiah } from "@/lib/utils";

export default function AddBookPage() {
  const router = useRouter();
  const searchRef = useRef<HTMLInputElement>(null);

  // Search state
  const [searchQ, setSearchQ] = useState("");
  const [results, setResults] = useState<BookSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [source, setSource] = useState<string | null>(null);

  // Manual form state
  const [form, setForm] = useState({
    title: "", author: "", isbn: "", price: "", stock: "10",
    category: "", publisher: "", cover_url: "", year: "",
  });
  const [saving, setSaving] = useState(false);

  // Search handler
  async function handleSearch(e?: React.FormEvent) {
    e?.preventDefault();
    const q = searchQ.trim();
    if (q.length < 2) {
      toast.error("Ketik minimal 2 karakter untuk mencari");
      return;
    }

    setSearching(true);
    setResults([]);
    setSearched(false);
    try {
      const res = await fetch(`/api/search-books?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setResults(data.results || []);
      setSource(data.source);
      setSearched(true);
      if (data.results?.length === 0) {
        toast("Buku tidak ditemukan. Coba kata kunci lain atau isi manual.", { icon: "🔍" });
      }
    } catch {
      toast.error("Gagal mencari buku");
    } finally {
      setSearching(false);
    }
  }

  // Select a search result → upload cover to R2 → fill form
  async function handleSelect(result: BookSearchResult) {
    // Upload cover to our R2 storage
    let r2CoverUrl = "";
    if (result.coverUrl) {
      try {
        const upRes = await fetch("/api/upload-cover", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageUrl: result.coverUrl,
            filename: result.isbn || result.title.replace(/[^a-zA-Z0-9]/g, "-").slice(0, 40),
          }),
        });
        const upData = await upRes.json();
        if (upData.url) {
          r2CoverUrl = upData.url;
        } else {
          // If R2 not configured, fallback to original URL
          r2CoverUrl = result.coverUrl;
          toast("R2 belum dikonfigurasi — menggunakan URL asli", { icon: "⚠️" });
        }
      } catch {
        r2CoverUrl = result.coverUrl;
        toast("Upload R2 gagal — menggunakan URL asli", { icon: "⚠️" });
      }
    }

    setForm({
      title: result.title,
      author: result.author,
      isbn: result.isbn || "",
      price: "",
      stock: "10",
      category: "",
      publisher: result.publisher || "",
      cover_url: r2CoverUrl,
      year: result.year?.toString() || "",
    });

    // Scroll ke form
    setTimeout(() => {
      document.getElementById("manual-form")?.scrollIntoView({ behavior: "smooth" });
    }, 100);

    toast.success(`${result.title} — tinggal isi harga & simpan!`, { duration: 3000 });
  }

  // Save to Supabase
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
        year: form.year ? parseInt(form.year) : null,
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

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function clearForm() {
    setForm({ title: "", author: "", isbn: "", price: "", stock: "10", category: "", publisher: "", cover_url: "", year: "" });
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/books" className="btn-ghost p-2 -ml-2">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="page-title">Tambah Buku</h1>
          <p className="page-subtitle">Cari buku dari Google Books / Open Library, atau isi manual</p>
        </div>
      </div>

      {/* SEARCH SECTION */}
      <div className="card p-4 space-y-3">
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            ref={searchRef}
            type="text"
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
            placeholder="Ketik judul buku... (contoh: Atomic Habits)"
            className="input-field flex-1"
            autoFocus
          />
          <button type="submit" disabled={searching} className="btn-primary">
            {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            Cari
          </button>
        </form>

        {/* Search tips */}
        {!searched && (
          <div className="text-xs text-brand-400 space-y-1">
            <p>🔍 Coba cari: <button onClick={() => { setSearchQ("Laut Bercerita"); setTimeout(() => handleSearch(), 50); }} className="text-brand-600 underline">Laut Bercerita</button>, <button onClick={() => { setSearchQ("Atomic Habits"); setTimeout(() => handleSearch(), 50); }} className="text-brand-600 underline">Atomic Habits</button>, <button onClick={() => { setSearchQ("Bumi Manusia"); setTimeout(() => handleSearch(), 50); }} className="text-brand-600 underline">Bumi Manusia</button></p>
            <p>📚 Sumber: Google Books → Open Library (fallback)</p>
          </div>
        )}

        {/* Results */}
        {searching && (
          <div className="flex items-center gap-3 text-brand-500 py-4">
            <Loader2 className="w-5 h-5 animate-spin" /> Mencari di {source ? source === "google" ? "Google Books" : "Open Library" : "database"}...
          </div>
        )}

        {searched && results.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-brand-400">
              Ditemukan {results.length} buku dari {source === "google" ? "Google Books" : "Open Library"}. Klik untuk pilih!
            </p>
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {results.map((r) => (
                <BookSearchCard key={r.id} result={r} onSelect={handleSelect} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* MANUAL / EDIT FORM */}
      <div id="manual-form" className="card p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-brand-800 flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            Detail Buku
          </h2>
          <button onClick={clearForm} className="text-xs text-brand-400 hover:text-red-500 flex items-center gap-1">
            <Trash2 className="w-3 h-3" /> Bersihkan
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Cover preview */}
          {form.cover_url && (
            <div className="flex justify-center">
              <div className="w-24 h-36 rounded-lg overflow-hidden shadow-md border border-brand-100">
                <img src={form.cover_url} alt={form.title} className="w-full h-full object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
              </div>
            </div>
          )}

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="label">Judul Buku *</label>
              <input type="text" className="input-field" placeholder="Judul buku"
                value={form.title} onChange={(e) => updateField("title", e.target.value)} required />
            </div>
            <div>
              <label className="label">Penulis *</label>
              <input type="text" className="input-field" placeholder="Nama penulis"
                value={form.author} onChange={(e) => updateField("author", e.target.value)} required />
            </div>
            <div>
              <label className="label">Tahun Terbit</label>
              <input type="number" className="input-field" placeholder="2024" min="1000" max="2099"
                value={form.year} onChange={(e) => updateField("year", e.target.value)} />
            </div>
            <div>
              <label className="label">ISBN</label>
              <input type="text" className="input-field" placeholder="978-xxx-xxx-xxxx"
                value={form.isbn} onChange={(e) => updateField("isbn", e.target.value)} />
            </div>
            <div>
              <label className="label">Penerbit</label>
              <input type="text" className="input-field" placeholder="Nama penerbit"
                value={form.publisher} onChange={(e) => updateField("publisher", e.target.value)} />
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
            <div className="sm:col-span-2">
              <label className="label">URL Cover (otomatis dari pencarian)</label>
              <input type="url" className="input-field text-sm" placeholder="https://..."
                value={form.cover_url} onChange={(e) => updateField("cover_url", e.target.value)} />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Link href="/books" className="btn-secondary flex-1">Batal</Link>
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? "Menyimpan..." : "Simpan Buku"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
