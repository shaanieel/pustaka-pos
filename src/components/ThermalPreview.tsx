"use client";

import React from "react";

interface ThermalPreviewProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  order: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  items: any[];
  customerName?: string;
  paymentAmount: number;
  paymentMethod: string;
  paymentStatus: string;
  cashierName?: string;
  onPrint: () => void;
  onClose: () => void;
}

const STORE = {
  name: "BUNAYYA PUTRA",
  subtitle: "Grosir Al-Qur'an dan Buku-Buku Islam",
  address: "JL. CEMPAKA NO. 91 A/91 B",
  city: "PEKANBARU — RIAU",
  whatsapp: "0812-7012-9971",
  website: "bunayyaputra.com",
};

function fmt(n: number) {
  return "Rp" + n.toLocaleString("id-ID");
}

function statusLabel(s: string) {
  switch (s) {
    case "lunas": return "● LUNAS";
    case "belum_lunas": return "● BELUM LUNAS";
    case "belum_bayar": return "● BELUM BAYAR";
    default: return s.toUpperCase();
  }
}

export default function ThermalPreview({
  order, items, customerName, paymentAmount, paymentMethod, paymentStatus, cashierName, onPrint, onClose,
}: ThermalPreviewProps) {
  const paid = order.paid_amount ?? (paymentAmount > 0 ? paymentAmount : order.final_amount);
  const change = Math.max(0, paid - order.final_amount);
  const remaining = order.final_amount - paid;
  const finalAmount = order.final_amount;
  const discount = order.discount || 0;
  const totalAmount = order.total_amount;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=60x60&data=${encodeURIComponent("https://bunayyaputra.com")}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-2"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl overflow-hidden max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gray-900 text-white px-4 py-3 flex items-center justify-between">
          <h2 className="font-semibold text-sm">🖨️ Preview Cetak Thermal</h2>
          <span className="text-[10px] text-gray-400">58mm ESC/POS</span>
        </div>

        {/* Thermal Paper Preview */}
        <div className="flex justify-center bg-gray-100 py-4">
          <div
            className="bg-white shadow-inner"
            style={{
              width: "220px",
              maxWidth: "100%",
              fontFamily: "'Courier New', 'Liberation Mono', monospace",
              fontSize: "9px",
              lineHeight: "1.3",
              color: "#000",
              padding: "10px 6px",
            }}
          >
            {/* ═══ Logo ═══ */}
            <div className="text-center mb-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo-green-hue.png"
                alt="Logo"
                className="inline-block"
                style={{ width: "90px", height: "auto", filter: "grayscale(1) brightness(0.4)" }}
              />
            </div>

            {/* ═══ Store Info ═══ */}
            <div className="text-center font-bold text-xs leading-tight mb-0.5" style={{ fontSize: "11px" }}>
              {STORE.name}
            </div>
            <div className="text-center leading-tight mb-0.5">{STORE.subtitle}</div>
            <div className="text-center leading-tight">{STORE.address}</div>
            <div className="text-center leading-tight mb-0.5">{STORE.city}</div>
            <div className="text-center leading-tight mb-0.5">WA: {STORE.whatsapp}</div>
            <div className="text-center my-1" style={{ letterSpacing: "1px" }}>
              {"=".repeat(32)}
            </div>

            {/* ═══ Transaction Info ═══ */}
            <div className="leading-tight">
              <div>No. Struk: #{order.id?.substring(0, 8).toUpperCase()}</div>
              <div>Tanggal: {new Date(order.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</div>
              <div>Waktu  : {new Date(order.created_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}</div>
              <div>Pelanggan: {customerName || "Umum"}</div>
              <div>Kasir: {cashierName || "Admin"}</div>
              <div>Metode: {paymentMethod.toUpperCase()}</div>
            </div>
            <div className="text-center my-1">{"─".repeat(32)}</div>

            {/* ═══ Items ═══ */}
            <div className="font-bold leading-tight">#  Produk                  Qty  Harga</div>
            {items.map((item: any, i: number) => {
              const no = (i + 1).toString();
              const name = (item.book_title || item.name || "").length > 18
                ? (item.book_title || item.name || "").substring(0, 17) + "."
                : (item.book_title || item.name || "");
              const qtyStr = (item.quantity || item.qty).toString();
              const priceStr = (item.price_at_time || item.price).toLocaleString("id-ID");
              const leftPart = no + " " + name;
              const rightPart = qtyStr + "  " + priceStr;
              const pad = 32 - leftPart.length - rightPart.length;
              return <div key={i} className="leading-tight">{leftPart}{" ".repeat(Math.max(0, pad))}{rightPart}</div>;
            })}
            <div className="text-center my-1">{"─".repeat(32)}</div>

            {/* ═══ Totals ═══ */}
            <div className="leading-tight">Subtotal: {fmt(totalAmount)}</div>
            {discount > 0 && <div className="leading-tight">Diskon  : -{fmt(discount)}</div>}
            <div className="font-bold leading-tight">TOTAL   : {fmt(finalAmount)}</div>
            <div className="text-center my-1">{"=".repeat(32)}</div>

            {/* ═══ Payment Status ═══ */}
            <div className="text-center font-bold text-xs leading-tight mb-1" style={{ fontSize: "11px" }}>
              {statusLabel(paymentStatus)}
            </div>

            {/* ═══ Payment Detail ═══ */}
            <div className="leading-tight">Dibayar  : {fmt(paid)}</div>
            {change >= 0 && <div className="leading-tight">Kembali  : {fmt(change)}</div>}
            {remaining > 0 && <div className="leading-tight">Sisa     : {fmt(remaining)}</div>}
            <div className="text-center my-1">{"─".repeat(32)}</div>

            {/* ═══ QR Code ═══ */}
            <div className="text-center mb-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrUrl} alt="QR" className="inline-block" style={{ width: "60px", height: "60px" }} />
            </div>
            <div className="text-center leading-tight mb-1">Scan untuk website kami</div>

            {/* ═══ Footer ═══ */}
            <div className="text-center leading-tight">Terima kasih :)</div>
            <div className="text-center leading-tight">Telah berbelanja di</div>
            <div className="text-center font-bold leading-tight">{STORE.name}</div>
            <div className="text-center leading-tight">Semoga bermanfaat :)</div>
            <div className="text-center leading-tight mb-1">{STORE.website}</div>
            <div className="text-center" style={{ letterSpacing: "1px" }}>
              {"=".repeat(32)}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="px-4 py-3 flex gap-2 border-t border-gray-200">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-lg text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 transition"
          >
            Batal
          </button>
          <button
            onClick={onPrint}
            className="flex-1 py-2 rounded-lg text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition"
          >
            🖨️ Cetak Sekarang
          </button>
        </div>
      </div>
    </div>
  );
}
