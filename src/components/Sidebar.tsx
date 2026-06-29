"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BookOpen,
  ShoppingCart,
  Users,
  PlusCircle,
  BookMarked,
  ReceiptText,
} from "lucide-react";
import { clsx } from "clsx";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/books", label: "Database Buku", icon: BookOpen },
  { href: "/books/add", label: "Tambah Buku", icon: PlusCircle },
  { href: "/orders", label: "Riwayat Pesanan", icon: ReceiptText },
  { href: "/orders/new", label: "Pesanan Baru", icon: ShoppingCart },
  { href: "/customers", label: "Pelanggan", icon: Users },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex flex-col fixed left-0 top-0 h-full w-64 bg-white border-r border-brand-100 z-40">
      {/* Logo */}
      <div className="px-6 pt-7 pb-6 border-b border-brand-50">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-md shadow-brand-200 group-hover:shadow-lg group-hover:scale-105 transition-all duration-200">
            <BookMarked className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-brand-900 tracking-tight leading-tight">
              Bunayya<span className="text-brand-600">Putra</span>
            </h1>
            <p className="text-[11px] text-brand-400 font-medium">
            Grosir Al-Qur'an &amp; Buku Islam
            </p>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-5 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          // Ambil item dengan prefix terpanjang yang match → no more double-active
          const isActive =
            navItems
              .filter((i) => pathname.startsWith(i.href))
              .sort((a, b) => b.href.length - a.href.length)[0]
              ?.href === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "flex items-center gap-3 px-4 py-3 rounded-xl text-[15px] font-medium transition-all duration-200 group",
                isActive
                  ? "bg-brand-50 text-brand-700 shadow-sm"
                  : "text-brand-600 hover:bg-brand-50/60 hover:text-brand-700"
              )}
            >
              <item.icon
                className={clsx(
                  "w-5 h-5 transition-colors duration-200",
                  isActive ? "text-brand-600" : "text-brand-400 group-hover:text-brand-500"
                )}
              />
              {item.label}
              {isActive && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-brand-500" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-brand-50">
        <p className="text-xs text-brand-400 font-medium">
          &copy; {new Date().getFullYear()} Bunayya Putra
        </p>
      </div>
    </aside>
  );
}
