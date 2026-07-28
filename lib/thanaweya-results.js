/**
 * نتيجة الثانوية العامة (نظام حديث) — بحث برقم الجلوس من ملف TSV مضغوط.
 */
import fs from "fs";
import path from "path";
import zlib from "zlib";
import readline from "readline";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_GZ = path.join(__dirname, "..", "data", "thanaweya-2026.tsv.gz");

let resultsMap = null;
let loading = null;
let loadError = null;

function parseDegree(raw) {
  if (raw == null || raw === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

async function loadFromGzip() {
  if (!fs.existsSync(DATA_GZ)) {
    throw new Error("ملف النتائج غير موجود: " + DATA_GZ);
  }
  const map = new Map();
  const stream = fs.createReadStream(DATA_GZ).pipe(zlib.createGunzip());
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
  for await (const line of rl) {
    if (!line) continue;
    const parts = line.split("\t");
    if (parts.length < 4) continue;
    const seat = String(parts[0]).trim();
    if (!seat) continue;
    map.set(seat, {
      name: parts[1] || "",
      total: parseDegree(parts[2]),
      status: parts[3] || "",
    });
  }
  resultsMap = map;
}

export function ensureThanaweyaLoaded() {
  if (resultsMap) return Promise.resolve();
  if (loadError) return Promise.reject(loadError);
  if (!loading) {
    loading = loadFromGzip()
      .catch((err) => {
        loadError = err;
        loading = null;
        throw err;
      })
      .then(() => {
        loading = null;
      });
  }
  return loading;
}

export function thanaweyaReady() {
  return Boolean(resultsMap);
}

export function thanaweyaCount() {
  return resultsMap ? resultsMap.size : 0;
}

export async function lookupThanaweyaBySeat(rawSeat) {
  await ensureThanaweyaLoaded();
  const seat = String(rawSeat || "").trim().replace(/[^\d]/g, "");
  if (!seat) return null;
  const row = resultsMap.get(seat);
  if (!row) return null;
  const MAX_TOTAL = 320;
  const total = row.total;
  const percentage =
    total == null || !Number.isFinite(Number(total))
      ? null
      : Math.round((Number(total) / MAX_TOTAL) * 10000) / 100;
  return {
    seating_no: seat,
    arabic_name: row.name,
    total_degree: total,
    max_total: MAX_TOTAL,
    percentage,
    student_case_desc: row.status,
  };
}

export function preloadThanaweyaResults() {
  ensureThanaweyaLoaded().catch((err) => {
    console.warn("  ⚠️  تعذر تحميل نتائج الثانوية:", err.message);
  });
}
