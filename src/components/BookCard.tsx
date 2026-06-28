"use client";

import { Book } from "@/types";
import { BookOpen, Pencil, Trash2 } from "lucide-react";
import { formatRupiah } from "@/lib/utils";
import Link from "next/link";

interface BookCardProps {
  book: Book;
  onDelete?: (id: string) => void;
}

export function BookCard({ book, onDelete }: BookCardProps) {
  const isLowStock = book.stock <= 5 && book.stock > 0;
  const isOutOfStock = book.stock === 0;

  return (
    <div className="card p-4 animate-fade-in-up group">
      <div className="flex gap-4">
        <div className="w-16 h-20 sm:w-20 sm:h-24 rounded-xl bg-gradient-to-br from-brand-100 to-brand-200 flex items-center justify-center flex-shrink-0 overflow-hidden">
          {book.cover_url ? (
            <img
              src={book.cover_url}
              alt={book.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <BookOpen className="w-7 h-7 text-brand-400" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-brand-950 truncate text-[15px]">
            {book.title}
          </h3>
          <p className="text-sm text-brand-500 mt-0.5">{book.author}</p>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className="text-sm font-bold text-brand-700">
              {formatRupiah(book.price)}
            </span>
            {isLowStock && (
              <span className="badge-warning">Stok: {book.stock}</span>
            )}
            {isOutOfStock && (
              <span className="badge-danger">Habis</span>
            )}
            {!isLowStock && !isOutOfStock && (
              <span className="badge-success">Stok: {book.stock}</span>
            )}
            {book.category && (
              <span className="badge-neutral">{book.category}</span>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <Link
            href={`/books/${book.id}/edit`}
            className="p-2 rounded-lg hover:bg-brand-50 text-brand-500 hover:text-brand-700 transition-colors"
          >
            <Pencil className="w-4 h-4" />
          </Link>
          <button
            onClick={() => onDelete?.(book.id)}
            className="p-2 rounded-lg hover:bg-red-50 text-brand-400 hover:text-red-500 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
