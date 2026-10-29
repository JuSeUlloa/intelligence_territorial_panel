import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
for (const line of fs.readFileSync(path.join(__dirname, "..", ".env"), "utf8").split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) {
    const valor = m[2].trim().replace(/^['"]/, "").replace(/['"]$/, "");
    process.env[m[1]] = valor.trim();
  }
}
process.env.DBX_CATALOG ??= "workspace";
process.env.DBX_SCHEMA ??= "territorial_inteligence";
process.env.DATABRICKS_HOST ??= "dbc-01398c98-b88e.cloud.databricks.com";
const handler = (await import("./dbx-core.mjs")).default;
const PORT = Number(process.env.DEV_API_PORT || 4201);
http.createServer(async (req, res) => {
  const resLike = {
    status(code) {
      this._st = code;
      return this;
    },
    setHeader(k, v) {
      res.setHeader(k, v);
      return this;
    },
    json(body) {
      res.writeHead(this._st || 200, { "content-type": "application/json" });
      res.end(JSON.stringify(body));
    },
    send(text) {
      res.writeHead(this._st || 200, { "content-type": "application/json" });
      res.end(text);
    }
  };
  try {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    await handler({ url: req.url, headers: req.headers }, resLike);
  } catch (e) {
    res.writeHead(500, { "content-type": "application/json" });
    res.end(JSON.stringify({ status: "error", error: String(e) }));
  }
}).listen(PORT, () => console.log(`local BFF en http://localhost:${PORT}/api/dbx/*`));
