// Kompresi gambar client-side via Canvas API
// Jika size > maxKB → kompres (turunin quality, lalu resize dimensi) sampai ≤ maxKB
// Jika size ≤ maxKB → return apa adanya
// Output selalu JPEG (kompresi terbaik)

export async function compressImage(
  file: File | Blob,
  maxKB = 200
): Promise<Blob> {
  // Sudah di bawah limit? return apa adanya
  if (file.size <= maxKB * 1024) return file;

  // Load image ke <img> element
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

  let blob: Blob = file;
  const originalW = img.naturalWidth;
  const originalH = img.naturalHeight;

  // Tahap 1: turunin quality JPEG (0.9 → 0.1)
  let quality = 0.9;
  while (quality >= 0.1 && blob.size > maxKB * 1024) {
    const canvas = document.createElement("canvas");
    canvas.width = originalW;
    canvas.height = originalH;
    const ctx = canvas.getContext("2d");
    if (!ctx) break;
    ctx.fillStyle = "#fff"; // white bg untuk PNG transparan
    ctx.fillRect(0, 0, originalW, originalH);
    ctx.drawImage(img, 0, 0);

    blob = await new Promise<Blob>((resolve) => {
      canvas.toBlob(
        (b) => resolve(b || file),
        "image/jpeg",
        quality
      );
    });
    quality -= 0.1;
  }

  // Tahap 2: kalau masih kebesaran, resize dimensi (90% → 10%)
  let scale = 0.9;
  while (scale >= 0.1 && blob.size > maxKB * 1024) {
    const w = Math.floor(originalW * scale);
    const h = Math.floor(originalH * scale);
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
