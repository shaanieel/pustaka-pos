// Kompresi gambar client-side via Canvas API — stepwise downscaling
// Output selalu JPEG
// 1. Stepwise resize ke maxLongSide (turun 50% tiap langkah)
// 2. Turunin quality JPEG sampe ≤ maxKB
// 3. Stepwise = hasil resize jauh lebih tajam

export async function compressImage(
  file: File | Blob,
  maxKB = 500,
  /** Maksimum pixel di sisi terpanjang. Default 1200 — HD retina. */
  maxLongSide = 1200
): Promise<Blob> {
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

  // ── Step 0: hitung target dimensi ──
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

  // ── Stepwise downscale untuk hasil tajam ──
  // Turunin resolusi bertahap (maks 50% tiap langkah) biar ga soft
  function stepwiseResize(
    source: HTMLImageElement | HTMLCanvasElement,
    finalW: number,
    finalH: number
  ): HTMLCanvasElement {
    let srcW =
      source instanceof HTMLImageElement
        ? source.naturalWidth || source.width
        : source.width;
    let srcH =
      source instanceof HTMLImageElement
        ? source.naturalHeight || source.height
        : source.height;

    let src: HTMLImageElement | HTMLCanvasElement = source;

    while (srcW > finalW * 1.5 || srcH > finalH * 1.5) {
      // Turunin 50% atau sampe target, mana yg lebih besar
      const nextW = Math.max(Math.round(srcW / 2), finalW);
      const nextH = Math.max(Math.round(srcH / 2), finalH);

      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = nextW;
      tempCanvas.height = nextH;
      const tempCtx = tempCanvas.getContext("2d");
      if (!tempCtx) break;
      tempCtx.fillStyle = "#fff";
      tempCtx.fillRect(0, 0, nextW, nextH);
      tempCtx.drawImage(src, 0, 0, nextW, nextH);

      srcW = nextW;
      srcH = nextH;
      src = tempCanvas;
    }

    // Final draw ke target
    const finalCanvas = document.createElement("canvas");
    finalCanvas.width = finalW;
    finalCanvas.height = finalH;
    const finalCtx = finalCanvas.getContext("2d");
    if (finalCtx) {
      finalCtx.fillStyle = "#fff";
      finalCtx.fillRect(0, 0, finalW, finalH);
      finalCtx.drawImage(src, 0, 0, finalW, finalH);
    }
    return finalCanvas;
  }

  const resizedCanvas = stepwiseResize(img, targetW, targetH);

  // ── Step 1: turunin quality (0.95 → 0.1) ──
  let blob: Blob = file;
  for (let q = 0.95; q >= 0.1; q -= 0.05) {
    if (blob.size <= maxKB * 1024) break;

    blob = await new Promise<Blob>((resolve) => {
      resizedCanvas.toBlob(
        (b) => resolve(b || file),
        "image/jpeg",
        Math.round(q * 100) / 100
      );
    });
  }

  // ── Step 2: kalo MASIH > maxKB di q=0.1, turunin dimensi ──
  let scale = 0.9;
  while (scale >= 0.1 && blob.size > maxKB * 1024) {
    const w = Math.round(targetW * scale);
    const h = Math.round(targetH * scale);
    if (Math.max(w, h) < 600) break;

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) break;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(resizedCanvas, 0, 0, w, h);

    blob = await new Promise<Blob>((resolve) => {
      canvas.toBlob(
        (b) => resolve(b || file),
        "image/jpeg",
        0.75
      );
    });
    scale -= 0.1;
  }

  return blob;
}

// Extract R2 object key dari proxy URL
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
