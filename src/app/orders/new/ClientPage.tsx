"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Book, Customer, CartItem, Order, OrderItem, PaymentMethod } from "@/types";
import { SearchBar } from "@/components/SearchBar";
import { GenrePicker } from "@/components/GenrePicker";
import { BottomSheet } from "@/components/BottomSheet";
import { Receipt } from "@/components/Receipt";
import { ScannerButton } from "@/components/ScannerButton";
import { formatRupiah } from "@/lib/utils";
import { QRCodeCanvas } from "qrcode.react";
import { printReceipt, getAutoPrint, reconnectPrinter, isConnected, loadImageToRaster } from "@/lib/bluetooth-printer";
import type { ReceiptData } from "@/lib/bluetooth-printer";
import {
  ArrowLeft,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  Save,
  User,
  Search,
  Wallet,
  CheckCircle2,
  ScanLine,
  Loader2,
  ChevronUp,
  Banknote,
  QrCode,
  ArrowRightLeft,
  Phone,
  X,
  Copy,
  PartyPopper,
  ImageOff,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { QRIS_STATIC, convertQRIS, generateKodeUnik } from "@/lib/qris";

export default function NewOrderPage() {
  const router = useRouter();
  const [cart, setCart] = useState<CartItem[]>([]);

  // Books — fetch ALL for poster grid
  const [allBooks, setAllBooks] = useState<Book[]>([]);
  const [loadingBooks, setLoadingBooks] = useState(true);

  // Book search
  const [bookSearch, setBookSearch] = useState("");

  // Customer
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerSearch, setCustomerSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showCustomerSearch, setShowCustomerSearch] = useState(false);
  const [showAllCustomers, setShowAllCustomers] = useState(false);
  const [allCustomers, setAllCustomers] = useState<Customer[]>([]);

  const [newCustomer, setNewCustomer] = useState({ name: "", phone: "", email: "" });

  // Category filter
  const [selectedCategory, setSelectedCategory] = useState("");

  // Genre filter (multi-select)
  const [genreFilterIds, setGenreFilterIds] = useState<number[]>([]);

  // Discount
  const [discount, setDiscount] = useState(0);

  // Modal
  const [saving, setSaving] = useState(false);
  const [savedOrder, setSavedOrder] = useState<Order | null>(null);
  const [savedItems, setSavedItems] = useState<OrderItem[]>([]);
  // Payment
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("tunai");
  const [showPayment, setShowPayment] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const changeAmount = Math.max(0, paymentAmount - (savedOrder?.final_amount || 0));

  // QRIS
  const [qrisString, setQrisString] = useState<string>("");
  const [qrisKodeUnik, setQrisKodeUnik] = useState<number>(0);
  const [qrisStatus, setQrisStatus] = useState<'idle' | 'waiting' | 'success'>('idle');

  // Generate QRIS dinamis saat modal bayar terbuka + method = qris
  useEffect(() => {
    if (showPayment && paymentMethod === "qris" && savedOrder && !qrisString) {
      const kode = generateKodeUnik();
      setQrisKodeUnik(kode);
      const amountWithCode = savedOrder.final_amount + kode;
      const result = convertQRIS(QRIS_STATIC, amountWithCode);
      setQrisString(result);
      setQrisStatus('waiting');

      // Catat ke DB biar worker bisa match via paid_amount
      supabase
        .from("orders")
        .update({
          payment_method: "qris",
          payment_status: "waiting_payment",
          paid_amount: amountWithCode,
        })
        .eq("id", savedOrder.id)
        .then(({ error }) => {
          if (error) console.error("Gagal set waiting_payment:", error);
        });
    }
    // Reset when modal closes OR switching away from QRIS
    if (!showPayment || paymentMethod !== "qris") {
      setQrisString("");
      setQrisKodeUnik(0);
      setQrisStatus('idle');
    }
  }, [showPayment, paymentMethod, savedOrder]);

  // ── Polling: auto-detect QRIS payment lunas ──
  useEffect(() => {
    if (paymentMethod !== 'qris' || qrisStatus !== 'waiting' || !savedOrder) return;

    let cancelled = false;
    const interval = setInterval(async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('payment_status, paid_amount, payment_confirmed_at')
        .eq('id', savedOrder.id)
        .maybeSingle();

      if (cancelled) return;
      if (error) return;

      if (data?.payment_status === 'lunas') {
        clearInterval(interval);
        setQrisStatus('success');
        setSavedOrder((prev) => prev ? { ...prev, ...data } : prev);
        // Kalo paymentMethod atau qrisStatus berubah di tengah, cancelled=true,
        // tapi kita pake ref biar redirect tetep jalan
        // Redirect ke receipt setelah animasi
        setTimeout(() => {
          setShowPayment(false);
          setShowReceipt(true);
          tryAutoPrint();
          // Update statistik pelanggan
          if (data?.paid_amount && savedOrder?.customer_id) {
            updateCustomerStats(savedOrder.customer_id, data.paid_amount);
          }
        }, 1800);
      }
    }, 5000);

    return () => { cancelled = true; clearInterval(interval); };
  }, [paymentMethod, qrisStatus, savedOrder?.id]);

  // Fetch ALL books on mount
  useEffect(() => {
    (async () => {
      setLoadingBooks(true);
      try {
        const { data } = await supabase
          .from("books")
          .select("*")
          .order("title");
        setAllBooks(data || []);
      } catch {
        // silent
      }
      setLoadingBooks(false);
    })();
  }, []);

  // Helper: store genre selections for filtering
  const [genreSelectionsData, setGenreSelectionsData] = useState<
    { subgenre_id: number; genre_name: string; subgenre_name: string }[]
  >([]);

  // Filtered books — safe with try/catch
  const displayedBooks = (() => {
    try {
      return allBooks.filter((b) => {
        const matchSearch =
          !bookSearch.trim() ||
          (b.title ?? "").toLowerCase().includes(bookSearch.toLowerCase()) ||
          ((b.author ?? "").toLowerCase().includes(bookSearch.toLowerCase())) ||
          ((b.isbn ?? "").includes(bookSearch));
        const matchCategory =
          genreFilterIds.length === 0 ||
          ((b.category ?? "") &&
            (b.category ?? "").split(", ").some((cat) =>
              genreSelectionsData.some(
                (s) => cat.toLowerCase() === (s.subgenre_name ?? "").toLowerCase()
              )
            ));
        return matchSearch && matchCategory;
      });
    } catch {
      return allBooks;
    }
  })();

  // ── SCAN BARCODE ── (cari ISBN ATAU book_code — 2 kolom)
  const handleScannedISBN = useCallback(async (code: string) => {
    toast.loading(`Mencari kode: ${code}...`, { id: "scan-kasir" });
    try {
      // Cek di 2 kolom: isbn + book_code (pakai OR query)
      const { data, error } = await supabase
        .from("books")
        .select("*")
        .or(`isbn.eq.${code},book_code.eq.${code}`)
        .maybeSingle();

      toast.dismiss("scan-kasir");

      if (error || !data) {
        const isIsbn = /^\d{8,13}$/.test(code);
        toast(
          (t) => (
            <div className="flex flex-col gap-2">
              <span className="text-sm">📚 {isIsbn ? `ISBN ${code}` : `Kode ${code}`} belum terdaftar</span>
              <button
                onClick={() => {
                  toast.dismiss(t.id);
                  router.push(`/books/add?isbn=${encodeURIComponent(code)}`);
                }}
                className="btn-primary text-xs py-1.5 px-3 w-full flex items-center justify-center gap-1"
              >
                <Plus className="w-3 h-3" />
                Tambah ke Database
              </button>
            </div>
          ),
          { duration: 8000 }
        );
        return;
      }

      const book = data as Book;
      const existing = cart.find((c) => c.book.id === book.id);
      if (existing) {
        if (existing.quantity >= book.stock) {
          toast.error("Stok tidak mencukupi");
          return;
        }
        setCart((prev) =>
          prev.map((c) => (c.book.id === book.id ? { ...c, quantity: c.quantity + 1 } : c))
        );
      } else {
        if (book.stock <= 0) {
          toast.error("Stok habis");
          return;
        }
        setCart((prev) => [...prev, { book, quantity: 1 }]);
      }
      toast.success(`${book.title} — ditambahkan ke keranjang!`, { duration: 2000 });
    } catch {
      toast.dismiss("scan-kasir");
      toast.error("Gagal mencari buku");
    }
  }, [cart]);

  // ── CUSTOMER ──
  const fetchAllCustomers = useCallback(async () => {
    try {
      const { data } = await supabase
        .from("customers")
        .select("*")
        .order("name");
      setAllCustomers(data || []);
    } catch {
      // silent
    }
    setShowAllCustomers(true);
    setShowCustomerSearch(false);
  }, []);

  const filteredAllCustomers = customerSearch.trim()
    ? allCustomers.filter(
        (c) =>
          c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
          (c.phone && c.phone.includes(customerSearch))
      )
    : allCustomers;

  const searchCustomers = useCallback(async () => {
    if (!customerSearch.trim()) {
      setCustomers([]);
      return;
    }
    try {
      const { data } = await supabase
        .from("customers")
        .select("*")
        .or(`name.ilike.%${customerSearch}%,phone.ilike.%${customerSearch}%`)
        .limit(10);
      setCustomers(data || []);
    } catch {}
  }, [customerSearch]);

  useEffect(() => {
    const timer = setTimeout(searchCustomers, 300);
    return () => clearTimeout(timer);
  }, [searchCustomers]);

  // ── CART ACTIONS ──
  function addToCart(book: Book) {
    const existing = cart.find((c) => c.book.id === book.id);
    if (existing) {
      if (existing.quantity >= book.stock) {
        toast.error("Stok tidak mencukupi");
        return;
      }
      setCart(cart.map((c) => c.book.id === book.id ? { ...c, quantity: c.quantity + 1 } : c));
    } else {
      if (book.stock <= 0) {
        toast.error("Stok habis");
        return;
      }
      setCart([...cart, { book, quantity: 1 }]);
    }
  }

  function removeFromCart(bookId: string) {
    setCart(cart.filter((c) => c.book.id !== bookId));
  }

  function updateQty(bookId: string, delta: number) {
    setCart(
      cart.map((c) => {
        if (c.book.id !== bookId) return c;
        const newQty = c.quantity + delta;
        if (newQty > c.book.stock) {
          toast.error("Stok tidak mencukupi");
          return c;
        }
        if (newQty <= 0) return c;
        return { ...c, quantity: newQty };
      })
    );
  }

  function updateQtyDirect(bookId: string, qty: number) {
    setCart(
      cart.map((c) => {
        if (c.book.id !== bookId) return c;
        if (qty > c.book.stock) {
          toast.error(`Stok hanya ${c.book.stock}`);
          return { ...c, quantity: c.book.stock };
        }
        return { ...c, quantity: qty };
      })
    );
  }

  const subtotal = cart.reduce((sum, c) => sum + c.book.price * c.quantity, 0);
  const finalAmount = subtotal - discount;
  const cartItemCount = cart.reduce((sum, c) => sum + c.quantity, 0);

  // ── SAVE ORDER ──
  async function handleSave() {
    if (cart.length === 0) {
      toast.error("Keranjang masih kosong");
      return;
    }
    if (discount > subtotal) {
      toast.error("Diskon melebihi total");
      return;
    }
    // Validasi: nama + no HP wajib (kecuali pilih dari data yang ada)
    const hasCustomer = selectedCustomer || (newCustomer.name.trim() && newCustomer.phone.trim());
    if (!hasCustomer) {
      toast.error("Nama pelanggan dan No. WA/HP wajib diisi");
      return;
    }

    setSaving(true);
    try {
      let customerId = selectedCustomer?.id || null;
      let customerName = selectedCustomer?.name || null;

      // Auto-create/assign customer: cek duplikat nama dulu
      if (newCustomer.name.trim()) {
        const name = newCustomer.name.trim();
        const phone = newCustomer.phone.trim();
        // Cari existing by name
        const { data: existing } = await supabase
          .from("customers")
          .select("id, name")
          .eq("name", name)
          .maybeSingle();

        if (existing) {
          customerId = existing.id;
          customerName = existing.name;
        } else {
          const { data: newCust, error: custError } = await supabase
            .from("customers")
            .insert({
              name,
              phone: phone || "000000000000",
              email: newCustomer.email.trim() || null,
            })
            .select()
            .single();
          if (custError) throw custError;
          customerId = newCust.id;
          customerName = newCust.name;
        }
      }

      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          customer_id: customerId,
          customer_name: customerName,
          total_amount: subtotal,
          discount,
          final_amount: finalAmount,
          status: "completed",
          payment_method: "tunai",
          payment_status: "belum_bayar",
          paid_amount: 0,
        })
        .select()
        .single();

      if (orderError) throw orderError;

      const orderItems = cart.map((c) => ({
        order_id: order.id,
        book_id: c.book.id,
        book_title: c.book.title,
        quantity: c.quantity,
        price_at_time: c.book.price,
        subtotal: c.book.price * c.quantity,
      }));

      const { data: itemsData, error: itemsError } = await supabase
        .from("order_items")
        .insert(orderItems)
        .select();

      if (itemsError) throw itemsError;

      for (const c of cart) {
        await supabase
          .from("books")
          .update({ stock: c.book.stock - c.quantity })
          .eq("id", c.book.id);
      }

      setSavedOrder(order);
      setSavedItems(itemsData || (orderItems as any));
      setPaymentAmount(finalAmount);
      setShowPayment(true);
    } catch (err: any) {
      toast.error(err.message || "Gagal membuat pesanan");
    } finally {
      setSaving(false);
    }
  }

  async function handlePaymentSubmit() {
    if (!savedOrder) return;

    // QRIS: bayar penuh, no manual amount
    if (paymentMethod === "qris") {
      if (!qrisString) {
        toast.error("QRIS belum siap");
        return;
      }
      try {
        const { error } = await supabase
          .from("orders")
          .update({
            payment_method: "qris",
            payment_status: "lunas",
            paid_amount: savedOrder.final_amount + qrisKodeUnik,
            payment_confirmed_at: new Date().toISOString(),
          })
          .eq("id", savedOrder.id);
        if (error) throw error;
        setSavedOrder({
          ...savedOrder,
          payment_method: "qris",
          payment_status: "lunas",
          paid_amount: savedOrder.final_amount + qrisKodeUnik,
          payment_confirmed_at: new Date().toISOString(),
        });
        setShowPayment(false);
        setShowReceipt(true);
        setTimeout(() => tryAutoPrint(), 500);

        // Update statistik pelanggan
        if (savedOrder.customer_id) {
          updateCustomerStats(savedOrder.customer_id, savedOrder.final_amount + qrisKodeUnik);
        }
      } catch (err: any) {
        toast.error(err.message || "Gagal menyimpan pembayaran");
      }
      return;
    }

    // Tunai / Transfer
    const total = savedOrder.final_amount;
    if (paymentAmount <= 0) {
      toast.error("Masukkan jumlah pembayaran");
      return;
    }

    // Determine payment status
    let status: "lunas" | "belum_bayar" | "belum_lunas";
    if (paymentAmount >= total) {
      status = "lunas";
    } else if (paymentAmount > 0) {
      status = "belum_lunas";
    } else {
      status = "belum_bayar";
    }

    try {
      // Update order with payment info
      const { error } = await supabase
        .from("orders")
        .update({
          payment_method: paymentMethod,
          payment_status: status,
          paid_amount: paymentAmount,
        })
        .eq("id", savedOrder.id);

      if (error) throw error;

      // Update local state
      setSavedOrder({
        ...savedOrder,
        payment_method: paymentMethod,
        payment_status: status,
        paid_amount: paymentAmount,
      });

      setShowPayment(false);
      setShowReceipt(true);
      setTimeout(() => tryAutoPrint(), 500);

      // Update statistik pelanggan
      if (savedOrder.customer_id) {
        updateCustomerStats(savedOrder.customer_id, paymentAmount);
      }
    } catch (err: any) {
      toast.error(err.message || "Gagal menyimpan pembayaran");
    }
  }

  // ── Update customer stats after payment ──
  async function updateCustomerStats(customerId: string, paid: number) {
    try {
      const { data: cust } = await supabase
        .from("customers")
        .select("total_orders, total_spent")
        .eq("id", customerId)
        .single();
      await supabase
        .from("customers")
        .update({
          total_orders: (cust?.total_orders || 0) + 1,
          total_spent: (cust?.total_spent || 0) + paid,
          updated_at: new Date().toISOString(),
        })
        .eq("id", customerId);
    } catch {
      // Silent — gak ngeblock flow utama
    }
  }

  function handleCloseReceipt() {
    setShowReceipt(false);
    setSavedOrder(null);
    setSavedItems([]);
    setCart([]);
    setSelectedCustomer(null);
    setDiscount(0);
    setPaymentAmount(0);
    setPaymentMethod("tunai");
    setQrisString("");
    setQrisKodeUnik(0);
    setQrisStatus('idle');
    setNewCustomer({ name: "", phone: "", email: "" });
    setShowAllCustomers(false);
    setCustomerSearch("");
  }

  // ── Bluetooth Print ──
  function buildReceiptData() {
    if (!savedOrder) return null;
    const paid = savedOrder.paid_amount ?? (paymentAmount > 0 ? paymentAmount : savedOrder.final_amount);
    const change = Math.max(0, paid - savedOrder.final_amount);
    return {
      orderId: savedOrder.id,
      createdAt: savedOrder.created_at,
      customerName: selectedCustomer?.name || newCustomer.name || "Pelanggan Umum",
      paymentMethod: paymentMethod,
      paymentStatus: savedOrder.payment_status || "lunas",
      totalAmount: savedOrder.total_amount,
      discount: savedOrder.discount,
      finalAmount: savedOrder.final_amount,
      paidAmount: paid,
      changeAmount: change,
      items: savedItems.map((i) => ({
        name: i.book_title,
        qty: i.quantity,
        price: i.price_at_time,
        subtotal: i.subtotal,
      })),
      qrData: `https://bunayyaputra.com`,
    };
  }

  async function handleBluetoothPrint() {
    const data = buildReceiptData();
    if (!data) return;
    try {
      // Load logo raster for thermal print
      try {
        const logo = await loadImageToRaster("/logo-green-hue.png", 180);
        if (logo) (data as any).logoRaster = logo;
      } catch {}
      if (!isConnected()) await reconnectPrinter();
      await printReceipt(data);
      toast.success("Struk terkirim ke printer ✅");
    } catch (e: any) {
      toast.error(e.message || "Gagal cetak via Bluetooth");
    }
  }

  // Auto-print helper
  async function tryAutoPrint() {
    if (!getAutoPrint()) return;
    try {
      const data = buildReceiptData();
      if (!data) return;
      if (!isConnected()) await reconnectPrinter();
      await printReceipt(data);
    } catch {
      // Silent — auto-print gagal, user masih bisa cetak manual
    }
  }

  // Receipt screen
  if (showReceipt && savedOrder && savedItems.length > 0) {
    return (
      <Receipt
        order={savedOrder}
        items={savedItems}
        customerName={selectedCustomer?.name || newCustomer.name || "Pelanggan Umum"}
        paymentAmount={paymentAmount}
        changeAmount={changeAmount}
        onClose={handleCloseReceipt}
        onBluetoothPrint={handleBluetoothPrint}
        paymentMethod={paymentMethod}
      />
    );
  }

  // ===== POSTER GRID + BOTTOM SHEET LAYOUT =====
  return (
    <>
      {/* QRIS Animation Styles */}
      <style>{`
        .scanner-line {
          position: absolute;
          left: 0;
          right: 0;
          height: 3px;
          background: linear-gradient(90deg, transparent, #10b981, transparent);
          animation: scan 2s ease-in-out infinite;
          z-index: 5;
        }
        @keyframes scan {
          0%, 100% { top: 0; }
          50% { top: 100%; }
        }
        @keyframes bounce-in {
          0% { transform: scale(0); opacity: 0; }
          50% { transform: scale(1.15); }
          100% { transform: scale(1); opacity: 1; }
        }
        .animate-bounce-in {
          animation: bounce-in 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out forwards;
        }
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.4s ease-out forwards;
          opacity: 0;
        }
        .confetti-container {
          position: absolute;
          inset: 0;
          pointer-events: none;
          overflow: hidden;
        }
        .confetti-piece {
          position: absolute;
          top: -10px;
          font-size: 20px;
          animation: confetti-fall 1.5s ease-in forwards;
        }
        @keyframes confetti-fall {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(200px) rotate(720deg); opacity: 0; }
        }
      `}</style>
      {/* Header */}
      <div className="flex items-center gap-3 mb-4 lg:mb-5">
        <Link href="/orders" className="btn-ghost p-2 -ml-2 shrink-0">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="page-title text-lg lg:text-2xl">Pesanan Baru</h1>
          <p className="page-subtitle text-xs lg:text-sm">Pilih buku & tambah ke keranjang</p>
        </div>
        <ScannerButton onScan={handleScannedISBN} label="Scan" size="sm" />
      </div>

      {/* --- MOBILE LAYOUT --- */}
      <div className="lg:hidden space-y-3">
        {/* Customer section — DI ATAS, biar keliatan kalau keranjang banyak */}
        <div className="card p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-brand-800 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-brand-600" />
              Pelanggan
            </span>
            <button
              onClick={() => {
                if (showAllCustomers) {
                  setShowAllCustomers(false);
                  setCustomerSearch("");
                } else {
                  fetchAllCustomers();
                }
                setSelectedCustomer(null);
              }}
              className="text-xs font-semibold text-brand-600"
            >
              {selectedCustomer ? "Ganti" : "Pilih"}
            </button>
          </div>

          {selectedCustomer ? (
            <div className="bg-brand-50 rounded-xl p-2.5 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-brand-950">{selectedCustomer.name}</p>
                <p className="text-[10px] text-brand-500">{selectedCustomer.phone}</p>
              </div>
              <button
                onClick={() => {
                  setSelectedCustomer(null);
                  setShowAllCustomers(false);
                }}
                className="text-xs text-red-400"
              >
                Hapus
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <input
                type="text"
                value={newCustomer.name}
                onChange={(e) => setNewCustomer((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Nama pelanggan *"
                className="input-field text-sm py-2"
              />
              <input
                type="tel"
                value={newCustomer.phone}
                onChange={(e) => setNewCustomer((prev) => ({ ...prev, phone: e.target.value }))}
                placeholder="No. WA/HP *"
                className="input-field text-sm py-2"
              />
              <input
                type="email"
                value={newCustomer.email}
                onChange={(e) => setNewCustomer((prev) => ({ ...prev, email: e.target.value }))}
                placeholder="Email (opsional)"
                className="input-field text-sm py-2"
              />
            </div>
          )}

          {showAllCustomers && (
            <div className="space-y-2">
              <SearchBar
                value={customerSearch}
                onChange={setCustomerSearch}
                placeholder="Cari nama..."
              />
              <div className="border border-brand-100 rounded-xl divide-y divide-brand-50 max-h-48 overflow-y-auto">
                {filteredAllCustomers.length === 0 ? (
                  <p className="p-3 text-xs text-brand-400 text-center">Tidak ditemukan</p>
                ) : (
                  filteredAllCustomers.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => {
                        setSelectedCustomer(c);
                        setShowAllCustomers(false);
                        setCustomerSearch("");
                        setNewCustomer({ name: "", phone: "", email: "" });
                      }}
                      className="w-full p-2.5 text-left hover:bg-brand-50/60"
                    >
                      <p className="text-sm font-semibold text-brand-950">{c.name}</p>
                      <p className="text-[10px] text-brand-500">{c.phone}</p>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Search + Kategori */}
        <div className="card p-3 space-y-2">
          <GenrePicker
            selectedIds={genreFilterIds}
            onChange={(ids, selections) => {
              setGenreFilterIds(ids);
              setGenreSelectionsData(selections);
              if (ids.length === 0) setSelectedCategory("");
              else setSelectedCategory(selections.map((s) => s.subgenre_name).join(", "));
            }}
            label="Filter Genre"
          />
          <div className="flex gap-2">
            <div className="flex-1">
              <SearchBar
                value={bookSearch}
                onChange={setBookSearch}
                placeholder="Cari judul..."
              />
            </div>
            <ScannerButton onScan={handleScannedISBN} variant="icon" />
          </div>
        </div>

        {/* Poster Grid */}
        {loadingBooks ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 text-brand-400 animate-spin" />
          </div>
        ) : displayedBooks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-brand-400">
            <ImageOff className="w-10 h-10 mb-2" />
            <p className="text-sm">Buku tidak ditemukan</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2.5">
            {displayedBooks.map((b) => (
              <button
                key={b.id}
                onClick={() => addToCart(b)}
                className="group relative bg-white rounded-xl border border-brand-100 overflow-hidden 
                           hover:shadow-md active:scale-[0.97] transition-all duration-150 text-left"
              >
                {/* Cover poster */}
                <div className="aspect-[3/4] bg-gradient-to-br from-brand-50 to-brand-100 relative overflow-hidden">
                  {b.cover_url ? (
                    <img
                      src={b.cover_url}
                      alt={b.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full p-2">
                      <div className="text-center">
                        <ImageOff className="w-5 h-5 text-brand-300 mx-auto mb-1" />
                        <p className="text-[9px] text-brand-400 leading-tight line-clamp-2">
                          {b.title}
                        </p>
                      </div>
                    </div>
                  )}
                  {/* Low stock badge */}
                  {b.stock > 0 && b.stock <= 3 && (
                    <span className="absolute top-1 left-1 bg-amber-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                      {b.stock}
                    </span>
                  )}
                  {b.stock <= 0 && (
                    <span className="absolute top-1 left-1 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                      Habis
                    </span>
                  )}
                  {/* + button — like poster film */}
                  <div className="absolute bottom-1.5 right-1.5 w-7 h-7 rounded-full bg-brand-600 text-white 
                                 flex items-center justify-center shadow-md
                                 group-hover:bg-brand-700 group-active:scale-90 transition-all">
                    <Plus className="w-4 h-4" />
                  </div>
                </div>
                {/* Info */}
                <div className="p-1.5">
                  <p className="text-[10px] font-semibold text-brand-950 leading-tight line-clamp-2 min-h-[2em]">
                    {b.title}
                  </p>
                  {b.author && (
                    <p className="text-[8px] text-brand-400 mt-0.5 truncate">{b.author}</p>
                  )}
                  <p className="text-[11px] font-bold text-brand-700 mt-0.5">
                    {formatRupiah(b.price)}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Spacer for bottom sheet */}
        <div className="h-24" />
      </div>

      {/* --- DESKTOP LAYOUT --- */}
      <div className="hidden lg:grid lg:grid-cols-3 gap-5">
        {/* Left: Poster Grid */}
        <div className="lg:col-span-2 space-y-4">
          <div className="card p-4 space-y-3">
            <label className="label">Cari Buku</label>
            <GenrePicker
              selectedIds={genreFilterIds}
              onChange={(ids, selections) => {
                setGenreFilterIds(ids);
                setGenreSelectionsData(selections);
                if (ids.length === 0) setSelectedCategory("");
                else setSelectedCategory(selections.map((s) => s.subgenre_name).join(", "));
              }}
              label="Filter Genre"
            />
            <div className="flex gap-2">
              <div className="flex-1">
                <SearchBar
                  value={bookSearch}
                  onChange={setBookSearch}
                  placeholder="Ketik judul, penulis, atau ISBN..."
                />
              </div>
              <ScannerButton onScan={handleScannedISBN} variant="icon" />
            </div>
          </div>

          {/* Poster Grid Desktop */}
          {loadingBooks ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 text-brand-400 animate-spin" />
            </div>
          ) : displayedBooks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-brand-400">
              <ImageOff className="w-12 h-12 mb-3" />
              <p className="text-sm">Buku tidak ditemukan</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 xl:grid-cols-4 gap-3">
              {displayedBooks.map((b) => (
                <button
                  key={b.id}
                  onClick={() => addToCart(b)}
                  className="group relative bg-white rounded-2xl border border-brand-100 overflow-hidden 
                             hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.97] transition-all duration-200 text-left"
                >
                  <div className="aspect-[3/4] bg-gradient-to-br from-brand-50 to-brand-100 relative overflow-hidden">
                    {b.cover_url ? (
                      <img
                        src={b.cover_url}
                        alt={b.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full p-3">
                        <div className="text-center">
                          <ImageOff className="w-7 h-7 text-brand-300 mx-auto mb-1" />
                          <p className="text-xs text-brand-400 line-clamp-3">{b.title}</p>
                        </div>
                      </div>
                    )}
                    {b.stock > 0 && b.stock <= 3 && (
                      <span className="absolute top-2 left-2 bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full leading-none">
                        Sisa {b.stock}
                      </span>
                    )}
                    {b.stock <= 0 && (
                      <span className="absolute top-2 left-2 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full leading-none">
                        Habis
                      </span>
                    )}
                    <div className="absolute bottom-2 right-2 w-8 h-8 rounded-full bg-brand-600 text-white 
                                   flex items-center justify-center shadow-md
                                   group-hover:bg-brand-700 group-active:scale-90 transition-all">
                      <Plus className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="p-2.5">
                    <p className="text-xs font-semibold text-brand-950 leading-tight line-clamp-2 min-h-[2.5em]">
                      {b.title}
                    </p>
                    {b.author && (
                      <p className="text-[10px] text-brand-400 mt-0.5 truncate">{b.author}</p>
                    )}
                    <p className="text-sm font-bold text-brand-700 mt-1">
                      {formatRupiah(b.price)}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Cart + Customer (Desktop) */}
        <div className="space-y-4">
          {/* Cart */}
          <div className="card p-4">
            <h2 className="font-bold text-brand-950 flex items-center gap-2 mb-3">
              <ShoppingCart className="w-4 h-4 text-brand-600" />
              Keranjang ({cartItemCount} item)
            </h2>

            {cart.length === 0 ? (
              <p className="text-sm text-brand-400 py-8 text-center">
                Belum ada buku. Klik tombol <Plus className="w-3 h-3 inline" /> di poster buku.
              </p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {cart.map((c) => (
                  <div key={c.book.id} className="flex items-center gap-2 py-2 px-3 rounded-xl bg-brand-50/60">
                    {c.book.cover_url ? (
                      <img
                        src={c.book.cover_url}
                        alt={c.book.title}
                        className="w-9 h-12 rounded-lg object-cover shrink-0"
                      />
                    ) : (
                      <div className="w-9 h-12 rounded-lg bg-brand-100 flex items-center justify-center shrink-0">
                        <ImageOff className="w-4 h-4 text-brand-300" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-brand-950 truncate">{c.book.title}</p>
                      <p className="text-[10px] text-brand-500">{formatRupiah(c.book.price)}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => updateQty(c.book.id, -1)}
                        className="p-1 rounded-lg hover:bg-brand-100 text-brand-600"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <input
                        type="number"
                        value={c.quantity}
                        min={1}
                        max={c.book.stock}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 1;
                          const clamped = Math.min(Math.max(val, 1), c.book.stock);
                          updateQtyDirect(c.book.id, clamped);
                        }}
                        className="w-10 text-center text-xs font-bold text-brand-950 border border-brand-200 rounded-md py-0.5 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <button
                        onClick={() => updateQty(c.book.id, 1)}
                        className="p-1 rounded-lg hover:bg-brand-100 text-brand-600"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                    <span className="text-xs font-bold text-brand-700 w-20 text-right">
                      {formatRupiah(c.book.price * c.quantity)}
                    </span>
                    <button
                      onClick={() => removeFromCart(c.book.id)}
                      className="p-1 rounded-lg hover:bg-red-50 text-red-400 hover:text-red-500"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Customer */}
          <div className="card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-brand-950 flex items-center gap-2">
                <User className="w-4 h-4 text-brand-600" />
                Pelanggan
              </h3>
              <button
                onClick={() => {
                  if (showAllCustomers) {
                    setShowAllCustomers(false);
                    setCustomerSearch("");
                  } else {
                    fetchAllCustomers();
                  }
                  setSelectedCustomer(null);
                }}
                className="text-xs font-semibold text-brand-600 hover:text-brand-700"
              >
                {selectedCustomer ? "Ganti" : "Pilih"}
              </button>
            </div>

            {selectedCustomer ? (
              <div className="bg-brand-50 rounded-xl p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-brand-950 text-sm">{selectedCustomer.name}</p>
                    <p className="text-xs text-brand-500">{selectedCustomer.phone}</p>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedCustomer(null);
                      setShowAllCustomers(false);
                      setCustomerSearch("");
                    }}
                    className="text-xs text-red-400 hover:text-red-500"
                  >
                    Hapus
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-brand-400">Pelanggan Umum</p>
            )}

            {showAllCustomers && (
              <div className="space-y-2">
                <SearchBar
                  value={customerSearch}
                  onChange={setCustomerSearch}
                  placeholder="Cari nama atau telepon..."
                />
                <div className="border border-brand-100 rounded-xl divide-y divide-brand-50 max-h-60 overflow-y-auto">
                  {filteredAllCustomers.length === 0 ? (
                    <p className="p-3 text-sm text-brand-400 text-center">Pelanggan tidak ditemukan</p>
                  ) : (
                    filteredAllCustomers.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => {
                          setSelectedCustomer(c);
                          setShowAllCustomers(false);
                          setCustomerSearch("");
                          setNewCustomer({ name: "", phone: "", email: "" });
                        }}
                        className="w-full p-3 text-left hover:bg-brand-50/60 transition-colors"
                      >
                        <p className="font-semibold text-brand-950 text-sm">{c.name}</p>
                        <p className="text-xs text-brand-500">{c.phone}</p>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}

            <div className="border-t border-brand-100 pt-3 mt-2">
              <p className="text-xs font-semibold text-brand-500 mb-2">Pelanggan Baru</p>
              <div className="space-y-2">
                <input
                  type="text"
                  value={newCustomer.name}
                  onChange={(e) => setNewCustomer((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Nama *"
                  className="input-field text-sm"
                />
                <input
                  type="text"
                  value={newCustomer.phone}
                  onChange={(e) => setNewCustomer((prev) => ({ ...prev, phone: e.target.value }))}
                  placeholder="No. WA/HP"
                  className="input-field text-sm"
                />
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="card p-4 space-y-3">
            <h3 className="font-bold text-brand-950">Ringkasan</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-brand-500">Subtotal</span>
                <span className="font-semibold text-brand-950">{formatRupiah(subtotal)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-brand-500">Diskon</span>
                <div className="flex items-center gap-2">
                  <span className="text-brand-400">Rp</span>
                  <input
                    type="number"
                    min="0"
                    max={subtotal}
                    value={discount || ""}
                    onChange={(e) => setDiscount(Number(e.target.value) || 0)}
                    className="w-24 text-right input-field py-1.5 text-sm"
                    placeholder="0"
                  />
                </div>
              </div>
              <hr className="border-brand-100" />
              <div className="flex justify-between">
                <span className="font-bold text-brand-950">Total</span>
                <span className="text-lg font-bold text-brand-700">{formatRupiah(finalAmount)}</span>
              </div>
            </div>
            <button
              onClick={handleSave}
              disabled={saving || cart.length === 0 || discount > subtotal}
              className="btn-primary w-full mt-2"
            >
              <Save className="w-4 h-4" />
              {saving ? "Menyimpan..." : "Simpan & Bayar"}
            </button>
          </div>
        </div>
      </div>

      {/* ===== BOTTOM SHEET (Mobile Cart) ===== */}
      <BottomSheet
        isOpen={cart.length > 0}
        onClose={() => {}}
        collapsedLabel={
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-brand-600" />
              <span className="text-sm font-bold text-brand-950">
                {cartItemCount} item
              </span>
              <span className="text-xs text-brand-400">
                ({formatRupiah(subtotal)})
              </span>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleSave();
              }}
              disabled={saving}
              className="btn-primary text-xs py-1.5 px-3"
            >
              {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
              Bayar
            </button>
          </div>
        }
      >
        {/* Collapsed minimal view */}
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 text-brand-600" />
            <span className="text-sm font-bold text-brand-950">
              {cartItemCount} item
            </span>
            <span className="text-xs text-brand-400">
              ({formatRupiah(subtotal)})
            </span>
          </div>
          <button
            onClick={(e) => {
              e.preventDefault();
              handleSave();
            }}
            disabled={saving}
            className="btn-primary text-xs py-1.5 px-3"
          >
            {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
            Bayar
          </button>
        </div>

        {/* Expanded: cart items */}
        <div className="mt-3 space-y-2">
          <div className="flex items-center gap-3 mb-3">
            <input
              type="number"
              min="0"
              value={discount || ""}
              onChange={(e) => setDiscount(Number(e.target.value) || 0)}
              className="input-field flex-1 text-sm py-2"
              placeholder="Diskon (Rp)"
            />
            <div className="text-right">
              <p className="text-xs text-brand-500">Total</p>
              <p className="text-base font-bold text-brand-700">{formatRupiah(finalAmount)}</p>
            </div>
          </div>

          {cart.map((c) => (
            <div key={c.book.id} className="flex items-center gap-2 py-2 px-3 rounded-xl bg-brand-50/60">
              {c.book.cover_url ? (
                <img
                  src={c.book.cover_url}
                  alt={c.book.title}
                  className="w-8 h-10 rounded-lg object-cover shrink-0"
                />
              ) : (
                <div className="w-8 h-10 rounded-lg bg-brand-100 flex items-center justify-center shrink-0">
                  <ImageOff className="w-3 h-3 text-brand-300" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-brand-950 truncate">{c.book.title}</p>
                <p className="text-[10px] text-brand-500">{formatRupiah(c.book.price)}</p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => updateQty(c.book.id, -1)}
                  className="p-1 rounded-lg hover:bg-brand-100 text-brand-600"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <input
                  type="number"
                  value={c.quantity}
                  min={1}
                  max={c.book.stock}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 1;
                    const clamped = Math.min(Math.max(val, 1), c.book.stock);
                    updateQtyDirect(c.book.id, clamped);
                  }}
                  className="w-10 text-center text-xs font-bold text-brand-950 border border-brand-200 rounded-md py-0.5 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <button
                  onClick={() => updateQty(c.book.id, 1)}
                  className="p-1 rounded-lg hover:bg-brand-100 text-brand-600"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
              <span className="text-xs font-bold text-brand-700 w-16 text-right">
                {formatRupiah(c.book.price * c.quantity)}
              </span>
              <button
                onClick={() => removeFromCart(c.book.id)}
                className="p-1 rounded-lg hover:bg-red-50 text-red-400 hover:text-red-500"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}

          {/* Customer di dalam sheet */}
          <div className="mt-3 pt-3 border-t border-brand-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-brand-500">Pelanggan</span>
              <button
                onClick={() => setSelectedCustomer(null)}
                className="text-xs text-brand-400 hover:text-brand-600"
              >
                {selectedCustomer?.name || "Umum"} {selectedCustomer && "✕"}
              </button>
            </div>
            {!selectedCustomer && (
              <div className="space-y-2">
                <input
                  type="text"
                  value={newCustomer.name}
                  onChange={(e) => setNewCustomer((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Nama pelanggan *"
                  className="input-field text-sm py-2"
                />
                <input
                  type="tel"
                  value={newCustomer.phone}
                  onChange={(e) => setNewCustomer((prev) => ({ ...prev, phone: e.target.value }))}
                  placeholder="No. WA/HP *"
                  className="input-field text-sm py-2"
                />
              </div>
            )}
          </div>
        </div>
      </BottomSheet>

      {/* Payment Modal — 3 metode + opsi bayar */}
      {showPayment && savedOrder && (
        <div className="fixed inset-0 z-[60] flex flex-col sm:items-center sm:justify-center bg-white sm:bg-black/40 sm:backdrop-blur-sm animate-fade-in">
          {/* Mobile: full screen, Desktop: card */}
          <div className="flex flex-col w-full h-full max-h-dvh sm:max-w-sm sm:max-h-[90vh] sm:h-auto sm:rounded-3xl sm:shadow-float sm:bg-white overflow-hidden">
            {/* Header */}
            <div className="flex items-center gap-3 px-5 pt-5 pb-3 shrink-0 sm:px-5 sm:pt-5 sm:pb-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-6 h-6 text-emerald-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-bold text-brand-950">Pembayaran</h2>
                <p className="text-sm text-brand-500">
                  #{savedOrder.id.slice(0, 8).toUpperCase()}
                </p>
              </div>
              <button
                onClick={() => { setShowPayment(false); setSavedOrder(null); setSavedItems([]); }}
                className="p-2 rounded-xl hover:bg-brand-50 text-brand-400 shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable content */}
            <div className="overflow-y-auto overscroll-contain px-5 flex-1 min-h-0 pb-2">
              {/* Summary */}
              <div className="bg-brand-50 rounded-2xl p-4 mb-4">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-brand-500">Brutto</span>
                  <span className="font-semibold text-brand-800">{formatRupiah(savedOrder.total_amount)}</span>
                </div>
                {savedOrder.discount > 0 && (
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-brand-500">Diskon</span>
                    <span className="font-semibold text-red-500">-{formatRupiah(savedOrder.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-brand-200 pt-2">
                  <span className="font-bold text-brand-950">Total</span>
                  <span className="text-xl font-black text-brand-700">{formatRupiah(savedOrder.final_amount)}</span>
                </div>
              </div>

              {/* Metode Pembayaran */}
              <p className="text-xs font-bold text-brand-800 mb-2">Metode Pembayaran</p>
              <div className="grid grid-cols-3 gap-2 mb-4">
                <button
                  onClick={() => setPaymentMethod("tunai")}
                  className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all ${
                    paymentMethod === "tunai"
                      ? "border-brand-600 bg-brand-50 text-brand-700"
                      : "border-brand-100 text-brand-400 hover:border-brand-300"
                  }`}
                >
                  <Banknote className="w-5 h-5" />
                  <span className="text-[11px] font-bold">Tunai</span>
                </button>
                <button
                  onClick={() => setPaymentMethod("qris")}
                  className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all ${
                    paymentMethod === "qris"
                      ? "border-brand-600 bg-brand-50 text-brand-700"
                      : "border-brand-100 text-brand-400 hover:border-brand-300"
                  }`}
                >
                  <QrCode className="w-5 h-5" />
                  <span className="text-[11px] font-bold">QRIS</span>
                </button>
                <button
                  onClick={() => setPaymentMethod("transfer")}
                  className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all ${
                    paymentMethod === "transfer"
                      ? "border-brand-600 bg-brand-50 text-brand-700"
                      : "border-brand-100 text-brand-400 hover:border-brand-300"
                  }`}
                >
                  <ArrowRightLeft className="w-5 h-5" />
                  <span className="text-[11px] font-bold">Transfer</span>
                </button>
              </div>

              {/* Jumlah Dibayar — QRIS */}
              {paymentMethod === "qris" && qrisString ? (
                <div className="space-y-4 pb-3 text-center relative">
                  {/* QR Code */}
                  <div className="bg-white p-4 rounded-2xl shadow-lg inline-block mx-auto relative overflow-hidden">
                    <QRCodeCanvas value={qrisString} size={220} level="M" />
                    {/* Scanning animation — waiting */}
                    {qrisStatus === 'waiting' && (
                      <>
                        <div className="absolute inset-0 bg-black/5 pointer-events-none" />
                        <div className="scanner-line" />
                        <div className="absolute inset-0 border-2 border-emerald-400/40 rounded-xl pointer-events-none" />
                      </>
                    )}
                  </div>
                  {/* Waiting / Info */}
                  {qrisStatus === 'waiting' && (
                    <div className="space-y-2 animate-pulse">
                      <div className="flex items-center justify-center gap-2">
                        <span className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce [animation-delay:0ms]" />
                        <span className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce [animation-delay:150ms]" />
                        <span className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce [animation-delay:300ms]" />
                      </div>
                      <p className="text-sm font-bold text-emerald-600">
                        Menunggu Pembayaran...
                      </p>
                      <p className="text-xs text-brand-500">
                        Scan QRIS menggunakan GoPay / OVO / DANA
                      </p>
                      <p className="text-lg font-black text-brand-700">
                        {formatRupiah((savedOrder?.final_amount || 0) + qrisKodeUnik)}
                      </p>
                      <p className="text-[10px] text-brand-400">
                        Kode unik: {qrisKodeUnik} · Harga: {formatRupiah(savedOrder?.final_amount || 0)} + {qrisKodeUnik}
                      </p>
                    </div>
                  )}
                  {/* Success overlay */}
                  {qrisStatus === 'success' && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-emerald-50/95 rounded-2xl z-10 animate-fade-in">
                      <div className="w-16 h-16 rounded-full bg-emerald-500 flex items-center justify-center animate-bounce-in mb-3 shadow-lg">
                        <CheckCircle2 className="w-10 h-10 text-white" />
                      </div>
                      <p className="text-lg font-black text-emerald-700 animate-fade-in-up">
                        Pembayaran Berhasil!
                      </p>
                      <p className="text-sm font-bold text-emerald-600 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
                        {formatRupiah((savedOrder?.final_amount || 0) + qrisKodeUnik)}
                      </p>
                      <p className="text-xs text-emerald-500 mt-1 animate-fade-in-up" style={{ animationDelay: '400ms' }}>
                        via QRIS
                      </p>
                      {/* Confetti */}
                      <div className="confetti-container">
                        {['🎉', '✨', '🪄', '💚', '🌟'].map((e, i) => (
                          <span
                            key={i}
                            className="confetti-piece"
                            style={{
                              left: `${20 + i * 15}%`,
                              animationDelay: `${i * 100}ms`,
                            }}
                          >
                            {e}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : /* Jumlah Dibayar — Tunai / Transfer */ (
              <div className="space-y-3 pb-3">
                <label className="label flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-brand-500" />
                  Jumlah Dibayar
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-400 font-semibold">Rp</span>
                  <input
                    type="number"
                    min={0}
                    value={paymentAmount || ""}
                    onChange={(e) => setPaymentAmount(Number(e.target.value) || 0)}
                    className="input-field pl-10 text-lg font-bold"
                    placeholder="0"
                    autoFocus
                  />
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setPaymentAmount(savedOrder?.final_amount || 0)}
                    className="flex-1 text-[11px] leading-tight font-bold py-2.5 px-2 rounded-xl bg-brand-50 text-brand-700 hover:bg-brand-100 transition-all"
                  >Lunas</button>
                  <button onClick={() => setPaymentAmount(Math.floor((savedOrder?.final_amount || 0) / 2))}
                    className="flex-1 text-[11px] leading-tight font-bold py-2.5 px-2 rounded-xl bg-amber-50 text-amber-600 hover:bg-amber-100 transition-all"
                  >Bayar Setengah</button>
                  <button onClick={() => setPaymentAmount(0)}
                    className="flex-1 text-[11px] leading-tight font-bold py-2.5 px-2 rounded-xl bg-red-50 text-red-500 hover:bg-red-100 transition-all"
                  >Belum Bayar</button>
                </div>
                {paymentAmount > 0 && (
                  <div className="flex justify-between items-center text-sm px-1">
                    <span className="text-brand-500">
                      {paymentAmount >= (savedOrder?.final_amount || 0) ? "Kembalian" : "Sisa hutang"}
                    </span>
                    <span className={`font-bold ${
                      paymentAmount >= (savedOrder?.final_amount || 0) ? "text-brand-700" : "text-amber-600"
                    }`}>
                      {paymentAmount >= (savedOrder?.final_amount || 0)
                        ? formatRupiah(paymentAmount - (savedOrder?.final_amount || 0))
                        : formatRupiah((savedOrder?.final_amount || 0) - paymentAmount)
                      }
                    </span>
                  </div>
                )}
                <div className="flex justify-center">
                  {paymentAmount <= 0 ? (
                    <span className="px-3 py-1 rounded-full bg-red-100 text-red-700 text-xs font-bold">● Belum Bayar</span>
                  ) : paymentAmount >= (savedOrder?.final_amount || 0) ? (
                    <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold">● Lunas</span>
                  ) : (
                    <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-bold">● Belum Lunas</span>
                  )}
                </div>
              </div>
              )}
            </div>

            {/* Bottom buttons */}
            <div className="flex gap-3 px-5 py-4 shrink-0 border-t border-brand-100 bg-white">
              <button onClick={() => { setShowPayment(false); setSavedOrder(null); setSavedItems([]); setQrisStatus('idle'); }}
                className="btn-secondary flex-1"
                disabled={qrisStatus === 'success'}
              >Batal</button>
              <button onClick={handlePaymentSubmit} className="btn-primary flex-1" disabled={qrisStatus === 'success'}>
                {qrisStatus === 'success' ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Mengalihkan...</>
                ) : paymentMethod === "qris" ? (
                  <><CheckCircle2 className="w-4 h-4" /> Sudah Dibayar</>
                ) : (
                  <><CheckCircle2 className="w-4 h-4" /> Konfirmasi</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
