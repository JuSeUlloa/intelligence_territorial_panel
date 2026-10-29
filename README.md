# Intelligence Territorial Panel

Panel de inteligencia territorial con la predicción del nivel de riesgo por
hurtos de personas a escala departamento, municipio y barrio en Colombia.
Construido con **Angular 22 · Tailwind CSS 4 · Mapbox GL** y un **BFF ligero
(Node/Vercel Functions)** que consulta el SQL warehouse de Databricks.

---

## Flujo de datos

```
┌───────────────────────────── Databricks SQL Warehouse ─────────────────────────────┐
│  hurtos_personas_consolidado         (gold municipal, histórico de predicciones)   │
│  hurto_personas_gold                 (gold municipal del mes siguiente)            │
│  hurto_personas_prediccion_municipio (predicción por BARRIO)                      │
│  thresholds_shrinkage_municipio      (umbrales p_25/p_50/p_75 por barrio)          │
│  departamentos_geo · municipios_geo · municipio_barrios_geo   (geometrías EWKT)    │
└───────────────────────────────────────────────────────────────────────────────────┘
                     │  OAuth M2M  (solo servidor)
                     ▼
┌──────────────────────── BFF — /api/dbx  (api/lib/dbx-core.mjs) ───────────────────┐
│  · Vercel Function (prod) o local-server.mjs (dev, puerto 4201)                    │
│  · rutas de lista blanca → SQL sin interpolación libre                             │
│  · deriva nivel_riesgo_predicho del barrio:                                        │
│      tasa_predicha ≥ p_75 → ALTO · ≥ p_50 → MEDIO · resto → BAJO                    │
│  · geometría EWKT → GeoJSON listo para Mapbox                                      │
└───────────────────────────────────────────────────────────────────────────────────┘
                     │  /api/dbx/<ruta>  (mismo origen, sin CORS)
                     ▼
┌──────────────────────────────── Angular (este panel) ──────────────────────────────┐
│  services/territory.service.ts — fetch + cache shareReplay por URL                 │
│  ui/container/dash — un solo pipeline: capa territorial + predicciones + /gold full │
└───────────────────────────────────────────────────────────────────────────────────┘
```

## Flujo del panel (arriba hacia abajo)

| Sección | Qué muestra |
|---|---|
| **Barra de filtros** | Mes (extraído de /gold), nivel de riesgo, **typeahead de municipio** (≥3 letras), toggle "Mes en Curso" (`/prediction`), Aplicar / Limpiar |
| **KPIs** | Municipios con predicción, hurtos esperados, tasa promedio, MAE (— en próximo mes), municipios en ALTO |
| **Mapa coropleta** | 3 niveles: departamento (agregado de sus municipios) → municipio → barrio (predicción `/prediction/neighborhood/current`). Popup con riesgo, tasas y población. Long-press de 1 s marca el departamento en el filtro. |
| **Gráfico de barras** | Eje X = territorio del nivel activo, apilado Bajo/Medio/Alto por conteo de meses. En municipio: desglose alternativo **por mes** (franja cronológica). El orden es ALTO → BAJO → sin datos, alfabético en empates |
| **Evolución mensual** | Líneas de tasa real vs predicha por mes (AVG por municipio, luego media por mes), eje 0–50 con modo **aumentar**, series marcables con click, banda entre líneas = error del modelo |
| **Riesgo predicho / Resumen** | Con un solo municipio aislado: tarjeta de resumen (nivel, tasas, hurtos estimados, población, historial por mes). En los demás casos: donnut SVG por niveles |
| **Cambios de nivel** | Municipios/barrios que cambiaron de nivel entre los dos últimos meses, con filtro por dirección y departamento, paginador 5/10 y popup de detalle |
| **Puntos de atención** | 🔴 En ALTO este mes y ⚪ sin reporte — con hurtos estimados y mes; click enfoca el mapa |
| **Footer** | Resumen de los módulos y stack |

## Ciclo de selección (cómo interactúan los filtros)

1. El **geo-filtro** del mapa emite `{nivel, departamento, municipio}` → el dash carga la capa y cruza las predicciones del nivel.
2. El **typeahead** marca municipio desde la barra de filtros (mismo pipeline).
3. Los filtros de **mes / riesgo** re-renderizan todo (meses → `/gold/<mes>`).
4. La **fila de análisis** y los gráficos heredan el mismo alcance territorial que los KPIs.

## Rutas del BFF (`/api/dbx/…`)

| Ruta | Fuente (tabla) | Uso en el panel |
|---|---|---|
| `/department` | `departamentos_geo` | capa de departamentos |
| `/department/{código}/municipality` | `municipios_geo` | capa de municipios (sola o por departamento) |
| `/neighborhood` | `municipio_barrios_geo` | capa de barrios (polígonos) |
| `/gold` · `/gold/{mes}` | `hurtos_personas_consolidado` | historial municipal (meses de la historia) |
| `/prediction` | `hurtos_personas_consolidado` (último mes) | estado municipal del mes en curso |
| `/prediction/neighborhood` · `/current` · `/{mes}` | `hurto_personas_prediccion_municipio` + thresholds | predicción y riesgos por barrio |

## Desarrollo local

```bash
# 1. BFF (lee api/.env — copiado de api/.env.example con tus credenciales)
cd api && node local-server.mjs        # http://localhost:4201/api/dbx/*

# 2. Panel (proxy /api/dbx → 4201 lo resuelve proxy.conf.json)
npm start                              # http://localhost:4200
```

## Variables de entorno del BFF

| Variable | Descripción |
|---|---|
| `DATABRICKS_HOST / CLIENT_ID / CLIENT_SECRET / WAREHOUSE_ID` | credenciales M2M del service principal |
| `DBX_CATALOG / DBX_SCHEMA` | espacio de trabajo del warehouse |
| `DBX_TABLE_DEPARTMENT / MUNICIPALITY / NEIGHBORHOOD` | tablas de geografía (columna `geometry` en EWKT) |
| `DBX_TABLE_PRED_NEIGHBORHOOD` | tabla de predicción por barrio |
| `DBX_TABLE_THRESH_BARRIO` | umbrales p_25/p_50/p_75 por barrio |

⚠️ El secret **nunca va al repo** (`api/.env` está ignorada en `.gitignore`) — en
producción se configura como variable de entorno del proyecto en Vercel.

## Despliegue (Vercel)

- `vercel.json` hace el build (`npm run build` → `dist/…/browser`) y redirige
  `/api/dbx/:ruta*` a la función `api/dbx.js`.
- El `environment.ts` de producción ya apunta a `/api/dbx` (mismo origen, sin CORS).
- Las variables del BFF se configuran en **Project → Settings → Environment
  Variables** (Production y Preview).

## Estructura

```
api/                        BFF (local-server + lógica lib/dbx-core.mjs + entrypoint dbx.js)
src/app/models/             modelos de la API (Prediccion, Barrio, Municipio)
src/app/services/           territory.service (fetch, caché), theme, riesgo-color
src/app/ui/container/dash/  orquestador: mapa + un solo pipeline de datos
src/app/ui/widgets/         filtros · geo-filtro · kpi · barras/series/torta · analisis · footer
src/environments/           base URLs por entorno (sin secretos)
```
