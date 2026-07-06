-- =============================================================
-- RUN THIS IN SUPABASE SQL EDITOR:
-- https://supabase.com/dashboard/project/qzlsccxuokfzwdlqrohx/sql/new
-- =============================================================

-- 1. GENRES TABLE
CREATE TABLE IF NOT EXISTS public.genres (
    id serial PRIMARY KEY,
    name text NOT NULL,
    slug text UNIQUE NOT NULL,
    icon text,
    sort_order int NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.genres ENABLE ROW LEVEL SECURITY;
CREATE POLICY "genres_select_all" ON public.genres FOR SELECT USING (true);
CREATE POLICY "genres_modify_auth" ON public.genres FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

GRANT SELECT ON public.genres TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.genres TO authenticated;
GRANT ALL ON public.genres TO service_role;

-- 2. SUBGENRES TABLE
CREATE TABLE IF NOT EXISTS public.subgenres (
    id serial PRIMARY KEY,
    genre_id int NOT NULL REFERENCES public.genres(id) ON DELETE CASCADE,
    name text NOT NULL,
    slug text NOT NULL,
    sort_order int NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(genre_id, slug)
);

ALTER TABLE public.subgenres ENABLE ROW LEVEL SECURITY;
CREATE POLICY "subgenres_select_all" ON public.subgenres FOR SELECT USING (true);
CREATE POLICY "subgenres_modify_auth" ON public.subgenres FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

GRANT SELECT ON public.subgenres TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.subgenres TO authenticated;
GRANT ALL ON public.subgenres TO service_role;

-- 3. BOOK_GENRES JUNCTION TABLE (many-to-many)
CREATE TABLE IF NOT EXISTS public.book_genres (
    book_id uuid NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
    subgenre_id int NOT NULL REFERENCES public.subgenres(id) ON DELETE CASCADE,
    PRIMARY KEY (book_id, subgenre_id)
);

ALTER TABLE public.book_genres ENABLE ROW LEVEL SECURITY;
CREATE POLICY "book_genres_select_all" ON public.book_genres FOR SELECT USING (true);
CREATE POLICY "book_genres_modify_auth" ON public.book_genres FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

GRANT SELECT ON public.book_genres TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.book_genres TO authenticated;
GRANT ALL ON public.book_genres TO service_role;

-- =============================================================
-- 4. SEED 12 GENRES + 60+ SUBGENRES
-- =============================================================

-- Al-Qur'an & Mushaf
INSERT INTO public.genres (name, slug, icon, sort_order) VALUES ('Al-Qur''an & Mushaf', 'al-quran-mushaf', 'BookOpen', 1);
WITH g AS (SELECT id FROM public.genres WHERE slug = 'al-quran-mushaf')
INSERT INTO public.subgenres (genre_id, name, slug, sort_order) VALUES
((SELECT id FROM g), 'Mushaf Standar', 'mushaf-standar', 1),
((SELECT id FROM g), 'Mushaf Terjemah', 'mushaf-terjemah', 2),
((SELECT id FROM g), 'Mushaf Tajwid', 'mushaf-tajwid', 3),
((SELECT id FROM g), 'Mushaf Hafalan', 'mushaf-hafalan', 4),
((SELECT id FROM g), 'Juz Amma & Iqro', 'juz-amma-dan-iqro', 5);

-- Buku Anak Pondok
INSERT INTO public.genres (name, slug, icon, sort_order) VALUES ('Buku Anak Pondok', 'buku-anak-pondok', 'School', 2);
WITH g AS (SELECT id FROM public.genres WHERE slug = 'buku-anak-pondok')
INSERT INTO public.subgenres (genre_id, name, slug, sort_order) VALUES
((SELECT id FROM g), 'Kelas 7', 'kelas-7', 1),
((SELECT id FROM g), 'Kelas 8', 'kelas-8', 2),
((SELECT id FROM g), 'Kelas 9', 'kelas-9', 3),
((SELECT id FROM g), 'Kelas 10', 'kelas-10', 4),
((SELECT id FROM g), 'Kelas 11', 'kelas-11', 5),
((SELECT id FROM g), 'Kelas 12', 'kelas-12', 6);

-- Buku Pelajaran
INSERT INTO public.genres (name, slug, icon, sort_order) VALUES ('Buku Pelajaran', 'buku-pelajaran', 'GraduationCap', 3);
WITH g AS (SELECT id FROM public.genres WHERE slug = 'buku-pelajaran')
INSERT INTO public.subgenres (genre_id, name, slug, sort_order) VALUES
((SELECT id FROM g), 'SD / MI', 'sd-mi', 1),
((SELECT id FROM g), 'SMP / MTs', 'smp-mts', 2),
((SELECT id FROM g), 'SMA / MA', 'sma-ma', 3),
((SELECT id FROM g), 'Perguruan Tinggi', 'perguruan-tinggi', 4);

-- Kitab Kuning & Klasik
INSERT INTO public.genres (name, slug, icon, sort_order) VALUES ('Kitab Kuning & Klasik', 'kitab-kuning-klasik', 'BookMarked', 4);
WITH g AS (SELECT id FROM public.genres WHERE slug = 'kitab-kuning-klasik')
INSERT INTO public.subgenres (genre_id, name, slug, sort_order) VALUES
((SELECT id FROM g), 'Fiqih', 'fiqih', 1),
((SELECT id FROM g), 'Aqidah', 'aqidah', 2),
((SELECT id FROM g), 'Nahwu & Sharaf', 'nahwu-dan-sharaf', 3),
((SELECT id FROM g), 'Hadits', 'hadits', 4),
((SELECT id FROM g), 'Tafsir', 'tafsir', 5),
((SELECT id FROM g), 'Buku Saku Matan', 'buku-saku-matan', 6),
((SELECT id FROM g), 'Kumpulan Doa & Dzikir', 'kumpulan-doa-dan-dzikir', 7);

-- Buku Bacaan
INSERT INTO public.genres (name, slug, icon, sort_order) VALUES ('Buku Bacaan', 'buku-bacaan', 'BookText', 5);
WITH g AS (SELECT id FROM public.genres WHERE slug = 'buku-bacaan')
INSERT INTO public.subgenres (genre_id, name, slug, sort_order) VALUES
((SELECT id FROM g), 'Motivasi & Pengembangan Diri', 'motivasi-dan-pengembangan-diri', 1),
((SELECT id FROM g), 'Biografi Tokoh', 'biografi-tokoh', 2),
((SELECT id FROM g), 'Sejarah Islam', 'sejarah-islam', 3),
((SELECT id FROM g), 'Sastra Islami', 'sastra-islami', 4);

-- Buku Bacaan Anak
INSERT INTO public.genres (name, slug, icon, sort_order) VALUES ('Buku Bacaan Anak', 'buku-bacaan-anak', 'Baby', 6);
WITH g AS (SELECT id FROM public.genres WHERE slug = 'buku-bacaan-anak')
INSERT INTO public.subgenres (genre_id, name, slug, sort_order) VALUES
((SELECT id FROM g), 'Cerita Nabi untuk Anak', 'cerita-nabi-untuk-anak', 1),
((SELECT id FROM g), 'Kisah Sahabat', 'kisah-sahabat', 2),
((SELECT id FROM g), 'Buku Aktivitas Anak', 'buku-aktivitas-anak', 3),
((SELECT id FROM g), 'Board Book Balita', 'board-book-balita', 4);

-- Novel
INSERT INTO public.genres (name, slug, icon, sort_order) VALUES ('Novel', 'novel', 'BookHeart', 7);
WITH g AS (SELECT id FROM public.genres WHERE slug = 'novel')
INSERT INTO public.subgenres (genre_id, name, slug, sort_order) VALUES
((SELECT id FROM g), 'Novel Islami', 'novel-islami', 1),
((SELECT id FROM g), 'Novel Remaja', 'novel-remaja', 2),
((SELECT id FROM g), 'Novel Inspiratif', 'novel-inspiratif', 3),
((SELECT id FROM g), 'Novel Sejarah', 'novel-sejarah', 4);

-- Komik
INSERT INTO public.genres (name, slug, icon, sort_order) VALUES ('Komik', 'komik', 'Palette', 8);
WITH g AS (SELECT id FROM public.genres WHERE slug = 'komik')
INSERT INTO public.subgenres (genre_id, name, slug, sort_order) VALUES
((SELECT id FROM g), 'Komik Nabi & Rasul', 'komik-nabi-dan-rasul', 1),
((SELECT id FROM g), 'Komik Sahabat', 'komik-sahabat', 2),
((SELECT id FROM g), 'Komik Edukasi Anak', 'komik-edukasi-anak', 3),
((SELECT id FROM g), 'Komik Akhlak', 'komik-akhlak', 4);

-- Herbal & Kesehatan
INSERT INTO public.genres (name, slug, icon, sort_order) VALUES ('Herbal & Kesehatan', 'herbal-kesehatan', 'HeartPulse', 9);
WITH g AS (SELECT id FROM public.genres WHERE slug = 'herbal-kesehatan')
INSERT INTO public.subgenres (genre_id, name, slug, sort_order) VALUES
((SELECT id FROM g), 'Madu & Habbatussauda', 'madu-dan-habbatussauda', 1),
((SELECT id FROM g), 'Minyak Zaitun', 'minyak-zaitun', 2),
((SELECT id FROM g), 'Herbal Sunnah', 'herbal-sunnah', 3);

-- Elektronik
INSERT INTO public.genres (name, slug, icon, sort_order) VALUES ('Elektronik', 'elektronik', 'Headphones', 10);
WITH g AS (SELECT id FROM public.genres WHERE slug = 'elektronik')
INSERT INTO public.subgenres (genre_id, name, slug, sort_order) VALUES
((SELECT id FROM g), 'Speaker Al-Qur''an', 'speaker-al-quran', 1),
((SELECT id FROM g), 'E-Pen Qur''an', 'e-pen-quran', 2),
((SELECT id FROM g), 'Aksesoris', 'aksesoris', 3);

-- E-Book Digital
INSERT INTO public.genres (name, slug, icon, sort_order) VALUES ('E-Book Digital', 'e-book-digital', 'Tablet', 11);
WITH g AS (SELECT id FROM public.genres WHERE slug = 'e-book-digital')
INSERT INTO public.subgenres (genre_id, name, slug, sort_order) VALUES
((SELECT id FROM g), 'E-Book Ibadah', 'e-book-ibadah', 1),
((SELECT id FROM g), 'E-Book Anak', 'e-book-anak', 2),
((SELECT id FROM g), 'E-Book Kajian', 'e-book-kajian', 3);

-- Film
INSERT INTO public.genres (name, slug, icon, sort_order) VALUES ('Film', 'film', 'Film', 12);
WITH g AS (SELECT id FROM public.genres WHERE slug = 'film')
INSERT INTO public.subgenres (genre_id, name, slug, sort_order) VALUES
((SELECT id FROM g), 'Film Islami', 'film-islami', 1),
((SELECT id FROM g), 'Film Anak Muslim', 'film-anak-muslim', 2),
((SELECT id FROM g), 'Film Dokumenter', 'film-dokumenter', 3),
((SELECT id FROM g), 'Kajian Video', 'kajian-video', 4);
