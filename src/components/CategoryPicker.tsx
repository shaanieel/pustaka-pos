"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { BOOK_CATEGORIES } from "@/lib/categories";
import { Plus, X, Check, Loader2 } from "lucide-react";
import { clsx } from "clsx";

interface CategoryPickerProps {
  value: string;
  onChange: (cat: string) => void;
  label?: string;
  compact?: boolean;
  showAllOption?: boolean;
}

export function CategoryPicker({
  value,
  onChange,
  label = "Kategori",
  compact = false,
  showAllOption = false,
}: CategoryPickerProps) {
  const [showAll, setShowAll] = useState(false);
  const [customInput, setCustomInput] = useState("");
  const [showCustom, setShowCustom] = useState(false);
  const [dbCategories, setDbCategories] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  // Fetch categories from Supabase
  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch("/api/categories");
      const data = await res.json();
      if (data.categories) setDbCategories(data.categories);
    } catch {
      // silent fallback
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // Merge static + DB categories, dedupe
  const allCats = Array.from(new Set([...BOOK_CATEGORIES, ...dbCategories]));

  const popular = allCats.slice(0, 12);
  const rest = allCats.slice(12);

  function toggleCategory(cat: string) {
    if (value === cat) {
      onChange("");
    } else {
      onChange(cat);
    }
  }

  async function addCustom() {
    const trimmed = customInput.trim();
    if (!trimmed) return;
    setSaving(true);
    try {
      // POST to Supabase via API
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      const data = await res.json();
      if (!res.ok && data.error) {
        // Table might not exist — still set locally
        onChange(trimmed);
      } else {
        // Success — add to local list
        setDbCategories((prev) =>
          prev.includes(trimmed) ? prev : [...prev, trimmed]
        );
        onChange(trimmed);
      }
    } catch {
      onChange(trimmed);
    } finally {
      setSaving(false);
      setShowCustom(false);
      setCustomInput("");
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="label">{label}</label>
        <button
          type="button"
          onClick={() => setShowCustom(!showCustom)}
          className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1"
        >
          <Plus className="w-3 h-3" />
          Kategori Baru
        </button>
      </div>

      {showCustom && (
        <div className="flex gap-2">
          <input
            type="text"
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCustom())}
            placeholder="Ketik kategori baru..."
            className="input-field flex-1 text-sm"
            autoFocus
            disabled={saving}
          />
          <button
            type="button"
            onClick={addCustom}
            disabled={saving || !customInput.trim()}
            className="btn-primary text-sm px-3"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
          </button>
        </div>
      )}

      <div className={`flex flex-wrap gap-1.5 ${compact ? "max-h-32 overflow-y-auto" : ""}`}>
        {showAllOption && (
          <button
            type="button"
            onClick={() => toggleCategory("")}
            className={clsx(
              "px-2.5 py-1 rounded-full text-xs font-medium transition-all",
              value === ""
                ? "bg-brand-600 text-white shadow-sm"
                : "bg-brand-50 text-brand-600 hover:bg-brand-100"
            )}
          >
            Semua
          </button>
        )}

        {value && !allCats.includes(value) && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-brand-600 text-white text-xs font-semibold">
            {value}
            <button type="button" onClick={() => onChange("")}>
              <X className="w-3 h-3" />
            </button>
          </span>
        )}

        {popular.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => toggleCategory(cat)}
            className={clsx(
              "px-2.5 py-1 rounded-full text-xs font-medium transition-all cursor-pointer",
              value === cat
                ? "bg-brand-600 text-white shadow-sm"
                : "bg-brand-50 text-brand-600 hover:bg-brand-100"
            )}
          >
            {cat}
          </button>
        ))}

        {showAll &&
          rest.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => toggleCategory(cat)}
              className={clsx(
                "px-2.5 py-1 rounded-full text-xs font-medium transition-all cursor-pointer",
                value === cat
                  ? "bg-brand-600 text-white shadow-sm"
                  : "bg-brand-50 text-brand-600 hover:bg-brand-100"
              )}
            >
              {cat}
            </button>
          ))}
      </div>

      {rest.length > 0 && (
        <button
          type="button"
          onClick={() => setShowAll(!showAll)}
          className="text-xs text-brand-500 hover:text-brand-700 font-medium"
        >
          {showAll ? "↑ Sembunyikan" : `↓ Lihat semua (${rest.length} lagi)`}
        </button>
      )}
    </div>
  );
}
