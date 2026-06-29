"use client";

import { useState, useRef, useEffect } from "react";
import { BOOK_CATEGORIES } from "@/lib/categories";
import { Plus, X, Check } from "lucide-react";
import { clsx } from "clsx";

interface CategoryPickerProps {
  value: string;
  onChange: (cat: string) => void;
  label?: string;
  compact?: boolean; // compact mode for order page
}

export function CategoryPicker({
  value,
  onChange,
  label = "Kategori",
  compact = false,
}: CategoryPickerProps) {
  const [showAll, setShowAll] = useState(false);
  const [customInput, setShowCustomInput] = useState("");
  const [showCustom, setShowCustom] = useState(false);

  // Show popular categories first, rest on expand
  const popular = BOOK_CATEGORIES.slice(0, 12);
  const rest = BOOK_CATEGORIES.slice(12);

  function toggleCategory(cat: string) {
    if (value === cat) {
      onChange("");
    } else {
      onChange(cat);
    }
  }

  function addCustom() {
    const trimmed = customInput.trim();
    if (trimmed) {
      onChange(trimmed);
      setShowCustom(false);
      setShowCustomInput("");
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

      {/* Custom category input */}
      {showCustom && (
        <div className="flex gap-2">
          <input
            type="text"
            value={customInput}
            onChange={(e) => setShowCustomInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCustom())}
            placeholder="Ketik kategori baru..."
            className="input-field flex-1 text-sm"
            autoFocus
          />
          <button
            type="button"
            onClick={addCustom}
            className="btn-primary text-sm px-3"
          >
            <Check className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Category chips */}
      <div className={`flex flex-wrap gap-1.5 ${compact ? "max-h-32 overflow-y-auto" : ""}`}>
        {/* Selected custom category (if not in list) */}
        {value && !BOOK_CATEGORIES.includes(value as any) && (
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
              "px-2.5 py-1 rounded-full text-xs font-medium transition-all",
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
                "px-2.5 py-1 rounded-full text-xs font-medium transition-all",
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
