export interface Book {
  id: string;
  title: string;
  author: string;
  isbn: string | null;
  price: number;
  stock: number;
  category: string | null;
  publisher: string | null;
  cover_url: string | null;
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

export interface Order {
  id: string;
  customer_id: string | null;
  customer_name: string | null;
  total_amount: number;
  discount: number;
  final_amount: number;
  status: "completed" | "pending" | "cancelled";
  notes: string | null;
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
