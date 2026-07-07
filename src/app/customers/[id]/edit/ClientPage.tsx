"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

export default function EditCustomerPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const customerId = params?.id as string;
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    notes: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const { data, error } = await supabase
          .from("customers")
          .select("*")
          .eq("id", customerId)
          .single();
        if (error) throw error;
        setForm({
          name: data.name || "",
          phone: data.phone || "",
          email: data.email || "",
          notes: data.notes || "",
        });
      } catch (err: any) {
        toast.error("Gagal memuat data pelanggan");
        router.push("/customers");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [customerId, router]);

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.phone) {
      toast.error("Nama dan telepon wajib diisi");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from("customers")
        .update({
          name: form.name.trim(),
          phone: form.phone.trim(),
          email: form.email.trim() || null,
          notes: form.notes.trim() || null,
        })
        .eq("id", customerId);
      if (error) throw error;
      toast.success("Pelanggan berhasil diupdate!");
      router.push("/customers");
    } catch (err: any) {
      toast.error(err.message || "Gagal mengupdate pelanggan");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-lg mx-auto space-y-5">
        <div className="flex items-center gap-3">
          <Link href="/customers" className="btn-ghost p-2 -ml-2">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="page-title">Edit Pelanggan</h1>
            <p className="page-subtitle">Memuat data...</p>
          </div>
        </div>
        <div className="card p-12 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-brand-400 mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/customers" className="btn-ghost p-2 -ml-2">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="page-title">Edit Pelanggan</h1>
          <p className="page-subtitle">Ubah data pelanggan</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="card p-6 space-y-5">
        <div>
          <label className="label">Nama *</label>
          <input type="text" className="input-field" placeholder="Contoh: Budi Santoso"
            value={form.name} onChange={(e) => updateField("name", e.target.value)} required />
        </div>
        <div>
          <label className="label">Telepon *</label>
          <input type="tel" className="input-field" placeholder="Contoh: 081234567890"
            value={form.phone} onChange={(e) => updateField("phone", e.target.value)} required />
        </div>
        <div>
          <label className="label">Email</label>
          <input type="email" className="input-field" placeholder="budi@email.com"
            value={form.email} onChange={(e) => updateField("email", e.target.value)} />
        </div>
        <div>
          <label className="label">Catatan</label>
          <textarea className="input-field" rows={3} placeholder="Catatan opsional..."
            value={form.notes} onChange={(e) => updateField("notes", e.target.value)} />
        </div>
        <div className="flex gap-3 pt-2">
          <Link href="/customers" className="btn-secondary flex-1">Batal</Link>
          <button type="submit" disabled={saving} className="btn-primary flex-1">
            <Save className="w-4 h-4" />
            {saving ? "Menyimpan..." : "Update"}
          </button>
        </div>
      </form>
    </div>
  );
}
