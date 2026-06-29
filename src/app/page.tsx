"use client";
export const dynamic = "force-dynamic";
export const runtime = "edge";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { StatsCard } from "@/components/StatsCard";
import { BookOpen, ShoppingCart, Users, DollarSign, TrendingUp, Package, PackageOpen, PlusCircle } from "lucide-react";
import { formatRupiah, formatDate } from "@/lib/utils";
import { DashboardStats, Order, Book } from "@/types";
import Link from "next/link";

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    try {
      const [
        { count: totalBooks },
        { data: books },
        { count: totalOrders },
        { data: orders },
        { count: totalCustomers },
      ] = await Promise.all([
        supabase.from("books").select("*", { count: "exact", head: true }),
        supabase.from("books").select("*"),
        supabase.from("orders").select("*", { count: "exact", head: true }),
        supabase.from("orders").select("*").order("created_at", { ascending: false }).limit(10),
        supabase.from("customers").select("*", { count: "exact", head: true }),
      ]);

      const allBooks = (books || []) as Book[];
      const totalStock = allBooks.reduce((sum, b) => sum + b.stock, 0);
      const totalRevenue = (orders || []).reduce((sum, o) => sum + (o.final_amount || 0), 0);
      const lowStockBooks = allBooks.filter((b) => b.stock <= 5 && b.stock > 0);

      setStats({
        totalBooks: totalBooks || 0,
        totalStock,
        totalOrders: totalOrders || 0,
        totalRevenue,
        totalCustomers: totalCustomers || 0,
        recentOrders: (orders || []) as Order[],
        lowStockBooks,
      });
    } catch (err) {
      console.error("Gagal memuat dashboard:", err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-brand-100 rounded-lg animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card p-5 h-28 animate-pulse bg-brand-50" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Ringkasan Bunayya Putra hari ini</p>
        </div>
        <Link href="/orders/new" className="btn-primary hidden sm:inline-flex">
          <ShoppingCart className="w-4 h-4" />
          Pesanan Baru
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Total Buku" value={stats!.totalBooks} subtitle={`${stats!.totalStock} stok tersedia`} icon={BookOpen} />
        <StatsCard title="Total Pesanan" value={stats!.totalOrders} icon={ShoppingCart} variant="success" />
        <StatsCard title="Pendapatan" value={formatRupiah(stats!.totalRevenue)} icon={DollarSign} variant="success" />
        <StatsCard title="Pelanggan" value={stats!.totalCustomers} icon={Users} variant="warning" />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-3 gap-3">
        <Link
          href="/orders/new"
          className="card p-4 flex flex-col items-center justify-center gap-2 hover:bg-brand-50/60 transition-colors active:scale-[0.97]"
        >
          <div className="w-11 h-11 rounded-xl bg-brand-100 flex items-center justify-center">
            <ShoppingCart className="w-5 h-5 text-brand-600" />
          </div>
          <span className="text-xs font-semibold text-brand-700 text-center leading-tight">
            Pesanan Baru
          </span>
        </Link>
        <Link
          href="/stock/in"
          className="card p-4 flex flex-col items-center justify-center gap-2 hover:bg-brand-50/60 transition-colors active:scale-[0.97]"
        >
          <div className="w-11 h-11 rounded-xl bg-amber-100 flex items-center justify-center">
            <PackageOpen className="w-5 h-5 text-amber-600" />
          </div>
          <span className="text-xs font-semibold text-brand-700 text-center leading-tight">
            Stok Masuk
          </span>
        </Link>
        <Link
          href="/books/add"
          className="card p-4 flex flex-col items-center justify-center gap-2 hover:bg-brand-50/60 transition-colors active:scale-[0.97]"
        >
          <div className="w-11 h-11 rounded-xl bg-green-100 flex items-center justify-center">
            <PlusCircle className="w-5 h-5 text-green-600" />
          </div>
          <span className="text-xs font-semibold text-brand-700 text-center leading-tight">
            Tambah Buku
          </span>
        </Link>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-brand-950 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-brand-500" />
              Pesanan Terbaru
            </h2>
            <Link href="/orders" className="text-sm font-semibold text-brand-600 hover:text-brand-700">Lihat Semua →</Link>
          </div>
          {stats!.recentOrders.length === 0 ? (
            <p className="text-sm text-brand-400 py-8 text-center">Belum ada pesanan</p>
          ) : (
            <div className="space-y-2">
              {stats!.recentOrders.slice(0, 5).map((order) => (
                <div key={order.id} className="flex items-center justify-between py-2.5 px-3 rounded-xl hover:bg-brand-50/60 transition-colors">
                  <div>
                    <p className="text-sm font-semibold text-brand-900">{order.customer_name || "Pelanggan Umum"}</p>
                    <p className="text-xs text-brand-400">{formatDate(order.created_at)}</p>
                  </div>
                  <span className="text-sm font-bold text-brand-700">{formatRupiah(order.final_amount)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-brand-950 flex items-center gap-2">
              <Package className="w-4 h-4 text-amber-500" />
              Stok Menipis
            </h2>
            <Link href="/books" className="text-sm font-semibold text-brand-600 hover:text-brand-700">Kelola Buku →</Link>
          </div>
          {stats!.lowStockBooks.length === 0 ? (
            <p className="text-sm text-brand-400 py-8 text-center">Semua stok aman ✅</p>
          ) : (
            <div className="space-y-2">
              {stats!.lowStockBooks.map((book) => (
                <div key={book.id} className="flex items-center justify-between py-2.5 px-3 rounded-xl hover:bg-amber-50/60 transition-colors">
                  <div>
                    <p className="text-sm font-semibold text-brand-900 truncate max-w-[180px]">{book.title}</p>
                    <p className="text-xs text-brand-400">{book.author}</p>
                  </div>
                  <span className="badge-warning">{book.stock === 0 ? "Habis" : `Sisa ${book.stock}`}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
