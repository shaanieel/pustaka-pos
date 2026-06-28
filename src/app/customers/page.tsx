"use client";
export const dynamic = "force-dynamic";
export const runtime = "edge";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Customer } from "@/types";
import { SearchBar } from "@/components/SearchBar";
import { ConfirmModal } from "@/components/ConfirmModal";
import { formatRupiah, formatDateShort } from "@/lib/utils";
import { Plus, Users, Phone, Mail, Trash2 } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const loadCustomers = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("customers")
        .select("*")
        .order("created_at", { ascending: false });

      if (search) {
        query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      setCustomers(data || []);
    } catch (err: any) {
      toast.error("Gagal memuat pelanggan");
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => { loadCustomers(); }, [loadCustomers]);

  async function handleDelete(id: string) {
    try {
      const { error } = await supabase.from("customers").delete().eq("id", id);
      if (error) throw error;
      toast.success("Pelanggan dihapus");
      loadCustomers();
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Pelanggan</h1>
          <p className="page-subtitle">{customers.length} pelanggan terdaftar</p>
        </div>
        <Link href="/customers/add" className="btn-primary">
          <Plus className="w-4 h-4" />
          Tambah Pelanggan
        </Link>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Cari nama atau telepon..." />

      {loading ? (
        <div className="grid gap-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="card p-4 h-20 animate-pulse bg-brand-50/50" />
          ))}
        </div>
      ) : customers.length === 0 ? (
        <div className="card p-12 text-center">
          <Users className="w-12 h-12 text-brand-300 mx-auto mb-3" />
          <p className="text-brand-500 font-medium">Belum ada pelanggan</p>
          <Link href="/customers/add" className="btn-primary mt-4 inline-flex">Tambah Pelanggan Pertama</Link>
        </div>
      ) : (
        <div className="grid gap-3">
          {customers.map((c) => (
            <div key={c.id} className="card p-4 animate-fade-in-up group">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center">
                    <Users className="w-5 h-5 text-brand-500" />
                  </div>
                  <div>
                    <p className="font-semibold text-brand-950 text-[15px]">{c.name}</p>
                    <div className="flex items-center gap-3 text-xs text-brand-500 mt-0.5">
                      {c.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3" /> {c.phone}
                        </span>
                      )}
                      {c.email && (
                        <span className="flex items-center gap-1">
                          <Mail className="w-3 h-3" /> {c.email}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right hidden sm:block">
                    <p className="text-xs text-brand-400">{c.total_orders} pesanan</p>
                    <p className="text-sm font-bold text-brand-700">{formatRupiah(c.total_spent)}</p>
                  </div>
                  <button
                    onClick={() => setDeleteId(c.id)}
                    className="p-2 rounded-lg hover:bg-red-50 text-brand-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmModal
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && handleDelete(deleteId)}
        title="Hapus Pelanggan?"
        message="Data pelanggan akan dihapus permanen."
        confirmLabel="Hapus"
        variant="danger"
      />
    </div>
  );
}
