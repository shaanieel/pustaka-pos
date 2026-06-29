"use client";

import { useRef } from "react";
import { Order, OrderItem } from "@/types";
import { formatRupiah } from "@/lib/utils";
import { Printer, X } from "lucide-react";

interface ReceiptProps {
  order: Order;
  items: OrderItem[];
  customerName: string;
  cashierName: string;
  paymentAmount: number;
  changeAmount: number;
  onClose: () => void;
}

export function Receipt({
  order,
  items,
  customerName,
  cashierName,
  paymentAmount,
  changeAmount,
  onClose,
}: ReceiptProps) {
  const receiptRef = useRef<HTMLDivElement>(null);

  function handlePrint() {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const logoBlock = `<img src="/logo.png" alt="Bunayya Putra" style="width:100px;height:auto;margin:0 auto 8px;display:block;" />`;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Struk Pembayaran — Bunayya Putra</title>
        <style>
          @page { margin: 0; size: 80mm auto; }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: 'Courier New', monospace;
            font-size: 11px;
            width: 80mm;
            padding: 10px 8px;
            color: #022C22;
            background: #fff;
          }
          .center { text-align: center; }
          .bold { font-weight: 700; }
          .divider { border-top: 1px dashed #022C22; margin: 6px 0; }
          .divider-solid { border-top: 1px solid #022C22; margin: 6px 0; }
          table { width: 100%; border-collapse: collapse; font-size: 10px; }
          th, td { padding: 2px 0; text-align: left; }
          th { border-bottom: 1px dashed #022C22; }
          .right { text-align: right; }
          .total-row td { border-top: 1px dashed #022C22; font-weight: 700; padding-top: 4px; }
          .store-name { font-size: 14px; font-weight: 800; letter-spacing: 1px; }
          .store-info { font-size: 9px; color: #555; }
          .col-qty { text-align: center; }
          .col-price { text-align: right; }
        </style>
      </head>
      <body>
        ${logoBlock}
        <div class="center store-name">BUNAYYA PUTRA</div>
        <div class="center store-info">Kasir Toko Buku</div>
        <div class="center store-info">${order.created_at ? new Date(order.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }) : ""}</div>
        <div class="divider"></div>
        <div style="margin:4px 0;font-size:10px;">
          <div>No: ${order.id.slice(0, 8).toUpperCase()}</div>
          <div>Kasir: ${cashierName}</div>
          <div>Pelanggan: ${customerName}</div>
        </div>
        <div class="divider"></div>
        <table>
          <thead>
            <tr>
              <th style="width:28px;">Qty</th>
              <th>Barang</th>
              <th class="right" style="width:50px;">Brutto</th>
              <th class="right" style="width:48px;">Netto</th>
            </tr>
          </thead>
          <tbody>
            ${items.map((item, i) => {
              const qty = item.quantity;
              const price = item.price_at_time;
              const subtotal = item.subtotal;
              const discountAmount = order.discount > 0 && i === items.length - 1
                ? Math.round(order.discount / items.length)
                : 0;
              const netto = subtotal - discountAmount;
              return `
              <tr>
                <td class="col-qty">${qty}x</td>
                <td>${item.book_title.length > 22 ? item.book_title.slice(0, 20) + ".." : item.book_title}</td>
                <td class="col-price">${formatRupiah(subtotal).replace("Rp", "")}</td>
                <td class="col-price">${formatRupiah(netto || subtotal).replace("Rp", "")}</td>
              </tr>
            `}).join("")}
          </tbody>
        </table>
        <div class="divider"></div>
        <table>
          <tr>
            <td>Brutto (Total Kotor)</td>
            <td class="right bold">${formatRupiah(order.total_amount).replace("Rp", "")}</td>
          </tr>
          ${order.discount > 0 ? `
          <tr>
            <td>Diskon</td>
            <td class="right bold">-${formatRupiah(order.discount).replace("Rp", "")}</td>
          </tr>
          ` : ""}
          <tr class="total-row">
            <td style="font-size:13px;padding-top:6px;">TOTAL (Netto)</td>
            <td class="right bold" style="font-size:13px;padding-top:6px;">${formatRupiah(order.final_amount).replace("Rp", "")}</td>
          </tr>
        </table>
        <div class="divider-solid"></div>
        <table>
          <tr>
            <td>Dibayar</td>
            <td class="right">${formatRupiah(paymentAmount).replace("Rp", "")}</td>
          </tr>
          <tr>
            <td>Kembali</td>
            <td class="right bold">${formatRupiah(changeAmount).replace("Rp", "")}</td>
          </tr>
        </table>
        <div class="divider"></div>
        <div class="center" style="margin-top:6px;font-size:9px;color:#555;">
          Terima kasih telah berbelanja<br/>
          Barang yang sudah dibeli tidak dapat dikembalikan<br/>
          <div style="margin-top:4px;">~ Bunayya Putra ~</div>
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 300);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-scale-in">
      <div className="bg-white rounded-3xl shadow-float max-w-sm w-full max-h-[90vh] overflow-y-auto">
        {/* Receipt Preview */}
        <div
          ref={receiptRef}
          className="p-6 font-mono text-sm"
        >
          {/* Close */}
          <div className="flex justify-end -mt-2 -mr-2 mb-2">
            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-brand-50 text-brand-400 hover:text-brand-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Header */}
          <div className="text-center border-b-2 border-dashed border-brand-200 pb-4 mb-4">
            <img
              src="/logo.png"
              alt="Bunayya Putra"
              className="w-20 h-auto mx-auto mb-2 opacity-90"
            />
            <h2 className="text-lg font-extrabold text-brand-900 tracking-widest">
              BUNAYYA PUTRA
            </h2>
            <p className="text-[11px] text-brand-500 font-medium">
              Kasir Toko Buku
            </p>
            <p className="text-[10px] text-brand-400 mt-1">
              {order.created_at
                ? new Date(order.created_at).toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : ""}
            </p>
          </div>

          {/* Info */}
          <div className="text-[11px] text-brand-700 space-y-0.5 mb-4">
            <div className="flex justify-between">
              <span className="text-brand-400">No</span>
              <span className="font-semibold">
                #{order.id.slice(0, 8).toUpperCase()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-brand-400">Kasir</span>
              <span className="font-semibold">{cashierName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-brand-400">Pelanggan</span>
              <span className="font-semibold">{customerName}</span>
            </div>
          </div>

          {/* Table Header */}
          <div className="border-b-2 border-dashed border-brand-200 pb-1.5 mb-1">
            <div className="grid grid-cols-[32px_1fr_60px_60px] gap-1 text-[10px] font-bold text-brand-500 uppercase tracking-wider">
              <span className="text-center">Qty</span>
              <span>Barang</span>
              <span className="text-right">Brutto</span>
              <span className="text-right">Netto</span>
            </div>
          </div>

          {/* Items */}
          <div className="space-y-1 mb-3">
            {items.map((item, i) => {
              const totalBrutto = item.subtotal;
              // For simplicity, netto per item = subtotal (discount shown separately)
              const totalNetto = item.subtotal - (order.discount > 0 && i === items.length - 1 ? Math.min(order.discount, item.subtotal) : 0);
              return (
                <div
                  key={item.id}
                  className="grid grid-cols-[32px_1fr_60px_60px] gap-1 text-[11px]"
                >
                  <span className="text-center text-brand-500">
                    {item.quantity}x
                  </span>
                  <span className="text-brand-900 truncate font-medium">
                    {item.book_title}
                  </span>
                  <span className="text-right text-brand-600 font-medium">
                    {formatRupiah(totalBrutto).replace("Rp", "")}
                  </span>
                  <span className="text-right text-brand-800 font-semibold">
                    {formatRupiah(totalNetto).replace("Rp", "")}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Totals */}
          <div className="border-t-2 border-dashed border-brand-200 pt-3 space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-brand-500">Brutto (Total Kotor)</span>
              <span className="font-bold text-brand-800">
                {formatRupiah(order.total_amount)}
              </span>
            </div>
            {order.discount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-brand-500">Diskon</span>
                <span className="font-bold text-red-500">
                  -{formatRupiah(order.discount)}
                </span>
              </div>
            )}
            <div className="flex justify-between border-t-2 border-dashed border-brand-200 pt-2">
              <span className="text-base font-black text-brand-900">
                TOTAL (Netto)
              </span>
              <span className="text-lg font-black text-brand-700">
                {formatRupiah(order.final_amount)}
              </span>
            </div>
          </div>

          {/* Payment */}
          <div className="mt-4 pt-3 border-t border-dashed border-brand-200 space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-brand-500">Dibayar</span>
              <span className="font-semibold text-brand-800">
                {formatRupiah(paymentAmount)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-brand-500">Kembali</span>
              <span className="font-bold text-brand-700">
                {formatRupiah(changeAmount)}
              </span>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-5 text-center border-t-2 border-dashed border-brand-200 pt-4">
            <p className="text-[11px] text-brand-400 italic">
              Terima kasih telah berbelanja
            </p>
            <p className="text-[10px] text-brand-300 mt-0.5">
              Barang yang sudah dibeli tidak dapat dikembalikan
            </p>
            <div className="mt-3 flex justify-center">
              <span className="text-[10px] font-bold text-brand-500 tracking-[0.3em]">
                ~ BUNAYYA PUTRA ~
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 pt-2 flex gap-3">
          <button
            onClick={onClose}
            className="btn-secondary flex-1"
          >
            Tutup
          </button>
          <button
            onClick={handlePrint}
            className="btn-primary flex-1"
          >
            <Printer className="w-4 h-4" />
            Cetak Struk
          </button>
        </div>
      </div>
    </div>
  );
}
