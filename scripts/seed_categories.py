import psycopg2
import sys

REF = "qzlsccxuokfzwdlqrohx"
PWD = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF6bHNjY3h1b2tmendkbHFyb2h4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjY2MjYwNywiZXhwIjoyMDk4MjM4NjA3fQ.YJpieTzfT9uhN1Dyd6JXOiqBSXlprIsJNieZmaFHK3g"

try:
    conn = psycopg2.connect(
        host="aws-0-ap-southeast-1.pooler.supabase.com",
        port=6543,
        user=f"postgres.{REF}",
        password=PWD,
        dbname="postgres",
        connect_timeout=10,
        sslmode="require",
    )
    cur = conn.cursor()
    print("Connected!")

    # Create table
    cur.execute("""
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
""")
    conn.commit()
    print("Table created!")

    # Enable RLS
    cur.execute("ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;")
    conn.commit()

    # Policies
    cur.execute("""
DROP POLICY IF EXISTS "categories_select_all" ON public.categories;
DROP POLICY IF EXISTS "categories_insert_all" ON public.categories;
DROP POLICY IF EXISTS "categories_update_all" ON public.categories;
DROP POLICY IF EXISTS "categories_delete_all" ON public.categories;
CREATE POLICY "categories_select_all" ON public.categories
  FOR SELECT TO public USING (true);
CREATE POLICY "categories_insert_all" ON public.categories
  FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "categories_update_all" ON public.categories
  FOR UPDATE TO public USING (true);
CREATE POLICY "categories_delete_all" ON public.categories
  FOR DELETE TO public USING (true);
""")
    conn.commit()
    print("Policies created!")

    # Seed from books
    cur.execute("""
INSERT INTO public.categories (name)
SELECT DISTINCT category FROM public.books
WHERE category IS NOT NULL AND category != ''
ON CONFLICT (name) DO NOTHING;
""")
    conn.commit()
    print("Seeded from books!")

    # Verify
    cur.execute("SELECT count(*) FROM public.categories")
    count = cur.fetchone()[0]
    print(f"Total categories: {count}")

    cur.execute("SELECT name FROM public.categories ORDER BY name")
    for row in cur.fetchall():
        print(f"  - {row[0]}")

    cur.close()
    conn.close()
except Exception as e:
    print(f"Error: {e}")
    sys.exit(1)
