"use client";

import { useState, useEffect } from "react";
import { Plus, X, ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import { clsx } from "clsx";

// Types
type Genre = { id: number; name: string; slug: string; icon: string };
type Subgenre = { id: number; genre_id: number; name: string; slug: string };
type Selection = { subgenre_id: number; genre_name: string; subgenre_name: string };

interface GenrePickerProps {
  selectedIds: number[]; // subgenre IDs
  onChange: (ids: number[], selections: Selection[]) => void;
  label?: string;
}

export function GenrePicker({
  selectedIds,
  onChange,
  label = "Genre & Kategori",
}: GenrePickerProps) {
  const [genres, setGenres] = useState<Genre[]>([]);
  const [subgenres, setSubgenres] = useState<Subgenre[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedGenres, setExpandedGenres] = useState<Set<number>>(new Set());
  const [error, setError] = useState("");

  // Fetch genres + subgenres
  useEffect(() => {
    fetchGenres();
  }, []);

  async function fetchGenres() {
    setLoading(true);
    try {
      const res = await fetch("/api/genres");
      const data = await res.json();
      if (data.genres) setGenres(data.genres);
      if (data.subgenres) setSubgenres(data.subgenres);
    } catch (err) {
      setError("Gagal memuat genre");
    } finally {
      setLoading(false);
    }
  }

  // Toggle a subgenre
  function toggle(subgenreId: number) {
    let newIds: number[];
    if (selectedIds.includes(subgenreId)) {
      newIds = selectedIds.filter((id) => id !== subgenreId);
    } else {
      newIds = [...selectedIds, subgenreId];
    }
    
    // Build selections array
    const selections = buildSelections(newIds);
    onChange(newIds, selections);
  }

  // Toggle genre expand
  function toggleGenre(genreId: number) {
    setExpandedGenres((prev) => {
      const next = new Set(prev);
      if (next.has(genreId)) next.delete(genreId);
      else next.add(genreId);
      return next;
    });
  }

  // Build human-readable selections
  function buildSelections(ids: number[]): Selection[] {
    return ids.map((sid) => {
      const sub = subgenres.find((s) => s.id === sid);
      const genre = genres.find((g) => g.id === sub?.genre_id);
      return {
        subgenre_id: sid,
        genre_name: genre?.name || "",
        subgenre_name: sub?.name || "",
      };
    });
  }

  // Get selected names for display
  const selectedNames = buildSelections(selectedIds);

  // Group subgenres by genre
  const subgenresByGenre = new Map<number, Subgenre[]>();
  for (const s of subgenres) {
    const arr = subgenresByGenre.get(s.genre_id) || [];
    arr.push(s);
    subgenresByGenre.set(s.genre_id, arr);
  }

  // Count selected per genre
  function countInGenre(genreId: number): number {
    const subIds = (subgenresByGenre.get(genreId) || []).map((s) => s.id);
    return selectedIds.filter((id) => subIds.includes(id)).length;
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-brand-400 py-4">
        <Loader2 className="w-4 h-4 animate-spin" />
        Memuat genre...
      </div>
    );
  }

  if (error) {
    return <p className="text-sm text-red-500 py-2">{error}</p>;
  }

  return (
    <div className="space-y-2">
      {/* Label */}
      <div className="flex items-center justify-between">
        <label className="label">{label}</label>
        {selectedIds.length > 0 && (
          <span className="text-xs text-brand-500 font-medium">
            {selectedIds.length} dipilih
          </span>
        )}
      </div>

      {/* Selected tags */}
      {selectedNames.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedNames.map((sel) => (
            <span
              key={sel.subgenre_id}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-brand-600 text-white text-xs font-medium"
            >
              {sel.subgenre_name}
              <button
                type="button"
                onClick={() => toggle(sel.subgenre_id)}
                className="hover:bg-white/20 rounded-full p-0.5"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Genre list */}
      <div className="border border-brand-200 rounded-lg divide-y divide-brand-100 overflow-hidden">
        {genres.map((genre) => {
          const isExpanded = expandedGenres.has(genre.id);
          const subs = subgenresByGenre.get(genre.id) || [];
          const count = countInGenre(genre.id);

          return (
            <div key={genre.id}>
              {/* Genre header */}
              <button
                type="button"
                onClick={() => toggleGenre(genre.id)}
                className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-brand-50 transition text-left"
              >
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-brand-400" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-brand-400" />
                )}
                <span className="flex-1 text-sm font-medium text-brand-800">
                  {genre.name}
                </span>
                {count > 0 && (
                  <span className="text-xs bg-brand-100 text-brand-600 px-1.5 py-0.5 rounded-full font-medium">
                    {count}
                  </span>
                )}
              </button>

              {/* Subgenre grid */}
              {isExpanded && (
                <div className="px-3 pb-2.5 pt-1 bg-brand-50/50">
                  <div className="flex flex-wrap gap-1.5">
                    {subs.map((sub) => {
                      const isSelected = selectedIds.includes(sub.id);
                      return (
                        <button
                          key={sub.id}
                          type="button"
                          onClick={() => toggle(sub.id)}
                          className={clsx(
                            "px-2.5 py-1 rounded-full text-xs font-medium transition-all border",
                            isSelected
                              ? "bg-brand-600 text-white border-brand-600 shadow-sm"
                              : "bg-white text-brand-600 border-brand-200 hover:border-brand-400 hover:bg-brand-50"
                          )}
                        >
                          {sub.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Helper text */}
      <p className="text-[10px] text-brand-400">
        Klik genre untuk membuka subgenre. Bisa pilih lebih dari satu.
      </p>
    </div>
  );
}
