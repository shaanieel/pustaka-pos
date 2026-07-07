"use client";

import { useState, useEffect } from "react";
import { Plus, X, ChevronDown, ChevronRight, Loader2, Pencil, Trash2, Check, Edit3 } from "lucide-react";
import { clsx } from "clsx";
import toast from "react-hot-toast";

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

  // ── Modal state ──
  const [showAddGenre, setShowAddGenre] = useState(false);
  const [showAddSub, setShowAddSub] = useState<number | null>(null); // genre_id
  const [editing, setEditing] = useState<{ type: "genre" | "subgenre"; id: number; name: string } | null>(null);
  const [inputName, setInputName] = useState("");

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
    } catch {
      setError("Gagal memuat genre");
    } finally {
      setLoading(false);
    }
  }

  // ── CRUD OPERATIONS ──
  async function handleAddGenre() {
    if (!inputName.trim()) return;
    try {
      const res = await fetch("/api/genres", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "genre", name: inputName.trim() }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success(`Genre "${inputName.trim()}" ditambahkan`);
      setShowAddGenre(false);
      setInputName("");
      await fetchGenres();
    } catch (err: any) {
      toast.error(err.message || "Gagal");
    }
  }

  async function handleAddSubgenre(genreId: number) {
    if (!inputName.trim()) return;
    try {
      const res = await fetch("/api/genres", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "subgenre", name: inputName.trim(), genre_id: genreId }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success(`Subgenre "${inputName.trim()}" ditambahkan`);
      setShowAddSub(null);
      setInputName("");
      await fetchGenres();
    } catch (err: any) {
      toast.error(err.message || "Gagal");
    }
  }

  async function handleRename() {
    if (!editing || !inputName.trim()) return;
    try {
      const res = await fetch("/api/genres", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: editing.type, id: editing.id, name: inputName.trim() }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success(`Berhasil rename`);
      setEditing(null);
      setInputName("");
      await fetchGenres();
    } catch (err: any) {
      toast.error(err.message || "Gagal");
    }
  }

  async function handleDelete(type: "genre" | "subgenre", id: number) {
    const label = type === "genre" ? "Genre" : "Subgenre";
    if (!confirm(`Hapus ${label} ini? Subgenre di dalamnya juga akan terhapus.`)) return;
    try {
      const res = await fetch("/api/genres", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, id }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success(`${label} berhasil dihapus`);
      await fetchGenres();
    } catch (err: any) {
      toast.error(err.message || "Gagal");
    }
  }

  // ── SELECTION LOGIC ──
  function toggle(subgenreId: number) {
    let newIds: number[];
    if (selectedIds.includes(subgenreId)) {
      newIds = selectedIds.filter((id) => id !== subgenreId);
    } else {
      newIds = [...selectedIds, subgenreId];
    }
    const selections = buildSelections(newIds);
    onChange(newIds, selections);
  }

  function toggleGenre(genreId: number) {
    setExpandedGenres((prev) => {
      const next = new Set(prev);
      if (next.has(genreId)) next.delete(genreId);
      else next.add(genreId);
      return next;
    });
  }

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

  const selectedNames = buildSelections(selectedIds);

  const subgenresByGenre = new Map<number, Subgenre[]>();
  for (const s of subgenres) {
    const arr = subgenresByGenre.get(s.genre_id) || [];
    arr.push(s);
    subgenresByGenre.set(s.genre_id, arr);
  }

  function countInGenre(genreId: number): number {
    const subIds = (subgenresByGenre.get(genreId) || []).map((s) => s.id);
    return selectedIds.filter((id) => subIds.includes(id)).length;
  }

  // ── ADD / RENAME MODAL ──
  function Modal({ title, onConfirm }: { title: string; onConfirm: () => void }) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40" onClick={() => { setShowAddGenre(false); setShowAddSub(null); setEditing(null); setInputName(""); }}>
        <div className="bg-white rounded-2xl p-4 w-[300px] shadow-xl mx-4" onClick={(e) => e.stopPropagation()}>
          <p className="text-sm font-semibold text-brand-800 mb-3">{title}</p>
          <input
            type="text"
            className="input-field w-full mb-3"
            placeholder="Nama..."
            value={inputName}
            onChange={(e) => setInputName(e.target.value)}
            autoFocus
            onKeyDown={(e) => { if (e.key === "Enter") onConfirm(); }}
          />
          <div className="flex gap-2">
            <button onClick={() => { setShowAddGenre(false); setShowAddSub(null); setEditing(null); setInputName(""); }} className="btn-secondary flex-1 text-sm">Batal</button>
            <button onClick={onConfirm} className="btn-primary flex-1 text-sm">
              <Check className="w-4 h-4" />
              Simpan
            </button>
          </div>
        </div>
      </div>
    );
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
      {/* Label + Add Genre button */}
      <div className="flex items-center justify-between">
        <label className="label">{label}</label>
        <button
          type="button"
          onClick={() => { setInputName(""); setShowAddGenre(true); }}
          className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-800 bg-brand-50 hover:bg-brand-100 px-2.5 py-1 rounded-full transition-colors"
        >
          <Plus className="w-3 h-3" /> Genre
        </button>
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
              <div className="flex items-center gap-1 px-1">
                <button
                  type="button"
                  onClick={() => toggleGenre(genre.id)}
                  className="flex-1 flex items-center gap-2 px-2 py-2.5 hover:bg-brand-50 transition text-left rounded-lg"
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
                {/* Edit genre */}
                <button
                  type="button"
                  onClick={() => { setEditing({ type: "genre", id: genre.id, name: genre.name }); setInputName(genre.name); }}
                  className="p-1.5 rounded-lg hover:bg-brand-100 text-brand-400 hover:text-brand-600"
                  title="Edit genre"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                {/* Delete genre */}
                <button
                  type="button"
                  onClick={() => handleDelete("genre", genre.id)}
                  className="p-1.5 rounded-lg hover:bg-red-50 text-brand-400 hover:text-red-500"
                  title="Hapus genre"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                {/* Add subgenre */}
                <button
                  type="button"
                  onClick={() => { setShowAddSub(genre.id); setInputName(""); }}
                  className="p-1.5 rounded-lg hover:bg-brand-100 text-brand-400 hover:text-brand-600"
                  title="Tambah subgenre"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Subgenre grid */}
              {isExpanded && (
                <div className="px-3 pb-2.5 pt-1 bg-brand-50/50">
                  <div className="flex flex-wrap gap-1.5">
                    {subs.map((sub) => {
                      const isSelected = selectedIds.includes(sub.id);
                      return (
                        <div key={sub.id} className="inline-flex items-center gap-0.5 group">
                          <button
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
                          {/* Edit subgenre */}
                          <button
                            type="button"
                            onClick={() => { setEditing({ type: "subgenre", id: sub.id, name: sub.name }); setInputName(sub.name); }}
                            className="opacity-0 group-hover:opacity-100 p-0.5 rounded-full hover:bg-brand-200 text-brand-400 hover:text-brand-600 transition-all"
                            title="Edit subgenre"
                          >
                            <Edit3 className="w-2.5 h-2.5" />
                          </button>
                          {/* Delete subgenre */}
                          <button
                            type="button"
                            onClick={() => handleDelete("subgenre", sub.id)}
                            className="opacity-0 group-hover:opacity-100 p-0.5 rounded-full hover:bg-red-100 text-brand-400 hover:text-red-500 transition-all"
                            title="Hapus subgenre"
                          >
                            <X className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modal: Add Genre */}
      {showAddGenre && <Modal title="Tambah Genre Baru" onConfirm={handleAddGenre} />}

      {/* Modal: Add Subgenre */}
      {showAddSub && <Modal title="Tambah Subgenre Baru" onConfirm={() => handleAddSubgenre(showAddSub)} />}

      {/* Modal: Edit / Rename */}
      {editing && <Modal title={`Edit ${editing.type === "genre" ? "Genre" : "Subgenre"}`} onConfirm={handleRename} />}

      <p className="text-[10px] text-brand-400">
        Klik genre untuk membuka subgenre. Klik + untuk tambah subgenre.
      </p>
    </div>
  );
}
