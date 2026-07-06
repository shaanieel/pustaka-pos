"""
Seed database: genres, subgenres, book_genres tables
"""
import os
import json
from supabase import create_client

SUPABASE_URL = "https://qzlsccxuokfzwdlqrohx.supabase.co"
SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF6bHNjY3h1b2tmendkbHFyb2h4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjY2MjYwNywiZXhwIjoyMDk4MjM4NjA3fQ.YJpieTzfT9uhN1Dyd6JXOiqBSXlprIsJNieZmaFHK3g"

supabase = create_client(SUPABASE_URL, SERVICE_KEY)

# ========== 12 GENRES with SUBGENRES from store ==========
GENRE_DATA = [
    {
        "name": "Al-Qur'an & Mushaf",
        "slug": "al-quran-mushaf",
        "icon": "BookOpen",
        "sort": 1,
        "subs": [
            "Mushaf Standar", "Mushaf Terjemah", "Mushaf Tajwid",
            "Mushaf Hafalan", "Juz Amma & Iqro"
        ]
    },
    {
        "name": "Buku Anak Pondok",
        "slug": "buku-anak-pondok",
        "icon": "School",
        "sort": 2,
        "subs": [
            "Kelas 7", "Kelas 8", "Kelas 9",
            "Kelas 10", "Kelas 11", "Kelas 12"
        ]
    },
    {
        "name": "Buku Pelajaran",
        "slug": "buku-pelajaran",
        "icon": "GraduationCap",
        "sort": 3,
        "subs": [
            "SD / MI", "SMP / MTs", "SMA / MA", "Perguruan Tinggi"
        ]
    },
    {
        "name": "Kitab Kuning & Klasik",
        "slug": "kitab-kuning-klasik",
        "icon": "BookMarked",
        "sort": 4,
        "subs": [
            "Fiqih", "Aqidah", "Nahwu & Sharaf", "Hadits",
            "Tafsir", "Buku Saku Matan", "Kumpulan Doa & Dzikir"
        ]
    },
    {
        "name": "Buku Bacaan",
        "slug": "buku-bacaan",
        "icon": "BookText",
        "sort": 5,
        "subs": [
            "Motivasi & Pengembangan Diri", "Biografi Tokoh",
            "Sejarah Islam", "Sastra Islami"
        ]
    },
    {
        "name": "Buku Bacaan Anak",
        "slug": "buku-bacaan-anak",
        "icon": "Baby",
        "sort": 6,
        "subs": [
            "Cerita Nabi untuk Anak", "Kisah Sahabat",
            "Buku Aktivitas Anak", "Board Book Balita"
        ]
    },
    {
        "name": "Novel",
        "slug": "novel",
        "icon": "BookHeart",
        "sort": 7,
        "subs": [
            "Novel Islami", "Novel Remaja",
            "Novel Inspiratif", "Novel Sejarah"
        ]
    },
    {
        "name": "Komik",
        "slug": "komik",
        "icon": "Palette",
        "sort": 8,
        "subs": [
            "Komik Nabi & Rasul", "Komik Sahabat",
            "Komik Edukasi Anak", "Komik Akhlak"
        ]
    },
    {
        "name": "Herbal & Kesehatan",
        "slug": "herbal-kesehatan",
        "icon": "HeartPulse",
        "sort": 9,
        "subs": [
            "Madu & Habbatussauda", "Minyak Zaitun", "Herbal Sunnah"
        ]
    },
    {
        "name": "Elektronik",
        "slug": "elektronik",
        "icon": "Headphones",
        "sort": 10,
        "subs": [
            "Speaker Al-Qur'an", "E-Pen Qur'an", "Aksesoris"
        ]
    },
    {
        "name": "E-Book Digital",
        "slug": "e-book-digital",
        "icon": "Tablet",
        "sort": 11,
        "subs": [
            "E-Book Ibadah", "E-Book Anak", "E-Book Kajian"
        ]
    },
    {
        "name": "Film",
        "slug": "film",
        "icon": "Film",
        "sort": 12,
        "subs": [
            "Film Islami", "Film Anak Muslim",
            "Film Dokumenter", "Kajian Video"
        ]
    },
]

# ========== Step 1: Create tables via raw SQL ==========
print("📦 Creating tables...")
sql = """
-- GENRES table
CREATE TABLE IF NOT EXISTS public.genres (
    id serial PRIMARY KEY,
    name text NOT NULL,
    slug text UNIQUE NOT NULL,
    icon text,
    sort_order int NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- SUBGENRES table
CREATE TABLE IF NOT EXISTS public.subgenres (
    id serial PRIMARY KEY,
    genre_id int NOT NULL REFERENCES public.genres(id) ON DELETE CASCADE,
    name text NOT NULL,
    slug text NOT NULL,
    sort_order int NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(genre_id, slug)
);

-- BOOK_GENRES junction table (many-to-many)
CREATE TABLE IF NOT EXISTS public.book_genres (
    book_id uuid NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
    subgenre_id int NOT NULL REFERENCES public.subgenres(id) ON DELETE CASCADE,
    PRIMARY KEY (book_id, subgenre_id)
);

-- GRANTS
GRANT SELECT ON public.genres TO anon, authenticated;
GRANT SELECT ON public.subgenres TO anon, authenticated;
GRANT SELECT ON public.book_genres TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.genres TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.subgenres TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.book_genres TO authenticated;
GRANT ALL ON public.genres TO service_role;
GRANT ALL ON public.subgenres TO service_role;
GRANT ALL ON public.book_genres TO service_role;

-- RLS for genres
ALTER TABLE public.genres ENABLE ROW LEVEL SECURITY;
CREATE POLICY "genres_select_all" ON public.genres FOR SELECT USING (true);
CREATE POLICY "genres_modify_auth" ON public.genres FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

ALTER TABLE public.subgenres ENABLE ROW LEVEL SECURITY;
CREATE POLICY "subgenres_select_all" ON public.subgenres FOR SELECT USING (true);
CREATE POLICY "subgenres_modify_auth" ON public.subgenres FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

ALTER TABLE public.book_genres ENABLE ROW LEVEL SECURITY;
CREATE POLICY "book_genres_select_all" ON public.book_genres FOR SELECT USING (true);
CREATE POLICY "book_genres_modify_auth" ON public.book_genres FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
"""

try:
    r = supabase.rpc('exec_sql', {'sql': sql}).execute()
    print("Tables created:", r)
except Exception as e:
    print(f"rpc exec_sql not available, trying REST: {e}")

# ========== Step 2: Seed genres & subgenres ==========
print("\n🌱 Seeding genres + subgenres...")

# Check if already seeded
existing = supabase.table("genres").select("id", count="exact").execute()
if existing.count and existing.count > 0:
    print(f"  Already has {existing.count} genres, clearing first...")
    supabase.table("book_genres").delete().neq("book_id", "00000000-0000-0000-0000-000000000000").execute()
    supabase.table("subgenres").delete().neq("id", 0).execute()
    supabase.table("genres").delete().neq("id", 0).execute()

for g in GENRE_DATA:
    # Insert genre
    genre_r = supabase.table("genres").insert({
        "name": g["name"],
        "slug": g["slug"],
        "icon": g["icon"],
        "sort_order": g["sort"]
    }).execute()
    genre_id = genre_r.data[0]["id"]
    print(f"  ✅ Genre: {g['name']} (id={genre_id})")

    # Insert subgenres
    for i, sub in enumerate(g["subs"]):
        sub_slug = sub.lower().replace(" ", "-").replace("/", "-").replace("&", "dan").replace("'", "")
        supabase.table("subgenres").insert({
            "genre_id": genre_id,
            "name": sub,
            "slug": sub_slug,
            "sort_order": i + 1
        }).execute()
    print(f"       {len(g['subs'])} subgenres seeded")

# ========== Step 3: Verify ==========
print("\n📊 Verification:")
genres = supabase.table("genres").select("id,name", count="exact").execute()
subs = supabase.table("subgenres").select("id", count="exact").execute()
print(f"  Genres: {genres.count}")
print(f"  Subgenres: {subs.count}")

print("\n🎉 DONE!")
