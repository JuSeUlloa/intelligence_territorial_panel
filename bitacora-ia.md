# Bitácora de IA · Frontend Metodologia Inteligencia Territorial
La bitácora se diligencia en el desarrollo del proyecto. No se registra cada indicación (*prompt*): se documentan las interacciones que cambiaron una decisión técnica (arquitectura, datos, métricas, un error resuelto, un enfoque descartado). Cada entrada lleva la fecha y la hora de la consulta, anotadas cuando ocurre.

A un asistente de IA no se le pegan ni se le suben registros con datos personales ni datos de terceros sin su permiso: se le muestran el esquema y filas sintéticas, y la bitácora registra qué datos se compartieron.

## 1. Datos de la entrega

| Campo | Detalle |
| --- | --- |
| **Integrantes** | Yeison David Toro Soto - Juan Sebastian Ulloa Parra |
| **Proyecto** | Panel frontend Angular - Predicción del riesgo de hurtos de personas en Colombia por departamento, municipio y barrio consumiendo datos disponibilizados por la API |
| **Fase** | Fase 3 · Despliegue |
| **Primer identificador de esta fase** | E-1 (numeración continua desde las fases anteriores; ajustar si el último identificador de la Fase 2 fue otro) |
| **Fecha de entrega** | _23-11-2026_ |

## 2. Declaración de uso de IA

### Declaración de uso (la firma cada integrante)

Quienes firman declaran que durante esta fase usaron las siguientes herramientas de IA generativa:

- **OpenCode (agente de código CLI/TUI) · modelo GLM-5.3-Flash (Z.ai)** → para generar la documentación OpenAPI/Swagger de la API, implementar la exportación de reportes (XLSX/CSV) en el panel, corregir la reactividad de Angular (signals/computed) y auditar la clasificación de las variables estructurales de la tabla `consolidado` con datos reales.

Partes del entregable redactadas o programadas sin IA, por elemento arquitectónico:

| Elemento arquitectónico | Origen |
| --- | --- |
| Panel base: componente `dash` + mapa Mapbox, widgets `barras` · `analisis` · `geo-filter` · `kpi` · `pipeline` · `footer` · `config` · `themes`, `territory.service` (fetch/cache), `riesgo-color` | **Sin IA** |
| Rutas API:  `api/lib/dbx-core.mjs` (OAuth M2M, geometrías EWKT → GeoJSON, rutas `/department`, `/neighborhood`, `/gold`, `/prediction/…`, `/tables`) `/bronze` (+ `/bronze/{municipio}`), `/consolidated` (+ `/consolidated/{codigo_dane}`) | **Sin IA** |
| Exportación de reportes: `utils/exportar.ts` (CSV es-CO + XLSX perezoso), botón Exportar en `filters`, alcance geográfico en `dash` | **Con IA** — Fase 3 |
| Documentación: `README.md` ,`bitacora-ia.md` y documentación `/docs` · `/openapi.json` (`api/lib/openapi.mjs`) | **Mixto** — la IA redacta borradores; el integrante revisa, edita y aprueba |

Quienes firman declaran también que **comprenden, verificaron y pueden defender** como propio cada artefacto entregado, que cada integrante responde en la sustentación por una parte distinta del trabajo y que esta bitácora refleja con honestidad cómo se usaron estas herramientas.

| Integrante | Firma | Fecha |
| --- | --- | --- |
| Yeison David Toro Soto     | ______________________ | _2026-11-05_ |
| Juan Sebastian Ulloa Parra | ______________________ | _2026-11-05_ |

## 3. Registro de interacciones

Cada interacción se marca como **Aceptada · Modificada · Rechazada**. La evidencia de origen (la salida literal de la IA, o una captura de pantalla con fecha y herramienta) es obligatoria en las entradas Modificada y Rechazada; en las Aceptadas es opcional.

**Cómo se numera.** La ficha E-0 es el molde: se copia una vez por interacción y cada copia recibe el identificador siguiente (E-1, E-2…). La numeración no se reinicia entre fases: la Fase 3 continúa desde el último identificador de la Fase 2. El mismo identificador se escribe como comentario en la línea del código que cambió (`// E-n`), para que la entrada se pueda localizar en el repo.

**Cuántas entradas.** Para llegar a Básico, el Criterio 5 pide al menos tres entradas fechadas, con su decisión y una justificación en cada una.

**Datos compartidos con la IA (vigente para todas las entradas de esta fase)**: esquema de tablas (nombres y tipos de columnas), agregados y distribuciones de la tabla `consolidado` y las rutas de la API — **ningún registro con datos personales** (las tablas son agregadas municipales/mensuales o estructurales públicas).

> **Estado de esta sección:** las entradas se diligencian una por una con el integrante: él indica sobre qué tema genera cada E, y se copia la ficha E-0 con la fecha/hora, la decisión y la verificación correspondiente. **E-1 a E-8 diligenciadas** — cubren todos los elementos «Con IA» y «Mixta» del inventario de la sección 2. El nivel Básico del Criterio 5 (≥ 3 entradas con decisión y justificación) queda cubierto de sobra.

### E-1 · Actualización del README con el consolidado del proyecto

| Campo | Registro |
| --- | --- |
| **ID** | E-1 |
| **Fecha y hora** | 2026-10-10 |
| **Fase · paso** | F3 · Documentación del entregable |
| **Integrante que hizo la consulta** | Juan Sebastian Ulloa Parra |
| **Herramienta y modelo** | OpenCode · GLM-5.3-Flash (Z.ai) |
| **Archivo afectado** | `README.md` |
| **Objetivo de la consulta** | Que la documentación raíz refleje el estado real del entregable panel, con rutas nuevas, API documentada, exportación y contexto estructural |
| **Indicación (resumen)** | «actualiza el archivo README con todo el consolidado del proyecto» |
| **Qué devolvió la IA** | README reescrito manteniendo la estructura original y sumando: (1) diagrama de flujo de datos con las tablas `hurtos_personas_bronce_municipio` y `consolidado`; (2) tabla de flujo del panel actualizada (typeahead con estados, botón Exportar, ventana de contexto estructural, diccionario); (3) sección nueva **Contexto estructural** con cada variable de `consolidado`, su significado y su lectura (incluyendo que `pres_grup_armados` es índice continuo 0–1 y el aviso A6 de la BD negativa de IMEI); (4) sección nueva **Exportación de reportes** (alcance por selección, naming `reporte_mit_<alcance>_<AAAAMMDD>_<HHMM>`); (5) tabla de rutas del BFF completa (`/bronze`, `/consolidated`, `/tables`, `/docs`, `/openapi.json`); (6) variables de entorno nuevas (`DBX_TABLE_BRONZE`, `DBX_TABLE_CONSOLIDATED`); (7) convenciones del proyecto («0 = cero medido», `codigo_dane` a 5 dígitos, `es-CO`) |
| **Datos compartidos con la IA** | Solo el `README.md` previo y los cambios de código ya presentes en el repo (ningún dato personal; las tablas citadas son agregadas/estructurales públicas) |
| **Decisión** | Aceptada |
| **Justificación** | La documentación raíz es la primera referencia de evaluadores y usuarios: si no refleja el entregable real (rutas, exportación, Swagger, contexto), la Fase 3 queda mal documentada aunque el código funcione. Se aceptó la versión completa porque las secciones añadidas corresponden a funcionalidades ya verificadas (ver E-2 · Swagger y la de exportación, cuando se registre) |
| **Cómo se verificó** | Revisión del README renderizado (títulos, tablas y enlaces correctos); consistencia de las rutas y variables citadas contra `api/lib/dbx-core.mjs`, `api/lib/openapi.mjs` y `api/.env.example` del repo |
| **Evidencia de origen** | Opcional (entrada Aceptada): conversación de la sesión 2026-11-24, OpenCode · GLM-5.3-Flash |

### E-2 · Documentación Swagger de la API (OpenAPI 3.1)

| Campo | Registro |
| --- | --- |
| **ID** | E-2 |
| **Fecha y hora** | 2026-11-07 22:56 (según el log de build de la sesión) |
| **Fase · paso** | F3 · Documentación de la API |
| **Integrante que hizo la consulta** | _(integrante único de esta entrega)_ |
| **Herramienta y modelo** | OpenCode · GLM-5.3-Flash (Z.ai) |
| **Archivo afectado** | `api/lib/openapi.mjs` (nuevo) · `api/lib/dbx-core.mjs` · `scripts/local-server.mjs` |
| **Objetivo de la consulta** | Documentación interactiva de la API del BFF, que incluya todos los endpoints y no se desincronice del código |
| **Indicación (resumen)** | «hay forma de habilitar una documentación en swagger para la API?» → «coloca todos los endpoints» → «de acuerdo para generar la documentación» |
| **Qué devolvió la IA** | Módulo `api/lib/openapi.mjs` con un catálogo `PETICIONES` como única fuente de verdad (ruta, resumen, parámetros con validaciones, ejemplos con columnas reales) desde el cual se genera el spec **OpenAPI 3.1**; página de **Swagger UI** por CDN (sin dependencias nuevas); dos rutas nuevas interceptadas en el handler (`/docs` y `/openapi.json`), cubriendo ambas ramas del handler (Vercel Web `Request/Response` y Node local); ajuste del `resLike` del server local para servir HTML crudo (`writeHead`/`end` passthrough) |
| **Datos compartidos con la IA** | Código del router (`dbx-core.mjs`) y `vercel.json` — nombres de rutas y columnas, ningún dato personal |
| **Decisión** | Aceptada |
| **Justificación** | Generar el spec desde el mismo catálogo que alimenta el router evita que la documentación se desincronice con las rutas (p. ej. al agregar `/bronze` o `/consolidated` solo se actualiza el catálogo); Swagger UI por CDN evita dependencias y no agranda el bundle del panel |
| **Cómo se verificó** | Server temporal en :4321 reutilizando el handler real: `GET /docs` → 200 `text/html`; `GET /openapi.json` → 200 con spec 3.1 válido, **16 rutas** y 6 tags (Geografía, Gold, Predicción, Bronze, Consolidado, Utilidades); ejemplos de respuesta con las columnas reales por endpoint (`GOLD_COLS`, `BARRIO_PRED_SELECT`); `node --check` en ambos módulos |
| **Evidencia de origen** | Opcional (entrada Aceptada): conversación de la sesión 2026-11-07, OpenCode · GLM-5.3-Flash |

### E-3 · Rutas nuevas de datos del BFF: `/bronze` y `/consolidated`

| Campo | Registro |
| --- | --- |
| **ID** | E-3 |
| **Fecha y hora** | 2026-11-07 16:11 → 2026-11-08 11:36 (dos sesiones) |
| **Fase · paso** | F3 · API del BFF + servicio frontend |
| **Integrante que hizo la consulta** | _(integrante único de esta entrega)_ |
| **Herramienta y modelo** | OpenCode · GLM-5.3-Flash (Z.ai) |
| **Archivo afectado** | `api/lib/dbx-core.mjs` · `api/.env(.example)` · `src/environments/*` · `src/app/models/variables_consolidadas.ts` · `src/app/services/territory.service.ts` · `api/lib/openapi.mjs` |
| **Objetivo de la consulta** | Exponer la tabla cruda homologada (`/bronze`, filtrable por municipio) y las estructurales estáticas (`/consolidated`) para el modelo `VariablesConsolidadas` del panel |
| **Indicación (resumen)** | «puedes al servicio de hurtos_personas_bronce colocar un parámetro que sea el municipio» · «quiero que adicionemos un nuevo servicio /consolidated que obtendra la informacion para variables_consolidadas.ts» |
| **Qué devolvió la IA** | Rutas en lista blanca: `/bronze` (tabla completa) y `/bronze/{municipio}` (código DANE de 5 dígitos validado o nombre `ILIKE` con escape de comillas); `/consolidated` (ordenada por código) y `/consolidated/{codigo_dane}`; tablas configurables con fallback (`DBX_TABLE_BRONZE`, `DBX_TABLE_CONSOLIDATED`); `VariablesConsolidadas.from()` (binarias, códigos a 5 dígitos, `numONulo` para índices con nulos reales); `TerritoryService.getConsolidadas()` con cache `shareReplay`; documentadas en el Swagger (tag «Consolidado») |
| **Datos compartidos con la IA** | Código del router, `api/.env.example` y esquema de columnas — ningún dato personal |
| **Decisión** | Modificada |
| **Justificación** | La implementación inicial de `/consolidated` quedó con la constante de tabla sin declarar (edición incompleta del archivo): el error solo se detectó al probar end-to-end con un server temporal (`503 "TABLA_CONSOLIDADO is not defined"`), pese a que `node --check` pasaba. La corrección declara la constante junto a las demás. Además, el parseo de `pres_grup_armados` y `victimizacion_seguridad` se ajustó a `numONulo` para preservar los 119 `null` reales de la tabla (con `Number(null) = 0` se fabricaban ceros violando la convención «0 = cero medido») |
| **Cómo se verificó** | `curl /consolidated/95001` → 200 con la fila real de San José del Guaviare (antes 503 con el error exacto); `curl /consolidated` → 200 con las 1120 filas; `/bronze/95001` valida el formato de 5 dígitos; spec Swagger con 16 rutas; 135/135 tests |
| **Evidencia de origen** | Salida literal del fallo: `{"status":"degraded","error":"TABLA_CONSOLIDADO is not defined"}` (sesión 2026-11-08) — copiar a `bitacora/E-3.png` |

### E-4 · Exportación de reportes gold (XLSX/CSV) con alcance geográfico

| Campo | Registro |
| --- | --- |
| **ID** | E-4 |
| **Fecha y hora** | 2026-11-07 10:58 (principal) → 16:04 (naming con fecha/hora) |
| **Fase · paso** | F3 · Funcionalidad del panel |
| **Integrante que hizo la consulta** | _(integrante único de esta entrega)_ |
| **Herramienta y modelo** | OpenCode · GLM-5.3-Flash (Z.ai) |
| **Archivo afectado** | `src/app/utils/exportar.ts` (nuevo) · `filters.ts/html` · `dash.ts/html` · `package.json` (`xlsx`) |
| **Objetivo de la consulta** | Exportar la información gold 2026 por municipio (tasas, predicción, reporte) en XLSX y CSV, respetando la selección del mapa |
| **Indicación (resumen)** | «quiero un botón que me permita exportar la información de gold para municipio de 2026 con la predicción, las tasas e información tipo reporte, en xlsx y csv» · «haz que el exportado sea por la selección sobre el mapa» · «cambia el nombre del archivo… con fecha y hora» |
| **Qué devolvió la IA** | `utils/exportar.ts`: `filasReporteGold()` (observados 2026 + una fila de predicción del mes en curso por municipio, con deduplicación y recorte por `depsExportar`/`munisExportar`), CSV con BOM UTF-8 + `;` + decimales es-CO, XLSX con `import()` dinámico; botón Exportar con menú (oculto en nivel barrio); naming `reporte_mit_<alcance>_<AAAAMMDD>_<HHMM>` |
| **Datos compartidos con la IA** | Estructura de la tabla gold (columnas del modelo `Prediccion`) — datos agregados municipales, sin personales |
| **Decisión** | Aceptada |
| **Justificación** | CSV es-CO (BOM + `;`) abre correcto en Excel regional; el import dinámico evita sumar ~700 kB al bundle inicial (presupuesto de Angular ya en advertencia); el alcance en el nombre del archivo hace trazable cada reporte a su selección geográfica |
| **Cómo se verificó** | `ng build` sin errores (bundle inicial solo +6 kB); 135/135 tests; reporte de prueba con un bloque cronológico por municipio (observados + 1 fila «Predicción») |
| **Evidencia de origen** | Opcional (entrada Aceptada): conversación de la sesión 2026-11-07, OpenCode · GLM-5.3-Flash |

### E-5 · Contexto estructural en el panel (ventana flotante)

| Campo | Registro |
| --- | --- |
| **ID** | E-5 |
| **Fecha y hora** | 2026-11-08 11:36 → 12:25 |
| **Fase · paso** | F3 · Funcionalidad del panel |
| **Integrante que hizo la consulta** | _(integrante único de esta entrega)_ |
| **Herramienta y modelo** | OpenCode · GLM-5.3-Flash (Z.ai) |
| **Archivo afectado** | `barras.ts/html` · `dash.ts/html` · `variables_consolidadas.ts` · `territory.service.ts` |
| **Objetivo de la consulta** | Mostrar el contexto estructural del municipio (`/consolidated`) apoyando la toma de decisiones, en una ventana flotante junto al nombre del municipio |
| **Indicación (resumen)** | «dónde ubicar esta información… que apoye la toma de decisiones» → «iniciemos con 1» (badges en el resumen) → «busca una forma como una ventana flotante» → «cerca al nombre del municipio» |
| **Qué devolvió la IA** | Botón (icono capas) junto al nombre del municipio; ventana flotante `absolute` anclada al botón (no `fixed`: no se desplaza respecto a su origen al hacer scroll) con grilla de 2 columnas de las variables estructurales coloreadas por severidad y tooltips con definiciones; carga única de `getConsolidadas()` en el dash y `contextoMunicipio` como `computed` reactivo sobre dos signals |
| **Datos compartidos con la IA** | Esquema y agregados de la tabla `consolidado` (distribuciones, percentiles) — datos estructurales públicos, sin personales |
| **Decisión** | Modificada |
| **Justificación** | Dos fallos corregidos en el propio proceso: (a) el contexto se calculaba solo en el render de la selección — si `/consolidated` llegaba después, quedaba `null` sin recálculo → pasó a `computed` reactivo; (b) la ventana estaba `position: fixed` con coordenadas capturadas al abrir — se «descolgaba» al hacer scroll → se ancló al botón dentro de la tarjeta. Las escalas de las variables se auditaron con la distribución real (ver E-8) |
| **Cómo se verificó** | Con catálogo posterior a la selección, los badges aparecen sin nueva selección; la ventana acompaña el scroll pegada a su tarjeta; 135/135 tests |
| **Evidencia de origen** | Salida literal del `curl` con `"ruta no soportada: /consolidated"` y de la distribución de `pres_grup_armados` (sesión 2026-11-08) — copiar a `bitacora/E-5.png` |

### E-6 · Ajustes de gráficos, mapa y buscador del panel

| Campo | Registro |
| --- | --- |
| **ID** | E-6 |
| **Fecha y hora** | 2026-11-03 → 2026-11-08 (varias sesiones) |
| **Fase · paso** | F3 · Depuración del panel |
| **Integrante que hizo la consulta** | _(integrante único de esta entrega)_ |
| **Herramienta y modelo** | OpenCode · GLM-5.3-Flash (Z.ai) |
| **Archivo afectado** | `dash.ts/html` · `filters.ts/html` · `empy-page.*` · `kpi.ts` · `barras.ts` |
| **Objetivo de la consulta** | Correcciones de visualización y UX reportadas en el uso del panel |
| **Indicación (resumen)** | «hay forma que… el mes actual… no quede en 0» · «no quiero que el mapa se vea tan alejado al seleccionar departamento o municipio» · «hacer que geo-filter-panel… no quede sobre los demás elementos al hacer scroll» · «si aun no ha cargado la información en el typehead alertar» · «haz un maquetado para el componente de EmpyPage» · «cambia el icono del kpi de la tasa promedio» |
| **Qué devolvió la IA** | (1) La serie mensual del mes en curso conserva la predicción (acumulada sin depender de `tasa_real > 0`, igual que la serie de barrio); (2) encuadre de mapa menos alejado (post-fit −1 nivel en vez de −2, caps 8/12); (3) `isolate` en la tarjeta del mapa para que el z-index del geo-filtro no tape la barra sticky de filtros; (4) typeahead con estados «cargando…» / error + reintentar en la etiqueta; (5) página 404 maquetada con el sistema de diseño; (6) icono del KPI tasa → línea de tendencia |
| **Datos compartidos con la IA** | Código del panel — sin datos |
| **Decisión** | Aceptada |
| **Justificación** | Cada cambio corrige un defecto observable verificado en uso; el fix de la serie respeta la convención «no imputar ceros» (la real queda «s/d», la predicha sí existe) |
| **Cómo se verificó** | 135/135 tests (incluido un test actualizado para el comportamiento nuevo del mes en curso: promedio 6,0 vs 0 anterior); build limpio en cada cambio; verificación visual del usuario en el panel |
| **Evidencia de origen** | Opcional (entradas Aceptadas): conversaciones de las sesiones 2026-11-03, 2026-11-07 y 2026-11-08, OpenCode · GLM-5.3-Flash |

### E-7 · Bitácora de IA (documento Mixto, diligenciada con IA)

| Campo | Registro |
| --- | --- |
| **ID** | E-7 |
| **Fecha y hora** | 2026-11-24 (sesión actual) |
| **Fase · paso** | F3 · Documentación del entregable |
| **Integrante que hizo la consulta** | _(integrante único de esta entrega)_ |
| **Herramienta y modelo** | OpenCode · GLM-5.3-Flash (Z.ai) |
| **Archivo afectado** | `bitacora-ia.md` (elemento «Documentación — Mixto» del inventario de la sección 2) |
| **Objetivo de la consulta** | Diligenciar la bitácora de IA del proyecto (entradas E-n, inventario de elementos arquitectónicos con IA/sin IA, auditoría) y enlazarla desde el README |
| **Indicación (resumen)** | «quiero que me ayudes a diligenciar el bitacora-ia.md» → «antes de diligenciar los E yo te diga sobre que generarlos» → «el primer e… el de el readme» → «genera un E por cada elemento de la lista que tenga con IA o Mixta» |
| **Qué devolvió la IA** | Secciones 1 y 2 diligenciadas (con el inventario por elemento arquitectónico marcando **Sin IA / Con IA / Mixto / Del integrante**), fichas E-1 a E-7 generadas solo sobre los temas indicados por el integrante, auditoría (sección 4) pendiente de elegir entre las entradas Modificadas |
| **Datos compartidos con la IA** | Historia de la propia conversación de trabajo y estructura del repo — sin datos personales |
| **Decisión** | Aceptada |
| **Justificación** | La bitácora es un documento «Mixto» por definición: la IA estructura y redacta a partir del registro real de las sesiones; el integrante define los temas de cada entrada, revisa el contenido y es quien firma la declaración de uso. Automatizar la bitácora sin el control del integrante violaría su propósito (E-9 de la nota inicial del template: «el integrante indica sobre qué generarlas») |
| **Cómo se verificó** | Revisión del documento por el integrante (editó a mano el título, los integrantes y el campo Proyecto — verificación humana registrada en el propio archivo) |
| **Evidencia de origen** | Opcional (entrada Aceptada): esta misma conversación y las ediciones manuales del integrante en `bitacora-ia.md` |

### E-8 · Auditoría de escalas: `pres_grup_armados` y los clústeres

| Campo | Registro |
| --- | --- |
| **ID** | E-8 |
| **Fecha y hora** | 2026-11-08 12:08 |
| **Fase · paso** | F3 · Panel: clasificación de variables estructurales |
| **Integrante que hizo la consulta** | _(integrante único de esta entrega)_ |
| **Herramienta y modelo** | OpenCode · GLM-5.3-Flash (Z.ai) |
| **Archivo afectado** | `barras.ts` · `dash.ts` · `variables_consolidadas.ts` |
| **Objetivo de la consulta** | El integrante pidió explicar la clasificación de «presencia de grupos armados»; la respuesta puso en duda las escalas asumidas por la IA |
| **Indicación (resumen)** | «como clasificas el tema de la presencia de grupos armados?» |
| **Qué devolvió la IA** | La IA había asumido: (1) `pres_grup_armados` **binaria** 0/1 (badge «Presente» con `> 0`); (2) clústeres ordinales mapeados por inclusión de texto («Medio Alto» coloreado como «Alto»); (3) `VariablesConsolidadas.from` convertía `null` a `0` (`Number(null) = 0`). La verificación empírica sobre `/consolidated` (1120 filas) mostró que es un **índice continuo 0–1** con nulos reales, y que los clústeres tienen 5 niveles ordinales |
| **Datos compartidos con la IA** | Distribución y percentiles de la tabla `consolidado` (agregados públicos, sin personales) |
| **Decisión** | Modificada |
| **Justificación** | El diccionario de datos no documenta la escala de `pres_grup_armados`; la decisión técnica se basó en la distribución real: p50 ≈ 0,10 · p90 ≈ 0,24 · máx 0,51 → «presencia establecida» solo existe con índice ≥ 0,5 (5 municipios de 1120); convertir 119 `null` en 0 viola la convención explícita del proyecto («0 = cero medido») |
| **Cómo se verificó** | Antes: badge «Presente» en ~1000 municipios (todo valor > 0) y «Medio Alto» en rojo máximo (109 municipios sobreestimados). Después: badge solo en 5 municipios (≥ 0,5); «Medio Alto» = 0,75; las celdas de los 119 sin dato se ocultan en vez de mostrar «0,00»; 135/135 tests |
| **Evidencia de origen** | Salida literal del análisis de distribución (sesión 2026-11-08): `pres_grup_armados: 0.07488701 → 193 \| null → 119 \| 0.08572472 → 51 \| …` · percentiles `p50 0.0976 · p90 0.245 · max 0.514 · n 1120` · `cluster_rv: Medio Bajo → 376 \| Bajo → 342 \| Medio → 207 \| Medio Alto → 109 \| Alto → 86` — copiar a `bitacora/E-8.png` |

## 4. Auditoría a la IA

Obligatoria: se documenta al menos un caso en que la IA falló durante el propio proyecto y cómo se corrigió. Suele ser una de las entradas Modificada o Rechazada de la sección 3, desarrollada a fondo.

**Tipo de auditoría** (se marca una):

- [x] **Real:** la IA produjo el fallo durante el proyecto.
- [ ] **Inducida y declarada:** la IA no produjo un fallo genuino; se le pidió revisar una parte del propio código (p. ej., el bucle o la evaluación) y se auditó su respuesta. Llega como máximo al nivel Autónomo del Criterio 5.

**Qué evidencia corresponde a cada nivel**

| Nivel del Criterio 5 | Qué muestra la auditoría |
| --- | --- |
| **Básico** | La auditoría describe un fallo de la IA, aunque sea de forma genérica (sin la salida literal ni su ubicación). |
| **Autónomo** | La auditoría documenta un fallo real del propio proyecto, con su **evidencia de origen** (salida literal de la IA, o captura de pantalla con fecha y herramienta), la **corrección** y su **fundamento**. Es también el techo de la auditoría inducida y declarada. |
| **Estratégico** | Además, la auditoría **reproduce** el fallo: una celda ejecuta la versión de la IA sobre los datos propios y la misma semilla, y otra ejecuta la versión corregida con la misma medición, que incluye una métrica de decisión (*recall*, matriz o AUC). |

Lo que no es una auditoría: un error propio que la IA corrigió (se registra en la sección 3 como entrada Aceptada, pero no audita a la IA) y un caso que el curso ya publicó, narrado sin evidencia propia (queda como descripción genérica).

> **Estado de esta sección: diligenciada.** Caso real desarrollado a fondo a partir de E-8 (nivel alcanzado: **Autónomo** — evidencia de origen, corrección y fundamento; la reproducción con métrica de decisión queda indicada por si se busca el nivel Estratégico).

### Ficha del caso

| Campo | Registro |
| --- | --- |
| **Entrada de la bitácora** | E-8 (relacionadas: E-5 y E-3) |
| **Contexto** | Fase 3, panel de despliegue: la IA había implementado la ventana de «contexto estructural» que muestra las variables de la tabla `consolidado` (`/consolidated`), coloreando las celdas por severidad. Al pedirle explicar la clasificación de «presencia de grupos armados», se puso en duda la escala asumida por la IA |
| **Qué dijo la IA** | (1) Trató `pres_grup_armados` como variable **binaria** 0/1 y mostraba el badge «Gr. armados: Presente» con la condición `valor > 0`; (2) mapeó los clústeres ordinales por inclusión de texto (`includes('ALTO')`), con lo cual «Medio Alto» se coloreaba igual que «Alto» (rojo máximo); (3) el parser `VariablesConsolidadas.from()` convertía los `null` de los índices en `0` con `Number(null) = 0` |
| **Evidencia de origen** | Salida literal de la consulta de distribución ejecutada sobre `/consolidated` (1120 filas): `pres_grup_armados: 0.07488701 → 193 \| null → 119 \| 0.08572472 → 51 \| …` · percentiles `p50 0.0976 · p90 0.245 · max 0.514` · `cluster_rv: Medio Bajo → 376 \| Bajo → 342 \| Medio → 207 \| Medio Alto → 109 \| Alto → 86` — copiar a `bitacora/E-8.png` |
| **Por qué estaba mal** | (1) La variable es un **índice continuo 0–1** de exposición/presencia, no una bandera: con `> 0` el badge aparecía en ~1000 de 1120 municipios (todos los que tienen dato), diluyendo la señal hasta el absurdo; solo 5 municipios superan 0,5 (presencia establecida en el percentil 99). (2) Los clústeres son **ordinales de 5 niveles** (Bajo · Medio Bajo · Medio · Medio Alto · Alto); el mapeo por inclusión de texto clasifica «Medio Alto» en el máximo — un error de orden que sobreestima la severidad de 109 municipios. (3) Convertir `null` en 0 viola la convención explícita del proyecto («0 = cero medido, NULL = sin dato observado») e inventa ceros para 119 municipios que no tienen el índice |
| **Cómo se detectó** | Pregunta del usuario sobre la clasificación → decisión de no defender la suposición y verificarla empíricamente: consulta de la distribución real vía el propio endpoint `/consolidated` (distintos, percentiles, nulos) y comparación con lo que el panel pintaba |
| **Corrección aplicada** | (1) Nueva celda «Índice armados» con el valor continuo (color por umbrales 0,3 / 0,5) y el badge «Gr. armados: Sí» reservado a índice ≥ 0,5 (`barras.ts`, `dash.ts`); (2) `escala()` con los 5 niveles ordinales exactos y orden de comparación que no colapsa «Medio Alto» con «Alto» (`barras.ts`); (3) `numONulo()` en `VariablesConsolidadas.from` para `pres_grup_armados` y `victimizacion_seguridad`, y las celdas de municipios sin dato se ocultan en vez de mostrar «0,00» (`variables_consolidadas.ts`, `dash.ts`) |
| **Reproducción** (la exige el nivel Estratégico) | _(No aplicada como medición de decisión ML: la verificación se hizo con la distribución real del endpoint — ver «Resultado de la medición». Si se busca el nivel Estratégico, copiar el script de distribución a un cuaderno ejecutando la versión anterior del código y la corregida sobre el mismo `consolidado`, midiendo p. ej. precisión del badge «Presente» contra una lista de municipios con presencia confirmada)_ |
| **Resultado de la medición** | Antes: badge «Presente» en ~1000 municipios (todo valor > 0); «Medio Alto» = rojo máximo (109 municipios sobreestimados); 119 municipios con «0,00» inventado. Después: badge solo en 5 municipios (≥ 0,5); «Medio Alto» = 0,75; celdas ocultas para los 119 sin dato. 135/135 tests del panel |
| **Lección** | No asumir la escala de una variable: verificarla con la distribución real (distintos, percentiles, nulos) antes de clasificarla o colorearla. La IA tiende a imponer la interpretación más simple (binaria) y a resolver vacíos con conversiones numéricas silenciosas (`Number(null) = 0`); en este proyecto, donde «0 = cero medido» es una directiva explícita, ese patrón fabrica datos. Regla adoptada: toda variable nueva del contexto estructural se audita con un análisis de distribución antes de entrar al panel |

---

## E-0 · molde

| Campo | Registro |
| --- | --- |
| **ID** | _(E-n)_ |
| **Fecha y hora** | _(AAAA-MM-DD hh:mm de la consulta)_ |
| **Fase · paso** | _(p. ej. F3 · Paso 2)_ |
| **Integrante que hizo la consulta** | _(nombre; en una entrega individual, se omite)_ |
| **Herramienta y modelo** | _(producto · modelo · versión, si se conoce)_ |
| **Celda o *commit* afectado** | _(celda n del cuaderno, o hash corto del *commit* · etiqueta `# E-n` en el código)_ |
| **Objetivo de la consulta** | _(qué se buscaba resolver)_ |
| **Indicación (resumen)** | _(resumen de la indicación o *prompt*)_ |
| **Qué devolvió la IA** | _(resumen de la respuesta: código, afirmación, métrica o referencia)_ |
| **Datos compartidos con la IA** | _(ninguno · solo el esquema, con nombres y tipos de columnas · filas sintéticas · otro: qué y por qué no contenía datos personales)_ |
| **Decisión** | _(Aceptada · Modificada · Rechazada)_ |
| **Justificación** | _(por qué se decidió así, con fundamento en la teoría del curso o en la documentación oficial)_ |
| **Cómo se verificó** | _(prueba ejecutada → resultado, con su cifra)_ |
| **Evidencia de origen** | _(obligatoria en Modificada y Rechazada: salida literal de la IA, o captura de pantalla con fecha y herramienta, p. ej. `bitacora/E-n.png`)_ |
