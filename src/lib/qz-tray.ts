/**
 * QZ Tray Connector — thermal printing via desktop app
 * ======================================================
 * QZ Tray must be installed on the user's machine (https://qz.io)
 * It runs as system tray app, exposes WebSocket API at localhost:4244
 *
 * Usage:
 *   import qz from "@/lib/qz-tray";
 *   await qz.connect();
 *   await qz.printReceipt({ receiptData });
 *   await qz.disconnect();
 */

let _scriptLoaded = false;
let _connected = false;
let _qz: any = null;

// ─── Import shared receipt builder — same format as Web Bluetooth path ──
import type { ReceiptData } from "./bluetooth-printer";
import { buildReceiptBytes } from "./bluetooth-printer";

// ─── Load QZ script ─────────────────────────────────
function loadScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if ((window as any).qz) {
      _qz = (window as any).qz;
      _scriptLoaded = true;
      resolve();
      return;
    }
    const s = document.createElement("script");
    s.src = "https://qz.io/qz.min.js";
    s.onload = () => {
      _qz = (window as any).qz;
      _scriptLoaded = true;
      resolve();
    };
    s.onerror = () => reject(new Error("Gagal load qz.min.js. Cek koneksi internet."));
    document.head.appendChild(s);
  });
}

// ─── Helpers ────────────────────────────────────────
function u8toBase64(buf: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
  return btoa(bin);
}

/** ESC/POS init — reset printer */
const CMD_INIT = 0x1b;
const CMD_CUT = 0x1d;

// ─── Public API ─────────────────────────────────────
const qz = {
  /** Connect to QZ Tray (must be running) */
  async connect(): Promise<void> {
    if (_connected) return;
    if (!_scriptLoaded) await loadScript();
    try {
      await _qz.websocket.connect();
      _connected = true;
    } catch {
      throw new Error("QZ Tray gak jalan. Download & install dari https://qz.io, terus jalankan.");
    }
  },

  /** Disconnect */
  async disconnect(): Promise<void> {
    if (!_connected) return;
    try { await _qz.websocket.disconnect(); } catch { /* ignore */ }
    _connected = false;
  },

  /** Cek koneksi */
  isConnected(): boolean {
    return _connected;
  },

  /** Daftar printer yang terdeteksi */
  async listPrinters(): Promise<string[]> {
    await this.connect();
    return _qz.printers.getPrinters();
  },

  /** Cari printer (pake keyword atau default pertama) */
  async findPrinter(keyword?: string): Promise<string> {
    await this.connect();
    const list: string[] = await _qz.printers.getPrinters();
    if (list.length === 0) throw new Error("Nggak ada printer ditemukan.");
    if (keyword) {
      const found = list.find((p: string) => p.toLowerCase().includes(keyword.toLowerCase()));
      if (found) return found;
      throw new Error(`Printer "${keyword}" gak ketemu.`);
    }
    // Auto-detect: cari thermal / POS / 58mm
    const thermal = list.find(
      (p: string) =>
        p.toLowerCase().includes("thermal") ||
        p.toLowerCase().includes("pos") ||
        p.toLowerCase().includes("58") ||
        p.toLowerCase().includes("iware") ||
        p.toLowerCase().includes("x-583")
    );
    return thermal || list[0];
  },

  /** Print raw ESC/POS bytes */
  async printRaw(printer: string, bytes: Uint8Array): Promise<void> {
    await this.connect();
    const config = _qz.configs.create(printer, { encoding: "EPC", feed: 3 });
    await _qz.print(config, [
      { type: "raw", format: "base64", data: u8toBase64(bytes) },
    ]);
  },

  /** Print receipt image (pixel mode — more compatible) */
  async printImage(printer: string, base64Img: string): Promise<void> {
    await this.connect();
    const config = _qz.configs.create(printer, { feed: 5 });
    await _qz.print(config, [
      { type: "pixel", format: "image", data: base64Img },
    ]);
  },

  /** Simple test print */
  async testPrint(printerName?: string): Promise<void> {
    const printer = printerName || (await this.findPrinter());
    const enc = new TextEncoder();
    const chunks: Uint8Array[] = [
      new Uint8Array([CMD_INIT, 0x40]),
      new Uint8Array([0x1b, 0x61, 0x01]),
      new Uint8Array([0x1d, 0x21, 0x22]),
      enc.encode("TEST PRINT\n\n"),
      new Uint8Array([0x1b, 0x61, 0x00]),
      enc.encode("QZ Tray\n"),
      enc.encode("Cetak thermal via desktop!\n\n\n"),
      new Uint8Array([0x1d, 0x56, 0x01]),
    ];
    let totalLen = 0;
    for (const c of chunks) totalLen += c.length;
    const full = new Uint8Array(totalLen);
    let off = 0;
    for (const c of chunks) { full.set(c, off); off += c.length; }
    await this.printRaw(printer, full);
  },

  /** Print full receipt from ReceiptData — uses buildReceiptBytes for consistent output */
  async printReceipt(
    data: ReceiptData,
    printerName?: string
  ): Promise<void> {
    const printer = printerName || (await this.findPrinter());
    const raw = buildReceiptBytes(data);
    await this.printRaw(printer, raw);
  },
};

export default qz;
export { _connected as isQZTrayConnected };
