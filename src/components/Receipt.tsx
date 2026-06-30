"use client";

import { useRef, useCallback } from "react";
import { toPng, toJpeg } from "html-to-image";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { Order, OrderItem } from "@/types";
import { formatRupiah } from "@/lib/utils";
import { Printer, FileImage, FileText, X } from "lucide-react";
import toast from "react-hot-toast";

interface ReceiptProps {
  order: Order;
  items: OrderItem[];
  customerName: string;
  paymentAmount: number;
  changeAmount: number;
  onClose: () => void;
  cashierName?: string;
  paymentMethod?: string;
}

const STORE = {
  name: "BUNAYYA PUTRA",
  subtitle: "Grosir Al-Qur'an dan Buku-Buku Islam",
  address: "JL. CEMPAKA NO. 91 A/91 B",
  city: "PEKANBARU — RIAU",
  whatsapp: "0812-7012-9971",
  website: "bunayyaputra.com",
  instagram: "@bunayyaputra",
};

// ── Header Logo (recolored to brand green) ──
function StoreLogo({ className = "w-12 h-auto" }: { className?: string }) {
  return (
    <img
      src="/logo-green-hue.png"
      alt="Bunayya Putra"
      className={className}
    />
  );
}

// ── Ikon SVG ──
function Ico({ name, className = "w-3.5 h-3.5 text-brand-600 shrink-0" }: { name: string; className?: string }) {
  const cls = className;
  switch (name) {
    case "map":
      return <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>;
    case "wa":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="#25D366" stroke="none">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
        </svg>
      );
    case "receipt":
      return <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1-2-1Z" /><path d="M8 7h8" /><path d="M8 11h8" /><path d="M8 15h5" /></svg>;
    case "calendar":
      return <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>;
    case "clock":
      return <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>;
    case "user":
      return <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>;
    case "wallet":
      return <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" /><path d="M3 5v14a2 2 0 0 0 2 2h16v-5" /><path d="M18 12a2 2 0 0 0 0 4h4v-4Z" /></svg>;
    case "globe":
      return <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>;
    case "ig":
      return <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5" /><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" /><line x1="17.5" y1="6.5" x2="17.51" y2="6.5" /></svg>;
    case "book-open":
      return <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" /></svg>;
    default:
      return null;
  }
}

export function Receipt({
  order,
  items,
  customerName,
  paymentAmount,
  changeAmount,
  onClose,
  cashierName = "Admin",
  paymentMethod = "Tunai",
}: ReceiptProps) {
  const receiptRef = useRef<HTMLDivElement>(null);

  // ─── Download JPG / PNG ─────────────────────────────────
  const downloadImage = useCallback(
    async (format: "jpg" | "png") => {
      if (!receiptRef.current) return;
      try {
        const dataUrl =
          format === "png"
            ? await toPng(receiptRef.current, { quality: 1, pixelRatio: 2 })
            : await toJpeg(receiptRef.current, { quality: 0.95, pixelRatio: 2 });
        const link = document.createElement("a");
        link.download = `struk-${order.id.slice(0, 8)}.${format}`;
        link.href = dataUrl;
        link.click();
        toast.success(`Struk terdownload sebagai ${format.toUpperCase()}`);
      } catch {
        toast.error("Gagal download struk");
      }
    },
    [order.id],
  );

  // ─── Download PDF ──────────────────────────────────────
  const downloadPDF = useCallback(async () => {
    if (!receiptRef.current) return;
    try {
      const canvas = await html2canvas(receiptRef.current, {
        scale: 2, useCORS: true, backgroundColor: "#ffffff", logging: false,
      });
      const imgData = canvas.toDataURL("image/png");
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const pdfWidth = 80;
      const pdfHeight = (imgHeight / imgWidth) * pdfWidth;
      const pdf = new jsPDF({
        orientation: pdfHeight > pdfWidth ? "portrait" : "landscape",
        unit: "mm", format: [pdfWidth, pdfHeight],
      });
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`struk-${order.id.slice(0, 8)}.pdf`);
      toast.success("Struk terdownload sebagai PDF");
    } catch {
      toast.error("Gagal download PDF");
    }
  }, [order.id]);

  // ─── Cetak ────────────────────────────────────────────
  const handlePrint = useCallback(async () => {
    if (!receiptRef.current) return;
    try {
      const canvas = await html2canvas(receiptRef.current, {
        scale: 2, useCORS: true, backgroundColor: "#ffffff", logging: false,
      });
      const imgData = canvas.toDataURL("image/png");
      const printWindow = window.open("", "_blank");
      if (!printWindow) return;
      printWindow.document.write(`
        <!DOCTYPE html><html><head><title>Cetak Struk — ${STORE.name}</title>
        <style>@page{margin:0}*{margin:0;padding:0}body{display:flex;justify-content:center;background:#fff}img{max-width:100%;height:auto;display:block}</style>
        </head><body><img src="${imgData}" alt="Struk" /></body></html>
      `);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => printWindow.print(), 500);
    } catch {
      toast.error("Gagal mencetak");
    }
  }, []);

  const paidAmount = order.paid_amount ?? (paymentAmount > 0 ? paymentAmount : order.final_amount);
  const change = paidAmount > order.final_amount ? paidAmount - order.final_amount : 0;
  const remaining = order.final_amount - paidAmount;

  // Payment status display
  const payStatus = order.payment_status || (paidAmount >= order.final_amount ? "lunas" : "belum_bayar");
  const statusConfig = {
    lunas: { label: "LUNAS", color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200" },
    belum_bayar: { label: "BELUM BAYAR", color: "text-red-600", bg: "bg-red-50", border: "border-red-200" },
    belum_lunas: { label: "BELUM LUNAS", color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200" },
  };
  const st = statusConfig[payStatus] || statusConfig.lunas;

  const dateFormatted = order.created_at
    ? new Date(order.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })
    : "";
  const timeFormatted = order.created_at
    ? new Date(order.created_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
    : "";

  // QR code URL (user asked about QRIS — current is website QR)
  const qrDataUrl = `https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(`https://${STORE.website}`)}`;

  const receiptId = order.id.slice(0, 8).toUpperCase();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-scale-in">
      <div className="bg-white rounded-3xl shadow-float w-full max-w-md max-h-[93vh] overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto overscroll-contain">
          <div ref={receiptRef} id="receipt-content" className="bg-white font-sans">
            {/* Close */}
            <div className="flex justify-end px-6 pt-4 pb-0" data-html2canvas-ignore="true">
              <button onClick={onClose} className="p-2 rounded-xl hover:bg-brand-50 text-brand-400 hover:text-brand-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* ═══════════════════ HEADER ═══════════════════ */}
            <div className="px-6 pb-3 text-center">
              <div className="flex justify-center mb-2">
                <StoreLogo className="w-14 h-auto" />
              </div>
              <h2 className="text-xl font-extrabold text-brand-800 tracking-wider uppercase">
                {STORE.name}
              </h2>
              <p className="text-[11px] font-semibold text-brand-500 mt-0.5">
                {STORE.subtitle}
              </p>
              {/* Alamat */}
              <div className="flex items-center justify-center gap-1 text-[10px] text-brand-400 mt-2">
                <Ico name="map" className="w-3 h-3 text-brand-400 shrink-0" />
                <span>{STORE.address}, {STORE.city}</span>
              </div>
              {/* WhatsApp (no "HP:" prefix) */}
              <div className="flex items-center justify-center gap-1 text-[10px] text-brand-400 mt-0.5">
                <Ico name="wa" className="w-3.5 h-3.5 shrink-0" />
                <span>{STORE.whatsapp}</span>
              </div>
            </div>

            {/* ── Divider ── */}
            <div className="px-6"><hr className="border-t border-brand-200" /></div>

            {/* ═══════════════ INFO TRANSAKSI ═══════════════ */}
            <div className="px-6 py-3">
              <h3 className="text-[11px] font-bold text-brand-600 uppercase tracking-wider mb-2">
                Informasi Transaksi
              </h3>
              {/* Dua kolom dengan vertical divider */}
              <div className="relative flex">
                {/* Kolom kiri: No. Struk, Tanggal, Waktu */}
                <div className="flex-1 space-y-2 pr-3">
                  <div className="flex items-center gap-1.5">
                    <Ico name="receipt" />
                    <div className="flex items-baseline gap-1">
                      <span className="text-[11px] text-brand-500">No. Struk</span>
                      <span className="text-[11px] font-bold text-brand-800">#{receiptId}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Ico name="calendar" />
                    <div className="flex items-baseline gap-1">
                      <span className="text-[11px] text-brand-500">Tanggal</span>
                      <span className="text-[11px] font-bold text-brand-800">{dateFormatted}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Ico name="clock" />
                    <div className="flex items-baseline gap-1">
                      <span className="text-[11px] text-brand-500">Waktu</span>
                      <span className="text-[11px] font-bold text-brand-800">{timeFormatted}</span>
                    </div>
                  </div>
                </div>

                {/* Vertical divider */}
                <div className="w-px bg-brand-200 shrink-0" />

                {/* Kolom kanan: Pelanggan, Kasir, Metode Bayar */}
                <div className="flex-1 space-y-2 pl-3">
                  <div className="flex items-center gap-1.5">
                    <Ico name="user" />
                    <div className="flex items-baseline gap-1">
                      <span className="text-[11px] text-brand-500">Pelanggan</span>
                      <span className="text-[11px] font-bold text-brand-800">{customerName}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Ico name="user" />
                    <div className="flex items-baseline gap-1">
                      <span className="text-[11px] text-brand-500">Kasir</span>
                      <span className="text-[11px] font-bold text-brand-800">{cashierName}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Ico name="wallet" />
                    <div className="flex items-baseline gap-1">
                      <span className="text-[11px] text-brand-500">Metode Bayar</span>
                      <span className="text-[11px] font-bold text-brand-800">{paymentMethod}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Divider ── */}
            <div className="px-6"><hr className="border-t border-brand-200" /></div>

            {/* ═══════════════ ITEM TABLE ═══════════════ */}
            <div className="px-6 py-3">
              <div className="grid gap-1 text-[10px] font-bold text-brand-500 uppercase tracking-wider mb-1"
                   style={{ gridTemplateColumns: "24px 1fr 32px 62px 62px" }}>
                <span className="text-center">No.</span>
                <span>Produk</span>
                <span className="text-center">Qty</span>
                <span className="text-right">Harga</span>
                <span className="text-right pr-0.5">Jumlah</span>
              </div>
              <hr className="border-t border-brand-200 mb-1" />
              <div className="space-y-0.5">
                {items.map((item, i) => (
                  <div key={item.id || i} className="grid gap-1 text-[12px] items-start py-0.5"
                       style={{ gridTemplateColumns: "24px 1fr 32px 62px 62px" }}>
                    <span className="text-center text-brand-400 pt-px">{i + 1}.</span>
                    <span className="text-brand-800 font-semibold leading-snug break-words pt-px">{item.book_title}</span>
                    <span className="text-center text-brand-600 font-medium pt-px">{item.quantity}</span>
                    <span className="text-right text-brand-600 pt-px">{formatRupiah(item.price_at_time).replace("Rp", "")}</span>
                    <span className="text-right text-brand-800 font-bold pt-px pr-0.5">{formatRupiah(item.subtotal).replace("Rp", "")}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Divider ── */}
            <div className="px-6"><hr className="border-t border-brand-200" /></div>

            {/* ═══════════════ TOTALS ═══════════════ */}
            <div className="px-6 py-3 space-y-1.5">
              <div className="flex justify-between text-[13px]">
                <span className="text-brand-500">Subtotal</span>
                <span className="font-semibold text-brand-700">{formatRupiah(order.total_amount)}</span>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between text-[13px]">
                  <span className="text-brand-500">Diskon</span>
                  <span className="font-bold text-red-500">-{formatRupiah(order.discount)}</span>
                </div>
              )}
              <hr className="border-t border-dashed border-brand-300" />
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold text-brand-800 uppercase tracking-wider">Total</span>
                <span className="text-lg font-black text-brand-700">{formatRupiah(order.final_amount)}</span>
              </div>

              {/* Status pembayaran badge */}
              <div className={`mt-2 mb-1 ${st.bg} ${st.border} border rounded-lg px-3 py-1.5 flex items-center justify-between`}>
                <span className={`text-[11px] font-bold ${st.color} uppercase tracking-wider`}>
                  ● {st.label}
                </span>
                <span className="text-[11px] font-semibold text-brand-600">
                  {paymentMethod}
                </span>
              </div>

              <div className="flex justify-between text-[13px]">
                <span className="text-brand-500">Dibayar</span>
                <span className="font-semibold text-brand-700">{formatRupiah(paidAmount)}</span>
              </div>
              {change > 0 && (
                <div className="flex justify-between text-[13px]">
                  <span className="text-brand-500">Kembalian</span>
                  <span className="font-bold text-brand-800">{formatRupiah(change)}</span>
                </div>
              )}
              {remaining > 0 && (
                <div className="flex justify-between text-[13px]">
                  <span className="text-amber-600 font-semibold">Sisa Hutang</span>
                  <span className="font-bold text-amber-700">{formatRupiah(remaining)}</span>
                </div>
              )}
            </div>

            {/* ── Divider ── */}
            <div className="px-6"><hr className="border-t border-brand-200" /></div>

            {/* ═══════════════ QR + TERIMA KASIH ═══════════════ */}
            <div className="px-6 pt-3 pb-2 text-center">
              <div className="flex items-center justify-center gap-4">
                <div className="w-[75px] h-[75px] rounded-lg overflow-hidden border border-brand-200 p-0.5 bg-white">
                  <img src={qrDataUrl} alt="QR" className="w-full h-full object-contain" crossOrigin="anonymous" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold text-brand-700 leading-tight">Terima kasih 🙏</p>
                  <p className="text-[11px] text-brand-500 mt-0.5 leading-snug">Telah berbelanja di {STORE.name}</p>
                  <p className="text-[11px] text-brand-500 leading-snug">Semoga bermanfaat 😊</p>
                </div>
              </div>
            </div>

            {/* Contact info */}
            <div className="px-6 pb-3 text-center">
              <p className="text-[10px] font-bold text-brand-400 uppercase tracking-wider mb-1">Kunjungi kami di:</p>
              <div className="flex items-center justify-center gap-3 text-[10px] text-brand-500">
                <span className="flex items-center gap-0.5"><Ico name="globe" className="w-3 h-3 text-brand-400" /> {STORE.website}</span>
                <span className="flex items-center gap-0.5"><Ico name="ig" className="w-3 h-3 text-brand-400" /> {STORE.instagram}</span>
                <span className="flex items-center gap-0.5"><Ico name="map" className="w-3 h-3 text-brand-400" /> Pekanbaru</span>
              </div>
            </div>

            {/* ═══════════════ FOOTER ═══════════════ */}
            <div className="bg-brand-800 px-6 py-4 text-center">
              <Ico name="book-open" className="w-5 h-5 text-brand-300 mx-auto mb-1" />
              <p className="text-xs font-medium text-brand-200 italic leading-relaxed">&ldquo;Ilmu adalah kehidupan hati.&rdquo;</p>
              <p className="text-[10px] text-brand-400 mt-0.5">&mdash; Imam Al-Ghazali</p>
            </div>
          </div>
        </div>

        {/* ═══════════════ ACTION BAR ═══════════════ */}
        <div className="px-6 pb-6 pt-3 space-y-2 border-t border-brand-100 bg-white" data-html2canvas-ignore="true">
          <div className="flex gap-2">
            <button onClick={() => downloadImage("jpg")} className="btn-secondary flex-1 text-xs py-2"><FileImage className="w-4 h-4" /> JPG</button>
            <button onClick={() => downloadImage("png")} className="btn-secondary flex-1 text-xs py-2"><FileImage className="w-4 h-4" /> PNG</button>
            <button onClick={downloadPDF} className="btn-secondary flex-1 text-xs py-2"><FileText className="w-4 h-4" /> PDF</button>
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="btn-secondary flex-1">Tutup</button>
            <button onClick={handlePrint} className="btn-primary flex-1"><Printer className="w-4 h-4" /> Cetak</button>
          </div>
        </div>
      </div>
    </div>
  );
}