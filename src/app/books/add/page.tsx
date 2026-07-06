"use client";
export const dynamic = "force-dynamic";
export const runtime = "edge";

import { useState, useRef, useCallback, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter, useSearchParams } from "next/navigation";
import { BookSearchResult } from "@/types";
import { BookSearchCard } from "@/components/BookSearchCard";
import { ScannerButton } from "@/components/ScannerButton";
import { CoverUploader } from "@/components/CoverUploader";
import { GenrePicker } from "@/components/GenrePicker";
import { BarcodeLabel } from "@/components/BarcodeLabel";
import { getCategoryPrefix } from "@/lib/categories";
import { ArrowLeft, Save, Search, Loader2, BookOpen, Trash2, Plus, Hash, Barcode } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import { formatRupiah } from "@/lib/utils";

export default function AddBookPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchRef = useRef<HTMLInputElement>(null);
  const initialIsbnRef = useRef(false);

  // Search state
  const [searchQ, setSearchQ] = useState("");
  const [results, setResults] = useState<BookSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [source, setSource] = useState<string | null>(null);

  // Manual form state
  const [form, setForm] = useState({
    title: "", author: "", isbn: "", price: "", stock: "10",
    category: "", publisher: "", cover_url: "", year: "", book_code: "",
  });
  const [saving, setSaving] = useState(false);
  const [coverUploading, setCoverUploading] = useState(false);

  // Genre state (multi-select)
  const [genreIds, setGenreIds] = useState<number[]>([]);
  const [genreSelections, setGenreSelections] = useState<
    { subgenre_id: number; genre_name: string; subgenre_name: string }[]
  >([]);

  // ── Auto-trigger ISBN search dari URL (?isbn=...) ──
  useEffect(() => {
    const isbn = searchParams.get("isbn");
    if (isbn && !initialIsbnRef.current) {
      initialIsbnRef.current = true;
      // Delay kecil biar component mount dulu
      setTimeout(() => {
        handleScannedISBN(isbn);
      }, 500);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── SCAN BARCODE HANDLER (Model 1: Master Barang) ──
  const handleScannedISBN = useCallback(async (isbn: string) => {
    toast.loading(`Mencari buku ISBN: ${isbn}...`, { id: "scan-search" });
    try {
      const res = await fetch(`/api/search-books?isbn=${encodeURIComponent(isbn)}`);
      const data = await res.json();
      toast.dismiss("scan-search");

      const result = data.results?.[0];
      if (result) {
        // ISBN ketemu di Google Books → auto-fill form
        toast.success(`${result.title} — tinggal isi harga & simpan!`);

        // Upload cover dari Google Books ke R2
        let r2CoverUrl = result.coverUrl || "";
        if (result.coverUrl) {
          try {
            const upRes = await fetch("/api/upload-cover", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                imageUrl: result.coverUrl,
                filename: isbn,
              }),
            });
            if (upRes.ok) {
              const upData = await upRes.json();
              if (upData.url) r2CoverUrl = upData.url;
            }
          } catch {
            // fallback: use Google Books URL
          }
        }

        setForm({
          title: result.title,
          author: result.author,
          isbn: result.isbn || isbn,
          price: "",
          stock: "10",
          category: "",
          publisher: result.publisher || "",
          cover_url: r2CoverUrl,
          year: result.year?.toString() || "",
          book_code: "",
        });
      } else {
        // ISBN TIDAK ketemu → ISBN tetap terisi, user isi manual
        toast("Buku tidak ditemukan di Google Books. ISBN tetap terdaftar, silakan isi manual.", {
          icon: "📚",
          duration: 5000,
        });
        setForm((prev) => ({ ...prev, isbn: isbn, cover_url: "" }));
      }

      // Scroll ke form
      setTimeout(() => {
        document.getElementById("manual-form")?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    } catch {
      toast.dismiss("scan-search");
      toast.error("Gagal mencari buku. Coba lagi.");
      setForm((prev) => ({ ...prev, isbn: isbn }));
    }
  }, []);

  // ── KEYWORD SEARCH HANDLER ──
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

  // ── SELECT A SEARCH RESULT ──
  const r2Warned = useRef(false);
  async function handleSelect(result: BookSearchResult) {
    let r2CoverUrl = result.coverUrl || "";
    if (result.coverUrl) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);
        const upRes = await fetch("/api/upload-cover", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageUrl: result.coverUrl,
            filename: result.isbn || result.title.replace(/[^a-zA-Z0-9]/g, "-").slice(0, 40),
          }),
          signal: controller.signal,
        });
        clearTimeout(timeout);
        if (upRes.ok) {
          const upData = await upRes.json();
          if (upData.url) r2CoverUrl = upData.url;
        } else if (!r2Warned.current) {
          r2Warned.current = true;
          toast("Cover disimpan dari sumber asli (R2 belum siap)", { icon: "💡" });
        }
      } catch {
        if (!r2Warned.current) {
          r2Warned.current = true;
          toast("Cover dari sumber asli", { icon: "📚", duration: 2000 });
        }
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
      book_code: "",
    });

    setTimeout(() => {
      document.getElementById("manual-form")?.scrollIntoView({ behavior: "smooth" });
    }, 100);

    toast.success(`${result.title} — tinggal isi harga & simpan!`, { duration: 3000 });
  }

  // ── SAVE TO SUPABASE ──
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title || !form.author || !form.price) {
      toast.error("Judul, penulis, dan harga wajib diisi");
      return;
    }
    setSaving(true);
    try {
      // Auto-generate book_code kalau kosong
      let bookCode = form.book_code.trim() || null;
      if (!bookCode) {
        bookCode = await generateGenericBookCode();
      }

      const { data: insertedBook, error } = await supabase.from("books").insert({
        title: form.title.trim(),
        author: form.author.trim(),
        isbn: form.isbn.trim() || null,
        price: parseFloat(form.price),
        stock: parseInt(form.stock) || 0,
        category: genreSelections.map((s) => s.subgenre_name).join(", "),
        publisher: form.publisher.trim() || null,
        cover_url: form.cover_url.trim() || null,
        year: form.year ? parseInt(form.year) : null,
        book_code: bookCode,
      }).select("id").single();

      if (error) throw error;

      // Save book_genres junction
      const bookId = insertedBook?.id;
      if (bookId && genreIds.length > 0) {
        const genreInserts = genreIds.map((sid) => ({
          book_id: bookId,
          subgenre_id: sid,
        }));
        await supabase.from("book_genres").insert(genreInserts);
      }

      toast.success("Buku berhasil ditambahkan!");
      router.push("/books");
    } catch (err: any) {
      toast.error(err.message || "Gagal menambahkan buku");
    } finally {
      setSaving(false);
    }
  }

  // ── AUTO-GENERATE BOOK CODE dari genre subgenre
  async function generateBookCodeFromGenre(subgenreName: string) {
    const prefix = getCategoryPrefix(subgenreName);
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
      const code = `${prefix}${String(nextNum).padStart(4, "0")}`;
      updateField("book_code", code);
    } catch {
      updateField("book_code", `${prefix}0001`);
    }
  }

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  // ── AUTO-GENERATE GENERIC BOOK CODE (tanpa kategori) ──
  async function generateGenericBookCode(): Promise<string> {
    try {
      const { data } = await supabase
        .from("books")
        .select("book_code")
        .like("book_code", "BK%")
        .order("book_code", { ascending: false })
        .limit(1);

      let maxNum = 0;
      if (data && data.length > 0) {
        const numStr = data[0].book_code.replace("BK", "");
        maxNum = parseInt(numStr) || 0;
      }
      const nextNum = maxNum + 1;
      return `BK${String(nextNum).padStart(4, "0")}`;
    } catch {
      return `BK0001`;
    }
  }

  function clearForm() {
    setForm({ title: "", author: "", isbn: "", price: "", stock: "10", category: "", publisher: "", cover_url: "", year: "", book_code: "" });
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/books" className="btn-ghost p-2 -ml-2">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className="page-title">Tambah Buku</h1>
          <p className="page-subtitle">Scan barcode, cari di Google Books, atau isi manual</p>
        </div>
        {/* Scan button in header */}
        <ScannerButton onScan={handleScannedISBN} label="Scan ISBN" size="sm" />
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
          />
          <button type="submit" disabled={searching} className="btn-primary">
            {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            Cari
          </button>
        </form>

        {!searched && (
          <div className="text-xs text-brand-400 space-y-1">
            <p>🔍 Coba cari: <button onClick={() => { setSearchQ("Laut Bercerita"); setTimeout(() => handleSearch(), 50); }} className="text-brand-600 underline">Laut Bercerita</button>, <button onClick={() => { setSearchQ("Atomic Habits"); setTimeout(() => handleSearch(), 50); }} className="text-brand-600 underline">Atomic Habits</button>, <button onClick={() => { setSearchQ("Bumi Manusia"); setTimeout(() => handleSearch(), 50); }} className="text-brand-600 underline">Bumi Manusia</button></p>
            <p>📚 Sumber: Google Books → Open Library (fallback)</p>
          </div>
        )}

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
          {/* Cover Uploader (gantiin URL input + preview lama) */}
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
              <div className="flex gap-2">
                <input type="text" className="input-field flex-1" placeholder="978-xxx-xxx-xxxx"
                  value={form.isbn} onChange={(e) => updateField("isbn", e.target.value)} />
                <ScannerButton onScan={handleScannedISBN} variant="icon" />
              </div>
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
            <div className="sm:col-span-2">
              <GenrePicker
                selectedIds={genreIds}
                onChange={(ids, selections) => {
                  setGenreIds(ids);
                  setGenreSelections(selections);
                  // Auto-gen book_code from first subgenre
                  if (selections.length > 0 && !form.book_code) {
                    generateBookCodeFromGenre(selections[0].subgenre_name);
                  }
                }}
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Link href="/books" className="btn-secondary flex-1">Batal</Link>
            <button type="submit" disabled={saving || coverUploading} className="btn-primary flex-1">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? "Menyimpan..." : "Simpan Buku"}
            </button>
          </div>
        </form>

        {/* Barcode Label Section — muncul setelah buku ada book_code */}
        {form.book_code && (
          <div className="pt-4 border-t border-brand-100 space-y-3">
            <h3 className="font-medium text-brand-700 text-sm flex items-center gap-1.5">
              <Barcode className="w-4 h-4" />
              Label Barcode — Print & Tempel di Buku
            </h3>
            <BarcodeLabel value={form.book_code} label={form.title} />
          </div>
        )}
      </div>
    </div>
  );
}
