"use client";

import { useEffect, useRef, useState } from "react";
import { Printer, Download, Barcode } from "lucide-react";

interface BarcodeLabelProps {
  value: string; // book_code
  label?: string; // judul buku
}

export function BarcodeLabel({ value, label }: BarcodeLabelProps) {
  const barcodeRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!value || value.length < 2) return;

    // Dynamic import jsbarcode
    import("jsbarcode").then((JsBarcode) => {
      if (barcodeRef.current) {
        try {
          JsBarcode.default(barcodeRef.current, value, {
            format: "CODE128",
            width: 2,
            height: 60,
            displayValue: true,
            fontSize: 14,
            textMargin: 4,
            margin: 10,
            background: "#ffffff",
            lineColor: "#000000",
          });
          setReady(true);
        } catch {
          // invalid value
        }
      }
    });
  }, [value]);

  // Print label
  const handlePrint = () => {
    const svgEl = barcodeRef.current;
    if (!svgEl) return;

    const svgData = new XMLSerializer().serializeToString(svgEl);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d")!;
    const img = new Image();

    img.onload = () => {
      // Landscape label: wide barcode
      canvas.width = 400;
      canvas.height = 150;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 30, 20, 340, 90);

      // Title text below
      ctx.fillStyle = "#333333";
      ctx.font = "bold 11px sans-serif";
      ctx.textAlign = "center";
      if (label) {
        // truncate
        const maxLen = 35;
        const text = label.length > maxLen ? label.slice(0, maxLen) + "…" : label;
        ctx.fillText(text, 200, 135);
      }

      // Open print window
      const win = window.open("", "_blank", "width=450,height=200");
      if (win) {
        win.document.write(`
          <html>
            <head><title>Print Label - ${value}</title></head>
            <body style="margin:0;display:flex;align-items:center;justify-content:center;height:100vh;">
              <img src="${canvas.toDataURL("image/png")}" style="max-width:100%;" />
              <script>window.onload=()=>{window.print();window.close()}<\/script>
            </body>
          </html>
        `);
        win.document.close();
      }
    };
    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
  };

  // Download PNG
  const handleDownload = () => {
    const svgEl = barcodeRef.current;
    if (!svgEl) return;

    const svgData = new XMLSerializer().serializeToString(svgEl);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d")!;
    const img = new Image();

    img.onload = () => {
      canvas.width = 400;
      canvas.height = 150;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 30, 20, 340, 90);
      ctx.fillStyle = "#333333";
      ctx.font = "bold 11px sans-serif";
      ctx.textAlign = "center";
      if (label) {
        const maxLen = 35;
        const text = label.length > maxLen ? label.slice(0, maxLen) + "…" : label;
        ctx.fillText(text, 200, 135);
      }

      const link = document.createElement("a");
      link.download = `${value}-barcode.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    };
    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
  };

  if (!value || value.length < 2) {
    return (
      <div className="text-xs text-brand-400 italic">
        Kode buku belum tersedia
      </div>
    );
  }

  return (
    <div ref={containerRef} className="space-y-3">
      {/* Barcode SVG */}
      <div className="bg-white rounded-xl border border-brand-200 p-4 inline-flex flex-col items-center">
        <svg ref={barcodeRef} className="max-w-full" />
        {ready && label && (
          <p className="text-xs text-brand-500 mt-1 text-center max-w-[300px] truncate">
            {label}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handlePrint}
          disabled={!ready}
          className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1"
        >
          <Printer className="w-3.5 h-3.5" />
          Print Label
        </button>
        <button
          type="button"
          onClick={handleDownload}
          disabled={!ready}
          className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1"
        >
          <Download className="w-3.5 h-3.5" />
          Simpan PNG
        </button>
      </div>
    </div>
  );
}
