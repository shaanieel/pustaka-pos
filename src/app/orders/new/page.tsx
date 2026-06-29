"use client";
export const dynamic = "force-dynamic";
export const runtime = "edge";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Book, Customer, CartItem, Order, OrderItem } from "@/types";
import { SearchBar } from "@/components/SearchBar";
import { Receipt } from "@/components/Receipt";
import { formatRupiah } from "@/lib/utils";
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
} from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

export default function NewOrderPage() {
  // Cart
  const [cart, setCart] = useState<CartItem[]>([]);

  // Book search
  const [books, setBooks] = useState<Book[]>([]);
  const [bookSearch, setBookSearch] = useState("");

  // Customer
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerSearch, setCustomerSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showCustomerSearch, setShowCustomerSearch] = useState(false);

  // Discount
  const [discount, setDiscount] = useState(0);

  // Saving
  const [saving, setSaving] = useState(false);

  // Payment modal
  const [savedOrder, setSavedOrder] = useState<Order | null>(null);
  const [savedItems, setSavedItems] = useState<OrderItem[]>([]);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [showPayment, setShowPayment] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const changeAmount = Math.max(0, paymentAmount - (savedOrder?.final_amount || 0));

  // Search books
  const searchBooks = useCallback(async () => {
    if (!bookSearch.trim()) {
      setBooks([]);
      return;
    }
    try {
      const { data } = await supabase
        .from("books")
        .select("*")
        .or(`title.ilike.%${bookSearch}%,author.ilike.%${bookSearch}%,isbn.ilike.%${bookSearch}%`)
        .limit(10);
      setBooks(data || []);
    } catch {
      // silent
    }
  }, [bookSearch]);

  useEffect(() => {
    const timer = setTimeout(searchBooks, 300);
    return () => clearTimeout(timer);
  }, [searchBooks]);

  // Search customers
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
    } catch {
      // silent
    }
  }, [customerSearch]);

  useEffect(() => {
    const timer = setTimeout(searchCustomers, 300);
    return () => clearTimeout(timer);
  }, [searchCustomers]);

  // Add to cart
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
    setBookSearch("");
    setBooks([]);
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

  // Quick add qty by typing
  function setQty(bookId: string, val: number) {
    if (val < 1) val = 1;
    setCart(
      cart.map((c) => {
        if (c.book.id !== bookId) return c;
        if (val > c.book.stock) {
          toast.error("Stok tidak mencukupi");
          return c;
        }
        return { ...c, quantity: val };
      })
    );
  }

  const subtotal = cart.reduce((sum, c) => sum + c.book.price * c.quantity, 0);
  const finalAmount = subtotal - discount;

  async function handleSave() {
    if (cart.length === 0) {
      toast.error("Tambahkan minimal 1 buku");
      return;
    }
    if (discount > subtotal) {
      toast.error("Diskon tidak boleh melebihi subtotal");
      return;
    }

    setSaving(true);
    try {
      // 1. Create order
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          customer_id: selectedCustomer?.id || null,
          customer_name: selectedCustomer?.name || null,
          total_amount: subtotal,
          discount,
          final_amount: finalAmount,
          status: "completed",
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // 2. Create order items
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

      // 3. Reduce stock
      for (const c of cart) {
        await supabase
          .from("books")
          .update({ stock: c.book.stock - c.quantity })
          .eq("id", c.book.id);
      }

      setSavedOrder(order);
      setSavedItems(itemsData || orderItems);
      setPaymentAmount(finalAmount);
      setShowPayment(true);
    } catch (err: any) {
      toast.error(err.message || "Gagal membuat pesanan");
    } finally {
      setSaving(false);
    }
  }

  function handlePaymentSubmit() {
    if (paymentAmount < (savedOrder?.final_amount || 0)) {
      toast.error("Uang tidak mencukupi");
      return;
    }
    setShowPayment(false);
    setShowReceipt(true);
  }

  function handleCloseReceipt() {
    setShowReceipt(false);
    setSavedOrder(null);
    setSavedItems([]);
    setCart([]);
    setSelectedCustomer(null);
    setDiscount(0);
    setPaymentAmount(0);
  }

  // If receipt is showing
  if (showReceipt && savedOrder && savedItems.length > 0) {
    return (
      <Receipt
        order={savedOrder}
        items={savedItems}
        customerName={selectedCustomer?.name || "Pelanggan Umum"}
        cashierName="Kasir"
        paymentAmount={paymentAmount}
        changeAmount={changeAmount}
        onClose={handleCloseReceipt}
      />
    );
  }

  return (
    <>
      <div className="space-y-5 max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link href="/orders" className="btn-ghost p-2 -ml-2">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="page-title">Pesanan Baru</h1>
            <p className="page-subtitle">Tambahkan buku ke keranjang</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-5">
          {/* Left: Book search + Cart */}
          <div className="lg:col-span-2 space-y-4">
            {/* Book Search */}
            <div className="card p-4 space-y-3">
              <label className="label">Cari Buku</label>
              <SearchBar
                value={bookSearch}
                onChange={setBookSearch}
                placeholder="Ketik judul, penulis, atau ISBN..."
              />
              {books.length > 0 && (
                <div className="border border-brand-100 rounded-xl divide-y divide-brand-50 max-h-64 overflow-y-auto">
                  {books.map((b) => (
                    <button
                      key={b.id}
                      onClick={() => addToCart(b)}
                      className="w-full flex items-center justify-between p-3 text-left hover:bg-brand-50/60 transition-colors"
                    >
                      <div>
                        <p className="font-semibold text-brand-950 text-sm">{b.title}</p>
                        <p className="text-xs text-brand-500">
                          {b.author} &middot; Stok: {b.stock}
                        </p>
                      </div>
                      <span className="text-sm font-bold text-brand-700">{formatRupiah(b.price)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Cart */}
            <div className="card p-4">
              <h2 className="font-bold text-brand-950 flex items-center gap-2 mb-3">
                <ShoppingCart className="w-4 h-4 text-brand-600" />
                Keranjang ({cart.length} item)
              </h2>

              {cart.length === 0 ? (
                <p className="text-sm text-brand-400 py-8 text-center">
                  Belum ada buku. Cari dan tambahkan di atas.
                </p>
              ) : (
                <div className="space-y-2">
                  {cart.map((c) => (
                    <div key={c.book.id} className="flex items-center justify-between py-2 px-3 rounded-xl bg-brand-50/60">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-brand-950 truncate">{c.book.title}</p>
                        <p className="text-xs text-brand-500">{formatRupiah(c.book.price)} / item</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateQty(c.book.id, -1)}
                          className="p-1 rounded-lg hover:bg-brand-100 text-brand-600"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <input
                          type="number"
                          min="1"
                          max={c.book.stock}
                          value={c.quantity}
                          onChange={(e) => setQty(c.book.id, Number(e.target.value) || 1)}
                          className="w-10 text-center text-sm font-bold text-brand-950 bg-transparent border-b border-brand-200 focus:outline-none focus:border-brand-500 [-moz-appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                        />
                        <button
                          onClick={() => updateQty(c.book.id, 1)}
                          className="p-1 rounded-lg hover:bg-brand-100 text-brand-600"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-sm font-bold text-brand-700 w-24 text-right">
                          {formatRupiah(c.book.price * c.quantity)}
                        </span>
                        <button
                          onClick={() => removeFromCart(c.book.id)}
                          className="p-1 rounded-lg hover:bg-red-50 text-red-400 hover:text-red-500"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right: Customer + Summary */}
          <div className="space-y-4">
            {/* Customer */}
            <div className="card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-brand-950 flex items-center gap-2">
                  <User className="w-4 h-4 text-brand-600" />
                  Pelanggan
                </h3>
                <button
                  onClick={() => {
                    setShowCustomerSearch(!showCustomerSearch);
                    setSelectedCustomer(null);
                  }}
                  className="text-xs font-semibold text-brand-600 hover:text-brand-700"
                >
                  {selectedCustomer ? "Ganti" : "Pilih"}
                </button>
              </div>

              {selectedCustomer ? (
                <div className="bg-brand-50 rounded-xl p-3">
                  <p className="font-semibold text-brand-950 text-sm">{selectedCustomer.name}</p>
                  <p className="text-xs text-brand-500">{selectedCustomer.phone}</p>
                </div>
              ) : (
                <p className="text-sm text-brand-400">Pelanggan Umum</p>
              )}

              {showCustomerSearch && (
                <div className="space-y-2">
                  <SearchBar
                    value={customerSearch}
                    onChange={setCustomerSearch}
                    placeholder="Cari nama atau telepon..."
                  />
                  {customers.length > 0 && (
                    <div className="border border-brand-100 rounded-xl divide-y divide-brand-50 max-h-40 overflow-y-auto">
                      {customers.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => {
                            setSelectedCustomer(c);
                            setShowCustomerSearch(false);
                            setCustomerSearch("");
                          }}
                          className="w-full p-3 text-left hover:bg-brand-50/60 transition-colors"
                        >
                          <p className="font-semibold text-brand-950 text-sm">{c.name}</p>
                          <p className="text-xs text-brand-500">{c.phone}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Summary */}
            <div className="card p-4 space-y-3">
              <h3 className="font-bold text-brand-950">Ringkasan</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-brand-500">Subtotal (Brutto)</span>
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
                  <span className="font-bold text-brand-950">Total (Netto)</span>
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
      </div>

      {/* Payment Modal */}
      {showPayment && savedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-scale-in">
          <div className="bg-white rounded-3xl shadow-float max-w-sm w-full p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-brand-950">Pesanan Tersimpan</h2>
                <p className="text-sm text-brand-500">
                  #{savedOrder.id.slice(0, 8).toUpperCase()}
                </p>
              </div>
            </div>

            <div className="bg-brand-50 rounded-2xl p-4 mb-5">
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
                <span className="font-bold text-brand-950">Total (Netto)</span>
                <span className="text-xl font-black text-brand-700">{formatRupiah(savedOrder.final_amount)}</span>
              </div>
            </div>

            <div className="space-y-3">
              <label className="label flex items-center gap-2">
                <Wallet className="w-4 h-4 text-brand-500" />
                Jumlah Dibayar
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-400 font-semibold">
                  Rp
                </span>
                <input
                  type="number"
                  min={savedOrder.final_amount}
                  value={paymentAmount || ""}
                  onChange={(e) => setPaymentAmount(Number(e.target.value) || 0)}
                  className="input-field pl-10 text-lg font-bold"
                  placeholder={`Min. ${formatRupiah(savedOrder.final_amount)}`}
                  autoFocus
                />
              </div>
              {paymentAmount > 0 && (
                <div className="flex justify-between text-sm px-1">
                  <span className="text-brand-500">Kembali</span>
                  <span className="font-bold text-brand-700">
                    {paymentAmount >= savedOrder.final_amount
                      ? formatRupiah(paymentAmount - savedOrder.final_amount)
                      : formatRupiah(0)}
                  </span>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowPayment(false);
                  setSavedOrder(null);
                  setSavedItems([]);
                }}
                className="btn-secondary flex-1"
              >
                Batal
              </button>
              <button
                onClick={handlePaymentSubmit}
                disabled={paymentAmount < savedOrder.final_amount}
                className="btn-primary flex-1"
              >
                <CheckCircle2 className="w-4 h-4" />
                Bayar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
