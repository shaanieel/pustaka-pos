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
  ChevronDown, TrendingUp, ShoppingCart,
  CheckCircle2, AlertTriangle, Pencil, Trash2, Calendar,
  ChevronLeft, ChevronRight, Filter
} from "lucide-react";
import Link from "next/link";
import { clsx } from "clsx";
import toast from "react-hot-toast";

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Date filters
  const now = new Date();
  const [preset, setPreset] = useState<"none" | "today" | "yesterday" | "month" | "range">("month");
  const [startDate, setStartDate] = useState(() => {
    const d = new Date(now);
    d.setDate(d.getDate() - 30);
    return d.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState(() => now.toISOString().split("T")[0]);
  const [showCalendar, setShowCalendar] = useState(false);
  const [filterMonth, setFilterMonth] = useState(() => String(now.getMonth() + 1).padStart(2, "0"));
  const [filterYear, setFilterYear] = useState(() => String(now.getFullYear()));

  function onMonthChange(month: string) {
    setFilterMonth(month);
    const y = filterYear || String(now.getFullYear());
    const lastDay = new Date(parseInt(y), parseInt(month), 0).getDate();
    setStartDate(`${y}-${month}-01`);
    setEndDate(`${y}-${month}-${String(lastDay).padStart(2, "0")}`);
    setPreset("range");
  }

  function onYearChange(year: string) {
    setFilterYear(year);
    const m = filterMonth || String(now.getMonth() + 1).padStart(2, "0");
    const lastDay = new Date(parseInt(year), parseInt(m), 0).getDate();
    setStartDate(`${year}-${m}-01`);
    setEndDate(`${year}-${m}-${String(lastDay).padStart(2, "0")}`);
    setPreset("range");
  }

  const MONTHS = [
    { value: "01", label: "Januari" }, { value: "02", label: "Februari" }, { value: "03", label: "Maret" },
    { value: "04", label: "April" }, { value: "05", label: "Mei" }, { value: "06", label: "Juni" },
    { value: "07", label: "Juli" }, { value: "08", label: "Agustus" }, { value: "09", label: "September" },
    { value: "10", label: "Oktober" }, { value: "11", label: "November" }, { value: "12", label: "Desember" },
  ];

  // Receipt viewer
  const [viewingOrder, setViewingOrder] = useState<OrderWithItems | null>(null);
  const [viewingItems, setViewingItems] = useState<OrderItem[]>([]);
  const [showReceipt, setShowReceipt] = useState(false);

  // Stats
  const [stats, setStats] = useState({ total: 0, revenue: 0, lunasCount: 0, hutangCount: 0 });

  // Apply preset
  function applyPreset(p: "today" | "yesterday" | "month" | "range") {
    setPreset(p);
    setShowCalendar(p === "range");
    const today = new Date();
    if (p === "today") {
      setStartDate(today.toISOString().split("T")[0]);
      setEndDate(today.toISOString().split("T")[0]);
    } else if (p === "yesterday") {
      const y = new Date(today);
      y.setDate(y.getDate() - 1);
      setStartDate(y.toISOString().split("T")[0]);
      setEndDate(y.toISOString().split("T")[0]);
    } else if (p === "month") {
      setStartDate(new Date(today.getFullYear(), today.getMonth() - 1, today.getDate()).toISOString().split("T")[0]);
      setEndDate(today.toISOString().split("T")[0]);
    }
  }

  // Navigate days
  function shiftDay(dir: -1 | 1) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + dir);
    setStartDate(d.toISOString().split("T")[0]);
    setEndDate(d.toISOString().split("T")[0]);
    setPreset("range");
  }

  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      const end = new Date(endDate);
      end.setDate(end.getDate() + 1);

      let query = supabase
        .from("orders")
        .select("*")
        .gte("created_at", startDate)
        .lt("created_at", end.toISOString().split("T")[0])
        .order("created_at", { ascending: false });

      if (search) {
        query = query.or(`customer_name.ilike.%${search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      const orderList = data || [];
      setOrders(orderList);

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
  }, [search, startDate, endDate]);

  useEffect(() => {
    const timer = setTimeout(loadOrders, search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [search, startDate, endDate, loadOrders]);

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
      if (!res.ok) throw new Error((await res.json()).error || "Update gagal");
      toast.success("✅ Status LUNAS");
      loadOrders();
    } catch {
      toast.error("Gagal memperbarui status");
    }
  }

  async function deleteOrder(orderId: string) {
    if (!confirm("Hapus pesanan ini? Data akan terhapus permanen dari database.")) return;
    try {
      // Delete order_items first (foreign key), then order
      await supabase.from("order_items").delete().eq("order_id", orderId);
      const { error } = await supabase.from("orders").delete().eq("id", orderId);
      if (error) throw error;
      toast.success("✅ Pesanan dihapus");
      loadOrders();
    } catch (err: any) {
      toast.error(err.message || "Gagal menghapus");
    }
  }

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

  function formatDateRange(start: string, end: string) {
    const s = new Date(start + "T00:00:00");
    const e = new Date(end + "T00:00:00");
    const fmt = (d: Date) => d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
    if (start === end) return fmt(s);
    return `${fmt(s)} — ${fmt(e)}`;
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

        {/* ═══ REVENUE ROW ═══ */}
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-brand-800 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-brand-500" />
              Pendapatan
            </h3>
            <span className="text-lg font-black text-brand-700">{formatRupiah(stats.revenue)}</span>
          </div>

          {/* Preset pills */}
          <div className="flex gap-1.5 mb-3 overflow-x-auto scrollbar-none">
            {(["today", "yesterday", "month"] as const).map((p) => (
              <button
                key={p}
                onClick={() => applyPreset(p)}
                className={clsx(
                  "px-3 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap",
                  preset === p
                    ? "bg-brand-600 text-white shadow-sm"
                    : "bg-brand-50 text-brand-600 hover:bg-brand-100"
                )}
              >
                {p === "today" ? "Hari Ini" : p === "yesterday" ? "Kemarin" : "Sebulan"}
              </button>
            ))}
            <button
              onClick={() => setShowCalendar(!showCalendar)}
              className={clsx(
                "px-3 py-1.5 rounded-full text-xs font-bold transition-all inline-flex items-center gap-1",
                showCalendar
                  ? "bg-brand-600 text-white shadow-sm"
                  : "bg-brand-50 text-brand-600 hover:bg-brand-100"
              )}
            >
              <Calendar className="w-3 h-3" />
              Pilih
            </button>
          </div>

          {/* Date range display + navigation */}
          <div className="flex items-center gap-2 bg-brand-50 rounded-xl px-3 py-2">
            <button onClick={() => shiftDay(-1)} className="p-1 hover:bg-brand-200 rounded-lg text-brand-500">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="flex-1 text-center text-xs font-semibold text-brand-700">
              {formatDateRange(startDate, endDate)}
            </span>
            <button onClick={() => shiftDay(1)} className="p-1 hover:bg-brand-200 rounded-lg text-brand-500">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Calendar inputs */}
          {showCalendar && (
            <div className="flex gap-2 mt-2" onClick={(e) => e.stopPropagation()}>
              <div className="flex-1">
                <label className="text-[10px] text-brand-400 font-medium">Dari</label>
                <input type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); setPreset("range"); }}
                  className="input-field w-full text-sm" />
              </div>
              <div className="flex-1">
                <label className="text-[10px] text-brand-400 font-medium">Sampai</label>
                <input type="date" value={endDate} onChange={(e) => { setEndDate(e.target.value); setPreset("range"); }}
                  className="input-field w-full text-sm" />
              </div>
            </div>
          )}
        </div>

        {/* ═══ MONTH & YEAR FILTER ═══ */}
        <div className="flex gap-2">
          <div className="relative">
            <select
              value={filterMonth}
              onChange={(e) => onMonthChange(e.target.value)}
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
              onChange={(e) => onYearChange(e.target.value)}
              className="appearance-none bg-white border border-brand-200 rounded-xl px-3 py-2.5 pr-8 text-sm font-medium text-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-300 cursor-pointer"
            >
              {Array.from({ length: 15 }, (_, i) => now.getFullYear() - i).map((y) => (
                <option key={y} value={String(y)}>{y}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-400 pointer-events-none" />
          </div>
        </div>

        {/* ═══ SEARCH ═══ */}
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
          <div className="flex-1">
            <SearchBar value={search} onChange={setSearch} placeholder="Cari nama pelanggan..." />
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
            <p className="text-brand-500 font-medium">Belum ada pesanan di periode ini</p>
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

                  {/* Row 2: Status badge + actions - scrollable on mobile */}
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-brand-100">
                    <PayBadge status={ps} />
                    <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none ml-2 shrink-0">
                      <button
                        onClick={() => deleteOrder(order.id)}
                        className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-500 text-xs font-bold transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span className="hidden sm:inline">Hapus</span>
                      </button>
                      <Link href={`/orders/${order.id}/edit`}
                        className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-50 hover:bg-brand-100 text-brand-600 text-xs font-bold transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Edit</span>
                      </Link>
                      {showMarkLunas && (
                        <button onClick={() => markAsLunas(order.id)}
                          className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-600 text-xs font-bold transition-colors"
                        >
                          <CircleCheck className="w-4 h-4" />
                          <span className="hidden sm:inline">Lunas</span>
                        </button>
                      )}
                      {order.status === "completed" && (
                        <button onClick={() => viewReceipt(order)}
                          className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-50 hover:bg-brand-100 text-brand-600 text-xs font-bold transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                          <span className="hidden sm:inline">Struk</span>
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
          onClose={() => { setShowReceipt(false); setViewingOrder(null); setViewingItems([]); }}
        />
      )}
    </>
  );
}
