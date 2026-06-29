"use client";
export const dynamic = "force-dynamic";
export const runtime = "edge";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Order, OrderItem, OrderWithItems } from "@/types";
import { SearchBar } from "@/components/SearchBar";
import { Receipt } from "@/components/Receipt";
import { formatRupiah, formatDate } from "@/lib/utils";
import { Plus, ReceiptText, CircleCheck, Clock, XCircle, Eye } from "lucide-react";
import Link from "next/link";
import { clsx } from "clsx";
import toast from "react-hot-toast";

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Receipt viewer
  const [viewingOrder, setViewingOrder] = useState<OrderWithItems | null>(null);
  const [viewingItems, setViewingItems] = useState<OrderItem[]>([]);
  const [showReceipt, setShowReceipt] = useState(false);

  const loadOrders = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });

      if (search) {
        query = query.or(`customer_name.ilike.%${search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      setOrders(data || []);
    } catch (err: any) {
      toast.error("Gagal memuat pesanan");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(loadOrders, search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [search]);

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

  const statusIcon = {
    completed: <CircleCheck className="w-4 h-4 text-emerald-500" />,
    pending: <Clock className="w-4 h-4 text-amber-500" />,
    cancelled: <XCircle className="w-4 h-4 text-red-500" />,
  };
  const statusBadge = {
    completed: "badge-success",
    pending: "badge-warning",
    cancelled: "badge-danger",
  };
  const statusLabel = {
    completed: "Selesai",
    pending: "Tertunda",
    cancelled: "Dibatalkan",
  };

  return (
    <>
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="page-title">Riwayat Pesanan</h1>
            <p className="page-subtitle">{orders.length} pesanan</p>
          </div>
          <Link href="/orders/new" className="btn-primary">
            <Plus className="w-4 h-4" />
            Pesanan Baru
          </Link>
        </div>

        <SearchBar value={search} onChange={setSearch} placeholder="Cari nama pelanggan..." />

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
            {orders.map((order) => (
              <div key={order.id} className="card p-4 animate-fade-in-up">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center">
                      {statusIcon[order.status]}
                    </div>
                    <div>
                      <p className="font-semibold text-brand-950 text-[15px]">
                        {order.customer_name || "Pelanggan Umum"}
                      </p>
                      <p className="text-xs text-brand-400">{formatDate(order.created_at)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={clsx("badge", statusBadge[order.status])}>
                      {statusLabel[order.status]}
                    </span>
                    <div className="text-right">
                      <p className="text-sm font-bold text-brand-700">{formatRupiah(order.final_amount)}</p>
                      {order.discount > 0 && (
                        <p className="text-xs text-brand-400">Diskon {formatRupiah(order.discount)}</p>
                      )}
                    </div>
                    {order.status === "completed" && (
                      <button
                        onClick={() => viewReceipt(order)}
                        className="p-2 rounded-xl hover:bg-brand-50 text-brand-400 hover:text-brand-600 transition-colors"
                        title="Lihat Struk"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Receipt Modal */}
      {showReceipt && viewingOrder && (
        <Receipt
          order={viewingOrder}
          items={viewingItems}
          customerName={viewingOrder.customer_name || "Pelanggan Umum"}
          cashierName="Kasir"
          paymentAmount={viewingOrder.final_amount}
          changeAmount={0}
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
