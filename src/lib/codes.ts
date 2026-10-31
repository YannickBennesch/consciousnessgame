import { randomInt } from "node:crypto";
import JSZip from "jszip";
import QRCode from "qrcode";
import { db } from "./db";

// No 0/O, 1/I/L. 31 symbols ^ 10 ≈ 8.2e14 possibilities.
export const CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
export const CODE_LENGTH = 10;

export function generateCode(): string {
  let out = "";
  for (let i = 0; i < CODE_LENGTH; i++) out += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  return out;
}

/** Accepts any casing, spaces or dashes. */
export function normalizeCode(input: string): string {
  return input.toUpperCase().replace(/[\s-]/g, "");
}

export function isWellFormed(code: string): boolean {
  return code.length === CODE_LENGTH && [...code].every((c) => CODE_ALPHABET.includes(c));
}

/** K7QXM4RT2W -> K7QX-M4RT-2W */
export function formatCode(code: string): string {
  return code.match(/.{1,4}/g)?.join("-") ?? code;
}

export function codeUrl(code: string): string {
  const base = process.env.APP_URL ?? "http://localhost:3000";
  return `${base.replace(/\/$/, "")}/play?code=${formatCode(code)}`;
}

export async function createBatch(series: string, count: number, note?: string) {
  if (!Number.isInteger(count) || count < 1 || count > 5000) throw new Error("count must be 1..5000");
  const codes = new Set<string>();
  while (codes.size < count) codes.add(generateCode());
  // Retry the (vanishingly rare) collision with an existing code.
  const existing = await db.playerCode.findMany({ where: { code: { in: [...codes] } }, select: { code: true } });
  for (const { code } of existing) {
    codes.delete(code);
    let fresh = generateCode();
    while (codes.has(fresh)) fresh = generateCode();
    codes.add(fresh);
  }
  return db.codeBatch.create({
    data: {
      series,
      count,
      note: note || null,
      codes: { create: [...codes].map((code) => ({ code, series })) },
    },
  });
}

export async function batchCsv(batchId: string): Promise<string> {
  const codes = await db.playerCode.findMany({ where: { batchId }, orderBy: { code: "asc" } });
  const rows = codes.map((c) => `${formatCode(c.code)},${codeUrl(c.code)}`);
  return ["code,url", ...rows].join("\n") + "\n";
}

/** One SVG per code: QR plus the code printed under it. 30 mm wide at print size. */
export async function qrSvg(code: string): Promise<string> {
  const qr = await QRCode.toString(codeUrl(code), { type: "svg", margin: 1, errorCorrectionLevel: "M" });
  const inner = qr.replace(/^<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "");
  const viewBox = qr.match(/viewBox="([^"]+)"/)?.[1] ?? "0 0 33 33";
  const size = Number(viewBox.split(" ")[2]);
  const h = size + 6;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="30mm" height="${(30 * h) / size}mm" viewBox="0 0 ${size} ${h}">
<svg x="0" y="0" width="${size}" height="${size}" viewBox="${viewBox}">${inner}</svg>
<text x="${size / 2}" y="${size + 4.2}" text-anchor="middle" font-family="DejaVu Sans Mono, Menlo, monospace" font-size="3.6" letter-spacing="0.2">${formatCode(code)}</text>
</svg>`;
}

export async function batchZip(batchId: string): Promise<Buffer> {
  const codes = await db.playerCode.findMany({ where: { batchId }, orderBy: { code: "asc" } });
  const zip = new JSZip();
  for (const c of codes) zip.file(`${formatCode(c.code)}.svg`, await qrSvg(c.code));
  zip.file("codes.csv", await batchCsv(batchId));
  return zip.generateAsync({ type: "nodebuffer" });
}
