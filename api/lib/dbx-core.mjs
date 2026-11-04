let tokenCache = null;
import { specOpenapi, paginaSwagger } from "./openapi.mjs";
async function getM2mToken() {
  if (tokenCache && Date.now() < tokenCache.exp) return tokenCache.token;
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: process.env.DATABRICKS_CLIENT_ID,
    client_secret: process.env.DATABRICKS_CLIENT_SECRET,
    scope: "all-apis"
  });
  const r = await fetch(`https://${process.env.DATABRICKS_HOST}/oidc/v1/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString()
  });
  if (!r.ok) throw new Error(`OAuth M2M fall\xF3: ${r.status} ${await r.text()}`);
  const j = await r.json();
  tokenCache = { token: j.access_token, exp: Date.now() + (j.expires_in - 120) * 1e3 };
  return j.access_token;
}
export async function runQuery(statement) {
  const token = await getM2mToken();
  const r = await fetch(`https://${process.env.DATABRICKS_HOST}/api/2.0/sql/statements`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      warehouse_id: process.env.DATABRICKS_WAREHOUSE_ID,
      catalog: process.env.DBX_CATALOG,
      schema: process.env.DBX_SCHEMA,
      statement,
      wait_timeout: "50s",
      format: "JSON_ARRAY",
      disposition: "EXTERNAL_LINKS"
    })
  });
  const j = await r.json();
  if (!r.ok || j.status?.state !== "SUCCEEDED") {
    const detalle =
      j.message ||
      (typeof j.error === "string" ? j.error : null) ||
      j.error?.message ||
      j.status?.error?.message ||
      "sin detalle del backend";
    throw new Error(`SQL ${r.status || j.status?.state}: ${detalle}`);
  }
  const cols = j.manifest.schema.columns.map((c) => c.name);
  let filas = j.result?.data_array || [];
  for (const link of j.result?.external_links || []) {
    const parte = await (await fetch(link.external_link)).json();
    if (Array.isArray(parte)) {
      filas = filas.concat(parte);
    }
  }
  return filas.map((row) => Object.fromEntries(cols.map((c, i) => [c, row[i]])));
}
function parseGroup(body) {
  const s = String(body ?? "").trim();
  if (!s) {
    return [];
  }
  if (!s.includes("(")) {
    return s.split(",").map((pt) => pt.trim().split(/\s+/).map(Number));
  }
  const items = [];
  let i = 0;
  while (i < s.length) {
    if (s[i] !== "(") {
      i += 1;
      continue;
    }
    let depth = 0;
    let j = i;
    for (; j < s.length; j += 1) {
      if (s[j] === "(") {
        depth += 1;
      }
      if (s[j] === ")") {
        depth -= 1;
        if (depth === 0) {
          break;
        }
      }
    }
    items.push(parseGroup(s.slice(i + 1, j)));
    i = j + 1;
  }
  return items;
}
export function geometryOf(raw) {
  if (!raw) return null;
  const s = String(raw).trim().replace(/^SRID=\d+\s*;\s*/i, "");
  if (s.startsWith("{")) {
    try {
      return JSON.parse(s);
    } catch {
      return null;
    }
  }
  const keyword = s.match(/^(MULTIPOLYGON|POLYGON)\s*/i);
  if (!keyword) return null;
  const body = s.slice(keyword[0].length).trim();
  if (!(body.startsWith("(") && body.endsWith(")"))) return null;
  const coordinates = parseGroup(body.slice(1, -1));
  return keyword[1].toUpperCase().startsWith("MULTI") ? { type: "MultiPolygon", coordinates } : { type: "Polygon", coordinates };
}
function toFeatureCollection(rows) {
  return {
    type: "FeatureCollection",
    features: rows.map((row) => {
      const geometry = geometryOf(row.geometry ?? row.Geometry);
      const props = Object.fromEntries(
        Object.entries(row).filter(([k]) => k.toLowerCase() !== "geometry")
      );
      return geometry ? { type: "Feature", geometry, properties: props } : null;
    }).filter(Boolean)
  };
}
const GOLD_COLS = `municipio, codigo_dane, departamento, mes, anio, tasa_predicha,
  tasa_real, total_tematica, tematica_mes_anterior, pob_dane_2025, error,
  abs_error, sq_error, ape_pct, nivel_riesgo_real, nivel_riesgo_predicho,
  p_25, p_50, p_75`;
const TABLA_PRED_BARRIO = process.env.DBX_TABLE_PRED_NEIGHBORHOOD || "hurto_personas_prediccion_municipio";
const TABLA_GOLD_BARRIO = process.env.DBX_TABLE_GOLD_BARRIO || "hurto_personas_gold_municipio";
const TABLA_THRESH_BARRIO = process.env.DBX_TABLE_THRESH_BARRIO || "thresholds_shrinkage_municipio";
const TABLA_BRONCE = process.env.DBX_TABLE_BRONZE || "hurtos_personas_bronce";
const BARRIO_PRED_SELECT = `
    SELECT p.codigo_dane AS codigo_dane, p.id_barrio, p.barrio, p.mes, p.anio,
      SUBSTR(CAST(p.codigo_dane AS STRING), 1, 2) AS departamento,
      p.tasa_predicha, p.pob_dane_2025, p.conteo_predicho,
      p.tematica_mes_anterior, p.tasa_real, p.abs_error, p.sq_error,
      p.nivel_riesgo_real, p.nivel_riesgo_predicho, p.p_25, p.p_50, p.p_75
    FROM ${TABLA_GOLD_BARRIO} p`;
export default async function handler(req, res) {
  const esWeb = typeof req?.headers?.get === "function";
  if (esWeb) {
    const url = new URL(req.url);
    let rutaWeb = url.searchParams.get("ruta") ?? url.pathname.replace(/^\/api\/dbx\/?/, "");
    if (rutaWeb.includes("%")) {
      try {
        rutaWeb = decodeURIComponent(rutaWeb);
      } catch {}
    }
    try {
      const doc = respuestaDocumentacion(rutaWeb);
      if (doc) {
        return new Response(doc.body, { status: doc.status, headers: doc.headers });
      }
      const data = await runQueryForRoute(rutaWeb);
      return new Response(JSON.stringify({ status: "Ok", response: data }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    } catch (e) {
      return new Response(JSON.stringify({ status: "degraded", error: String(e.message || e) }), {
        status: 503,
        headers: { "content-type": "application/json" },
      });
    }
  }
  const queryRuta = req.query?.ruta;
  const fromUrl = String(req.url ?? "").replace(/^\/api\/dbx\/?/, "").split("?")[0];
  let path = typeof queryRuta === "string" && queryRuta.length > 0 ? queryRuta : Array.isArray(queryRuta) ? queryRuta.map(encodeURIComponent).join("/") : fromUrl;
  if (path.includes("%")) {
    try {
      path = decodeURIComponent(path);
    } catch {
    }
  }
  try {
    const doc = respuestaDocumentacion(path);
    if (doc) {
      res.writeHead(doc.status, doc.headers);
      res.end(doc.body);
      return;
    }
    const data = await runQueryForRoute(path);
    res.status(200).json({ status: "Ok", response: data });
  } catch (e) {
    res.status(503).json({ status: "degraded", error: String(e.message || e) });
  }
}
function respuestaDocumentacion(path) {
  if (path !== "openapi.json" && path !== "docs") {
    return null;
  }
  const esSpec = path === "openapi.json";
  return {
    status: 200,
    headers: { "content-type": esSpec ? "application/json" : "text/html; charset=utf-8", "cache-control": "no-store" },
    body: esSpec ? JSON.stringify(specOpenapi()) : paginaSwagger(),
  };
}
async function runQueryForRoute(path) {
  const [seg0, seg1, seg2] = path.split(/\/+/).filter(Boolean);
  switch (true) {
    case (seg0 === "gold" && !seg1):
      return runQuery(`SELECT ${GOLD_COLS} FROM hurtos_personas_consolidado
        WHERE mes <> (SELECT MAX(mes) FROM hurtos_personas_consolidado)`);
    case (seg0 === "gold" && !!seg1): {
      const mes = Number(seg1);
      if (!Number.isInteger(mes) || mes < 1 || mes > 12) throw new Error(`mes inv\xE1lido: ${seg1}`);
      return runQuery(`SELECT ${GOLD_COLS} FROM hurtos_personas_consolidado WHERE mes = ${mes}`);
    }
    case (seg0 === "prediction" && !seg1):
      return runQuery(`SELECT municipio, codigo_dane, departamento, mes, anio,
        tasa_predicha, tasa_real, total_tematica, tematica_mes_anterior,
        pob AS pob_dane_2025, error, abs_error, sq_error, ape_pct,
        nivel_riesgo_real, nivel_riesgo_predicho, p_25, p_50, p_75
        FROM (
          SELECT g.*, COALESCE(g.pob_dane_2025, ref.pob_dane) AS pob
          FROM hurtos_personas_consolidado g
          LEFT JOIN (
            SELECT codigo_dane, MAX(pob_dane_2025) AS pob_dane
            FROM hurtos_personas_consolidado
            WHERE pob_dane_2025 IS NOT NULL
            GROUP BY codigo_dane
          ) ref ON ref.codigo_dane = g.codigo_dane
        ) WHERE mes = (SELECT MAX(mes) FROM hurtos_personas_consolidado)`);
    case (seg0 === "prediction" && seg1 === "neighborhood" && !seg2):
      return runQuery(BARRIO_PRED_SELECT);
    case (seg0 === "prediction" && seg1 === "neighborhood" && seg2 === "current"):
      return runQuery(`${BARRIO_PRED_SELECT}
        WHERE p.anio * 100 + p.mes = (
          SELECT MAX(p2.anio * 100 + p2.mes) FROM ${TABLA_GOLD_BARRIO} p2
        )`);
    case (seg0 === "prediction" && seg1 === "neighborhood" && !!seg2): {
      const mes = Number(seg2);
      if (!Number.isInteger(mes) || mes < 1 || mes > 12) throw new Error(`mes inv\xE1lido: ${seg2}`);
      return runQuery(`${BARRIO_PRED_SELECT} WHERE p.mes = ${mes}`);
    }
        case (seg0 === "department" && !seg1): {
      const table = process.env.DBX_TABLE_DEPARTMENT;
      if (!table) throw new Error("DBX_TABLE_DEPARTMENT no configurada");
      return toFeatureCollection(
        await runQuery(`SELECT codigo_departamento, departamento_nombre, geometry FROM ${table}`)
      );
    }
    case (seg0 === "department" && !!seg1 && seg2 === "municipality"): {
      const table = process.env.DBX_TABLE_MUNICIPALITY;
      if (!table) throw new Error("DBX_TABLE_MUNICIPALITY no configurada");
      const code = String(seg1).replace(/\D/g, "").padStart(2, "0");
      if (code.length !== 2) throw new Error(`c\xF3digo inv\xE1lido: ${seg1}`);
      return toFeatureCollection(
        await runQuery(
          `SELECT codigo_municipio AS codigo_dane, municipio, codigo_departamento, geometry
             FROM ${table} WHERE codigo_departamento = '${code}'`
        )
      );
    }
        case (seg0 === "tables" && !seg1):
      return runQuery(`SHOW TABLES IN ${process.env.DBX_CATALOG}.${process.env.DBX_SCHEMA}`);
    case (seg0 === "bronze" && !seg1):
      return runQuery(`SELECT * FROM ${TABLA_BRONCE}`);
    case (seg0 === "bronze" && !!seg1): {
      let filtro = seg1;
      if (filtro.includes("%")) {
        try {
          filtro = decodeURIComponent(filtro);
        } catch {}
      }
      if (/^\d+$/.test(filtro)) {
        if (filtro.length !== 5) {
          throw new Error(`c\xf3digo de municipio inv\xe1lido: ${seg1} (usa c\xf3digo DANE de 5 d\xedgitos)`);
        }
        return runQuery(`SELECT * FROM ${TABLA_BRONCE} WHERE CAST(codigo_dane AS STRING) = '${filtro}'`);
      }
      const nombre = filtro.replace(/'/g, "''");
      return runQuery(`SELECT * FROM ${TABLA_BRONCE} WHERE municipio ILIKE '%${nombre}%'`);
    }
    case (seg0 === "neighborhood" && !seg1): {
      const table = process.env.DBX_TABLE_NEIGHBORHOOD;
      if (!table) throw new Error("DBX_TABLE_NEIGHBORHOOD no configurada");
      return toFeatureCollection(
        await runQuery(`SELECT id_barrio, barrio, geometry FROM ${table}`)
      );
    }
    default:
      throw new Error(`ruta no soportada: /${path}`);
  }
}
