export interface Book {
  id: string;
  title: string;
  author: string;
  isbn: string | null;
  book_code: string | null;
  price: number;
  stock: number;
  category: string | null;
  publisher: string | null;
  cover_url: string | null;
  year: number | null;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  notes: string | null;
  total_orders: number;
  total_spent: number;
  created_at: string;
  updated_at: string;
}

export type PaymentMethod = "tunai" | "qris" | "transfer";
export type PaymentStatus = "lunas" | "belum_bayar" | "belum_lunas" | "waiting_payment";

export interface Order {
  id: string;
  customer_id: string | null;
  customer_name: string | null;
  total_amount: number;
  discount: number;
  final_amount: number;
  status: "completed" | "pending" | "cancelled";
  notes: string | null;
  payment_method: PaymentMethod | null;
  payment_status: PaymentStatus | null;
  paid_amount: number | null;
  payment_confirmed_at: string | null;
  created_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  book_id: string | null;
  book_title: string;
  quantity: number;
  price_at_time: number;
  subtotal: number;
}

export interface OrderWithItems extends Order {
  items: OrderItem[];
  customer?: Customer | null;
}

export interface CartItem {
  book: Book;
  quantity: number;
}

export interface DashboardStats {
  totalBooks: number;
  totalStock: number;
  totalOrders: number;
  totalRevenue: number;
  totalCustomers: number;
  recentOrders: Order[];
  lowStockBooks: Book[];
}

export interface BookSearchResult {
  id: string;
  title: string;
  author: string;
  year: number | null;
  isbn: string | null;
  publisher: string | null;
  coverUrl: string | null;
  source: "google" | "openlibrary";
}
