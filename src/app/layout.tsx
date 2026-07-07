import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import { Sidebar } from "@/components/Sidebar";
import { MobileNav } from "@/components/MobileNav";

export const runtime = "edge";

export const metadata: Metadata = {
  title: "Bunayya Putra — Grosir Al-Qur'an & Buku Islam",
  description: "Aplikasi kasir modern — Grosir Al-Qur'an dan Buku-Buku Islam",
  icons: {
    icon: "https://qzlsccxuokfzwdlqrohx.supabase.co/storage/v1/object/public/assets/favicon.ico",
    shortcut: "https://qzlsccxuokfzwdlqrohx.supabase.co/storage/v1/object/public/assets/favicon-32.png",
    apple: "https://qzlsccxuokfzwdlqrohx.supabase.co/storage/v1/object/public/assets/favicon-32.png",
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Bunayya Putra",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: "#059669",
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <head>
        {/* iOS fullscreen hints */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-touch-fullscreen" content="yes" />
        <style>{`
          /* Prevent pull-to-refresh and overscroll on mobile */
          html, body {
            overscroll-behavior: none;
            -webkit-overflow-scrolling: touch;
          }
          body {
            /* Prevent select text on mobile for app-like feel */
            -webkit-tap-highlight-color: transparent;
            /* Use safe area insets for notched phones */
            padding-bottom: env(safe-area-inset-bottom, 0px);
          }
        `}</style>
      </head>
      <body className="min-h-[100dvh] flex flex-col lg:flex-row">
        {/* Auto fullscreen trigger — one tap anywhere */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              document.addEventListener('DOMContentLoaded', function() {
                // Auto-fullscreen attempt (works in some browsers after user gesture)
                document.addEventListener('click', function() {
                  if (document.documentElement.requestFullscreen && !document.fullscreenElement) {
                    document.documentElement.requestFullscreen().catch(() => {});
                  }
                }, { once: true });

                // Lock orientation to portrait on mobile
                try {
                  if (screen.orientation && screen.orientation.lock) {
                    screen.orientation.lock('portrait').catch(() => {});
                  }
                } catch(e) {}

                // Expand viewport to hide address bar on scroll
                let _lastScrollTop = 0;
                window.addEventListener('scroll', function() {
                  const st = window.pageYOffset || document.documentElement.scrollTop;
                  _lastScrollTop = st <= 0 ? 0 : st;
                }, { passive: true });
              });
            `,
          }}
        />
        <Sidebar />
        <main className="flex-1 pb-[calc(4rem+env(safe-area-inset-bottom,0px))] lg:pb-8 lg:ml-64 min-h-[100dvh]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 lg:py-6">
            {children}
          </div>
        </main>
        <MobileNav />
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 3000,
            style: {
              borderRadius: "12px",
              padding: "12px 16px",
              fontSize: "14px",
              fontWeight: 500,
            },
          }}
        />
      </body>
    </html>
  );
}
