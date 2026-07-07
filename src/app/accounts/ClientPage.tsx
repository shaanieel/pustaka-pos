"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";
import { SearchBar } from "@/components/SearchBar";
import { Users, Mail, Phone, MapPin, Shield, Eye, EyeOff, Save, X } from "lucide-react";
import toast from "react-hot-toast";

// Service role client untuk admin — baca/tulis semua profiles
const adminSupabase = createClient(
  "https://qzlsccxuokfzwdlqrohx.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF6bHNjY3h1b2tmendkbHFyb2h4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjY2MjYwNywiZXhwIjoyMDk4MjM4NjA3fQ.YJpieTzfT9uhN1Dyd6JXOiqBSXlprIsJNieZmaFHK3g",
  { auth: { persistSession: false } }
);

interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  address: string | null;
  province_name: string | null;
  regency_name: string | null;
  district_name: string | null;
  village_name: string | null;
  postal_code: string | null;
  latitude: number | null;
  longitude: number | null;
  created_at: string | null;
}

export default function AccountsPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [editProfile, setEditProfile] = useState<Profile | null>(null);
  const [editFullName, setEditFullName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editProvinceName, setEditProvinceName] = useState("");
  const [editRegencyName, setEditRegencyName] = useState("");
  const [editDistrictName, setEditDistrictName] = useState("");
  const [editVillageName, setEditVillageName] = useState("");
  const [editPostalCode, setEditPostalCode] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadProfiles = useCallback(async () => {
    setLoading(true);
    try {
      let query = adminSupabase.from("profiles").select("*");

      if (search) {
        query = query.or(
          `full_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`
        );
      }

      const { data, error } = await query.order("created_at", { ascending: false });
      if (error) throw error;
      setProfiles(data || []);
    } catch {
      toast.error("Gagal memuat data akun.");
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => { loadProfiles(); }, [loadProfiles]);

  const openEdit = (p: Profile) => {
    setEditProfile(p);
    setEditFullName(p.full_name || "");
    setEditEmail(p.email || "");
    setEditPhone(p.phone || "");
    setEditAddress(p.address || "");
    setEditProvinceName(p.province_name || "");
    setEditRegencyName(p.regency_name || "");
    setEditDistrictName(p.district_name || "");
    setEditVillageName(p.village_name || "");
    setEditPostalCode(p.postal_code || "");
    setEditPassword("");
    setShowPassword(false);
  };

  const saveEdit = async () => {
    if (!editProfile) return;
    if (!editFullName.trim()) return toast.error("Nama wajib diisi.");
    setSaving(true);
    try {
      const { error } = await adminSupabase
        .from("profiles")
        .update({
          full_name: editFullName.trim(),
          email: editEmail.trim(),
          phone: editPhone.trim(),
          address: editAddress.trim() || null,
          province_name: editProvinceName.trim() || null,
          regency_name: editRegencyName.trim() || null,
          district_name: editDistrictName.trim() || null,
          village_name: editVillageName.trim() || null,
          postal_code: editPostalCode.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editProfile.id);

      if (error) throw error;
      toast.success("Data akun berhasil disimpan.");
      setEditProfile(null);
      loadProfiles();
    } catch (err: any) {
      toast.error("Gagal: " + (err?.message || "Unknown error"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Data Akun</h1>
          <p className="page-subtitle">
            {profiles.length} akun terdaftar — kelola email, nomor HP
          </p>
        </div>
      </div>

      <SearchBar
        value={search}
        onChange={setSearch}
        placeholder="Cari nama, email, atau telepon..."
      />

      {loading ? (
        <div className="grid gap-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="card p-4 h-20 animate-pulse bg-brand-50/50" />
          ))}
        </div>
      ) : profiles.length === 0 ? (
        <div className="card p-12 text-center">
          <Shield className="w-12 h-12 text-brand-300 mx-auto mb-3" />
          <p className="text-brand-500 font-medium">Belum ada akun terdaftar</p>
          <p className="text-xs text-brand-400 mt-1">
            User yang daftar via web store otomatis muncul di sini.
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {profiles.map((p) => {
            const fullAddress = [p.address, p.village_name, p.district_name, p.regency_name, p.province_name]
              .filter(Boolean).join(", ");

            return (
              <div key={p.id} className="card p-4 group">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center shrink-0">
                      <Shield className="w-5 h-5 text-brand-500" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-brand-950 text-[15px] truncate">
                          {p.full_name || "Tanpa Nama"}
                        </p>
                        <span className="text-[11px] bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full font-medium">
                          Akun
                        </span>
                      </div>
                      <div className="flex flex-col gap-0.5 mt-0.5">
                        {p.email && (
                          <span className="flex items-center gap-1 text-xs text-brand-500">
                            <Mail className="w-3 h-3 shrink-0" />
                            <span className="truncate">{p.email}</span>
                          </span>
                        )}
                        {p.phone && (
                          <span className="flex items-center gap-1 text-xs text-brand-500">
                            <Phone className="w-3 h-3 shrink-0" />
                            <span className="truncate">{p.phone}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0 hidden sm:block">
                    {fullAddress ? (
                      <div className="flex items-start gap-1 text-xs text-brand-400">
                        <MapPin className="w-3 h-3 mt-0.5 shrink-0" />
                        <span className="max-w-[200px] text-right">{fullAddress}</span>
                      </div>
                    ) : (
                      <span className="text-[11px] text-brand-300 italic">Belum isi alamat</span>
                    )}
                    {p.created_at && (
                      <p className="text-[10px] text-brand-300 mt-0.5">
                        Daftar: {new Date(p.created_at).toLocaleDateString("id-ID")}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 mt-3 pt-3 border-t border-brand-100">
                  <button
                    onClick={() => openEdit(p)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-50 hover:bg-brand-100 text-brand-600 text-xs font-bold transition-colors"
                  >
                    ✏️ Edit Data
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* EDIT MODAL */}
      {editProfile && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90dvh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b shrink-0">
              <h3 className="font-semibold text-brand-800">Edit Data Akun</h3>
              <button onClick={() => setEditProfile(null)} className="p-1 hover:bg-brand-50 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-4 space-y-4">
              {/* Nama */}
              <div>
                <label className="block text-sm font-medium text-brand-700 mb-1">Nama Lengkap</label>
                <input
                  className="w-full px-3 py-2 rounded-xl border border-brand-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                />
              </div>
              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-brand-700 mb-1">Email</label>
                <input
                  type="email"
                  className="w-full px-3 py-2 rounded-xl border border-brand-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                />
                <p className="text-[10px] text-brand-400 mt-1">⚠️ Ubah email login user harus via Dashboard</p>
              </div>
              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-brand-700 mb-1">Nomor HP</label>
                <input
                  type="tel"
                  className="w-full px-3 py-2 rounded-xl border border-brand-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                />
              </div>
              {/* Alamat */}
              <div>
                <label className="block text-sm font-medium text-brand-700 mb-1">Alamat</label>
                <input
                  className="w-full px-3 py-2 rounded-xl border border-brand-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  placeholder="Jalan, gang, nomor rumah"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-brand-700 mb-1">Provinsi</label>
                  <input
                    className="w-full px-3 py-2 rounded-xl border border-brand-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
                    value={editProvinceName}
                    onChange={(e) => setEditProvinceName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-brand-700 mb-1">Kota</label>
                  <input
                    className="w-full px-3 py-2 rounded-xl border border-brand-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
                    value={editRegencyName}
                    onChange={(e) => setEditRegencyName(e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-brand-700 mb-1">Kecamatan</label>
                  <input
                    className="w-full px-3 py-2 rounded-xl border border-brand-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
                    value={editDistrictName}
                    onChange={(e) => setEditDistrictName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-brand-700 mb-1">Kelurahan</label>
                  <input
                    className="w-full px-3 py-2 rounded-xl border border-brand-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
                    value={editVillageName}
                    onChange={(e) => setEditVillageName(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-brand-700 mb-1">Kode Pos</label>
                <input
                  className="w-full px-3 py-2 rounded-xl border border-brand-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
                  value={editPostalCode}
                  onChange={(e) => setEditPostalCode(e.target.value)}
                />
              </div>
              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-brand-700 mb-1">Password Baru</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    className="w-full px-3 py-2 pr-10 rounded-xl border border-brand-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    placeholder="Isi untuk reset password (min 6 karakter)"
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-400 hover:text-brand-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[10px] text-brand-400 mt-1">⚠️ Reset password via Dashboard → Auth → Users</p>
              </div>
            </div>

            <div className="flex gap-3 px-4 py-3 border-t bg-brand-50/50 shrink-0">
              <button
                onClick={() => setEditProfile(null)}
                className="flex-1 px-4 py-2 rounded-xl border border-brand-200 text-brand-600 text-sm font-semibold hover:bg-brand-50 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={saveEdit}
                disabled={saving}
                className="flex-1 btn-primary !rounded-xl"
              >
                <Save className="w-4 h-4" />
                {saving ? "Menyimpan..." : "Simpan"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
