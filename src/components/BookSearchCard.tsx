"use client";

import { BookSearchResult } from "@/types";
import { BookOpen, Check, Loader2, Download, ExternalLink } from "lucide-react";
import { useState } from "react";

interface BookSearchCardProps {
  result: BookSearchResult;
  onSelect: (result: BookSearchResult) => Promise<void>;
}

const SOURCE_LABEL: Record<string, string> = {
  google: "Google Books",
  openlibrary: "Open Library",
};

export function BookSearchCard({ result, onSelect }: BookSearchCardProps) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleClick() {
    if (loading || done) return;
    setLoading(true);
    try {
      await onSelect(result);
      setDone(true);
    } catch {
      // parent handles toast
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading || done}
      className="card p-3 w-full text-left flex gap-3 items-start hover:shadow-md transition-all duration-150 disabled:opacity-60"
    >
      {/* Cover thumbnail */}
      <div className="w-12 h-16 rounded-lg bg-gradient-to-br from-brand-100 to-brand-200 flex items-center justify-center flex-shrink-0 overflow-hidden">
        {result.coverUrl ? (
          <img
            src={result.coverUrl}
            alt={result.title}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
              (e.target as HTMLImageElement).nextElementSibling?.classList.remove("hidden");
            }}
          />
        ) : null}
        <BookOpen className={`w-5 h-5 text-brand-300 ${result.coverUrl ? "hidden" : ""}`} />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-brand-900 text-sm truncate">
          {result.title}
          {result.year ? <span className="text-brand-400 font-normal ml-1">({result.year})</span> : null}
        </p>
        <p className="text-xs text-brand-500 mt-0.5">{result.author}</p>
        {result.isbn && <p className="text-[10px] text-brand-300 mt-0.5">ISBN: {result.isbn}</p>}
        <span className="text-[10px] text-brand-300 inline-flex items-center gap-1 mt-1">
          <ExternalLink className="w-2.5 h-2.5" />
          {SOURCE_LABEL[result.source] || result.source}
        </span>
      </div>

      {/* Action indicator */}
      <div className="flex-shrink-0 self-center">
        {done ? (
          <Check className="w-5 h-5 text-emerald-500" />
        ) : loading ? (
          <Loader2 className="w-5 h-5 text-brand-400 animate-spin" />
        ) : (
          <Download className="w-5 h-5 text-brand-300" />
        )}
      </div>
    </button>
  );
}
