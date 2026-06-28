"""Create Supabase tables via REST - brute force all pooler regions"""
import psycopg2

PROJECT_REF = "qzlsccxuokfzwdlqrohx"
SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF6bHNjY3h1b2tmendkbHFyb2h4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjY2MjYwNywiZXhwIjoyMDk4MjM4NjA3fQ.YJpieTzfT9uhN1Dyd6JXOiqBSXlprIsJNieZmaFHK3g"

USER_PREFIXES = ["postgres", f"postgres.{PROJECT_REF}"]
HOSTS = [
    f"db.{PROJECT_REF}.supabase.co",
    f"aws-0-ap-southeast-1.pooler.supabase.com",
    f"aws-1-ap-southeast-1.pooler.supabase.com",
    f"aws-0-us-east-1.pooler.supabase.com",
]
PORTS = [6543, 5432]

SQL = """
CREATE TABLE IF NOT EXISTS books (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL, author TEXT NOT NULL, isbn TEXT UNIQUE,
  price NUMERIC NOT NULL CHECK (price >= 0),
  stock INT NOT NULL DEFAULT 0 CHECK (stock >= 0),
  category TEXT, publisher TEXT, cover_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS customers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL, phone TEXT UNIQUE NOT NULL, email TEXT, notes TEXT,
  total_orders INT DEFAULT 0, total_spent NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  customer_name TEXT, total_amount NUMERIC NOT NULL DEFAULT 0,
  discount NUMERIC DEFAULT 0, final_amount NUMERIC NOT NULL DEFAULT 0,
  status TEXT DEFAULT 'completed' CHECK (status IN ('completed', 'pending', 'cancelled')),
  notes TEXT, created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS order_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
  book_id UUID REFERENCES books(id) ON DELETE SET NULL,
  book_title TEXT NOT NULL, quantity INT NOT NULL CHECK (quantity > 0),
  price_at_time NUMERIC NOT NULL, subtotal NUMERIC NOT NULL
);
ALTER TABLE books ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Allow all books" ON books FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Allow all customers" ON customers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Allow all orders" ON orders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Allow all order_items" ON order_items FOR ALL USING (true) WITH CHECK (true);
INSERT INTO books (title, author, isbn, price, stock, category, publisher) VALUES
('Laut Bercerita', 'Leila S. Chudori', '978-602-424-694-5', 95000, 15, 'Fiksi', 'KPG'),
('Atomic Habits', 'James Clear', '978-073-521-129-2', 125000, 20, 'Non-Fiksi', 'Penguin'),
('Filosofi Teras', 'Henry Manampiring', '978-602-659-546-1', 79000, 25, 'Non-Fiksi', 'Kompas'),
('Pulang', 'Tere Liye', '978-623-972-673-7', 89000, 10, 'Fiksi', 'Sabak Grip'),
('Cantik Itu Luka', 'Eka Kurniawan', '978-602-031-752-1', 85000, 5, 'Fiksi', 'GPU'),
('The Psychology of Money', 'Morgan Housel', '978-085-719-768-9', 150000, 8, 'Non-Fiksi', 'Harriman House'),
('Bumi Manusia', 'Pramoedya Ananta Toer', '978-979-973-122-7', 75000, 3, 'Fiksi', 'Lentera Dipantara')
ON CONFLICT DO NOTHING;
INSERT INTO customers (name, phone, email) VALUES
('Budi Santoso', '081234567890', 'budi@email.com'),
('Siti Rahayu', '082345678901', 'siti@email.com'),
('Ahmad Rizki', '083456789012', 'ahmad@email.com')
ON CONFLICT DO NOTHING;
"""

found = False
for user in USER_PREFIXES:
    for host in HOSTS:
        for port in PORTS:
            conn_str = f"postgresql://{user}:{SERVICE_KEY}@{host}:{port}/postgres"
            try:
                print(f"TRY: {user}@{host}:{port}...", end=" ")
                conn = psycopg2.connect(conn_str, connect_timeout=8)
                cur = conn.cursor()
                cur.execute(SQL)
                conn.commit()
                cur.close()
                conn.close()
                print("✅ SUCCESS!")
                # Verify
                conn2 = psycopg2.connect(conn_str, connect_timeout=5)
                cur2 = conn2.cursor()
                cur2.execute("SELECT count(*) FROM books")
                print(f"  Books: {cur2.fetchone()[0]}")
                cur2.execute("SELECT count(*) FROM customers")
                print(f"  Customers: {cur2.fetchone()[0]}")
                conn2.close()
                found = True
                break
            except Exception as e:
                msg = str(e)[:80].replace("\n", " ")
                print(f"❌ {msg}")
    if found:
        break

if not found:
    print("\nALL FAILED - BOSS perlu buka Supabase Dashboard & execute SQL manual")
