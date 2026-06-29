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

// Mapping 3-huruf prefix per kategori
const CATEGORY_PREFIX_MAP: Record<string, string> = {
  "Al-Qur'an": "QRN",
  Tajwid: "TJW",
  Tafsir: "TFS",
  Hafalan: "HFL",
  Hadits: "HDT",
  "Syarah Hadits": "SYH",
  Fiqih: "FQH",
  "Fiqih Wanita": "FQW",
  Muamalah: "MUM",
  "Fara'idh": "FRD",
  Tauhid: "TWH",
  Aqidah: "AQD",
  Akhlak: "AKH",
  Doa: "DOA",
  Dzikir: "DZK",
  Shalat: "SHL",
  Puasa: "PSA",
  Zakat: "ZKT",
  "Haji & Umrah": "HJU",
  "Sirah Nabawiyah": "SRH",
  "Biografi Ulama": "BIO",
  "Sejarah Islam": "SJI",
  "Anak Muslim": "ANM",
  "Cerita Nabi": "CRN",
  "Pendidikan Islam": "PDI",
  "Bahasa Arab": "BSA",
  "Imla'": "IML",
  "Nahwu & Shorof": "NHW",
  "Keluarga Muslim": "KLM",
  Pernikahan: "PRN",
  "Parenting Islami": "PTI",
  "Kajian Islam": "KJI",
  "Khutbah & Dakwah": "KHD",
  Fiksi: "FKS",
  "Non-Fiksi": "NFK",
  Pendidikan: "PND",
  Komik: "KMK",
  Referensi: "REF",
  Lainnya: "LNN",
};

export function isPredefinedCategory(cat: string): boolean {
  return (BOOK_CATEGORIES as readonly string[]).includes(cat);
}

// Ambil 3 huruf prefix dari kategori
// Kalau predefined → pake mapping
// Kalau custom → ambil konsonan pertama, fallback ke huruf pertama
export function getCategoryPrefix(category: string): string {
  const mapped = CATEGORY_PREFIX_MAP[category];
  if (mapped) return mapped;

  // Custom category: ambil konsonan, skip spasi & simbol
  const cleaned = category.toUpperCase().replace(/[^A-Z]/g, "");
  const consonants = cleaned.replace(/[AEIOU]/g, "");
  const source = consonants.length >= 3 ? consonants : cleaned;
  return source.slice(0, 3).padEnd(3, "X");
}
