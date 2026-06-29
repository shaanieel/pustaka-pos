"use client";

import { useRef, useCallback } from "react";
import { toPng, toJpeg } from "html-to-image";
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
}

const STORE = {
  name: "BUNAYYA PUTRA",
  subtitle: "Grosir Al-Qur'an dan Buku-Buku Islam",
  address: "JL. CEMPAKA NO. 91 A/91 B",
  city: "PEKANBARU — RIAU",
  phone: "TELP. (0761) 7715424",
  mobile: "0812-7012-9971",
};

export function Receipt({
  order,
  items,
  customerName,
  paymentAmount,
  changeAmount,
  onClose,
}: ReceiptProps) {
  const receiptRef = useRef<HTMLDivElement>(null);

  const downloadImage = useCallback(async (format: "jpg" | "png") => {
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
  }, [order.id]);

  const downloadPDF = useCallback(() => {
    if (!receiptRef.current) return;
    const cloned = receiptRef.current.cloneNode(true) as HTMLElement;
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Struk — ${STORE.name}</title>
        <style>
          @page { margin: 10px; size: auto; }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
            font-size: 13px;
            color: #022C22;
            background: #fff;
            padding: 14px;
            max-width: 400px;
            margin: 0 auto;
          }
          body * { font-family: inherit !important; }
          img[alt="logo"] { width: 56px; height: auto; display: block; margin: 0 auto 10px; }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .font-extrabold { font-weight: 800; }
          .font-bold { font-weight: 700; }
          .font-semibold { font-weight: 600; }
          .text-xs { font-size: 10px; }
          .text-sm { font-size: 12px; }
          .text-base { font-size: 14px; }
          .text-lg { font-size: 16px; }
          .text-xl { font-size: 18px; }
          .border-dashed { border-style: dashed; }
          .border-t-2 { border-top-width: 2px; }
          .border-t { border-top-width: 1px; }
          .pt-2 { padding-top: 8px; }
          .pt-3 { padding-top: 12px; }
          .pt-4 { padding-top: 16px; }
          .pb-4 { padding-bottom: 16px; }
          .mb-3 { margin-bottom: 12px; }
          .mb-4 { margin-bottom: 16px; }
          .mt-2 { margin-top: 8px; }
          .mt-3 { margin-top: 12px; }
          .mt-5 { margin-top: 20px; }
          .space-y-1 > * + * { margin-top: 4px; }
          .space-y-1d5 > * + * { margin-top: 6px; }
          .flex { display: flex; }
          .justify-between { justify-content: space-between; }
          .grid { display: grid; }
          .gap-1 { gap: 4px; }
          .tracking-widest { letter-spacing: 0.1em; }
          .tracking-wider { letter-spacing: 0.05em; }
          .uppercase { text-transform: uppercase; }
          .leading-relaxed { line-height: 1.6; }
        </style>
      </head>
      <body>${cloned.outerHTML}</body>
      </html>
    `;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 400);
  }, [order.id]);

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-scale-in">
      <div className="bg-white rounded-3xl shadow-float w-full max-w-md max-h-[93vh] overflow-hidden flex flex-col">
        {/* Receipt content — scrollable */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          <div
            ref={receiptRef}
            id="receipt-content"
            className="p-6 font-sans bg-white"
          >
            {/* Close button */}
            <div className="flex justify-end -mt-2 -mr-2 mb-3">
              <button
                onClick={onClose}
                className="p-2 rounded-xl hover:bg-brand-50 text-brand-400 hover:text-brand-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* ═════ HEADER ═════ */}
            <div className="text-center border-b-2 border-dashed border-brand-200 pb-4 mb-4">
              <img
                src="/logo.png"
                alt="logo"
                className="w-14 h-auto mx-auto mb-2"
              />
              <h2 className="text-xl font-extrabold text-brand-900 tracking-widest uppercase">
                {STORE.name}
              </h2>
              <p className="text-[11px] font-semibold text-brand-600 mt-0.5">
                {STORE.subtitle}
              </p>
              <p className="text-[10px] text-brand-400 mt-1 uppercase tracking-wider leading-relaxed">
                {STORE.address}, {STORE.city}
                <br />
                {STORE.phone} &middot; HP: {STORE.mobile}
              </p>
              <p className="text-[11px] font-semibold text-brand-500 mt-2">
                {dateFormatted} &middot; {timeFormatted}
              </p>
            </div>

            {/* ═════ INFO ═════ */}
            <div className="text-xs text-brand-700 space-y-1 mb-4">
              <div className="flex justify-between">
                <span className="text-brand-400">No. Faktur</span>
                <span className="font-bold text-brand-800">
                  #{order.id.slice(0, 8).toUpperCase()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-brand-400">Pelanggan</span>
                <span className="font-semibold">{customerName}</span>
              </div>
            </div>

            {/* ═════ TABLE HEADER ═════ */}
            <div className="border-b-2 border-dashed border-brand-200 pb-1.5 mb-1">
              <div className="grid grid-cols-[28px_1fr_62px_62px] gap-1 text-[10px] font-bold text-brand-500 uppercase tracking-wider">
                <span className="text-center">Qty</span>
                <span>JUDUL BUKU</span>
                <span className="text-right">BRUTTO</span>
                <span className="text-right">NETTO</span>
              </div>
            </div>

            {/* ═════ ITEMS ═════ */}
            <div className="space-y-1 mb-3">
              {items.map((item, i) => {
                const totalBrutto = item.subtotal;
                const discountPerItem =
                  order.discount > 0
                    ? Math.round((order.discount / items.length) * (i + 1)) -
                      Math.round((order.discount / items.length) * i)
                    : 0;
                const totalNetto = totalBrutto - discountPerItem;
                return (
                  <div
                    key={item.id || i}
                    className="grid grid-cols-[28px_1fr_62px_62px] gap-1 text-[12px]"
                  >
                    <span className="text-center text-brand-500 font-semibold">
                      {item.quantity}
                    </span>
                    <span className="text-brand-900 font-semibold truncate">
                      {item.book_title}
                    </span>
                    <span className="text-right text-brand-600 font-medium">
                      {formatRupiah(totalBrutto).replace("Rp", "")}
                    </span>
                    <span className="text-right text-brand-800 font-bold">
                      {formatRupiah(totalNetto).replace("Rp", "")}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* ═════ TOTALS ═════ */}
            <div className="border-t-2 border-dashed border-brand-200 pt-3 space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-brand-500 font-medium">BRUTTO (Total Kotor)</span>
                <span className="font-bold text-brand-800">
                  {formatRupiah(order.total_amount)}
                </span>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-brand-500 font-medium">Diskon</span>
                  <span className="font-bold text-red-500">
                    -{formatRupiah(order.discount)}
                  </span>
                </div>
              )}
              <div className="flex justify-between border-t-2 border-dashed border-brand-200 pt-2">
                <span className="text-base font-black text-brand-900 uppercase tracking-wider">
                  TOTAL NETTO
                </span>
                <span className="text-xl font-black text-brand-700">
                  {formatRupiah(order.final_amount)}
                </span>
              </div>
            </div>

            {/* ═════ PAYMENT ═════ */}
            <div className="mt-4 pt-3 border-t border-dashed border-brand-200 space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-brand-500 font-medium">Dibayar</span>
                <span className="font-bold text-brand-800">
                  {formatRupiah(paidAmount)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-brand-500 font-medium">Kembali</span>
                <span className="font-bold text-brand-700 text-base">
                  {formatRupiah(change)}
                </span>
              </div>
            </div>

            {/* ═════ FOOTER ═════ */}
            <div className="mt-5 pt-4 text-center border-t-2 border-dashed border-brand-200">
              <p className="text-sm font-bold text-brand-700 arabic-text">
                Syukron Jazakumullahu Khoiron 🙏
              </p>
              <p className="text-xs text-brand-400 mt-1.5 font-medium">
                Selamat datang kembali di {STORE.name} 😊
              </p>
            </div>
          </div>
        </div>

        {/* ═════ ACTION BAR ═════ */}
        <div className="px-6 pb-6 pt-3 space-y-2 border-t border-brand-100 bg-white">
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
            <button onClick={downloadPDF} className="btn-primary flex-1">
              <Printer className="w-4 h-4" />
              Cetak
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
