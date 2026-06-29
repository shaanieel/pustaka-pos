"use client";
export const dynamic = "force-dynamic";
export const runtime = "edge";

import { useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Book } from "@/types";
import { ScannerButton } from "@/components/ScannerButton";
import { formatRupiah } from "@/lib/utils";
import {
  ArrowLeft,
  Save,
  Loader2,
  PackageOpen,
  CheckCircle2,
  Plus,
  Trash2,
  ScanLine,
  BookOpen,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

interface StockEntry {
  isbn: string;
  book: Book;
  addQty: number;
}

export default function StockInPage() {
  const router = useRouter();
  const [entries, setEntries] = useState<StockEntry[]>([]);
  const [scanning, setScanning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // ── SCAN BARCODE HANDLER (Model 3: Stok Masuk) ──
  const handleScannedISBN = useCallback(async (isbn: string) => {
    // Cek duplikat
    if (entries.some((e) => e.isbn === isbn)) {
      toast.error("Buku sudah ada di daftar");
      return;
    }

    setScanning(true);
    toast.loading(`Mencari buku ISBN: ${isbn}...`, { id: "scan-stock" });

    try {
      const { data, error } = await supabase
        .from("books")
        .select("*")
        .eq("isbn", isbn)
        .single();

      toast.dismiss("scan-stock");

      if (error || !data) {
        // Buku belum ada di database → kasih opsi tambah
        toast(
          (t) => (
            <div className="flex flex-col gap-2">
              <span className="text-sm">📚 ISBN {isbn} belum terdaftar</span>
              <button
                onClick={() => {
                  toast.dismiss(t.id);
                  router.push(`/books/add?isbn=${encodeURIComponent(isbn)}`);
                }}
                className="btn-primary text-xs py-1.5 px-3 w-full flex items-center justify-center gap-1"
              >
                <Plus className="w-3 h-3" />
                Tambah ke Database
              </button>
            </div>
          ),
          { duration: 8000 }
        );
        setScanning(false);
        return;
      }

      const book = data as Book;
      setEntries((prev) => [...prev, { isbn, book, addQty: 1 }]);
      toast.success(`${book.title} — stok sekarang: ${book.stock}`, { duration: 2500 });
    } catch {
      toast.dismiss("scan-stock");
      toast.error("Gagal mencari buku");
    } finally {
      setScanning(false);
    }
  }, [entries]);

  function updateEntryQty(isbn: string, qty: number) {
    if (qty < 1) return;
    setEntries((prev) =>
      prev.map((e) => (e.isbn === isbn ? { ...e, addQty: qty } : e))
    );
  }

  function removeEntry(isbn: string) {
    setEntries((prev) => prev.filter((e) => e.isbn !== isbn));
  }

  async function handleSave() {
    if (entries.length === 0) {
      toast.error("Scan minimal 1 buku");
      return;
    }

    setSaving(true);
    try {
      let updated = 0;
      for (const entry of entries) {
        const newStock = entry.book.stock + entry.addQty;
        const { error } = await supabase
          .from("books")
          .update({ stock: newStock })
          .eq("id", entry.book.id);

        if (!error) updated++;
      }

      toast.success(`Stok berhasil ditambahkan! (${updated} buku diperbarui)`);
      setSaved(true);
    } catch (err: any) {
      toast.error(err.message || "Gagal update stok");
    } finally {
      setSaving(false);
    }
  }

  function handleNewBatch() {
    setEntries([]);
    setSaved(false);
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/books" className="btn-ghost p-2 -ml-2">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className="page-title">Stok Masuk</h1>
          <p className="page-subtitle">Scan barcode buku untuk tambah stok</p>
        </div>
        {!saved && (
          <ScannerButton onScan={handleScannedISBN} label="Scan ISBN" size="sm" />
        )}
      </div>

      {/* Scan Area */}
      {!saved && (
        <>
          {/* Quick scan visual cue */}
          <div className="card p-6 text-center space-y-4">
            <div className="mx-auto w-20 h-20 rounded-2xl bg-brand-50 flex items-center justify-center">
              <ScanLine className="w-10 h-10 text-brand-500" />
            </div>
            <div>
              <h2 className="font-bold text-brand-800 text-lg">Scan Barcode Buku</h2>
              <p className="text-sm text-brand-500 mt-1">
                Arahkan kamera ke barcode ISBN di belakang buku.
                Stok akan otomatis bertambah.
              </p>
            </div>
            <div className="flex justify-center gap-3">
              <ScannerButton onScan={handleScannedISBN} label="Buka Scanner" />
            </div>
            {scanning && (
              <div className="flex items-center justify-center gap-2 text-brand-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Memindai...</span>
              </div>
            )}
          </div>

          {/* Entry List */}
          {entries.length > 0 && (
            <div className="card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-brand-800 flex items-center gap-2">
                  <PackageOpen className="w-4 h-4 text-brand-600" />
                  Daftar Stok Masuk ({entries.length} buku)
                </h3>
              </div>

              <div className="space-y-2">
                {entries.map((entry) => (
                  <div
                    key={entry.isbn}
                    className="flex items-center justify-between py-3 px-4 rounded-xl bg-brand-50/60"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-brand-950 truncate">
                        {entry.book.title}
                      </p>
                      <p className="text-xs text-brand-500">
                        ISBN: {entry.isbn} &middot; Stok sekarang:{" "}
                        <span className="font-semibold text-brand-700">{entry.book.stock}</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateEntryQty(entry.isbn, entry.addQty - 1)}
                        className="p-1.5 rounded-lg hover:bg-brand-100 text-brand-600"
                        disabled={entry.addQty <= 1}
                      >
                        <span className="w-4 h-4 flex items-center justify-center font-bold text-sm">−</span>
                      </button>
                      <input
                        type="number"
                        min="1"
                        max="999"
                        value={entry.addQty}
                        onChange={(e) => updateEntryQty(entry.isbn, Number(e.target.value) || 1)}
                        className="w-14 text-center text-sm font-bold text-brand-950 bg-white border border-brand-200 rounded-lg py-1.5 focus:outline-none focus:border-brand-500"
                      />
                      <button
                        onClick={() => updateEntryQty(entry.isbn, entry.addQty + 1)}
                        className="p-1.5 rounded-lg hover:bg-brand-100 text-brand-600"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                      <span className="text-sm font-bold text-emerald-600 w-20 text-right">
                        +{entry.addQty}
                      </span>
                      <button
                        onClick={() => removeEntry(entry.isbn)}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 hover:text-red-500 ml-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Total summary */}
              <div className="flex justify-between items-center pt-3 border-t border-brand-100">
                <span className="text-sm text-brand-500">Total tambahan stok</span>
                <span className="text-lg font-bold text-emerald-600">
                  +{entries.reduce((sum, e) => sum + e.addQty, 0)} buku
                </span>
              </div>

              {/* Save button */}
              <button
                onClick={handleSave}
                disabled={saving || entries.length === 0}
                className="btn-primary w-full mt-2"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Simpan Stok Masuk
                  </>
                )}
              </button>
            </div>
          )}
        </>
      )}

      {/* Success State */}
      {saved && entries.length > 0 && (
        <div className="card p-6 text-center space-y-4">
          <div className="mx-auto w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center">
            <CheckCircle2 className="w-10 h-10 text-emerald-600" />
          </div>
          <div>
            <h2 className="font-bold text-brand-800 text-lg">Stok Berhasil Ditambahkan!</h2>
            <p className="text-sm text-brand-500 mt-1">
              {entries.reduce((sum, e) => sum + e.addQty, 0)} buku telah diperbarui stoknya.
            </p>
          </div>

          {/* Summary table */}
          <div className="bg-brand-50 rounded-xl divide-y divide-brand-100 text-left">
            {entries.map((entry) => (
              <div key={entry.isbn} className="flex items-center justify-between p-3 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-brand-800 truncate">{entry.book.title}</p>
                  <p className="text-xs text-brand-500">{entry.isbn}</p>
                </div>
                <div className="text-right ml-3">
                  <p className="text-xs text-brand-400">
                    {entry.book.stock} →{" "}
                    <span className="font-bold text-emerald-600">{entry.book.stock + entry.addQty}</span>
                  </p>
                  <p className="text-xs text-emerald-500 font-bold">+{entry.addQty}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <Link href="/books" className="btn-secondary flex-1">
              Lihat Database
            </Link>
            <button onClick={handleNewBatch} className="btn-primary flex-1">
              <ScanLine className="w-4 h-4" />
              Scan Lagi
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
