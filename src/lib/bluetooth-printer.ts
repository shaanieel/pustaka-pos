// Bluetooth Thermal Printer — Web Bluetooth + ESC/POS 58mm
// Pair sekali, auto-reconnect, cetak struk kaya Receipt component

const PRINTER_STORAGE_KEY = "pustakapos_printer";
const AUTO_PRINT_KEY = "pustakapos_autoprint";

export interface PairedPrinter {
  id: string; // device.id
  name: string;
}

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

// ─── Bluetooth ─────────────────────────────────

let _device: BluetoothDevice | null = null;
let _characteristic: BluetoothRemoteGATTCharacteristic | null = null;

/** Cari service & characteristic writable di printer */
async function findPrinterChar(
  server: BluetoothRemoteGATTServer
): Promise<BluetoothRemoteGATTCharacteristic | null> {
  try {
    const service = await server.getPrimaryService(
      "000018f0-0000-1000-8000-00805f9b34fb"
    );
    const char = await service.getCharacteristic(
      "00002af1-0000-1000-8000-00805f9b34fb"
    );
    return char;
  } catch {
    // Fallback: scan semua service cari yg writable
    try {
      const services = await server.getPrimaryServices();
      for (const svc of services) {
        try {
          const chars = await svc.getCharacteristics();
          for (const c of chars) {
            if (c.properties.write || c.properties.writeWithoutResponse) {
              return c;
            }
          }
        } catch {
          continue;
        }
      }
    } catch {
      return null;
    }
    return null;
  }
}

/** Pair printer baru — munculin popup Bluetooth OS */
export async function pairPrinter(): Promise<PairedPrinter> {
  if (typeof window === "undefined" || !navigator.bluetooth) {
    throw new Error("Web Bluetooth tidak didukung di browser ini. Gunakan Chrome/Edge di laptop.");
  }

  const device = await navigator.bluetooth.requestDevice({
    acceptAllDevices: true,
    optionalServices: [
      "000018f0-0000-1000-8000-00805f9b34fb",
      "49535343-fe7d-4ae5-8fa9-9fafd205e455",
    ],
  });

  const server = await device.gatt!.connect();
  const char = await findPrinterChar(server);

  if (!char) {
    await device.gatt!.disconnect();
    throw new Error("Printer tidak mendukung ESC/POS (tidak ada karakteristik write).");
  }

  _device = device;
  _characteristic = char;

  const paired: PairedPrinter = {
    id: device.id,
    name: device.name || "Printer Thermal",
  };
  setPairedPrinter(paired);

  // Listen disconnect untuk cleanup
  device.addEventListener("gattserverdisconnected", () => {
    _device = null;
    _characteristic = null;
  });

  return paired;
}

/** Reconnect ke printer yg pernah dipairing — tanpa dialog */
export async function reconnectPrinter(): Promise<void> {
  if (typeof window === "undefined" || !navigator.bluetooth) {
    throw new Error("Web Bluetooth tidak didukung.");
  }

  // Kalo udah nyambung & masih aktif, skip
  if (_device?.gatt?.connected) return;

  const paired = getPairedPrinter();
  if (!paired) throw new Error("Belum ada printer terdaftar. Pairing dulu.");

  const devices = await navigator.bluetooth.getDevices();
  const device = devices.find((d) => d.id === paired.id);
  if (!device) {
    removePairedPrinter();
    throw new Error(`Printer "${paired.name}" tidak ditemukan. Pairing ulang.`);
  }

  const server = await device.gatt!.connect();
  const char = await findPrinterChar(server);
  if (!char) {
    await device.gatt!.disconnect();
    throw new Error("Printer tidak mendukung ESC/POS.");
  }

  _device = device;
  _characteristic = char;

  device.addEventListener("gattserverdisconnected", () => {
    _device = null;
    _characteristic = null;
  });
}

/** Putuskan koneksi */
export async function disconnectPrinter(): Promise<void> {
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
  if (typeof window === "undefined" || !navigator.bluetooth) return [];
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

// ─00─ Max chars for 58mm paper (Font A = 12x24, 32 chars)
const MAX_COL = 32;
// ─
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

// ─── Format Rupiah ─────────────────────────────

function fmt(n: number): string {
  return "Rp" + n.toLocaleString("id-ID");
}

// ─── Build Receipt — match Receipt component ───

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
  // Header
  parts.push(BOLD_ON);
  parts.push(enc.encode("#  Produk" + " ".repeat(Math.max(0, 23)) + "Qty  Harga\n"));
  parts.push(BOLD_OFF);
  for (let i = 0; i < data.items.length; i++) {
    const item = data.items[i];
    const no = (i + 1).toString();
    const name = item.name.length > 18 ? item.name.substring(0, 17) + "." : item.name;
    const qtyStr = item.qty.toString();
    const priceStr = item.price.toLocaleString("id-ID");
    // Layout: [1] [nama...............] [qty] [harga]
    // Total 32 chars
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
  if (!_characteristic) {
    await reconnectPrinter();
  }
  if (!_characteristic) {
    throw new Error("Printer tidak terhubung.");
  }

  const bytes = buildReceiptBytes(data);

  // Kirim per chunk (BLE max 20 byte per write)
  const CHUNK = 20;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    const chunk = bytes.slice(i, i + CHUNK);
    await _characteristic.writeValue(chunk);
  }
}

/** Test print — cetak struk test */
export async function testPrint(): Promise<void> {
  const testData: ReceiptData = {
    orderId: "TEST1234",
    createdAt: new Date().toISOString(),
    customerName: "Test",
    paymentMethod: "tunai",
    paymentStatus: "lunas",
    totalAmount: 50000,
    discount: 0,
    finalAmount: 50000,
    paidAmount: 50000,
    changeAmount: 0,
    items: [{ name: "Produk Test", qty: 1, price: 50000, subtotal: 50000 }],
  };
  await printReceipt(testData);
}
