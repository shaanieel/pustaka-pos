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
  phone: "TELP. (0761) 7715424",
  mobile: "0812-7012-9971",
  website: "bunayyaputra.com",
  instagram: "@bunayyaputra",
};

// ── Inline SVG Logo: BP dalam buku terbuka (hijau) ──
function LogoGreen({ className = "w-12 h-auto" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 60 60"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Open book */}
      <path
        d="M8 12 C8 10 10 8 12 8 L28 8 C30 8 32 10 32 12 L32 48 C28 46 24 44 20 44 C16 44 12 46 8 48 Z"
        fill="#10B981"
        opacity="0.9"
      />
      <path
        d="M52 12 C52 10 50 8 48 8 L32 8 C30 8 28 10 28 12 L28 48 C32 46 36 44 40 44 C44 44 48 46 52 48 Z"
        fill="#059669"
        opacity="0.9"
      />
      {/* Spine */}
      <rect x="28" y="8" width="4" height="38" rx="1" fill="#047857" />
      {/* Pages */}
      <rect x="11" y="14" width="18" height="26" rx="1" fill="white" opacity="0.3" />
      <rect x="31" y="14" width="18" height="26" rx="1" fill="white" opacity="0.3" />
      {/* Text BP */}
      <text
        x="30"
        y="36"
        textAnchor="middle"
        fill="white"
        fontSize="16"
        fontWeight="bold"
        fontFamily="Inter, sans-serif"
        letterSpacing="1"
      >
        BP
      </text>
    </svg>
  );
}

// ── Ikon SVG mini untuk informasi transaksi ──
function IconReceipt() {
  return (
    <svg className="w-3.5 h-3.5 text-brand-600 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1-2-1Z" />
      <path d="M8 7h8" /><path d="M8 11h8" /><path d="M8 15h5" />
    </svg>
  );
}
function IconCalendar() {
  return (
    <svg className="w-3.5 h-3.5 text-brand-600 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}
function IconClock() {
  return (
    <svg className="w-3.5 h-3.5 text-brand-600 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}
function IconUser() {
  return (
    <svg className="w-3.5 h-3.5 text-brand-600 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}
function IconWallet() {
  return (
    <svg className="w-3.5 h-3.5 text-brand-600 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
      <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
      <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
    </svg>
  );
}
function IconMap() {
  return (
    <svg className="w-3.5 h-3.5 text-brand-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}
function IconGlobe() {
  return (
    <svg className="w-3.5 h-3.5 text-brand-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}
function IconInstagram() {
  return (
    <svg className="w-3.5 h-3.5 text-brand-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
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
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
      });

      const imgData = canvas.toDataURL("image/png");
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;

      const pdfWidth = 80;
      const pdfHeight = (imgHeight / imgWidth) * pdfWidth;

      const pdf = new jsPDF({
        orientation: pdfHeight > pdfWidth ? "portrait" : "landscape",
        unit: "mm",
        format: [pdfWidth, pdfHeight],
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
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
      });

      const imgData = canvas.toDataURL("image/png");
      const printWindow = window.open("", "_blank");
      if (!printWindow) return;

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Cetak Struk — ${STORE.name}</title>
          <style>
            @page { margin: 0; }
            * { margin: 0; padding: 0; }
            body { display: flex; justify-content: center; background: #fff; }
            img { max-width: 100%; height: auto; display: block; }
          </style>
        </head>
        <body>
          <img src="${imgData}" alt="Struk" />
        </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => printWindow.print(), 500);
    } catch {
      toast.error("Gagal mencetak");
    }
  }, []);

  const paidAmount = paymentAmount > 0 ? paymentAmount : order.final_amount;
  const change = paymentAmount > 0 ? changeAmount : 0;

  const dateFormatted = order.created_at
    ? new Date(order.created_at).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "";
  const timeFormatted = order.created_at
    ? new Date(order.created_at).toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  // QR data — store website
  const qrDataUrl = `https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(`https://${STORE.website}`)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-scale-in">
      <div className="bg-white rounded-3xl shadow-float w-full max-w-md max-h-[93vh] overflow-hidden flex flex-col">
        {/* Receipt content — scrollable */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          <div
            ref={receiptRef}
            id="receipt-content"
            className="bg-white font-sans"
          >
            {/* ── Close button (hidden in export) ── */}
            <div
              className="flex justify-end px-6 pt-4 pb-0"
              data-html2canvas-ignore="true"
            >
              <button
                onClick={onClose}
                className="p-2 rounded-xl hover:bg-brand-50 text-brand-400 hover:text-brand-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* ═══════════════════ HEADER ═══════════════════ */}
            <div className="px-6 pb-4 text-center">
              <div className="flex justify-center mb-2">
                <LogoGreen className="w-14 h-auto" />
              </div>
              <h2 className="text-xl font-extrabold text-brand-800 tracking-wider uppercase">
                {STORE.name}
              </h2>
              <p className="text-[11px] font-semibold text-brand-500 mt-0.5">
                {STORE.subtitle}
              </p>
              <div className="flex items-center justify-center gap-1 text-[10px] text-brand-400 mt-1">
                <IconMap />
                <span className="font-medium">
                  {STORE.address}, {STORE.city}
                </span>
              </div>
              <div className="flex items-center justify-center gap-1 text-[10px] text-brand-400">
                <svg className="w-3 h-3 text-brand-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
                <span>{STORE.phone} &middot; HP: {STORE.mobile}</span>
              </div>
            </div>

            {/* ── Divider ── */}
            <div className="px-6">
              <hr className="border-t border-brand-200" />
            </div>

            {/* ═══════════════ INFO TRANSAKSI ═══════════════ */}
            <div className="px-6 py-3">
              <h3 className="text-[11px] font-bold text-brand-600 uppercase tracking-wider mb-2">
                Informasi Transaksi
              </h3>
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center gap-2">
                  <IconReceipt />
                  <span className="text-brand-400 w-[75px] shrink-0">No. Struk</span>
                  <span className="font-bold text-brand-800">
                    #{order.id.slice(0, 8).toUpperCase()}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <IconCalendar />
                  <span className="text-brand-400 w-[75px] shrink-0">Tanggal</span>
                  <span className="font-medium text-brand-700">{dateFormatted}</span>
                </div>
                <div className="flex items-center gap-2">
                  <IconClock />
                  <span className="text-brand-400 w-[75px] shrink-0">Waktu</span>
                  <span className="font-medium text-brand-700">{timeFormatted}</span>
                </div>
                <div className="flex items-center gap-2">
                  <IconUser />
                  <span className="text-brand-400 w-[75px] shrink-0">Pelanggan</span>
                  <span className="font-medium text-brand-700">{customerName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <IconUser />
                  <span className="text-brand-400 w-[75px] shrink-0">Kasir</span>
                  <span className="font-medium text-brand-700">{cashierName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <IconWallet />
                  <span className="text-brand-400 w-[75px] shrink-0">Bayar</span>
                  <span className="font-medium text-brand-700">{paymentMethod}</span>
                </div>
              </div>
            </div>

            {/* ── Divider ── */}
            <div className="px-6">
              <hr className="border-t border-brand-200" />
            </div>

            {/* ═══════════════ ITEM TABLE ═══════════════ */}
            <div className="px-6 py-3">
              {/* Table Header */}
              <div
                className="grid gap-1 text-[10px] font-bold text-brand-500 uppercase tracking-wider mb-1"
                style={{ gridTemplateColumns: "24px 1fr 32px 62px 62px" }}
              >
                <span className="text-center">No.</span>
                <span className="pl-0.5">Produk</span>
                <span className="text-center">Qty</span>
                <span className="text-right">Harga</span>
                <span className="text-right pr-0.5">Jumlah</span>
              </div>

              {/* Divider */}
              <hr className="border-t border-brand-200 mb-1" />

              {/* Items */}
              <div className="space-y-0.5">
                {items.map((item, i) => (
                  <div
                    key={item.id || i}
                    className="grid gap-1 text-[12px] items-start py-0.5"
                    style={{ gridTemplateColumns: "24px 1fr 32px 62px 62px" }}
                  >
                    <span className="text-center text-brand-400 pt-px">{i + 1}.</span>
                    <span className="text-brand-800 font-semibold leading-snug break-words pt-px">
                      {item.book_title}
                    </span>
                    <span className="text-center text-brand-600 font-medium pt-px">{item.quantity}</span>
                    <span className="text-right text-brand-600 pt-px">
                      {formatRupiah(item.price_at_time).replace("Rp", "")}
                    </span>
                    <span className="text-right text-brand-800 font-bold pt-px pr-0.5">
                      {formatRupiah(item.subtotal).replace("Rp", "")}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Divider ── */}
            <div className="px-6">
              <hr className="border-t border-brand-200" />
            </div>

            {/* ═══════════════ TOTALS ═══════════════ */}
            <div className="px-6 py-3 space-y-1.5">
              {/* Subtotal */}
              <div className="flex justify-between text-[13px]">
                <span className="text-brand-500">Subtotal</span>
                <span className="font-semibold text-brand-700">
                  {formatRupiah(order.total_amount)}
                </span>
              </div>

              {/* Diskon */}
              {order.discount > 0 && (
                <div className="flex justify-between text-[13px]">
                  <span className="text-brand-500">Diskon</span>
                  <span className="font-bold text-red-500">
                    -{formatRupiah(order.discount)}
                  </span>
                </div>
              )}

              {/* Divider */}
              <hr className="border-t border-dashed border-brand-300" />

              {/* Total */}
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold text-brand-800 uppercase tracking-wider">
                  Total
                </span>
                <span className="text-lg font-black text-brand-700">
                  {formatRupiah(order.final_amount)}
                </span>
              </div>

              {/* Bayar */}
              <div className="flex justify-between text-[13px]">
                <span className="text-brand-500">Bayar</span>
                <span className="font-semibold text-brand-700">
                  {formatRupiah(paidAmount)}
                </span>
              </div>

              {/* Kembalian */}
              <div className="flex justify-between text-[13px]">
                <span className="text-brand-500">Kembalian</span>
                <span className="font-bold text-brand-800">
                  {formatRupiah(change)}
                </span>
              </div>
            </div>

            {/* ── Divider ── */}
            <div className="px-6">
              <hr className="border-t border-brand-200" />
            </div>

            {/* ═══════════════ QR + TERIMA KASIH ═══════════════ */}
            <div className="px-6 pt-3 pb-2 text-center">
              <div className="flex items-center justify-center gap-4">
                {/* QR Code */}
                <div className="w-[75px] h-[75px] rounded-lg overflow-hidden border border-brand-200 p-0.5 bg-white">
                  <img
                    src={qrDataUrl}
                    alt="QR Code"
                    className="w-full h-full object-contain"
                    crossOrigin="anonymous"
                  />
                </div>

                {/* Thank You */}
                <div className="text-left">
                  <p className="text-sm font-bold text-brand-700 leading-tight">
                    Terima kasih 🙏
                  </p>
                  <p className="text-[11px] text-brand-500 mt-0.5 leading-snug">
                    Telah berbelanja di {STORE.name}
                  </p>
                  <p className="text-[11px] text-brand-500 leading-snug">
                    Semoga bermanfaat 😊
                  </p>
                </div>
              </div>
            </div>

            {/* Contact Info */}
            <div className="px-6 pb-3 text-center">
              <p className="text-[10px] font-bold text-brand-400 uppercase tracking-wider mb-1">
                Kunjungi kami di:
              </p>
              <div className="flex items-center justify-center gap-3 text-[10px] text-brand-500">
                <span className="flex items-center gap-0.5">
                  <IconGlobe /> {STORE.website}
                </span>
                <span className="flex items-center gap-0.5">
                  <IconInstagram /> {STORE.instagram}
                </span>
                <span className="flex items-center gap-0.5">
                  <IconMap /> Pekanbaru
                </span>
              </div>
            </div>

            {/* ═══════════════ FOOTER ═══════════════ */}
            <div className="bg-brand-800 px-6 py-4 text-center">
              <svg
                className="w-5 h-5 text-brand-300 mx-auto mb-1"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                {/* Open book icon */}
                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
              </svg>
              <p className="text-xs font-medium text-brand-200 italic leading-relaxed">
                &ldquo;Ilmu adalah kehidupan hati.&rdquo;
              </p>
              <p className="text-[10px] text-brand-400 mt-0.5">
                &mdash; Imam Al-Ghazali
              </p>
            </div>
          </div>
        </div>

        {/* ═══════════════ ACTION BAR ═══════════════ */}
        <div
          className="px-6 pb-6 pt-3 space-y-2 border-t border-brand-100 bg-white"
          data-html2canvas-ignore="true"
        >
          <div className="flex gap-2">
            <button
              onClick={() => downloadImage("jpg")}
              className="btn-secondary flex-1 text-xs py-2"
            >
              <FileImage className="w-4 h-4" />
              JPG
            </button>
            <button
              onClick={() => downloadImage("png")}
              className="btn-secondary flex-1 text-xs py-2"
            >
              <FileImage className="w-4 h-4" />
              PNG
            </button>
            <button
              onClick={downloadPDF}
              className="btn-secondary flex-1 text-xs py-2"
            >
              <FileText className="w-4 h-4" />
              PDF
            </button>
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="btn-secondary flex-1">
              Tutup
            </button>
            <button onClick={handlePrint} className="btn-primary flex-1">
              <Printer className="w-4 h-4" />
              Cetak
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
