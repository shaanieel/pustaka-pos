"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BookOpen,
  ShoppingCart,
  Users,
} from "lucide-react";
import { clsx } from "clsx";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/books", label: "Buku", icon: BookOpen },
  { href: "/orders/new", label: "Pesanan", icon: ShoppingCart },
  { href: "/customers", label: "Pelanggan", icon: Users },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-brand-100 z-50 safe-area-bottom">
      <div className="flex items-center justify-around px-1 py-2">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "flex flex-col items-center gap-1 py-1.5 px-3 rounded-2xl min-w-[64px] transition-all duration-200",
                isActive
                  ? "text-brand-700"
                  : "text-brand-400 hover:text-brand-600"
              )}
            >
              <div
                className={clsx(
                  "relative p-1.5 rounded-xl transition-all duration-200",
                  isActive && "bg-brand-100"
                )}
              >
                <item.icon
                  className={clsx(
                    "w-5 h-5 transition-all",
                    isActive && "scale-110"
                  )}
                  strokeWidth={isActive ? 2.5 : 2}
                />
              </div>
              <span
                className={clsx(
                  "text-[11px] font-semibold transition-all",
                  isActive ? "opacity-100" : "opacity-70"
                )}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
