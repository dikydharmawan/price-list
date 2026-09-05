import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".webp": "image/webp",
  ".txt": "text/plain; charset=utf-8",
};

let apiHandler = null;
async function getApi() {
  if (!apiHandler) {
    const mod = await import("./api/data.js");
    apiHandler = mod.default;
  }
  return apiHandler;
}

function shimReq(raw, body) {
  const req = {
    method: raw.method,
    headers: raw.headers,
    url: raw.url,
    [Symbol.asyncIterator]() {
      return this;
    },
    next() {
      if (!body || body.length === 0) return Promise.resolve({ done: true });
      const chunk = body;
      body = "";
      return Promise.resolve({ value: chunk, done: false });
    },
  };
  return req;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  let p = url.pathname;

  if (p.startsWith("/api/")) {
    let body = "";
    for await (const chunk of req) body += chunk;
    const sres = {
      writeHead(status, headers) {
        res.statusCode = status;
        for (const k in headers || {}) res.setHeader(k, headers[k]);
      },
      end(b) {
        res.end(b);
      },
    };
    const h = await getApi();
    const result = await h(shimReq(req, body), sres);
    // Setelah admin menyimpan (POST sukses), ikut update data.json
    // supaya perubahan juga terlihat saat website dibuka lewat file://
    try {
      if (req.method === "POST" && res.statusCode === 200 && body) {
        const d = JSON.parse(body);
        if (d && d.layanan && Array.isArray(d.layanan)) {
          fs.writeFileSync(path.join(ROOT, "data.json"), JSON.stringify(d, null, 2), "utf8");
        }
      }
    } catch (e) {
      console.error("gagal sinkron data.json:", e.message);
    }
    return result;
  }

  if (p === "/") p = "/index.html";
  const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT)) {
    res.writeHead(403);
    return res.end("Forbidden");
  }
  const ext = path.extname(f).toLowerCase();
  try {
    const data = fs.readFileSync(f);
    const noCache = [".html", ".js", ".css", ".json"].includes(ext);
    res.writeHead(200, {
      "Content-Type": MIME[ext] || "application/octet-stream",
      "Cache-Control": noCache ? "no-store" : "public, max-age=86400",
    });
    res.end(data);
  } catch (e) {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("404 Not Found");
  }
});

server.listen(PORT, () => {
  console.log("DiksStore dev server berjalan:");
  console.log("  Website : http://localhost:" + PORT + "/");
  console.log("  Admin   : http://localhost:" + PORT + "/admin.html");
  console.log("  Password admin default : diksstore080847");
  console.log("  Simpan admin -> local-store.json (lokal, tidak mempengaruhi data.json)");
});