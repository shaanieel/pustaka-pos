// Bluetooth Thermal Printer — Web Bluetooth + ESC/POS 58mm
// Pair sekali, auto-reconnect, cetak struk modern
//
// ─── LIMITASI YANG DIKETAHUI ───
// Web Bluetooth API HANYA support BLE (Bluetooth Low Energy).
// Printer thermal POS-58B/RPP02N umumnya pake Bluetooth Classic (SPP),
// yang TIDAK BISA diakses via Web Bluetooth di browser desktop/mobile.
//
// Solusi alternatif kalo printer cuma support SPP:
//   1. USB (WebUSB / Web Serial) — via kabel USB
//   2. QZ Tray — aplikasi desktop bridge buat cetak dari browser
//   3. Bridge lokal — aplikasi companion yg forward data dari WebSocket ke SPP

const PRINTER_STORAGE_KEY = "pustakapos_printer";
const AUTO_PRINT_KEY = "pustakapos_autoprint";

export interface PairedPrinter {
  id: string;
  name: string;
}

export interface PrinterLogEntry {
  level: "info" | "warn" | "error" | "debug";
  message: string;
  timestamp: string;
  data?: any;
}

type LogCallback = (entry: PrinterLogEntry) => void;

// ─── Persistence ───────────────────────────────

export function getPairedPrinter(): PairedPrinter | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(PRINTER_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setPairedPrinter(p: PairedPrinter) {
  localStorage.setItem(PRINTER_STORAGE_KEY, JSON.stringify(p));
}

export function removePairedPrinter() {
  localStorage.removeItem(PRINTER_STORAGE_KEY);
}

export function getAutoPrint(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(AUTO_PRINT_KEY) !== "false";
}

export function setAutoPrint(v: boolean) {
  localStorage.setItem(AUTO_PRINT_KEY, v ? "true" : "false");
}

// ─── Utility ───────────────────────────────────

let _device: BluetoothDevice | null = null;
let _characteristic: BluetoothRemoteGATTCharacteristic | null = null;
let _logCallback: LogCallback | null = null;

export function setLogCallback(cb: LogCallback) {
  _logCallback = cb;
}

function log(level: PrinterLogEntry["level"], message: string, data?: any) {
  const entry: PrinterLogEntry = {
    level,
    message,
    timestamp: new Date().toLocaleTimeString("id-ID"),
    data,
  };
  console.log(`[Printer ${level.toUpperCase()}] ${message}`, data ?? "");
  _logCallback?.(entry);
}

// ─── UUID Database ─────────────────────────────
// Berbagai UUID yg umum dipake printer thermal BLE
const PRINTER_SERVICE_UUIDS = [
  // Standard ESC/POS BLE
  "000018f0-0000-1000-8000-00805f9b34fb",
  // Mopria / Star Micronics / Epson
  "49535343-fe7d-4ae5-8fa9-9fafd205e455",
  // Generic Printer (Star, Bixolon, etc)
  "0000ff00-0000-1000-8000-00805f9b34fb",
  // Serial Port Profile over BLE (beberapa printer thermal)
  "00001101-0000-1000-8000-00805f9b34fb",
  // SPW (Print Service for Wearables)
  "0000180a-0000-1000-8000-00805f9b34fb",
  // Vendor-specific (PeriPage, 58mm generic)
  "ae22d12e-0000-1000-8000-00805f9b34fb",
  // Thermal printer BLE (Xprinter, RPP02N)
  "9ea5e000-0000-1000-8000-00805f9b34fb",
];

const PRINTER_CHAR_UUIDS = [
  // Standard ESC/POS write
  "00002af1-0000-1000-8000-00805f9b34fb",
  // Mopria print characteristic
  "49535343-8841-43f4-a8d4-ecbe34729bb3",
  // Alternative write char
  "00001102-0000-1000-8000-00805f9b34fb",
  // Serial data
  "0000ff02-0000-1000-8000-00805f9b34fb",
  // Peripheral preferred connection
  "0000ff01-0000-1000-8000-00805f9b34fb",
  // PeriPage write char
  "ae22d12f-0000-1000-8000-00805f9b34fb",
  // Common write
  "9ea5e001-0000-1000-8000-00805f9b34fb",
];

/** Cek apakah browser support Web Bluetooth */
export function isWebBluetoothSupported(): boolean {
  return typeof navigator !== "undefined" && "bluetooth" in navigator;
}

/** Deteksi platform */
export function getPlatformInfo() {
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  const isMobile = /Android|iPhone|iPad|iPod/i.test(ua);
  const isChrome = /Chrome/i.test(ua) && !/Edg/i.test(ua);
  const isEdge = /Edg/i.test(ua);
  const isDesktop = !isMobile && (isChrome || isEdge);

  return { isMobile, isDesktop, isChrome, isEdge, ua };
}

// ─── Cari Characteristic ───────────────────────

/** Cari writable characteristic — coba UUID umum dulu, lalu scan semua service */
async function findPrinterChar(
  server: BluetoothRemoteGATTServer
): Promise<BluetoothRemoteGATTCharacteristic | null> {
  // Strategy 1: coba UUID service tertentu + UUID characteristic tertentu
  for (const svcUuid of PRINTER_SERVICE_UUIDS) {
    try {
      log("debug", `Coba service UUID: ${svcUuid}`);
      const service = await server.getPrimaryService(svcUuid);
      log("info", `Service ditemukan: ${service.uuid}`);

      // Coba semua char UUID yg umum
      for (const charUuid of PRINTER_CHAR_UUIDS) {
        try {
          const char = await service.getCharacteristic(charUuid);
          const props = char.properties;
          log("info", `Characteristic ${charUuid}: write=${props.write} writeWithoutResponse=${props.writeWithoutResponse} notify=${props.notify}`);

          if (props.write || props.writeWithoutResponse) {
            log("info", `Characteristic writable dipilih: ${charUuid} (write=${props.write}, woResp=${props.writeWithoutResponse})`);
            return char;
          }
        } catch {
          // Char UUID gak cocok, lanjut
        }
      }

      // Kalo gak ketemu via UUID spesifik, scan semua char di service ini
      const chars = await service.getCharacteristics();
      for (const c of chars) {
        if (c.properties.write || c.properties.writeWithoutResponse) {
          log("info", `Characteristic writable ditemukan via scan: ${c.uuid} (write=${c.properties.write}, woResp=${c.properties.writeWithoutResponse})`);
          return c;
        }
      }
    } catch {
      // Service UUID gak cocok, lanjut
    }
  }

  // Strategy 2: scan SEMUA service cari yg writable
  log("warn", "Tidak ketemu via UUID spesifik. Scan semua service...");
  try {
    const services = await server.getPrimaryServices();
    log("info", `Found ${services.length} services total`);
    for (const svc of services) {
      log("debug", `  Service: ${svc.uuid}`);
      try {
        const chars = await svc.getCharacteristics();
        for (const c of chars) {
          const props = `write=${c.properties.write} woResp=${c.properties.writeWithoutResponse} read=${c.properties.read} notify=${c.properties.notify}`;
          log("debug", `    Char: ${c.uuid} [${props}]`);
          if (c.properties.write || c.properties.writeWithoutResponse) {
            log("info", `Characteristic writable ditemukan via scan: ${c.uuid}`);
            return c;
          }
        }
      } catch {
        // skip service yg error
      }
    }
  } catch (e) {
    log("error", "Gagal scan services", e);
  }

  return null;
}

// ─── Pair / Reconnect / Disconnect ─────────────

/** Pair printer baru — munculin popup Bluetooth OS */
export async function pairPrinter(): Promise<PairedPrinter> {
  log("info", "Pair printer baru...");

  if (!isWebBluetoothSupported()) {
    const platform = getPlatformInfo();
    if (platform.isMobile) {
      throw new Error(
        "Web Bluetooth tidak didukung di browser ini. " +
        "Gunakan Chrome Android versi terbaru."
      );
    }
    throw new Error(
      "Web Bluetooth tidak didukung di browser ini.\n\n" +
      "Gunakan Chrome atau Edge versi terbaru di Windows/Mac.\n\n" +
      "Catatan: Printer thermal POS-58B umumnya menggunakan Bluetooth Classic (SPP)\n" +
      "yang TIDAK didukung Web Bluetooth. Solusi:\n" +
      "  1. USB: sambung via kabel USB\n" +
      "  2. QZ Tray: aplikasi bridge desktop\n" +
      "  3. Ganti printer yg support BLE / WiFi"
    );
  }

  log("info", "Menampilkan dialog pairing Bluetooth...");
  const device = await navigator.bluetooth.requestDevice({
    acceptAllDevices: true,
    optionalServices: PRINTER_SERVICE_UUIDS,
  });

  log("info", `Device dipilih: ${device.name || "Tanpa nama"} (${device.id})`);
  log("debug", "Connecting to GATT server...");

  const server = await device.gatt!.connect();
  log("info", "GATT connected");

  const char = await findPrinterChar(server);
  if (!char) {
    await device.gatt!.disconnect();
    log("error", "Tidak ada characteristic writable");

    // Log detail semua service buat debugging
    try {
      const services = await server.getPrimaryServices();
      for (const svc of services) {
        log("debug", `Service: ${svc.uuid}`);
        try {
          const chars = await svc.getCharacteristics();
          for (const c of chars) {
            log("debug", `  Char ${c.uuid}: write=${c.properties.write} woResp=${c.properties.writeWithoutResponse} read=${c.properties.read} notify=${c.properties.notify}`);
          }
        } catch {}
      }
    } catch {}

    const platform = getPlatformInfo();
    if (!platform.isMobile) {
      throw new Error(
        "Printer tidak kompatibel dengan Web Bluetooth.\n\n" +
        device.name
          ? `Printer "${device.name}" terdeteksi tapi tidak memiliki service ESC/POS yang diperlukan.\n\n`
          : "" +
        "Kemungkinan printer ini menggunakan Bluetooth Classic (SPP) yang TIDAK didukung Web Bluetooth.\n\n" +
        "Solusi:\n" +
        "  1. USB: Hubungkan via kabel USB ke komputer\n" +
        "  2. QZ Tray: Install aplikasi bridge desktop (https://qztray.com)\n" +
        "  3. Ganti printer thermal dengan support BLE atau WiFi"
      );
    }

    throw new Error(
      "Printer tidak memiliki karakteristik tulis (write).\n" +
      "Coba:\n" +
      "  1. Restart printer\n" +
      "  2. Hapus pairing lama di Settings Bluetooth HP\n" +
      "  3. Pair ulang dari awal\n" +
      "  4. Coba pake USB kalo ada"
    );
  }

  _device = device;
  _characteristic = char;

  const paired: PairedPrinter = {
    id: device.id,
    name: device.name || "Printer Thermal",
  };
  setPairedPrinter(paired);

  device.addEventListener("gattserverdisconnected", () => {
    log("warn", `Printer disconnected: ${device.name}`);
    _device = null;
    _characteristic = null;
  });

  log("info", `Pairing berhasil: ${paired.name}`);
  return paired;
}

/** Reconnect ke printer yg pernah dipairing — tanpa dialog */
export async function reconnectPrinter(): Promise<void> {
  log("info", "Reconnect printer...");

  if (!isWebBluetoothSupported()) {
    throw new Error("Web Bluetooth tidak didukung browser ini.");
  }

  if (_device?.gatt?.connected) {
    log("debug", "Printer masih terhubung, skip reconnect");
    return;
  }

  const paired = getPairedPrinter();
  if (!paired) throw new Error("Belum ada printer terdaftar. Pairing dulu.");

  log("info", `Mencari device: ${paired.name} (${paired.id})`);
  const devices = await navigator.bluetooth.getDevices();
  const device = devices.find((d) => d.id === paired.id);

  if (!device) {
    removePairedPrinter();
    throw new Error(
      `Printer "${paired.name}" tidak ditemukan. ` +
      "Mungkin sudah di-unpair dari OS Bluetooth settings. Pairing ulang."
    );
  }

  log("info", `Device ditemukan, connecting...`);
  const server = await device.gatt!.connect();
  log("info", "GATT connected");

  const char = await findPrinterChar(server);
  if (!char) {
    await device.gatt!.disconnect();
    throw new Error("Printer tidak mendukung ESC/POS (karakteristik write tidak ditemukan).");
  }

  _device = device;
  _characteristic = char;

  device.addEventListener("gattserverdisconnected", () => {
    log("warn", `Printer disconnected: ${device.name}`);
    _device = null;
    _characteristic = null;
  });

  log("info", "Reconnect berhasil");
}

/** Putuskan koneksi */
export async function disconnectPrinter(): Promise<void> {
  log("info", "Disconnect printer");
  if (_device?.gatt?.connected) {
    _device.gatt.disconnect();
  }
  _device = null;
  _characteristic = null;
}

/** Status koneksi */
export function isConnected(): boolean {
  return !!(_device?.gatt?.connected);
}

/** Dapatkan nama printer yg sedang nyambung */
export function getConnectedName(): string | null {
  return _device?.name || null;
}

/** Daftar device yg pernah dipairing ke origin ini */
export async function listPairedDevices(): Promise<PairedPrinter[]> {
  if (!isWebBluetoothSupported()) return [];
  try {
    const devices = await navigator.bluetooth.getDevices();
    return devices.map((d) => ({
      id: d.id,
      name: d.name || "Printer Thermal",
    }));
  } catch {
    return [];
  }
}

// ─── ESC/POS 58mm ──────────────────────────────

const ESC = "\x1b";
const GS = "\x1d";

function cmd(...args: number[]) {
  return new Uint8Array(args);
}

// Init
const INIT = cmd(0x1b, 0x40);
// Line feed
const LF = cmd(0x0a);
// Center align
const CENTER = cmd(0x1b, 0x61, 0x01);
// Left align
const LEFT = cmd(0x1b, 0x61, 0x00);
// Right align
const RIGHT = cmd(0x1b, 0x61, 0x02);
// Bold on
const BOLD_ON = cmd(0x1b, 0x45, 0x01);
// Bold off
const BOLD_OFF = cmd(0x1b, 0x45, 0x00);
// Double height + width
const DB_SIZE = cmd(0x1d, 0x21, 0x30);
// Normal size
const NORMAL = cmd(0x1d, 0x21, 0x00);
// Paper cut (full)
const CUT = cmd(0x1d, 0x56, 0x00);
// Drawer kick
const KICK = cmd(0x1b, 0x70, 0x00, 0x19, 0xfa);
// Feed paper (n lines)
function feed(n: number) { return cmd(0x1b, 0x64, n); }

const MAX_COL = 32;
const DIVIDER = "─".repeat(MAX_COL);
const EQUALS = "=".repeat(MAX_COL);

function textLine(t: string): Uint8Array {
  return new TextEncoder().encode(t.substring(0, MAX_COL) + "\n");
}

function centerText(t: string): Uint8Array {
  const pad = Math.max(0, Math.floor((MAX_COL - t.length) / 2));
  const padded = " ".repeat(pad) + t;
  return textLine(padded);
}

function boldText(t: string): Uint8Array {
  const enc = new TextEncoder();
  const text = enc.encode(t.substring(0, MAX_COL));
  const result = new Uint8Array(BOLD_ON.length + text.length + BOLD_OFF.length);
  result.set(BOLD_ON, 0);
  result.set(text, BOLD_ON.length);
  result.set(BOLD_OFF, BOLD_ON.length + text.length);
  return result;
}

function rightAlign(t: string): Uint8Array {
  const truncated = t.length > MAX_COL ? t.substring(0, MAX_COL) : t;
  const pad = Math.max(0, MAX_COL - truncated.length);
  return textLine(" ".repeat(pad) + truncated);
}

function leftRight(left: string, right: string): Uint8Array {
  const maxL = MAX_COL - 1;
  const rLen = right.length;
  const lTrunc = left.length > maxL - rLen ? left.substring(0, maxL - rLen) : left;
  const pad = MAX_COL - lTrunc.length - rLen;
  const line = lTrunc + " ".repeat(Math.max(0, pad)) + right;
  return textLine(line);
}

function fmt(n: number): string {
  return "Rp" + n.toLocaleString("id-ID");
}

// ─── Build Receipt ─────────────────────────────

export interface ReceiptData {
  orderId: string;
  createdAt: string;
  customerName: string;
  paymentMethod: string;
  paymentStatus: string;
  totalAmount: number;
  discount: number;
  finalAmount: number;
  paidAmount: number;
  changeAmount: number;
  items: {
    name: string;
    qty: number;
    price: number;
    subtotal: number;
  }[];
}

function statusLabel(s: string): string {
  switch (s) {
    case "lunas": return "● LUNAS";
    case "belum_lunas": return "● BELUM LUNAS";
    case "belum_bayar": return "● BELUM BAYAR";
    case "waiting_payment": return "● MENUNGGU PEMBAYARAN";
    default: return s.toUpperCase();
  }
}

export function buildReceiptBytes(data: ReceiptData): Uint8Array {
  const enc = new TextEncoder();
  const parts: Uint8Array[] = [INIT, CENTER];

  // ── Header ──
  parts.push(DB_SIZE);
  parts.push(enc.encode("BUNAYYA PUTRA\n"));
  parts.push(NORMAL);
  parts.push(enc.encode("Grosir Al-Qur'an & Buku Islam\n"));
  parts.push(enc.encode("JL. CEMPAKA NO. 91 A/91 B\n"));
  parts.push(enc.encode("PEKANBARU — RIAU\n"));
  parts.push(enc.encode("WA: 0812-7012-9971\n"));
  parts.push(textLine(EQUALS));

  // ── Info Transaksi ──
  parts.push(LEFT);
  parts.push(enc.encode("No. Struk: #" + data.orderId.substring(0, 8).toUpperCase() + "\n"));
  const d = new Date(data.createdAt);
  const dateStr = d.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
  const timeStr = d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
  parts.push(enc.encode("Tanggal: " + dateStr + "\n"));
  parts.push(enc.encode("Waktu  : " + timeStr + "\n"));
  parts.push(enc.encode("Pelanggan: " + (data.customerName || "Umum") + "\n"));
  parts.push(enc.encode("Metode: " + data.paymentMethod.toUpperCase() + "\n"));
  parts.push(textLine(DIVIDER));

  // ── Items ──
  parts.push(BOLD_ON);
  parts.push(enc.encode("#  Produk                  Qty  Harga\n"));
  parts.push(BOLD_OFF);
  for (let i = 0; i < data.items.length; i++) {
    const item = data.items[i];
    const no = (i + 1).toString();
    const name = item.name.length > 18 ? item.name.substring(0, 17) + "." : item.name;
    const qtyStr = item.qty.toString();
    const priceStr = item.price.toLocaleString("id-ID");
    const leftPart = no + " " + name;
    const rightPart = qtyStr + "  " + priceStr;
    const pad = MAX_COL - leftPart.length - rightPart.length;
    parts.push(enc.encode(leftPart + " ".repeat(Math.max(0, pad)) + rightPart + "\n"));
  }
  parts.push(textLine(DIVIDER));

  // ── Total ──
  parts.push(enc.encode("Subtotal: " + fmt(data.totalAmount) + "\n"));
  if (data.discount > 0) {
    parts.push(enc.encode("Diskon  : -" + fmt(data.discount) + "\n"));
  }
  parts.push(BOLD_ON);
  parts.push(enc.encode("TOTAL   : " + fmt(data.finalAmount) + "\n"));
  parts.push(BOLD_OFF);
  parts.push(textLine(EQUALS));

  // ── Payment Status ──
  parts.push(CENTER);
  parts.push(DB_SIZE);
  parts.push(enc.encode(statusLabel(data.paymentStatus) + "\n"));
  parts.push(NORMAL);

  // ── Payment Detail ──
  parts.push(LEFT);
  parts.push(enc.encode("Dibayar  : " + fmt(data.paidAmount) + "\n"));
  if (data.changeAmount >= 0) {
    parts.push(enc.encode("Kembali  : " + fmt(data.changeAmount) + "\n"));
  }
  parts.push(textLine(DIVIDER));

  // ── Footer ──
  parts.push(CENTER);
  parts.push(enc.encode("Terima kasih 🙏\n"));
  parts.push(enc.encode("Telah berbelanja di\n"));
  parts.push(BOLD_ON);
  parts.push(enc.encode("Bunayya Putra\n"));
  parts.push(BOLD_OFF);
  parts.push(enc.encode("Semoga bermanfaat 😊\n"));
  parts.push(enc.encode("bunayyaputra.com\n"));
  parts.push(textLine(EQUALS));

  // ── Spasi + Potong ──
  parts.push(LF);
  parts.push(LF);
  parts.push(LF);
  parts.push(CUT);

  // Gabung
  const totalLen = parts.reduce((sum, p) => sum + p.byteLength, 0);
  const result = new Uint8Array(totalLen);
  let offset = 0;
  for (const p of parts) {
    result.set(p, offset);
    offset += p.byteLength;
  }
  return result;
}

// ─── Print ─────────────────────────────────────

export async function printReceipt(data: ReceiptData): Promise<void> {
  log("info", "Print receipt dimulai...");

  if (!_characteristic) {
    log("info", "Characteristic kosong, reconnect dulu...");
    await reconnectPrinter();
  }
  if (!_characteristic) {
    throw new Error("Printer tidak terhubung.");
  }

  const bytes = buildReceiptBytes(data);
  log("info", `Total data: ${bytes.length} bytes`);

  // Cek characteristic properties
  const props = _characteristic.properties;
  const canWrite = props.write;
  const canWriteNoResp = props.writeWithoutResponse;

  log("info", `Properties: write=${canWrite}, writeWithoutResponse=${canWriteNoResp}`);

  if (!canWrite && !canWriteNoResp) {
    throw new Error("Characteristic tidak memiliki properti write.");
  }

  // Kirim per chunk + delay antar chunk (biar buffer printer ga overflow)
  const CHUNK = 20; // BLE MTU max ~20 byte per write
  const DELAY_MS = 50; // delay antar chunk biar printer ga kewalahan

  let sentBytes = 0;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    const chunk = bytes.slice(i, i + CHUNK);

    try {
      if (canWriteNoResp) {
        // writeWithoutResponse lebih cepet (ga nunggu ack)
        await _characteristic.writeValueWithoutResponse(chunk);
      } else {
        await _characteristic.writeValue(chunk);
      }
      sentBytes += chunk.byteLength;

      // Delay antar chunk biar printer punya waktu proses
      if (i + CHUNK < bytes.length) {
        await new Promise((r) => setTimeout(r, DELAY_MS));
      }
    } catch (e: any) {
      log("error", `Write gagal di byte ${i}: ${e.message}`);
      throw new Error(`Gagal kirim data ke printer di byte ${i}: ${e.message}`);
    }
  }

  log("info", `Print berhasil: ${sentBytes}/${bytes.length} bytes terkirim`);
}

/** Test print — cetak struk test */
export async function testPrint(): Promise<void> {
  log("info", "Test print dimulai...");
  const testData: ReceiptData = {
    orderId: "TEST" + Date.now().toString(36).toUpperCase().slice(-4),
    createdAt: new Date().toISOString(),
    customerName: "Test Cetak",
    paymentMethod: "tunai",
    paymentStatus: "lunas",
    totalAmount: 50000,
    discount: 0,
    finalAmount: 50000,
    paidAmount: 50000,
    changeAmount: 0,
    items: [
      { name: "Produk Test #1", qty: 1, price: 25000, subtotal: 25000 },
      { name: "Produk Test #2", qty: 2, price: 12500, subtotal: 25000 },
    ],
  };
  await printReceipt(testData);
}
