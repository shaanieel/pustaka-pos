-- ============================================
-- PUSTAKAPOS DATABASE SCHEMA
-- Copy & paste ke Supabase SQL Editor
-- ============================================
-- Link: https://supabase.com/dashboard/project/qzlsccxuokfzwdlqrohx/sql/new

-- Tabel Buku
CREATE TABLE IF NOT EXISTS books (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  isbn TEXT UNIQUE,
  price NUMERIC NOT NULL CHECK (price >= 0),
  stock INT NOT NULL DEFAULT 0 CHECK (stock >= 0),
  category TEXT,
  publisher TEXT,
  cover_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabel Pelanggan
CREATE TABLE IF NOT EXISTS customers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT UNIQUE NOT NULL,
  email TEXT,
  notes TEXT,
  total_orders INT DEFAULT 0,
  total_spent NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabel Pesanan
CREATE TABLE IF NOT EXISTS orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  customer_name TEXT,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  discount NUMERIC DEFAULT 0,
  final_amount NUMERIC NOT NULL DEFAULT 0,
  status TEXT DEFAULT 'completed' CHECK (status IN ('completed', 'pending', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabel Item Pesanan
CREATE TABLE IF NOT EXISTS order_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
  book_id UUID REFERENCES books(id) ON DELETE SET NULL,
  book_title TEXT NOT NULL,
  quantity INT NOT NULL CHECK (quantity > 0),
  price_at_time NUMERIC NOT NULL,
  subtotal NUMERIC NOT NULL
);

-- Index
CREATE INDEX IF NOT EXISTS idx_books_title ON books(title);
CREATE INDEX IF NOT EXISTS idx_books_category ON books(category);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);

-- Trigger update timestamp
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_books_timestamp ON books;
CREATE TRIGGER update_books_timestamp BEFORE UPDATE ON books
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

DROP TRIGGER IF EXISTS update_customers_timestamp ON customers;
CREATE TRIGGER update_customers_timestamp BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- Update stats pelanggan
CREATE OR REPLACE FUNCTION update_customer_stats()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE customers
  SET total_orders = (SELECT COUNT(*) FROM orders WHERE customer_id = NEW.customer_id),
      total_spent = (SELECT COALESCE(SUM(final_amount), 0) FROM orders WHERE customer_id = NEW.customer_id)
  WHERE id = NEW.customer_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_customer_after_order ON orders;
CREATE TRIGGER update_customer_after_order AFTER INSERT OR UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_customer_stats();

-- Kurangi stok otomatis
CREATE OR REPLACE FUNCTION decrease_book_stock()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE books SET stock = stock - NEW.quantity WHERE id = NEW.book_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS decrease_stock_after_order_item ON order_items;
CREATE TRIGGER decrease_stock_after_order_item AFTER INSERT ON order_items
  FOR EACH ROW EXECUTE FUNCTION decrease_book_stock();

-- RLS
ALTER TABLE books ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Allow all books" ON books;
DROP POLICY IF EXISTS "Allow all customers" ON customers;
DROP POLICY IF EXISTS "Allow all orders" ON orders;
DROP POLICY IF EXISTS "Allow all order_items" ON order_items;

CREATE POLICY "Allow all books" ON books FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all customers" ON customers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all orders" ON orders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all order_items" ON order_items FOR ALL USING (true) WITH CHECK (true);

-- 🔥 Sample Data
INSERT INTO books (title, author, isbn, price, stock, category, publisher) VALUES
('Laut Bercerita', 'Leila S. Chudori', '978-602-424-694-5', 95000, 15, 'Fiksi', 'KPG'),
('Atomic Habits', 'James Clear', '978-073-521-129-2', 125000, 20, 'Non-Fiksi', 'Penguin Random House'),
('Filosofi Teras', 'Henry Manampiring', '978-602-659-546-1', 79000, 25, 'Non-Fiksi', 'Kompas'),
('Pulang', 'Tere Liye', '978-623-972-673-7', 89000, 10, 'Fiksi', 'Sabak Grip'),
('Cantik Itu Luka', 'Eka Kurniawan', '978-602-031-752-1', 85000, 5, 'Fiksi', 'Gramedia Pustaka Utama'),
('The Psychology of Money', 'Morgan Housel', '978-085-719-768-9', 150000, 8, 'Non-Fiksi', 'Harriman House'),
('Bumi Manusia', 'Pramoedya Ananta Toer', '978-979-973-122-7', 75000, 3, 'Fiksi', 'Lentera Dipantara')
ON CONFLICT DO NOTHING;

INSERT INTO customers (name, phone, email) VALUES
('Budi Santoso', '081234567890', 'budi@email.com'),
('Siti Rahayu', '082345678901', 'siti@email.com'),
('Ahmad Rizki', '083456789012', 'ahmad@email.com')
ON CONFLICT DO NOTHING;

-- ============================================
-- SELESAI! 🎉 Refresh web di localhost:3210
-- ============================================
