-- Migration: Tambah kolom year ke tabel books
-- Copy-paste ke Supabase SQL Editor:
-- https://supabase.com/dashboard/project/qzlsccxuokfzwdlqrohx/sql/new
ALTER TABLE books ADD COLUMN IF NOT EXISTS year INT;
