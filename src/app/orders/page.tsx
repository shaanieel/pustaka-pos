"use client";
export const dynamic = "force-dynamic";
export const runtime = "edge";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Order, OrderItem, OrderWithItems } from "@/types";
import { SearchBar } from "@/components/SearchBar";
import { Receipt } from "@/components/Receipt";
import { formatRupiah, formatDate } from "@/lib/utils";
import {
  Plus, ReceiptText, CircleCheck, Clock, XCircle, Eye,
  ChevronDown, Filter, Banknote, TrendingUp, ShoppingCart,
  CheckCircle2, AlertTriangle, Pencil
} from "lucide-react";
import Link from "next/link";
import { clsx } from "clsx";
import toast from "react-hot-toast";

const MONTHS = [
  { value: "1", label: "Januari" }, { value: "2", label: "Februari" },
  { value: "3", label: "Maret" }, { value: "4", label: "April" },
  { value: "5", label: "Mei" }, { value: "6", label: "Juni" },
  { value: "7", label: "Juli" }, { value: "8", label: "Agustus" },
  { value: "9", label: "September" }, { value: "10", label: "Oktober" },
  { value: "11", label: "November" }, { value: "12", label: "Desember" },
];

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Filters
  const now = new Date();
  const [filterMonth, setFilterMonth] = useState(String(now.getMonth() + 1));
  const [filterYear, setFilterYear] = useState(String(now.getFullYear()));

  // Receipt viewer
  const [viewingOrder, setViewingOrder] = useState<OrderWithItems | null>(null);
  const [viewingItems, setViewingItems] = useState<OrderItem[]>([]);
  const [showReceipt, setShowReceipt] = useState(false);

  // Stats
  const [stats, setStats] = useState({ total: 0, revenue: 0, lunasCount: 0, hutangCount: 0 });

  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      // Date range filter
      const startDate = `${filterYear}-${filterMonth.padStart(2, "0")}-01`;
      const endMonth = parseInt(filterMonth) + 1;
      const endYear = endMonth > 12 ? parseInt(filterYear) + 1 : parseInt(filterYear);
      const endMonthPadded = endMonth > 12 ? "01" : String(endMonth).padStart(2, "0");
      const endDate = `${endYear}-${endMonthPadded}-01`;

      let query = supabase
        .from("orders")
        .select("*")
        .gte("created_at", startDate)
        .lt("created_at", endDate)
        .order("created_at", { ascending: false });

      if (search) {
        query = query.or(`customer_name.ilike.%${search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      const orderList = data || [];
      setOrders(orderList);

      // Compute stats
      const revenue = orderList.reduce((sum, o) => sum + (o.payment_status === "lunas" ? (o.final_amount || 0) : 0), 0);
      setStats({
        total: orderList.length,
        revenue,
        lunasCount: orderList.filter(o => o.payment_status === "lunas").length,
        hutangCount: orderList.filter(o => o.payment_status === "belum_lunas" || o.payment_status === "belum_bayar").length,
      });
    } catch {
      toast.error("Gagal memuat pesanan");
    } finally {
      setLoading(false);
    }
  }, [search, filterMonth, filterYear]);

  useEffect(() => {
    const timer = setTimeout(loadOrders, search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [search, filterMonth, filterYear, loadOrders]);

  async function viewReceipt(order: Order) {
    try {
      const { data: items, error } = await supabase
        .from("order_items")
        .select("*")
        .eq("order_id", order.id);

      if (error) throw error;

      setViewingOrder(order as OrderWithItems);
      setViewingItems(items || []);
      setShowReceipt(true);
    } catch {
      toast.error("Gagal memuat detail pesanan");
    }
  }

  async function markAsLunas(orderId: string) {
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payment_status: "lunas" }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Update gagal");
      }

      toast.success("Status diperbarui jadi LUNAS ✅");
      loadOrders();
    } catch {
      toast.error("Gagal memperbarui status");
    }
  }

  // ── Payment status helpers ──
  const payStatusConfig: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
    lunas: {
      label: "LUNAS",
      color: "text-emerald-700",
      bg: "bg-emerald-50 border-emerald-200",
      icon: <CircleCheck className="w-3.5 h-3.5 text-emerald-500" />,
    },
    belum_bayar: {
      label: "BELUM BAYAR",
      color: "text-red-700",
      bg: "bg-red-50 border-red-200",
      icon: <XCircle className="w-3.5 h-3.5 text-red-500" />,
    },
    belum_lunas: {
      label: "BELUM LUNAS",
      color: "text-amber-700",
      bg: "bg-amber-50 border-amber-200",
      icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />,
    },
  };

  function PayBadge({ status }: { status: string | null }) {
    const cfg = payStatusConfig[status || "belum_bayar"] || payStatusConfig.belum_bayar;
    return (
      <span className={clsx("inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-[11px] font-bold", cfg.bg, cfg.color)}>
        {cfg.icon}
        {cfg.label}
      </span>
    );
  }

  return (
    <>
      <div className="space-y-5">
        {/* ═══ HEADER ═══ */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="page-title text-2xl sm:text-3xl font-extrabold text-brand-800">
              📋 Riwayat Pesanan
            </h1>
            <p className="page-subtitle text-brand-500">
              {stats.total} pesanan · {formatRupiah(stats.revenue)} pemasukan
            </p>
          </div>
          <Link href="/orders/new" className="btn-primary">
            <Plus className="w-4 h-4" />
            Pesanan Baru
          </Link>
        </div>

        {/* ═══ STATS CARDS ═══ */}
        <div className="grid grid-cols-3 gap-3">
          <div className="card p-3 text-center">
            <ShoppingCart className="w-5 h-5 text-brand-400 mx-auto mb-1" />
            <p className="text-xl font-black text-brand-800">{stats.total}</p>
            <p className="text-[11px] text-brand-400 font-medium">Total</p>
          </div>
          <div className="card p-3 text-center">
            <CheckCircle2 className="w-5 h-5 text-emerald-500 mx-auto mb-1" />
            <p className="text-xl font-black text-emerald-600">{stats.lunasCount}</p>
            <p className="text-[11px] text-brand-400 font-medium">Lunas</p>
          </div>
          <div className="card p-3 text-center">
            <AlertTriangle className="w-5 h-5 text-amber-500 mx-auto mb-1" />
            <p className="text-xl font-black text-amber-600">{stats.hutangCount}</p>
            <p className="text-[11px] text-brand-400 font-medium">Hutang</p>
          </div>
        </div>

        {/* ═══ FILTER ROW ═══ */}
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
          <div className="flex-1">
            <SearchBar value={search} onChange={setSearch} placeholder="Cari nama pelanggan..." />
          </div>
          <div className="flex gap-2">
            <div className="relative">
              <select
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
                className="appearance-none bg-white border border-brand-200 rounded-xl px-3 py-2.5 pr-8 text-sm font-medium text-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-300 cursor-pointer"
              >
                {MONTHS.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-400 pointer-events-none" />
            </div>
            <div className="relative">
              <select
                value={filterYear}
                onChange={(e) => setFilterYear(e.target.value)}
                className="appearance-none bg-white border border-brand-200 rounded-xl px-3 py-2.5 pr-8 text-sm font-medium text-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-300 cursor-pointer"
              >
                {Array.from({ length: 5 }, (_, i) => now.getFullYear() - i).map((y) => (
                  <option key={y} value={String(y)}>{y}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* ═══ LIST ═══ */}
        {loading ? (
          <div className="grid gap-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="card p-4 h-20 animate-pulse bg-brand-50/50" />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="card p-12 text-center">
            <ReceiptText className="w-12 h-12 text-brand-300 mx-auto mb-3" />
            <p className="text-brand-500 font-medium">Belum ada pesanan</p>
            <Link href="/orders/new" className="btn-primary mt-4 inline-flex">Buat Pesanan Pertama</Link>
          </div>
        ) : (
          <div className="grid gap-3">
            {orders.map((order) => {
              const ps = order.payment_status || "belum_bayar";
              const showMarkLunas = ps === "belum_lunas" || ps === "belum_bayar";

              return (
                <div key={order.id} className="card p-4 animate-fade-in-up">
                  {/* Row 1: Customer info + amount */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center shrink-0">
                        {order.status === "completed" ? (
                          <CircleCheck className="w-5 h-5 text-emerald-500" />
                        ) : order.status === "pending" ? (
                          <Clock className="w-5 h-5 text-amber-500" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-500" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-brand-950 text-[15px] truncate">
                          {order.customer_name || "Pelanggan Umum"}
                        </p>
                        <p className="text-xs text-brand-400 mt-0.5">
                          {formatDate(order.created_at)}
                          {order.payment_method && ` · ${order.payment_method}`}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-base font-bold text-brand-700">
                        {formatRupiah(order.final_amount)}
                      </p>
                      {order.discount > 0 && (
                        <p className="text-[11px] text-brand-400">
                          Diskon {formatRupiah(order.discount)}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Row 2: Status badge + actions */}
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-brand-100">
                    <PayBadge status={ps} />
                    <div className="flex items-center gap-2">
                      {/* Edit button — always visible */}
                      <Link
                        href={`/orders/${order.id}/edit`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-50 hover:bg-brand-100 text-brand-600 text-xs font-bold transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        Edit
                      </Link>
                      {showMarkLunas && (
                        <button
                          onClick={() => markAsLunas(order.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-600 text-xs font-bold transition-colors"
                        >
                          <CircleCheck className="w-4 h-4" />
                          Tandai Lunas
                        </button>
                      )}
                      {order.status === "completed" && (
                        <button
                          onClick={() => viewReceipt(order)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-50 hover:bg-brand-100 text-brand-600 text-xs font-bold transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                          Struk
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Receipt Modal */}
      {showReceipt && viewingOrder && (
        <Receipt
          order={viewingOrder}
          items={viewingItems}
          customerName={viewingOrder.customer_name || "Pelanggan Umum"}
          paymentAmount={viewingOrder.final_amount}
          changeAmount={0}
          paymentMethod={viewingOrder.payment_method || "Tunai"}
          onClose={() => {
            setShowReceipt(false);
            setViewingOrder(null);
            setViewingItems([]);
          }}
        />
      )}
    </>
  );
}
