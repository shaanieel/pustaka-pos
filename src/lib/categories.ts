// Kategori buku — fokus buku agama Islam
// Digunakan di: Add Book, Edit Book, Pesanan Baru, Database Buku

export const BOOK_CATEGORIES = [
  // Agama — Al-Qur'an
  "Al-Qur'an",
  "Tajwid",
  "Tafsir",
  "Hafalan",

  // Agama — Hadits
  "Hadits",
  "Syarah Hadits",

  // Agama — Fiqih
  "Fiqih",
  "Fiqih Wanita",
  "Muamalah",
  "Fara'idh",

  // Agama — Aqidah
  "Tauhid",
  "Aqidah",
  "Akhlak",

  // Agama — Ibadah
  "Doa",
  "Dzikir",
  "Shalat",
  "Puasa",
  "Zakat",
  "Haji & Umrah",

  // Agama — Sejarah & Biografi
  "Sirah Nabawiyah",
  "Biografi Ulama",
  "Sejarah Islam",

  // Agama — Anak
  "Anak Muslim",
  "Cerita Nabi",
  "Pendidikan Islam",

  // Agama — Bahasa
  "Bahasa Arab",
  "Imla'",
  "Nahwu & Shorof",

  // Agama — Sosial
  "Keluarga Muslim",
  "Pernikahan",
  "Parenting Islami",
  "Kajian Islam",
  "Khutbah & Dakwah",

  // Umum
  "Fiksi",
  "Non-Fiksi",
  "Pendidikan",
  "Komik",
  "Referensi",
  "Lainnya",
] as const;

export function isPredefinedCategory(cat: string): boolean {
  return (BOOK_CATEGORIES as readonly string[]).includes(cat);
}
