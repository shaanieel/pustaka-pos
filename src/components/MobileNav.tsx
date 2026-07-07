"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  BookOpen,
  ShoppingCart,
  Users,
  Plus,
  Clock,
  Shield,
} from "lucide-react";
import { clsx } from "clsx";

const navItems = [
  { href: "/", label: "Beranda", icon: LayoutDashboard },
  { href: "/books", label: "Buku", icon: BookOpen },
  // Center: floating add button (not in the map, rendered separately)
  { href: "/orders", label: "Pesanan", icon: Clock },
  { href: "/accounts", label: "Data Akun", icon: Shield },
  { href: "/customers", label: "Pelanggan", icon: Users },
];

export function MobileNav() {
  const pathname = usePathname() ?? "/";
  const router = useRouter();

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  }

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-brand-100 z-50">
      <div className="flex items-center justify-around px-1 py-2 relative">
        {navItems.map((item, i) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "flex flex-col items-center gap-0.5 py-1 px-2 rounded-2xl min-w-[60px] transition-all duration-200",
                active
                  ? "text-brand-700"
                  : "text-brand-400 hover:text-brand-600"
              )}
            >
              <div
                className={clsx(
                  "relative p-1.5 rounded-xl transition-all duration-200",
                  active && "bg-brand-100"
                )}
              >
                <item.icon
                  className={clsx(
                    "w-5 h-5 transition-all",
                    active && "scale-110"
                  )}
                  strokeWidth={active ? 2.5 : 2}
                />
              </div>
              <span
                className={clsx(
                  "text-[10px] font-semibold transition-all",
                  active ? "opacity-100" : "opacity-70"
                )}
              >
                {item.label}
              </span>
            </Link>
          );
        })}

        {/* Floating Center Button — Pesanan Baru */}
        <div className="absolute left-1/2 -translate-x-1/2 -top-5 z-10">
          <button
            onClick={() => router.push("/orders/new")}
            className="w-14 h-14 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-white
                       flex items-center justify-center shadow-lg shadow-brand-300/50
                       active:scale-90 transition-transform duration-150
                       border-4 border-white"
          >
            <Plus className="w-7 h-7" strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </nav>
  );
}
