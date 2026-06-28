"use client";
export const dynamic = "force-dynamic";
export const runtime = "edge";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Book } from "@/types";
import { BookCard } from "@/components/BookCard";
import { SearchBar } from "@/components/SearchBar";
import { ConfirmModal } from "@/components/ConfirmModal";
import { Plus, BookOpen } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

export default function BooksPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const loadBooks = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("books")
        .select("*")
        .order("created_at", { ascending: false });

      if (search) {
        query = query.or(`title.ilike.%${search}%,author.ilike.%${search}%,isbn.ilike.%${search}%`);
      }
      if (categoryFilter) {
        query = query.eq("category", categoryFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      setBooks(data || []);
    } catch (err: any) {
      toast.error(err.message || "Gagal memuat buku");
    } finally {
      setLoading(false);
    }
  }, [search, categoryFilter]);

  useEffect(() => {
    loadBooks();
  }, [loadBooks]);

  async function handleDelete(id: string) {
    try {
      const { error } = await supabase.from("books").delete().eq("id", id);
      if (error) throw error;
      toast.success("Buku berhasil dihapus");
      loadBooks();
    } catch (err: any) {
      toast.error(err.message || "Gagal menghapus buku");
    }
  }

  const categories = Array.from(new Set(books.map((b) => b.category).filter(Boolean)));

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Database Buku</h1>
          <p className="page-subtitle">{books.length} buku terdaftar</p>
        </div>
        <Link href="/books/add" className="btn-primary">
          <Plus className="w-4 h-4" />
          Tambah Buku
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Cari judul, penulis, atau ISBN..."
          />
        </div>
        {categories.length > 0 && (
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="input-field sm:max-w-[180px]"
          >
            <option value="">Semua Kategori</option>
            {categories.map((cat) => (
              <option key={cat} value={cat!}>{cat}</option>
            ))}
          </select>
        )}
      </div>

      {loading ? (
        <div className="grid gap-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="card p-4 h-24 animate-pulse bg-brand-50/50" />
          ))}
        </div>
      ) : books.length === 0 ? (
        <div className="card p-12 text-center">
          <BookOpen className="w-12 h-12 text-brand-300 mx-auto mb-3" />
          <p className="text-brand-500 font-medium">
            {search || categoryFilter ? "Tidak ada buku yang cocok" : "Belum ada buku terdaftar"}
          </p>
          <Link href="/books/add" className="btn-primary mt-4 inline-flex">Tambah Buku Pertama</Link>
        </div>
      ) : (
        <div className="grid gap-3">
          {books.map((book) => (
            <BookCard key={book.id} book={book} onDelete={(id) => setDeleteId(id)} />
          ))}
        </div>
      )}

      <ConfirmModal
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && handleDelete(deleteId)}
        title="Hapus Buku?"
        message="Buku yang dihapus tidak bisa dikembalikan. Pastikan tidak ada pesanan yang terkait."
        confirmLabel="Hapus"
        variant="danger"
      />
    </div>
  );
}
