import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const HERE =
  typeof __dirname !== "undefined"
    ? __dirname
    : fileURLToPath(new URL(".", import.meta.url));

const KEY = "diksstore:data";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "diksstore120704";
const STORE_FILE = process.env.DATA_STORE_FILE || "";
const KV_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || "";
const KV_TOKEN =
  process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || "";

function kvBase() {
  return KV_URL.endsWith("/") ? KV_URL.slice(0, -1) : KV_URL;
}

function fileGet() {
  if (!STORE_FILE) return null;
  try {
    const s = fs.readFileSync(STORE_FILE, "utf8");
    return s ? s : null;
  } catch (e) {
    return null;
  }
}

function fileSet(val) {
  if (!STORE_FILE) throw new Error("Penyimpanan (KV/Redis) belum dikonfigurasi.");
  fs.writeFileSync(STORE_FILE, val, "utf8");
  return true;
}

async function kvGet() {
  if (STORE_FILE) return fileGet();
  if (!KV_URL || !KV_TOKEN) return null;
  const r = await fetch(kvBase() + "/get/" + KEY, {
    headers: { Authorization: "Bearer " + KV_TOKEN },
  });
  if (!r.ok) return null;
  const j = await r.json();
  if (j && j.error) throw new Error(j.error);
  return j && j.result ? j.result : null;
}

async function kvSet(val) {
  if (STORE_FILE) return fileSet(val);
  if (!KV_URL || !KV_TOKEN) throw new Error("Penyimpanan (KV/Redis) belum dikonfigurasi.");
  // Nilai dikirim sebagai path ber-URL-encode (bukan body JSON.stringify ulang),
  // supaya tersimpan sebagai teks mentah, bukan string JSON ter-double-encode.
  const r = await fetch(kvBase() + "/set/" + KEY + "/" + encodeURIComponent(val), {
    method: "POST",
    headers: { Authorization: "Bearer " + KV_TOKEN },
  });
  const j = await r.json();
  if (!r.ok || (j && j.error)) {
    throw new Error(j && j.error ? j.error : "Gagal menyimpan (HTTP " + r.status + ")");
  }
  return true;
}

function readSeed() {
  const candidates = [
    path.join(HERE, "data.json"),
    path.resolve(process.cwd(), "data.json"),
    path.join(HERE, "..", "data.json"),
  ];
  for (const p of candidates) {
    try {
      return JSON.parse(fs.readFileSync(p, "utf8"));
    } catch (e) {
      /* coba lokasi berikutnya */
    }
  }
  return { wa: "6283847105847", layanan: [] };
}

// Tahan-banting: nilai lama yang ter-double-encode / hasil parse aneh
// diurai berulang sampai jadi objek, jika gagal kembalikan null.
function parseStored(s) {
  var v = s;
  for (var i = 0; i < 3; i++) {
    if (typeof v === "object" && v !== null) return v;
    if (typeof v !== "string") return null;
    try {
      v = JSON.parse(v);
    } catch (e) {
      return null;
    }
  }
  return v;
}

function validate(d) {
  if (!d || typeof d !== "object") return "Data harus berupa objek.";
  if (typeof d.wa !== "string" || !/^[0-9]{6,15}$/.test(d.wa)) {
    return "Field wa harus berupa nomor WA (angka).";
  }
  if (!Array.isArray(d.layanan)) return "Field layanan harus array.";
  for (const s of d.layanan) {
    if (!s || typeof s !== "object" || !s.id || !s.nama) {
      return "Setiap layanan wajib punya id dan nama.";
    }
    if (!Array.isArray(s.grup)) return "Layanan " + s.id + " wajib punya array grup.";
    for (const g of s.grup) {
      if (!g || typeof g !== "object" || typeof g.judul !== "string") {
        return "Grup di layanan " + s.id + " wajib punya judul.";
      }
      if (!Array.isArray(g.paket)) return "Grup " + g.judul + " wajib punya array paket.";
      for (const p of g.paket) {
        if (!p || typeof p.label !== "string" || typeof p.pesan !== "string") {
          return "Paket di grup " + g.judul + " wajib punya label dan pesan.";
        }
      }
    }
  }
  return null;
}

export default async function handler(req, res) {
  const enabledCors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, x-admin-password",
  };

  if (req.method === "OPTIONS") {
    res.writeHead(204, enabledCors);
    return res.end();
  }

  if (req.method === "GET") {
    try {
      const stored = await kvGet();
      const data = (stored && parseStored(stored)) || readSeed();
      res.writeHead(200, {
        ...enabledCors,
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "public, max-age=0, s-maxage=30",
      });
      return res.end(JSON.stringify(data));
    } catch (err) {
      res.writeHead(500, {
        ...enabledCors,
        "Content-Type": "application/json; charset=utf-8",
      });
      return res.end(JSON.stringify({ error: String(err && err.message || err) }));
    }
  }

  if (req.method === "POST") {
    const auth = req.headers["x-admin-password"];
    if (auth !== ADMIN_PASSWORD) {
      res.writeHead(401, { ...enabledCors, "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: "Password salah." }));
    }
    let body = "";
    for await (const chunk of req) body += chunk;
    let data;
    try {
      data = JSON.parse(body);
    } catch (e) {
      res.writeHead(400, { ...enabledCors, "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: "JSON tidak valid." }));
    }
    if (data && data.__check === true) {
      res.writeHead(200, { ...enabledCors, "Content-Type": "application/json" });
      return res.end(JSON.stringify({ ok: true }));
    }
    const err = validate(data);
    if (err) {
      res.writeHead(400, { ...enabledCors, "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: err }));
    }
    try {
      await kvSet(JSON.stringify(data));
      res.writeHead(200, { ...enabledCors, "Content-Type": "application/json" });
      return res.end(JSON.stringify({ ok: true }));
    } catch (e) {
      res.writeHead(500, {
        ...enabledCors,
        "Content-Type": "application/json",
      });
      return res.end(JSON.stringify({ error: String(e && e.message || e) }));
    }
  }

  res.writeHead(405, { ...enabledCors, "Content-Type": "application/json" });
  return res.end(JSON.stringify({ error: "Metode tidak diizinkan." }));
}