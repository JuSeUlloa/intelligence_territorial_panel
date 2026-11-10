# Intelligence Territorial Panel

Panel de inteligencia territorial con la predicción del nivel de riesgo por
hurtos de personas a escala departamento, municipio y barrio en Colombia.
Construido con **Angular 22 · Tailwind CSS 4 · Mapbox GL** y un **BFF ligero
(Node/Vercel Functions)** que consulta el SQL warehouse de Databricks,
documentado con **Swagger UI** y con **exportación de reportes (CSV/XLSX)**.

---

## Flujo de datos

```
┌───────────────────────────── Databricks SQL Warehouse ─────────────────────────────┐
│  hurtos_personas_consolidado         (gold municipal, histórico de predicciones)   │
│  hurto_personas_gold                 (gold municipal del mes siguiente)            │
│  hurto_personas_prediccion_municipio (predicción por BARRIO)                      │
│  hurtos_personas_bronce_municipio    (crudo homologado con id_barrio)             │
│  consolidado                          (estructurales estáticas por municipio)     │
│  thresholds_shrinkage_municipio      (umbrales p_25/p_50/p_75 por barrio)          │
│  departamentos_geo · municipios_geo · municipio_barrios_geo   (geometrías EWKT)    │
└───────────────────────────────────────────────────────────────────────────────────┘
                     │  OAuth M2M  (solo servidor)
                     ▼
┌──────────────────────── BFF — /api/dbx  (api/lib/dbx-core.mjs) ───────────────────┐
│  · Vercel Function (prod) o scripts/local-server.mjs (dev, puerto 4201)           │
│  · rutas de lista blanca → SQL sin interpolación libre                             │
│  · deriva nivel_riesgo_predicho del barrio:                                        │
│      tasa_predicha ≥ p_75 → ALTO · ≥ p_50 → MEDIO · resto → BAJO                    │
│  · geometría EWKT → GeoJSON listo para Mapbox                                      │
│  · documentación: /api/dbx/docs (Swagger UI) · /api/dbx/openapi.json (spec 3.1)     │
└───────────────────────────────────────────────────────────────────────────────────┘
                     │  /api/dbx/<ruta>  (mismo origen, sin CORS)
                     ▼
┌──────────────────────────────── Angular (este panel) ──────────────────────────────┐
│  services/territory.service.ts — fetch + cache shareReplay por URL                 │
│  ui/container/dash — un solo pipeline: capa territorial + predicciones + /gold full │
│  utils/exportar.ts — reporte gold 2026 en XLSX/CSV con alcance geográfico           │
└───────────────────────────────────────────────────────────────────────────────────┘
```

## Flujo del panel (arriba hacia abajo)

| Sección | Qué muestra |
|---|---|
| **Barra de filtros** | Mes (extraído de /gold), nivel de riesgo, **typeahead de municipio** con estados de carga (spinner «cargando…» / error con reintentar / sugerencias), toggle "Mes en Curso" (`/prediction`), Aplicar / Limpiar, y botón **Exportar** (CSV / XLSX) — oculto en nivel barrio |
| **KPIs** | Municipios con predicción, hurtos esperados, tasa promedio (icono de línea de tendencia), MAE (— en próximo mes), municipios en ALTO |
| **Mapa coropleta** | 3 niveles: departamento → municipio → barrio (`/prediction/neighborhood/current`). Al seleccionar departamento/municipio el encuadre queda 1 nivel más cerca del territorio (topes de zoom 8/12/13). Popup con riesgo, tasas y población; long-press 1 s marca el departamento. Todo el z-index del mapa queda aislado (`isolate`) para no tapar la barra sticky de filtros |
| **Gráfico de barras** | Eje X = territorio del nivel activo, apilado Bajo/Medio/Alto por conteo de meses. En municipio: desglose alternativo **por mes**. Orden ALTO → BAJO → sin datos, alfabético en empates |
| **Evolución mensual** | Líneas de tasa real vs predicha por mes; el **mes en curso conserva su predicción** (aunque no haya tasa real aún — solo sale de la línea real), banda entre líneas = error del modelo |
| **Riesgo predicho / Resumen** | Con un municipio aislado: tarjeta de resumen (nivel, tasas, hurtos estimados, población, historial por mes) + botón de **contexto estructural** que abre una **ventana flotante** con las variables de la tabla `consolidado` (ver abajo). En los demás casos: donut SVG por niveles |
| **Cambios de nivel** | Municipios/barrios que cambiaron de nivel entre los dos últimos meses, con filtro por dirección y departamento, paginador 5/10 y popup de detalle |
| **Puntos de atención** | 🔴 En ALTO este mes y ⚪ sin reporte — con hurtos estimados y mes; click enfoca el mapa |
| **Diccionario de datos** | Modal con el diccionario de datos (markdown de `public/diccionario/`), con índice de secciones |
| **Footer** | Resumen de los módulos y stack |

## Contexto estructural (tabla `consolidado`)

La ventana flotante del resumen (icono de capas junto al nombre del municipio)
muestra las variables estáticas que dan el "telón de fondo" a la decisión:

| Variable | Qué es | Lectura en el panel |
|---|---|---|
| `pob_dane_2025` | Población proyección DANE | Denominador de todas las tasas |
| `pdet` / `zomac` | Municipios priorizados post-acuerdo / Zonas más afectadas por el conflicto | Badges neutros "PDET" / "ZOMAC" |
| `riesgo_victimizacion` | Índice estructural 0–1 | Celda coloreada (≤ ⅓ verde · ≤ ⅔ ámbar · resto rojo) |
| `cluster_rv` | Categoría ordinal del índice (Bajo · Medio Bajo · Medio · Medio Alto · Alto) | Celda con color por severidad |
| `pres_grup_armados` | **Índice continuo 0–1** de presencia (no binaria: p50 ≈ 0,10 · p90 ≈ 0,24 → solo ~5 de 1120 municipios superan 0,5) | Celda "Índice armados"; el badge "Gr. armados: Sí" solo con índice ≥ 0,5 (presencia establecida) |
| `victimizacion_seguridad` | Índice por seguridad (varianza ≈ 0: información casi uniforme) | Celda neutra |
| `art95_num1_base_datos_negativa…` | Equipos en la **BD negativa de terminales móviles (art. 106, Ley 1453 de 2011)** | Celda "BD neg. IMEI" — ⚠ auditoría pendiente (A6): posible proxy de población |
| `pib2024_peso_relativo…` | % del municipio en el valor agregado departamental | Celda "PIB dpto (2024)" |
| `hurto_2025` / `hurto_acum_5` | Hurtos del año y acumulado 5 años | Línea base histórica |
| `municipio_isla_area_no_municipalizada` | Categoría territorial | Solo destacada cuando **no** es "Municipio" (isla / área no municipalizada) |

Los `null` de la tabla (119 municipios sin algunos índices) no se convierten
en ceros: las celdas correspondientes simplemente se ocultan.

## Exportación de reportes (XLSX / CSV)

- Botón **Exportar** en la barra de filtros (oculto si el nivel del mapa es
  *barrio*). Menú con dos formatos: **Excel CSV (.csv)** y **Excel (.xlsx)**.
- Contenido: todas las filas **gold 2026 del alcance activo del mapa**
  (nacional → todos los municipios · departamento → sus municipios ·
  municipio → solo ese), con las columnas del modelo (tasas, hurtos,
  errores, niveles de riesgo, percentiles) y una fila final de **predicción
  del mes en curso** por municipio (sin tasa real, sin métricas de error).
- El recorte geográfico y una fila de tipo ("Observado" / "Predicción")
  permiten leer el cronograma de cada municipio en orden cronológico.
- Nombre del archivo: `reporte_mit_<alcance>_<AAAAMMDD>_<HHMM>.{csv|xlsx}`
  (ej. `reporte_mit_medellin_20261108_1121.xlsx`; el alcance es el municipio
  elegido, o el departamento si aplica, o `nacional`).
- CSV: BOM UTF-8, separador `;`, decimales es-CO → se abre directo en Excel.
- XLSX: hoja única con anchos de columna ajustados; la librería `xlsx` se
  carga perezosamente (no entra al bundle inicial del panel).

## Rutas del BFF (`/api/dbx/…`)

| Ruta | Fuente (tabla) | Uso en el panel |
|---|---|---|
| `/department` | `departamentos_geo` | capa de departamentos |
| `/department/{código}/municipality` | `municipios_geo` | capa de municipios (sola o por departamento) |
| `/neighborhood` | `municipio_barrios_geo` | capa de barrios (polígonos) |
| `/gold` · `/gold/{mes}` | `hurtos_personas_consolidado` | historial municipal (meses de la historia) |
| `/prediction` | `hurtos_personas_consolidado` (último mes) | estado municipal del mes en curso |
| `/prediction/neighborhood` · `/current` · `/{mes}` | `hurto_personas_prediccion_municipio` + thresholds | predicción y riesgos por barrio |
| `/bronze` · `/bronze/{municipio}` | `hurto_personas_bronce_municipio` (o `DBX_TABLE_BRONZE`) | crudo homologado; filtra por **código DANE (5 dígitos)** o nombre (`ILIKE`, escapado) |
| `/consolidated` · `/consolidated/{codigo_dane}` | `consolidado` (o `DBX_TABLE_CONSOLIDATED`) | estructurales estáticas del contexto (badges / ventana flotante) |
| `/tables` | — | `SHOW TABLES` del schema (diagnóstico) |
| `/docs` · `/openapi.json` | — | **Swagger UI** y spec **OpenAPI 3.1** (generada del mismo catálogo que el router) |

## Desarrollo local

```bash
# 1. BFF (lee api/.env — copiado de api/.env.example con tus credenciales)
npm run bff                           # http://localhost:4201/api/dbx/*
#   · reinicia el BFF después de añadir rutas: el proceso no recarga solo

# 2. Panel (proxy /api/dbx → 4201 lo resuelve proxy.conf.json)
npm start                             # http://localhost:4200

# 3. Documentación interactiva de la API
#    http://localhost:4201/api/dbx/docs   (también en producción)
```

> El typeahead muestra su estado: spinner «cargando…» junto a la etiqueta,
> y en caso de fallo un enlace **reintentar** (el catálogo se recarga sin
> recargar la página).

## Variables de entorno del BFF

| Variable | Descripción |
|---|---|
| `DATABRICKS_HOST / CLIENT_ID / CLIENT_SECRET / WAREHOUSE_ID` | credenciales M2M del service principal |
| `DBX_CATALOG / DBX_SCHEMA` | espacio de trabajo del warehouse |
| `DBX_TABLE_DEPARTMENT / MUNICIPALITY / NEIGHBORHOOD` | tablas de geografía (columna `geometry` en EWKT) |
| `DBX_TABLE_PRED_NEIGHBORHOOD` | tabla de predicción por barrio |
| `DBX_TABLE_THRESH_BARRIO` | umbrales p_25/p_50/p_75 por barrio |
| `DBX_TABLE_BRONZE` | crudo homologado (`hurto_personas_bronce_municipio`) |
| `DBX_TABLE_CONSOLIDATED` | estructurales por municipio (`consolidado`) |

⚠️ El secret **nunca va al repo** (`api/.env` está ignorada en `.gitignore`) — en
producción se configura como variable de entorno del proyecto en Vercel.

## Despliegue (Vercel)

- `vercel.json` hace el build (`npm run build` → `dist/…/browser`) y redirige
  `/api/dbx/:ruta*` a la función `api/dbx.mjs`.
- El `environment.ts` de producción ya apunta a `/api/dbx` (mismo origen, sin CORS).
- Las variables del BFF se configuran en **Project → Settings → Environment
  Variables** (Production y Preview).
- La documentación Swagger queda publicada en
  `https://<tu-app>.vercel.app/api/dbx/docs`.

## Estructura

```
api/dbx.mjs                    entrypoint Vercel Function (prod)
api/lib/dbx-core.mjs           router SQL (rutas whitelisted) + handler dual Web/Node
api/lib/openapi.mjs            catálogo RUTAS → spec OpenAPI 3.1 + página Swagger UI
scripts/local-server.mjs       BFF dev en :4201 (npm run bff) — no se despliega en Vercel
public/diccionario/            diccionario de datos (markdown) que muestra el modal
src/app/models/                modelos de la API (Prediccion, Barrio, Municipio, VariablesConsolidadas)
src/app/services/              territory.service (fetch, caché, getConsolidadas), theme, riesgo-color
src/app/utils/exportar.ts      reporte gold (filas + CSV es-CO + XLSX perezoso) con alcance geográfico
src/app/ui/container/dash/     orquestador: mapa + un solo pipeline de datos + exportación + contexto
src/app/ui/widgets/            filtros · geo-filtro · kpi · barras/series/torta/resumen · analisis · pipeline · diccionario · footer
src/app/ui/components/         spinner · empy-page (ruta comodín 404 maquetada)
src/environments/              base URLs por entorno (sin secretos)
```

## Convenciones del proyecto

- **Nunca se imputa con ceros**: `0` = cero medido, `NULL` = mes sin dato
  observado (`hay_observacion`). La tasa real faltante se muestra "s/d".
- El mes en curso en la gráfica de líneas mantiene su **tasa predicha** (viene
  de `/prediction`), aunque su tasa real aún no exista.
- `codigo_dane` siempre normalizado a **5 dígitos** (los ceros a la izquierda
  importan: Medellín es `05001`).
- Zona horaria de nombres/decimales: `es-CO` en todo el panel y los archivos.
