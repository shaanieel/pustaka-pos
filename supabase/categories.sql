-- =====================================================
-- CATEGORIES TABLE — Run this in Supabase SQL Editor
-- =====================================================

CREATE TABLE IF NOT EXISTS public.categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Policies: allow public read + write (anon key)
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

-- Seed: insert distinct categories from existing books
INSERT INTO public.categories (name)
SELECT DISTINCT category FROM public.books
WHERE category IS NOT NULL AND category != ''
ON CONFLICT (name) DO NOTHING;

-- Also seed predefined categories from code
INSERT INTO public.categories (name) VALUES
  ('Al-Qur''an'), ('Tajwid'), ('Tafsir'), ('Hafalan'),
  ('Hadits'), ('Syarah Hadits'), ('Fiqih'), ('Fiqih Wanita'),
  ('Muamalah'), ('Fara''idh'), ('Tauhid'), ('Aqidah'), ('Akhlak'),
  ('Doa'), ('Dzikir'), ('Shalat'), ('Puasa'), ('Zakat'), ('Haji & Umrah'),
  ('Sirah Nabawiyah'), ('Biografi Ulama'), ('Sejarah Islam'),
  ('Anak Muslim'), ('Cerita Nabi'), ('Pendidikan Islam'),
  ('Bahasa Arab'), ('Imla'''), ('Nahwu & Shorof'),
  ('Keluarga Muslim'), ('Pernikahan'), ('Parenting Islami'),
  ('Kajian Islam'), ('Khutbah & Dakwah'),
  ('Fiksi'), ('Non-Fiksi'), ('Pendidikan'), ('Komik'), ('Referensi'), ('Lainnya')
ON CONFLICT (name) DO NOTHING;
