"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Order, OrderItem, PaymentMethod, PaymentStatus } from "@/types";
import { Receipt } from "@/components/Receipt";
import { formatRupiah } from "@/lib/utils";
import {
  ArrowLeft,
  Save,
  Loader2,
  User,
  Phone,
  Wallet,
  Banknote,
  QrCode,
  ArrowRightLeft,
  CircleCheck,
  XCircle,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import Link from "next/link";
import { clsx } from "clsx";
import toast from "react-hot-toast";
import { printReceipt, reconnectPrinter, isConnected } from "@/lib/bluetooth-printer";
import type { ReceiptData } from "@/lib/bluetooth-printer";

const PAYMENT_METHODS: { value: PaymentMethod; label: string; icon: React.ReactNode }[] = [
  { value: "tunai", label: "Tunai", icon: <Banknote className="w-5 h-5" /> },
  { value: "qris", label: "QRIS", icon: <QrCode className="w-5 h-5" /> },
  { value: "transfer", label: "Transfer", icon: <ArrowRightLeft className="w-5 h-5" /> },
];

const PAYMENT_STATUSES: { value: PaymentStatus; label: string; description: string; color: string; bg: string; icon: React.ReactNode }[] = [
  {
    value: "lunas",
    label: "Lunas",
    description: "Pembayaran full, tidak ada sisa",
    color: "text-emerald-700",
    bg: "bg-emerald-50 border-emerald-200",
    icon: <CheckCircle2 className="w-5 h-5 text-emerald-500" />,
  },
  {
    value: "belum_lunas",
    label: "Belum Lunas (Dibayar Sebagian)",
    description: "Sudah bayar sebagian, masih ada sisa",
    color: "text-amber-700",
    bg: "bg-amber-50 border-amber-200",
    icon: <AlertTriangle className="w-5 h-5 text-amber-500" />,
  },
  {
    value: "belum_bayar",
    label: "Belum Dibayar",
    description: "Belum ada pembayaran sama sekali",
    color: "text-red-700",
    bg: "bg-red-50 border-red-200",
    icon: <XCircle className="w-5 h-5 text-red-500" />,
  },
];

export default function EditOrderPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const orderId = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);

  // Editable fields
  const [customerName, setCustomerName] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("tunai");
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("lunas");
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [discount, setDiscount] = useState(0);
  const [notes, setNotes] = useState("");

  // Preview receipt
  const [showReceipt, setShowReceipt] = useState(false);

  useEffect(() => {
    if (!orderId) return;
    (async () => {
      try {
        const res = await fetch(`/api/orders/${orderId}`);
        if (!res.ok) throw new Error("Gagal memuat pesanan");
        const data = await res.json();
        const o = data.order as Order;

        setOrder(o);
        setItems(data.items || []);
        setCustomerName(o.customer_name || "");
        setPaymentMethod(o.payment_method || "tunai");
        setPaymentStatus(o.payment_status || "lunas");
        setPaidAmount(o.paid_amount ?? o.final_amount);
        setDiscount(o.discount || 0);
        setNotes(o.notes || "");
      } catch {
        toast.error("Gagal memuat data pesanan");
      } finally {
        setLoading(false);
      }
    })();
  }, [orderId]);

  // Calculate derived values
  const finalAmount = (order?.total_amount ?? 0) - discount;
  const changeAmount = Math.max(0, paidAmount - finalAmount);
  const remainingAmount = Math.max(0, finalAmount - paidAmount);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_name: customerName.trim() || null,
          payment_method: paymentMethod,
          payment_status: paymentStatus,
          paid_amount:
            paymentStatus === "lunas"
              ? finalAmount
              : paymentStatus === "belum_bayar"
              ? 0
              : paidAmount,
          discount,
          notes: notes.trim() || null,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Gagal menyimpan");
      }

      toast.success("Pesanan berhasil diperbarui ✅");

      // Refresh data
      const refresh = await fetch(`/api/orders/${orderId}`);
      const refreshData = await refresh.json();
      setOrder(refreshData.order);
      setItems(refreshData.items || []);
      setShowReceipt(true);
    } catch (err: any) {
      toast.error(err.message || "Gagal menyimpan perubahan");
    } finally {
      setSaving(false);
    }
  }

  async function handleBluetoothPrint() {
    if (!order) return;
    const paid = paymentStatus === "lunas" ? finalAmount : paymentStatus === "belum_bayar" ? 0 : paidAmount;
    const change = paid > finalAmount ? paid - finalAmount : 0;
    const data: ReceiptData = {
      orderId: order.id,
      createdAt: order.created_at,
      customerName: customerName || order.customer_name || "",
      paymentMethod: paymentMethod,
      paymentStatus: paymentStatus,
      totalAmount: order.total_amount || 0,
      discount,
      finalAmount,
      paidAmount: paid,
      changeAmount: change,
      items: items.map((i) => ({ name: i.book_title, qty: i.quantity, price: i.price_at_time, subtotal: i.subtotal })),
    };
    try {
      if (!isConnected()) await reconnectPrinter();
      await printReceipt(data);
      toast.success("Struk terkirim ke printer");
    } catch (e: any) {
      toast.error(e.message || "Gagal cetak via Bluetooth");
    }
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-100 animate-pulse" />
          <div className="flex-1">
            <div className="h-6 w-48 bg-brand-100 rounded-lg animate-pulse" />
            <div className="h-4 w-32 bg-brand-50 rounded-lg animate-pulse mt-1" />
          </div>
        </div>
        <div className="card p-6 space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 bg-brand-50 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <p className="text-brand-500 font-medium">Pesanan tidak ditemukan</p>
        <Link href="/orders" className="btn-primary mt-4 inline-flex">Kembali ke Riwayat</Link>
      </div>
    );
  }

  return (
    <>
      <div className="max-w-2xl mx-auto space-y-5 pb-24">
        {/* ═══ HEADER ═══ */}
        <div className="flex items-center gap-3">
          <Link href="/orders" className="btn-ghost p-2 -ml-2">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="page-title text-lg truncate">Edit Pesanan</h1>
            <p className="page-subtitle text-xs">
              #{orderId.slice(0, 8).toUpperCase()} · {order.status}
            </p>
          </div>
        </div>

        {/* ═══ FORM CARD ═══ */}
        <div className="card p-5 space-y-5">
          {/* ── Pelanggan ── */}
          <div>
            <label className="label flex items-center gap-1.5">
              <User className="w-4 h-4 text-brand-600" />
              Nama Pelanggan
            </label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="input-field"
              placeholder="Nama pelanggan..."
            />
          </div>

          {/* ── Metode Bayar ── */}
          <div>
            <label className="label flex items-center gap-1.5">
              <Wallet className="w-4 h-4 text-brand-600" />
              Metode Pembayaran
            </label>
            <div className="grid grid-cols-3 gap-2">
              {PAYMENT_METHODS.map((m) => (
                <button
                  key={m.value}
                  onClick={() => setPaymentMethod(m.value)}
                  className={clsx(
                    "flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all",
                    paymentMethod === m.value
                      ? "border-brand-600 bg-brand-50 text-brand-700"
                      : "border-brand-200 bg-white text-brand-500 hover:border-brand-300"
                  )}
                >
                  {m.icon}
                  <span className="text-xs font-bold">{m.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* ── Status Pembayaran ── */}
          <div>
            <label className="label flex items-center gap-1.5">
              <CircleCheck className="w-4 h-4 text-brand-600" />
              Status Pembayaran
            </label>
            <div className="space-y-2">
              {PAYMENT_STATUSES.map((s) => (
                <button
                  key={s.value}
                  onClick={() => {
                    setPaymentStatus(s.value);
                    // Auto-set paidAmount based on status
                    if (s.value === "lunas") setPaidAmount(finalAmount);
                    else if (s.value === "belum_bayar") setPaidAmount(0);
                  }}
                  className={clsx(
                    "w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left",
                    paymentStatus === s.value
                      ? `${s.bg} ${s.color} border-current`
                      : "border-brand-200 bg-white text-brand-600 hover:border-brand-300"
                  )}
                >
                  {s.icon}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold">{s.label}</p>
                    <p className="text-xs opacity-75">{s.description}</p>
                  </div>
                  {paymentStatus === s.value && (
                    <CheckCircle2 className="w-5 h-5 shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* ── Jumlah Dibayar (hanya untuk belum_lunas) ── */}
          {paymentStatus === "belum_lunas" && (
            <div>
              <label className="label">
                Jumlah Dibayar
                <span className="text-xs text-brand-400 font-normal ml-2">
                  (Total: {formatRupiah(finalAmount)})
                </span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-brand-400">Rp</span>
                <input
                  type="number"
                  min={0}
                  max={finalAmount}
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(Number(e.target.value) || 0)}
                  className="input-field pl-10"
                  placeholder="0"
                />
              </div>
              <div className="flex justify-between text-xs mt-1.5 px-1">
                <span className="text-amber-600 font-semibold">
                  Sisa: {formatRupiah(remainingAmount)}
                </span>
                <button
                  onClick={() => setPaidAmount(finalAmount)}
                  className="text-brand-600 font-semibold hover:underline"
                >
                  Bayar Lunas
                </button>
              </div>
            </div>
          )}

          {/* ── Diskon ── */}
          <div>
            <label className="label">Diskon</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-brand-400">Rp</span>
              <input
                type="number"
                min={0}
                max={order.total_amount}
                value={discount}
                onChange={(e) => setDiscount(Math.min(Number(e.target.value) || 0, order.total_amount))}
                className="input-field pl-10"
                placeholder="0"
              />
            </div>
            {discount > 0 && (
              <p className="text-xs text-emerald-600 font-semibold mt-1.5 px-1">
                Subtotal: {formatRupiah(order.total_amount)} → Total: {formatRupiah(finalAmount)}
              </p>
            )}
          </div>

          {/* ── Catatan ── */}
          <div>
            <label className="label">Catatan (opsional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="input-field min-h-[80px] resize-none"
              placeholder="Catatan untuk pesanan ini..."
              rows={3}
            />
          </div>

          {/* ── Ringkasan ── */}
          <div className="bg-brand-50 rounded-xl p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-brand-500">Subtotal</span>
              <span className="font-semibold text-brand-700">{formatRupiah(order.total_amount)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-brand-500">Diskon</span>
                <span className="font-bold text-red-500">-{formatRupiah(discount)}</span>
              </div>
            )}
            <hr className="border-t border-dashed border-brand-200" />
            <div className="flex justify-between items-center">
              <span className="text-sm font-bold text-brand-800">Total</span>
              <span className="text-lg font-black text-brand-700">{formatRupiah(finalAmount)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-brand-500">Dibayar</span>
              <span className="font-semibold text-brand-700">{formatRupiah(paidAmount)}</span>
            </div>
            {changeAmount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-brand-500">Kembalian</span>
                <span className="font-bold text-emerald-600">{formatRupiah(changeAmount)}</span>
              </div>
            )}
            {remainingAmount > 0 && paymentStatus !== "belum_bayar" && (
              <div className="flex justify-between text-sm">
                <span className="text-amber-600 font-semibold">Sisa</span>
                <span className="font-bold text-amber-700">{formatRupiah(remainingAmount)}</span>
              </div>
            )}
          </div>

          {/* ── Daftar Item ── */}
          <div>
            <label className="label flex items-center gap-1.5">
              <span>Item Pesanan ({items.length})</span>
              <span className="text-xs text-brand-400 font-normal">(hanya lihat)</span>
            </label>
            <div className="divide-y divide-brand-100 rounded-xl border border-brand-100">
              {items.map((item) => (
                <div key={item.id} className="flex items-center justify-between py-2.5 px-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-brand-900 truncate">{item.book_title}</p>
                    <p className="text-xs text-brand-400">
                      {item.quantity} × {formatRupiah(item.price_at_time)}
                    </p>
                  </div>
                  <span className="text-sm font-bold text-brand-700 ml-2 shrink-0">
                    {formatRupiah(item.subtotal)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── SAVE & PREVIEW ── */}
        <div className="flex gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary flex-1"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Menyimpan...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Simpan & Lihat Struk
              </>
            )}
          </button>
        </div>
      </div>

      {/* ═══ RECEIPT MODAL ═══ */}
      {showReceipt && order && (
        <Receipt
          order={{
            ...order,
            customer_name: customerName || order.customer_name,
            discount,
            final_amount: finalAmount,
            paid_amount: paymentStatus === "lunas" ? finalAmount : paymentStatus === "belum_bayar" ? 0 : paidAmount,
            payment_method: paymentMethod,
            payment_status: paymentStatus,
          }}
          items={items}
          customerName={customerName || "Pelanggan Umum"}
          paymentAmount={paymentStatus === "lunas" ? finalAmount : paidAmount}
          changeAmount={changeAmount}
          paymentMethod={
            paymentMethod === "tunai" ? "Tunai" : paymentMethod === "qris" ? "QRIS" : "Transfer"
          }
          onBluetoothPrint={handleBluetoothPrint}
          onClose={() => {
            setShowReceipt(false);
            router.push("/orders");
          }}
        />
      )}
    </>
  );
}
