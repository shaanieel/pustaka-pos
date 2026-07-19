"use client";
export const dynamic = "force-dynamic";
export const runtime = "edge";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Printer,
  Bluetooth,
  BluetoothConnected,
  BluetoothOff,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Trash2,
  TestTube,
  ArrowLeft,
  Settings2,
  RefreshCw,
  Info,
} from "lucide-react";
import Link from "next/link";
import {
  getPairedPrinter,
  setPairedPrinter,
  removePairedPrinter,
  getAutoPrint,
  setAutoPrint,
  pairPrinter,
  reconnectPrinter,
  disconnectPrinter,
  isConnected,
  getConnectedName,
  testPrint,
  setLogCallback,
  type PrinterLogEntry,
  isWebBluetoothSupported,
  getPlatformInfo,
} from "@/lib/bluetooth-printer";

type Status = "idle" | "connecting" | "connected" | "error";

export default function PrinterSettingsPage() {
  const [paired, setPaired] = useState(getPairedPrinter());
  const [connected, setConnected] = useState(false);
  const [deviceName, setDeviceName] = useState<string | null>(null);
  const [autoPrint, setAutoPrintState] = useState(getAutoPrint());
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const [pairing, setPairing] = useState(false);
  const [logs, setLogs] = useState<PrinterLogEntry[]>([]);
  const [showLogs, setShowLogs] = useState(false);
  const logEndRef = useRef<HTMLDivElement>(null);

  // Platform detection
  const platform = getPlatformInfo();

  // Log collector
  useEffect(() => {
    setLogCallback((entry) => {
      setLogs((prev) => [...prev.slice(-99), entry]); // max 100 log entries
    });
    return () => setLogCallback(() => {});
  }, []);

  // Auto-scroll log
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const refreshStatus = useCallback(() => {
    setConnected(isConnected());
    setDeviceName(getConnectedName());
    const p = getPairedPrinter();
    setPaired(p);
  }, []);
  useEffect(() => {
    refreshStatus();
    // Hapus auto-reconnect — biar manual aja, soalnya bikin web lemot
  }, [refreshStatus]);

  async function handlePair() {
    setPairing(true);
    setError("");
    setLogs([]);
    try {
      const p = await pairPrinter();
      setPaired(p);
      setConnected(true);
      setDeviceName(p.name);
      setStatus("connected");
    } catch (e: any) {
      setError(e.message || "Gagal pairing");
      setStatus("error");
    } finally {
      setPairing(false);
    }
  }

  async function handleReconnect() {
    setStatus("connecting");
    setError("");
    setLogs([]);
    try {
      await reconnectPrinter();
      setConnected(true);
      setDeviceName(getConnectedName());
      setStatus("connected");
    } catch (e: any) {
      setError(e.message || "Gagal menghubungkan");
      setStatus("error");
    }
  }

  async function handleDisconnect() {
    try {
      await disconnectPrinter();
    } catch {}
    setConnected(false);
    setDeviceName(null);
    setStatus("idle");
  }

  async function handleForget() {
    await handleDisconnect();
    removePairedPrinter();
    setPaired(null);
    setLogs([]);
  }

  async function handleTestPrint() {
    setError("");
    setLogs([]);
    try {
      if (!isConnected()) {
        await reconnectPrinter();
        setConnected(true);
        setDeviceName(getConnectedName());
      }
      await testPrint();
    } catch (e: any) {
      setError(e.message || "Test print gagal");
    }
  }

  function handleAutoPrintToggle() {
    const v = !autoPrint;
    setAutoPrint(v);
    setAutoPrintState(v);
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/" className="btn-ghost p-2 -ml-2 shrink-0">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <Printer className="w-6 h-6 text-brand-600" />
        <h1 className="text-xl font-bold text-brand-900">Pengaturan Printer</h1>
      </div>

      {/* Platform Info */}
      {!isWebBluetoothSupported() && (
        <div className="card p-4 border-amber-200 bg-amber-50">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-sm text-amber-800 space-y-1">
              <p className="font-bold">Web Bluetooth tidak didukung di browser ini.</p>
              <p>Gunakan Chrome atau Edge versi terbaru di Windows/Android.</p>
              <p className="text-xs text-amber-600 mt-2">
                {platform.isMobile
                  ? "Coba buka pake Chrome Android"
                  : "Chrome/Edge di Windows — buka chrome://flags/#enable-experimental-web-platform-features kalo perlu"}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Limitation Notice for Desktop */}
      {isWebBluetoothSupported() && !platform.isMobile && (
        <div className="card p-4 border-brand-200 bg-brand-50">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-brand-600 shrink-0 mt-0.5" />
            <div className="text-sm text-brand-700 space-y-1">
              <p className="font-bold">Catatan Penting</p>
              <p>
                Web Bluetooth di komputer <strong>hanya support BLE</strong> (Bluetooth Low Energy).
              </p>
              <p className="text-xs text-brand-500 mt-1">
                Printer thermal POS-58B / RPP02N umumnya pake Bluetooth Classic (SPP) yang{" "}
                <strong>tidak bisa</strong> diakses via browser.
              </p>
              <p className="text-xs text-brand-500">
                Alternatif: <strong>via USB</strong> (WebUSB/Serial) atau install{" "}
                <a href="https://qztray.com" target="_blank" rel="noopener noreferrer"
                   className="text-brand-700 underline font-semibold">QZ Tray</a>.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Status Card */}
      <div className="card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-brand-800">Status Printer</h2>
          {status === "connecting" && (
            <span className="flex items-center gap-1 text-sm text-amber-600 font-semibold">
              <Loader2 className="w-4 h-4 animate-spin" /> Menghubungkan...
            </span>
          )}
          {connected && (
            <span className="flex items-center gap-1 text-sm text-emerald-600 font-semibold">
              <BluetoothConnected className="w-4 h-4" /> Terhubung
            </span>
          )}
          {!connected && status !== "connecting" && (
            <span className="flex items-center gap-1 text-sm text-brand-400 font-semibold">
              <BluetoothOff className="w-4 h-4" /> Putus
            </span>
          )}
        </div>

        {connected && deviceName && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-50 border border-emerald-200">
            <BluetoothConnected className="w-8 h-8 text-emerald-600 shrink-0" />
            <div>
              <p className="font-bold text-emerald-800">{deviceName}</p>
              <p className="text-xs text-emerald-600">
                Bluetooth · 58mm thermal
              </p>
            </div>
          </div>
        )}

        {!connected && status === "idle" && paired && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200">
            <Bluetooth className="w-8 h-8 text-amber-600 shrink-0" />
            <div>
              <p className="font-bold text-amber-800">{paired.name}</p>
              <p className="text-xs text-amber-600">
                Tersimpan — tekan Hubungkan
              </p>
            </div>
          </div>
        )}

        {!connected && status === "idle" && !paired && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-brand-50 border border-brand-200">
            <Bluetooth className="w-8 h-8 text-brand-400 shrink-0" />
            <div>
              <p className="font-bold text-brand-600">Belum ada printer</p>
              <p className="text-xs text-brand-400">
                Pairing printer thermal Bluetooth dulu
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700 whitespace-pre-line">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span className="min-w-0">{error}</span>
          </div>
        )}

        {/* Buttons */}
        <div className="flex flex-wrap gap-3">
          {!connected && (
            <>
              <button
                onClick={handlePair}
                disabled={pairing || !isWebBluetoothSupported()}
                className="btn-primary"
              >
                {pairing ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Pairing...</>
                ) : (
                  <><Bluetooth className="w-4 h-4" /> Pair Printer Baru</>
                )}
              </button>
              {paired && (
                <button onClick={handleReconnect} className="btn-secondary">
                  <RefreshCw className="w-4 h-4" /> Hubungkan
                </button>
              )}
            </>
          )}
          {connected && (
            <>
              <button onClick={handleTestPrint} className="btn-primary">
                <TestTube className="w-4 h-4" /> Test Print
              </button>
              <button onClick={handleDisconnect} className="btn-secondary">
                <BluetoothOff className="w-4 h-4" /> Putuskan
              </button>
            </>
          )}
        </div>
      </div>

      {/* Auto Print */}
      <div className="card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-bold text-brand-800">Cetak Otomatis</h2>
            <p className="text-sm text-brand-500">
              Cetak struk otomatis setiap ada pembayaran berhasil
            </p>
          </div>
          <button
            onClick={handleAutoPrintToggle}
            className={`relative w-12 h-7 rounded-full transition-all ${
              autoPrint ? "bg-emerald-500" : "bg-brand-300"
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white shadow-md transition-all ${
                autoPrint ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>
      </div>

      {/* Device Info */}
      {paired && (
        <div className="card p-5 space-y-3">
          <h2 className="font-bold text-brand-800">Informasi Printer</h2>
          <div className="text-sm space-y-1 text-brand-600">
            <p>
              <span className="font-semibold text-brand-700">Nama:</span>{" "}
              {paired.name}
            </p>
            <p>
              <span className="font-semibold text-brand-700">ID:</span>{" "}
              <code className="text-xs bg-brand-50 px-1 rounded">{paired.id}</code>
            </p>
            <p>
              <span className="font-semibold text-brand-700">Koneksi:</span>{" "}
              Bluetooth {platform.isDesktop ? "LE" : ""}
            </p>
            <p>
              <span className="font-semibold text-brand-700">Kertas:</span>{" "}
              58mm thermal
            </p>
            <p>
              <span className="font-semibold text-brand-700">Platform:</span>{" "}
              {platform.isMobile ? "📱 Mobile" : "💻 Desktop"}
            </p>
          </div>
          <button
            onClick={handleForget}
            className="flex items-center gap-2 text-sm text-red-500 hover:text-red-700 font-semibold"
          >
            <Trash2 className="w-4 h-4" /> Lupakan Printer
          </button>
        </div>
      )}

      {/* Log Viewer */}
      {logs.length > 0 && (
        <div className="card p-5 space-y-3">
          <button
            onClick={() => setShowLogs(!showLogs)}
            className="flex items-center justify-between w-full"
          >
            <h2 className="font-bold text-brand-800">
              Log Bluetooth ({logs.length})
            </h2>
            <span className="text-xs text-brand-500">{showLogs ? "Sembunyikan" : "Lihat"}</span>
          </button>
          {showLogs && (
            <div className="bg-gray-900 text-green-400 rounded-xl p-3 text-[11px] font-mono max-h-64 overflow-y-auto space-y-0.5">
              {logs.map((log, i) => (
                <div key={i} className={
                  log.level === "error" ? "text-red-400" :
                  log.level === "warn" ? "text-yellow-400" :
                  log.level === "debug" ? "text-gray-500" :
                  "text-green-400"
                }>
                  <span className="opacity-50">[{log.timestamp}]</span>{" "}
                  <span className="font-semibold">{log.level.toUpperCase()}</span>{" "}
                  {log.message}
                </div>
              ))}
              <div ref={logEndRef} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
