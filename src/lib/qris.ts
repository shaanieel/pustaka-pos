// QRIS Core — Parse, Convert, Validate, CRC16
// Ported from verssache/qris-dinamis (MIT)

/** CRC16-CCITT: poly=0x1021, init=0xFFFF */
function calculateCRC16(str: string): string {
  let crc = 0xffff;
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if (crc & 0x8000) crc = ((crc << 1) ^ 0x1021) & 0xffff;
      else crc = (crc << 1) & 0xffff;
    }
  }
  return (crc & 0xffff).toString(16).toUpperCase().padStart(4, "0");
}

interface TLV {
  tag: string;
  length: number;
  value: string;
  children?: TLV[];
}

/** Parse TLV dari QRIS string */
function parseTLV(data: string): TLV[] {
  const elements: TLV[] = [];
  let pos = 0;
  const nestedTags = new Set([
    ...Array.from({ length: 26 }, (_, i) => String(i + 26).padStart(2, "0")),
    "62",
  ]);

  while (pos < data.length) {
    if (pos + 4 > data.length) break;
    const tag = data.substring(pos, pos + 2);
    const length = parseInt(data.substring(pos + 2, pos + 4), 10);
    if (isNaN(length) || pos + 4 + length > data.length) break;

    const value = data.substring(pos + 4, pos + 4 + length);
    const el: TLV = { tag, length, value };
    if (nestedTags.has(tag)) el.children = parseTLV(value);

    elements.push(el);
    pos += 4 + length;
  }
  return elements;
}

/** Build TLV back to string */
function buildTLVString(elements: TLV[]): string {
  return elements
    .map((el) => {
      const value = el.children ? buildTLVString(el.children) : el.value;
      const len = value.length.toString().padStart(2, "0");
      return `${el.tag}${len}${value}`;
    })
    .join("");
}

export interface QRISInfo {
  merchantName: string;
  merchantCity: string;
  amount: number | null;
  method: "static" | "dynamic";
}

/** Parse + validasi, return info */
export function parseQRIS(qrisString: string): QRISInfo & { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!qrisString || qrisString.trim().length === 0)
    return { valid: false, errors: ["Empty string"], merchantName: "", merchantCity: "", amount: null, method: "static" };

  const str = qrisString.trim();
  if (!str.startsWith("000201")) errors.push('Must start with "000201"');
  if (str.length < 20) errors.push("Too short");

  const dataWithoutCRC = str.substring(0, str.length - 4);
  const declaredCRC = str.substring(str.length - 4);
  const calculatedCRC = calculateCRC16(dataWithoutCRC);
  if (declaredCRC.toUpperCase() !== calculatedCRC) {
    errors.push(`CRC mismatch: expected ${calculatedCRC}, got ${declaredCRC.toUpperCase()}`);
  }

  const elements = parseTLV(str);
  const find = (tag: string) => elements.find((t) => t.tag === tag);
  const methodVal = find("01")?.value;
  const amountEl = find("54");

  return {
    valid: errors.length === 0,
    errors,
    method: methodVal === "12" ? "dynamic" : "static",
    merchantName: find("59")?.value ?? "",
    merchantCity: find("60")?.value ?? "",
    amount: amountEl ? parseInt(amountEl.value, 10) || null : null,
  };
}

/**
 * Convert QRIS statis → dinamis dengan amount tertentu
 * @param qrisString QRIS statis string
 * @param amount Nominal dalam Rupiah
 * @returns QRIS dinamis string
 */
export function convertQRIS(qrisString: string, amount: number): string {
  const elements = parseTLV(qrisString);
  const result: TLV[] = [];
  let amountInserted = false;

  for (const el of elements) {
    // Skip tag 01 (method), 54 (amount), 62 (additional), 63 (CRC) — kita handle manual
    if (["01", "54", "62", "63"].includes(el.tag)) continue;

    // Ubah static → dynamic
    if (el.tag === "01") {
      result.push({ tag: "01", length: 2, value: "12" });
      continue;
    }

    // Inject amount sebelum Country Code (58)
    if (el.tag === "58" && !amountInserted) {
      const amountStr = Math.round(amount).toString();
      result.push({ tag: "54", length: amountStr.length, value: amountStr });
      amountInserted = true;
    }

    result.push(el);
  }

  // Build dan hitung CRC
  const withoutCRC = buildTLVString(result);
  const crcInput = withoutCRC + "6304";
  const crc = calculateCRC16(crcInput);
  return crcInput + crc;
}

/** QRIS static BOSSS — Zaeinstore GoPay Merchant */
export const QRIS_STATIC = "00020101021126610014COM.GO-JEK.WWW01189360091437383523490210G7383523490303UMI51440014ID.CO.QRIS.WWW0215ID10254523578390303UMI5204566153033605802ID5923ZAEINSTORE, Toko Sepatu6007BANDUNG61054091262070703A016304C9C8";

/** Generate kode unik 2 digit */
export function generateKodeUnik(): number {
  return Math.floor(Math.random() * 90) + 10; // 10–99
}
