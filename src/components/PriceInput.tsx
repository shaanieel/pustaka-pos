"use client";

import { parseFormattedNumber, formatNumber } from "@/lib/utils";

interface PriceInputProps {
  value: string;
  onChange: (raw: string) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
  id?: string;
}

export function PriceInput({
  value,
  onChange,
  label = "Harga (Rp)",
  placeholder = "0",
  required = false,
  id,
}: PriceInputProps) {
  // Tampilkan nilai terformat dengan titik ribuan
  const displayValue = value ? formatNumber(value) : value;

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    // Hanya angka yang boleh
    const raw = e.target.value.replace(/[^0-9]/g, "");
    onChange(raw);
  }

  return (
    <div>
      {label && <label className="label" htmlFor={id}>{label}</label>}
      <input
        id={id}
        type="text"
        inputMode="numeric"
        pattern="[0-9.]*"
        className="input-field"
        placeholder={placeholder}
        value={displayValue}
        onChange={handleChange}
        required={required}
      />
    </div>
  );
}
