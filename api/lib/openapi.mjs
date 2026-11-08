// Documentación OpenAPI de la API dbx.
// PETICIONES es la fuente de verdad del catálogo; el spec se construye desde aquí.
// Mantener sincronizado con el router de dbx-core.mjs (runQueryForRoute).

const TAGS = [
  { name: "Geografía", descripcion: "Capas GeoJSON de departamentos, municipios y barrios." },
  { name: "Gold", descripcion: "Tabla consolidada por municipio (tasa real + predicha, errores y niveles de riesgo)." },
  { name: "Predicción", descripcion: "Predicciones por municipio y por barrio para el mes en curso o un mes dado." },
  { name: "Bronze", descripcion: "Datos crudos homologados de hurtos de personas por municipio." },
  { name: "Consolidado", descripcion: "Variables estructurales estáticas por municipio (población, PDET/ZOMAC, clusters, riesgo, PIB)." },
  { name: "Utilidades", descripcion: "Documentación interactiva, spec OpenAPI y catálogo de tablas." },
];

function enRuta(ruta) {
  // operationId amigable: /prediction/neighborhood/{mes} -> prediccionNeighborhoodMes
  const especiales = { department: "departamentos", neighborhood: "neighborhood", gold: "gold", prediction: "prediccion", bronze: "bronze", tables: "tables" };
  let id = ruta.replace(/^\//, "");
  id = id.replace(/\{[^}]+\}/g, (m) => "Por" + m.slice(1, -1).split("_").map((w) => w[0].toUpperCase() + w.slice(1)).join(""));
  id = id.split("/").map((w) => especiales[w] ?? w).join("");
  return id[0].toUpperCase() + id.slice(1);
}

const PETICIONES = [
  {
    ruta: "/department",
    tag: "Geografía",
    resumen: "Departamentos",
    descripcion:
      "Retorna la capa GeoJSON de departamentos con su geometría y código DANE.",
    esquema: "featureCollection",
    ejemplos: [
      { status: "Ok", response: { type: "FeatureCollection", features: [{ type: "Feature", properties: { codigo_departamento: "76", departamento_nombre: "Valle del Cauca" }, geometry: { type: "MultiPolygon", coordinates: "(…)" } }] } },
    ],
  },
  {
    ruta: "/department/{codigo_departamento}/municipality",
    tag: "Geografía",
    resumen: "Municipios de un departamento",
    descripcion:
      "GeoJSON de los municipios de un departamento (código DANE del departamento, 2 dígitos).",
    esquema: "featureCollection",
    parametros: [
      {
        nombre: "codigo_departamento",
        en: "path",
        descripcion: "Código DANE del departamento",
        tipo: "string",
        patron: "^[0-9]{2}$",
        requerido: true,
      },
    ],
    ejemplos: [
      { status: "Ok", response: { type: "FeatureCollection", features: [{ type: "Feature", properties: { codigo_dane: "76001", municipio: "Cali", codigo_departamento: "76" }, geometry: { type: "MultiPolygon", coordinates: "(…)" } }] } },
    ],
  },
  {
    ruta: "/neighborhood",
    tag: "Geografía",
    resumen: "Barrios",
    descripcion:
      "GeoJSON de barrios por municipio (id_barrio, barrio, geometry).",
    esquema: "featureCollection",
    ejemplos: [
      { status: "Ok", response: { type: "FeatureCollection", features: [{ type: "Feature", properties: { id_barrio: "B001", barrio: "La Pampa" }, geometry: { type: "MultiPolygon", coordinates: "(…)" } }] } },
    ],
  },
  {
    ruta: "/gold",
    tag: "Gold",
    resumen: "Gold · histórico por mes",
    descripcion:
      "Tabla gold de hurtos de personas por municipio (tasas reales y predichas, errores, niveles de riesgo, percentiles). Excluye el último mes disponible (usar /prediction para el actual).",
    esquema: "filas",
    columnas: ["municipio", "codigo_dane", "departamento", "mes", "anio", "tasa_predicha", "tasa_real", "total_tematica", "tematica_mes_anterior", "pob_dane_2025", "error", "abs_error", "sq_error", "ape_pct", "nivel_riesgo_real", "nivel_riesgo_predicho", "p_25", "p_50", "p_75"],
    ejemplos: [
      { status: "Ok", response: [{ municipio: "Cali", codigo_dane: "76001", departamento: "76", mes: 4, anio: 2025, tasa_predicha: 14.8, tasa_real: 13.2, total_tematica: 112, tematica_mes_anterior: 98, pob_dane_2025: 837000, error: -1.6, abs_error: 1.6, sq_error: 2.56, ape_pct: 10.8, nivel_riesgo_real: "MEDIO", nivel_riesgo_predicho: "ALTO", p_25: 12.1, p_50: 14.7, p_75: 16.9 }] },
    ],
  },
  {
    ruta: "/gold/{mes}",
    tag: "Gold",
    resumen: "Gold · un mes",
    descripcion: "Filas gold de un mes específico.",
    esquema: "filas",
    parametros: [
      {
        nombre: "mes",
        en: "path",
        descripcion: "Mes del año",
        tipo: "integer",
        minimo: 1,
        maximo: 12,
        requerido: true,
      },
    ],
    ejemplos: [
      { status: "Ok", response: [{ codigo_dane: "76001", mes: 3, anio: 2025, tasa_predicha: 15.2, tasa_real: 14.9 }] },
    ],
    errores: ["400 servicio: mes inválido (fuera de 1–12)"],
  },
  {
    ruta: "/prediction",
    tag: "Predicción",
    resumen: "Predicción · mes más reciente",
    descripcion:
      "Predicción por municipio para el último mes disponible en la tabla consolidada.",
    esquema: "filas",
    ejemplos: [
      { status: "Ok", response: [{ municipio: "Cali", codigo_dane: "76001", departamento: "76", mes: 11, anio: 2026, tasa_predicha: 14.4, tasa_real: 0, pob_dane_2025: 837000, nivel_riesgo_predicho: "ALTO", p_25: 12.4, p_50: 14.2, p_75: 16.3 }] },
    ],
  },
  {
    ruta: "/prediction/neighborhood",
    tag: "Predicción",
    resumen: "Predicción por barrio · histórico",
    descripcion:
      "Predicción y niveles de riesgo por barrio (tabla gold de municipio con id_barrio).",
    esquema: "filas",
    ejemplos: [
      { status: "Ok", response: [{ codigo_dane: "76001", id_barrio: "B001", barrio: "La Pampa", mes: 4, anio: 2025, tasa_predicha: 12.3, tasa_real: 11.8, conteo_predicho: 4 }] },
    ],
  },
  {
    ruta: "/prediction/neighborhood/current",
    tag: "Predicción",
    resumen: "Predicción por barrio · mes actual",
    descripcion:
      "Predicción por barrio para el mes más reciente (anio*100+mes máximo).",
    esquema: "filas",
    ejemplos: [
      { status: "Ok", response: [{ codigo_dane: "76001", id_barrio: "B001", barrio: "La Pampa", mes: 11, anio: 2026, tasa_predicha: 12.1, tasa_real: 0 }] },
    ],
  },
  {
    ruta: "/prediction/neighborhood/{mes}",
    tag: "Predicción",
    resumen: "Predicción por barrio · un mes",
    descripcion: "Predicción por barrio para un mes específico.",
    esquema: "filas",
    parametros: [
      {
        nombre: "mes",
        en: "path",
        descripcion: "Mes del año",
        tipo: "integer",
        minimo: 1,
        maximo: 12,
        requerido: true,
      },
    ],
    ejemplos: [
      { status: "Ok", response: [{ id_barrio: "B001", barrio: "La Pampa", mes: 9, anio: 2026, tasa_predicha: 11.6 }] },
    ],
  },
  {
    ruta: "/bronze",
    tag: "Bronze",
    resumen: "Bronze · crudo homologado",
    descripcion:
      "Tabla bronze de hurtos de personas homologada por municipio (incluye id_barrio).",
    esquema: "filas",
    ejemplos: [
      { status: "Ok", response: [{ codigo_dane: "76001", municipio: "Cali", id_barrio: "B001", fecha: "2025-04-12", genero: "M", zona: "URBANA" }] },
    ],
  },
  {
    ruta: "/bronze/{municipio}",
    tag: "Bronze",
    resumen: "Bronze · por municipio",
    descripcion:
      "Filas bronze filtradas por municipio. Acepta código DANE (5 dígitos, coincidencia exacta) o nombre (búsqueda parcial, insensible a mayúsculas).",
    esquema: "filas",
    parametros: [
      {
        nombre: "municipio",
        en: "path",
        descripcion:
          "Código DANE de 5 dígitos del municipio o parte de su nombre",
        tipo: "string",
        requerido: true,
        ejemplosValores: ["76100", "buenaventura"],
      },
    ],
    ejemplos: [
      { status: "Ok", response: [{ codigo_dane: "76100", municipio: "Buenaventura", id_barrio: "B201", fecha: "2025-06-03" }] },
    ],
    errores: ["503 si el código no tiene 5 dígitos"],
  },
  {
    ruta: "/tables",
    tag: "Utilidades",
    resumen: "Catálogo de tablas",
    descripcion: "SHOW TABLES del schema configurado en Databricks.",
    esquema: "filas",
    ejemplos: [
      { status: "Ok", response: [{ database: "territorial_inteligence", tableName: "hurto_personas_gold_municipio", isTemporary: false }] },
    ],
  },
  {
    ruta: "/consolidated",
    tag: "Consolidado",
    resumen: "Consolidado · estructurales por municipio",
    descripcion:
      "Tabla estructural estática por municipio (una fila por municipio): población DANE 2025, PDET/ZOMAC, índices de riesgo y victimización, presencia de grupos armados, PIB relativo, hurtos históricos, art. 95, islas/áreas no municipalizadas y coordenadas. Es la fuente de las VariablesConsolidadas del modelo.",
    esquema: "filas",
    columnas: ["codigo_departamento", "departamento", "codigo_municipio", "municipio", "pob_dane_2025", "pdet", "zomac", "pdet_zomac", "riesgo_victimizacion", "cluster_rv", "pres_grup_armados", "cluster_pga", "victimizacion_seguridad", "cluster_vs", "pib2024_peso_relativo_mun_valor_agregado_departamental", "hurto_2025", "hurto_acum_5", "art95_num1_base_datos_negativa_del_articulo_106_ley_1453_2011", "municipio_isla_area_no_municipalizada", "longitud", "latitud"],
    ejemplos: [
      { status: "Ok", response: [{ codigo_departamento: 5, departamento: "Antioquia", codigo_municipio: "05001", municipio: "Medellín", pob_dane_2025: 2569000, pdet: 0, zomac: 0, riesgo_victimizacion: 0.72, cluster_rv: "ALTO", longitud: -75.58, latitud: 6.24 }] },
    ],
  },
  {
    ruta: "/consolidated/{codigo_dane}",
    tag: "Consolidado",
    resumen: "Consolidado · por municipio",
    descripcion: "Fila estructural de un municipio (código DANE de 5 dígitos).",
    esquema: "filas",
    parametros: [
      {
        nombre: "codigo_dane",
        en: "path",
        descripcion: "Código DANE del municipio (5 dígitos)",
        tipo: "string",
        requerido: true,
      },
    ],
    ejemplos: [
      { status: "Ok", response: [{ codigo_municipio: "05001", municipio: "Medellín", pob_dane_2025: 2569000 }] },
    ],
    errores: ["503 si el código no tiene 5 dígitos"],
  },
  {
    ruta: "/openapi.json",
    tag: "Utilidades",
    resumen: "Spec OpenAPI de esta API",
    descripcion: "Documento OpenAPI 3.1 en JSON (esta misma documentación).",
    esquema: "filas",
    ejemplos: [
      { status: "Ok", response: "(el documento OpenAPI mismo)" },
    ],
  },
  {
    ruta: "/docs",
    tag: "Utilidades",
    resumen: "Swagger UI",
    descripcion: "Documentación interactiva (esta página).",
    esquema: "filas",
    ejemplos: [
      { status: "Ok", response: "(HTML con Swagger UI)" },
    ],
  },
];

function parametrosDe(def) {
  return (def.parametros ?? []).map((p) => ({
    name: p.nombre,
    in: p.en,
    required: p.requerido ?? false,
    description: p.descripcion,
    schema:
      p.tipo === "integer"
        ? { type: "integer", ...(p.minimo != null ? { minimum: p.minimo } : {}),
            ...(p.maximo != null ? { maximum: p.maximo } : {}) }
        : { type: "string", ...(p.patron ? { pattern: p.patron } : {}) },
    ...(p.ejemplosValores
      ? {
          examples: p.ejemplosValores.reduce((acc, v, i) => {
            acc["ejemplo" + (i + 1)] = { value: v };
            return acc;
          }, {}),
        }
      : {}),
  }));
}

function respuesta200(def) {
  const cuerpo = {
    description:
      "Respuesta envuelta en { status, response }: FeatureCollection GeoJSON (Geografía) o arreglo de filas (demás endpoints)." +
      (def.columnas ? " Columnas: " + def.columnas.join(", ") + "." : ""),
    content: {
      "application/json": {
        schema: { $ref: "#/components/schemas/Envelope" },
        examples: def.ejemplos?.length
          ? def.ejemplos.map((ejemplo, i) => ({ [enRuta(def.ruta) + "Ejemplo" + (def.ejemplos.length > 1 ? i + 1 : "")]: { value: ejemplo } }))
              .reduce((acc, x) => ({ ...acc, ...x }), {})
          : undefined,
      },
    },
  };
  return cuerpo;
}

export function specOpenapi() {
  const rutas = {};
  for (const def of PETICIONES) {
    rutas[def.ruta] = {
      get: {
        tags: [def.tag],
        operationId: "get" + enRuta(def.ruta),
        summary: def.resumen,
        description:
          def.descripcion +
          (def.errores ? "\n\n**Errores conocidos:**\n" + def.errores.map((e) => "- " + e).join("\n") : ""),
        ...(def.parametros?.length ? { parameters: parametrosDe(def) } : {}),
        responses: {
          200: respuesta200(def),
          503: {
            description: "Backend degradado (fallo de consulta o ruta no soportada).",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/RespuestaDegradada" },
                examples: {
                  rutaNoSoportada: {
                    value: { status: "degraded", error: "ruta no soportada: /otra" },
                  },
                },
              },
            },
          },
        },
      },
    };
  }
  return {
    openapi: "3.1.0",
    info: {
      title: "Intelligence Territorial Panel · API",
      version: "1.0.0",
      description:
        "Pasarela de datos del panel: capas geográficas (bronze/silver/gold) y predicciones de hurtos de personas servidas desde Databricks. Todas las respuestas exitosas llegan envueltas: { status: 'Ok', response: <FeatureCollection | filas> }. Solo se acepta el método GET.",
    },
    servers: [{ url: "/api/dbx", description: "Base común de todos los endpoints (frontend y local usan el mismo prefijo)" }],
    tags: TAGS.map((t) => ({ name: t.name, description: t.descripcion })),
    paths: rutas,
    components: {
      schemas: {
        Envelope: {
          type: "object",
          properties: {
            status: { type: "string", const: "Ok" },
            response: {
              description:
                "FeatureCollection GeoJSON (capas /department, /department/{cod}/municipality, /neighborhood) o un arreglo de filas.",
            },
          },
        },
        RespuestaDegradada: {
          type: "object",
          properties: {
            status: { type: "string", const: "degraded" },
            error: { type: "string" },
          },
        },
      },
    },
  };
}

export function paginaSwagger() {
  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Intelligence Territorial Panel · API</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.17.14/swagger-ui.css" />
  <style>
    html { box-sizing: border-box; }
    body { margin: 0; background: #fafafa; }
    #contenedor { min-height: 100vh; }
    .topbar, .topbar-wrapper { display: none; }
  </style>
  <script src="https://unpkg.com/swagger-ui-dist@5.17.14/swagger-ui-bundle.js" defer><\/script>
  <script defer>
    window.addEventListener("load", () => {
      window.SwaggerUIBundle({
        url: "openapi.json",
        dom_id: "#contenedor",
        deepLinking: true,
        persistAuthorization: true,
        docExpansion: "list",
        tagsSorter: "alpha",
        operationsSorter: "alpha",
      });
    });
  <\/script>
</head>
<body>
  <div id="contenedor"></div>
</body>
</html>
`;
}
