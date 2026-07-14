// Kompresi gambar client-side via Canvas API
// Output selalu JPEG
// 1. Resize dulu ke maxLongSide biar dimensi turun
// 2. Turunin quality JPEG sampe ≤ maxKB
// 3. Kalo masih > maxKB di q=0.1, baru resize lebih kecil (min 600px)

export async function compressImage(
  file: File | Blob,
  maxKB = 200,
  /** Maksimum pixel di sisi terpanjang. Default 1200 — HD buat retina. */
  maxLongSide = 1200
): Promise<Blob> {
  // Udah di bawah limit? balikin apa adanya
  if (file.size <= maxKB * 1024) return file;

  const img = new Image();
  const url = URL.createObjectURL(file);
  try {
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Gagal load gambar"));
      img.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }

  // ── Step 0: hitung target dimensi (maxLongSide) ──
  const ow = img.naturalWidth;
  const oh = img.naturalHeight;
  const long = Math.max(ow, oh);
  let targetW: number, targetH: number;

  if (long > maxLongSide) {
    const s = maxLongSide / long;
    targetW = Math.round(ow * s);
    targetH = Math.round(oh * s);
  } else {
    targetW = ow;
    targetH = oh;
  }

  let blob: Blob = file;

  // ── Step 1: turunin quality (0.9 → 0.1) ──
  for (let q = 0.9; q >= 0.1; q -= 0.1) {
    if (blob.size <= maxKB * 1024) break;
    const canvas = document.createElement("canvas");
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext("2d");
    if (!ctx) break;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, targetW, targetH);
    // imageSmoothingEnabled true by default — biar downscale halus
    ctx.drawImage(img, 0, 0, targetW, targetH);

    blob = await new Promise<Blob>((resolve) => {
      canvas.toBlob(
        (b) => resolve(b || file),
        "image/jpeg",
        q
      );
    });
  }

  // ── Step 2: kalo MASIH > maxKB di q=0.1, turunin dimensi ──
  let scale = 0.9;
  while (scale >= 0.1 && blob.size > maxKB * 1024) {
    const w = Math.round(targetW * scale);
    const h = Math.round(targetH * scale);
    // Gak boleh lebih kecil dari 600px di sisi terpanjang
    if (Math.max(w, h) < 600) break;

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) break;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);

    blob = await new Promise<Blob>((resolve) => {
      canvas.toBlob(
        (b) => resolve(b || file),
        "image/jpeg",
        0.7
      );
    });
    scale -= 0.1;
  }

  return blob;
}

// Extract R2 object key dari proxy URL
// "/api/cover/12345-abc.jpg" → "12345-abc.jpg"
export function extractKeyFromUrl(url: string): string | null {
  if (!url) return null;
  const match = url.match(/\/api\/cover\/(.+)$/);
  return match ? match[1] : null;
}

// Hapus foto lama dari R2 via API
export async function deleteCoverFromR2(url: string): Promise<boolean> {
  const key = extractKeyFromUrl(url);
  if (!key) return false;
  try {
    const res = await fetch(`/api/cover/${key}`, { method: "DELETE" });
    return res.ok;
  } catch {
    return false;
  }
}
