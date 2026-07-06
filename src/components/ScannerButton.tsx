"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { ScanLine, X, Camera, Loader2 } from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";

interface ScannerButtonProps {
  onScan: (isbn: string) => void;
  label?: string;
  variant?: "primary" | "secondary" | "icon";
  size?: "sm" | "md";
}

export function ScannerButton({
  onScan,
  label = "Scan Barcode",
  variant = "primary",
  size = "md",
}: ScannerButtonProps) {
  const [open, setOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerDivId = useRef(`scanner-${Math.random().toString(36).slice(2, 8)}`);

  const startScanner = useCallback(async () => {
    setError(null);
    setScanning(true);

    try {
      const scanner = new Html5Qrcode(scannerDivId.current);
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 280, height: 140 },
          aspectRatio: 2,
        },
        (decodedText) => {
          // Accept ALL barcode formats (ISBN, book_code, dll)
          const raw = decodedText.replace(/[-\s]/g, "");
          setLastScanned(raw);
          stopScanner(scanner);
          onScan(raw);
          setOpen(false);
        },
        () => {
          // onScanFailure — silent, keep scanning
        }
      );
    } catch (e: any) {
      setScanning(false);
      const msg = e.message || e.toString();
      if (msg.includes("NotAllowedError") || msg.includes("Permission")) {
        setError("Izin kamera ditolak. Buka Settings browser > izinkan kamera.");
      } else if (msg.includes("NotFoundError")) {
        setError("Kamera tidak ditemukan. Pastikan perangkat punya kamera belakang.");
      } else {
        setError(`Gagal: ${msg.slice(0, 100)}`);
      }
    }
  }, [onScan]);

  function stopScanner(scanner?: Html5Qrcode | null) {
    const s = scanner || scannerRef.current;
    if (s) {
      s.stop().catch(() => {});
      scannerRef.current = null;
    }
    setScanning(false);
  }

  function handleClose() {
    stopScanner();
    setOpen(false);
    setError(null);
  }

  // Cleanup on unmount or close
  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, []);

  // Start scanning when modal opens
  useEffect(() => {
    if (open) {
      // Small delay to let DOM render
      const t = setTimeout(startScanner, 300);
      return () => clearTimeout(t);
    }
  }, [open, startScanner]);

  const btnSize = size === "sm" ? "text-sm px-3 py-1.5" : "px-4 py-2";
  const btnClass =
    variant === "icon"
      ? "btn-ghost p-2"
      : variant === "secondary"
      ? `btn-secondary ${btnSize}`
      : `btn-primary ${btnSize}`;

  return (
    <>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`${btnClass} flex items-center gap-1.5`}
      >
        {variant === "icon" ? (
          <ScanLine className="w-5 h-5" />
        ) : (
          <>
            <ScanLine className={size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4"} />
            {label}
          </>
        )}
      </button>

      {/* Scanner Modal */}
      {open && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-brand-100">
              <div className="flex items-center gap-2">
                <ScanLine className="w-5 h-5 text-brand-600" />
                <h3 className="font-semibold text-brand-800">Scan Barcode</h3>
              </div>
              <button onClick={handleClose} className="btn-ghost p-1.5 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scanner area */}
            <div className="p-4 space-y-3">
              {/* Viewfinder */}
              <div className="relative bg-black rounded-xl overflow-hidden aspect-[4/3]">
                {error ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-brand-950/90 p-6">
                    <div className="text-center space-y-3">
                      <Camera className="w-10 h-10 text-red-400 mx-auto" />
                      <p className="text-red-300 text-sm">{error}</p>
                      <button
                        onClick={() => {
                          setError(null);
                          startScanner();
                        }}
                        className="btn-secondary text-sm"
                      >
                        Coba Lagi
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div id={scannerDivId.current} className="w-full h-full" />
                    {/* Scanning overlay */}
                    {scanning && (
                      <div className="absolute inset-0 pointer-events-none">
                        {/* Corner guides */}
                        <div className="absolute top-8 left-8 w-10 h-10 border-t-3 border-l-3 border-green-400 rounded-tl" />
                        <div className="absolute top-8 right-8 w-10 h-10 border-t-3 border-r-3 border-green-400 rounded-tr" />
                        <div className="absolute bottom-8 left-8 w-10 h-10 border-b-3 border-l-3 border-green-400 rounded-bl" />
                        <div className="absolute bottom-8 right-8 w-10 h-10 border-b-3 border-r-3 border-green-400 rounded-br" />
                        {/* Scan line animation */}
                        <div className="absolute left-8 right-8 top-1/2 h-0.5">
                          <div className="h-full bg-gradient-to-r from-transparent via-green-400 to-transparent animate-pulse" />
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* Loading */}
                {!scanning && !error && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/80">
                    <div className="text-center space-y-2">
                      <Loader2 className="w-8 h-8 text-brand-400 animate-spin mx-auto" />
                      <p className="text-brand-300 text-sm">Menyalakan kamera...</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Instructions */}
              <p className="text-xs text-brand-400 text-center">
                📷 Arahkan kamera ke <strong>barcode ISBN</strong> di belakang buku
                {lastScanned && (
                  <span className="block mt-0.5 text-green-500">Terakhir scan: {lastScanned}</span>
                )}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
