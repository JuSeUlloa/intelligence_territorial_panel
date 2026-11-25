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

> **Estado de esta sección:** las entradas se diligencian una por una con el integrante: él indica sobre qué tema genera cada E, y se copia la ficha E-0 con la fecha/hora, la decisión y la verificación correspondiente. **E-1 a E-4 diligenciadas** (las rutas `/bronze`·`/consolidated` y el contexto estructural del panel quedan descritos en el README y el Swagger, sin ficha propia a criterio del integrante). El nivel Básico del Criterio 5 (≥ 3 entradas con decisión y justificación) queda cubierto de sobra; **para la auditoría obligatoria de la sección 4 hace falta una entrada Modificada o Rechazada**.

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
| **Cómo se verificó** | Revisión del README renderizado (títulos, tablas y enlaces correctos); consistencia de las rutas y variables citadas contra `api/lib/dbx-core.mjs`, `api/lib/openapi.mjs` del repo |
| **Evidencia de origen** | N/A|

### E-2 · Documentación Swagger de la API (OpenAPI 3.1)

| Campo | Registro |
| --- | --- |
| **ID** | E-2 |
| **Fecha y hora** | 2026-11-07|
| **Fase · paso** | F3 · Documentación de la API |
| **Integrante que hizo la consulta** | Juan Sebastian Ulloa Parra|
| **Herramienta y modelo** | OpenCode · GLM-5.3-Flash (Z.ai) |
| **Archivo afectado** | `api/lib/openapi.mjs` · `api/lib/dbx-core.mjs` · `scripts/local-server.mjs` |
| **Objetivo de la consulta** | Documentación interactiva de la API, que incluya todos los endpoints y no se desincronice del código |
| **Indicación (resumen)** | «hay forma de habilitar una documentación en swagger para la API?» → «coloca todos los endpoints» → «de acuerdo para generar la documentación» |
| **Qué devolvió la IA** | Módulo `api/lib/openapi.mjs` con un catálogo `PETICIONES` como única fuente de verdad (ruta, resumen, parámetros con validaciones, ejemplos con columnas reales) desde el cual se genera el spec **OpenAPI 3.1**; página de **Swagger UI** por CDN (sin dependencias nuevas); dos rutas nuevas interceptadas en el handler (`/docs` y `/openapi.json`), cubriendo ambas ramas del handler (Vercel Web `Request/Response` y Node local); ajuste del `resLike` del server local para servir HTML crudo (`writeHead`/`end` passthrough) |
| **Datos compartidos con la IA** | Código del router (`dbx-core.mjs`) y `vercel.json` — nombres de rutas y columnas, ningún dato personal |
| **Decisión** | Aceptada |
| **Justificación** | Generar el spec desde el mismo catálogo que alimenta el router evita que la documentación se desincronice con las rutas (p. ej. al agregar `/bronze` o `/consolidated` solo se actualiza el catálogo); Swagger UI por CDN evita dependencias y no agranda el bundle del panel |
| **Cómo se verificó** | Server temporal en :4321 reutilizando el handler real: `GET /docs` → 200 `text/html`; `GET /openapi.json` → 200 con spec 3.1 válido, **16 rutas** y 6 tags (Geografía, Gold, Predicción, Bronze, Consolidado, Utilidades); ejemplos de respuesta con las columnas reales por endpoint (`GOLD_COLS`, `BARRIO_PRED_SELECT`); `node --check` en ambos módulos |
| **Evidencia de origen** | conversación de la sesión 2026-11-07, OpenCode · GLM-5.3-Flash |

### E-3 · Exportación de reportes gold (XLSX/CSV) con alcance geográfico

| Campo | Registro |
| --- | --- |
| **ID** | E-3 |
| **Fecha y hora** | 2026-10-24 |
| **Fase · paso** | F3 · Funcionalidad del panel |
| **Integrante que hizo la consulta** | Juan Sebastian Ulloa Parra |
| **Herramienta y modelo** | OpenCode · GLM-5.3-Flash (Z.ai) |
| **Archivo afectado** | `src/app/utils/exportar.ts` (nuevo) · `filters.ts/html` · `dash.ts/html` · `package.json` (`xlsx`) |
| **Objetivo de la consulta** | Exportar la información gold 2026 por municipio (tasas, predicción, reporte) en XLSX y CSV, respetando la selección del mapa |
| **Indicación (resumen)** | «quiero un botón que me permita exportar la información de gold para municipio de 2026 con la predicción, las tasas e información tipo reporte, en xlsx y csv» · «haz que el exportado sea por la selección sobre el mapa» · «cambia el nombre del archivo… con fecha y hora» |
| **Qué devolvió la IA** | `utils/exportar.ts`: `filasReporteGold()` (observados 2026 + una fila de predicción del mes en curso por municipio, con deduplicación y recorte por `depsExportar`/`munisExportar`), CSV con BOM UTF-8 + `;` + decimales es-CO, XLSX con `import()` dinámico; botón Exportar con menú (oculto en nivel barrio); naming `reporte_mit_<alcance>_<AAAAMMDD>_<HHMM>` |
| **Datos compartidos con la IA** | Estructura de la tabla gold (columnas del modelo `Prediccion`) — datos agregados municipales, sin personales |
| **Decisión** | Aceptada |
| **Justificación** | CSV es-CO (BOM + `;`) abre correcto en Excel regional; el import dinámico evita sumar ~700 kB al bundle inicial (presupuesto de Angular ya en advertencia); el alcance en el nombre del archivo hace trazable cada reporte a su selección geográfica |
| **Cómo se verificó** | `ng build` sin errores (bundle inicial solo +6 kB); 135/135 tests; reporte de prueba con un bloque cronológico por municipio (observados + 1 fila «Predicción») |
| **Evidencia de origen** | conversación de la sesión 2026-10-24, OpenCode · GLM-5.3-Flash |

### E-4 · Bitácora de IA (documento Mixto, diligenciada con IA)

| Campo | Registro |
| --- | --- |
| **ID** | E-4 |
| **Fecha y hora** | 2026-11-9 |
| **Fase · paso** | Documentación del entregable |
| **Integrante que hizo la consulta** | Juan Sebastian Ulloa Parra |
| **Herramienta y modelo** | OpenCode · GLM-5.3-Flash (Z.ai) |
| **Archivo afectado** | `bitacora-ia.md` (elemento «Documentación — Mixto» del inventario de la sección 2) |
| **Objetivo de la consulta** | Diligenciar la bitácora de IA del proyecto (entradas E-n, inventario de elementos arquitectónicos con IA/sin IA, auditoría) y enlazarla desde el README |
| **Indicación (resumen)** | «quiero diligenciar el bitacora-ia.md» → « los identificadores inician por E-» → «genera un E por cada elemento de la lista que tenga con IA o  sea Mixto» |
| **Qué devolvió la IA** | Secciones 1 y 2 diligenciadas (con el inventario por elemento arquitectónico marcando **Sin IA / Con IA / Mixto / Del integrante**), fichas E-n generadas solo sobre los temas indicados por el integrante, auditoría (sección 4) pendiente de diligenciar con la entrada Modificada elegida |
| **Datos compartidos con la IA** | Historia de la propia conversación de trabajo y estructura del repo — sin datos personales |
| **Decisión** | Aceptada |
| **Justificación** | La bitácora es un documento «Mixto» por definición: la IA estructura y redacta a partir del registro real de las sesiones; el integrante define los temas de cada entrada, revisa el contenido y es quien firma la declaración de uso. Automatizar la bitácora sin el control del integrante violaría su propósito  |
| **Cómo se verificó** | Revisión del documento por el integrante |
| **Evidencia de origen** | Opcional : esta misma conversación y las ediciones manuales del integrante en `bitacora-ia.md` |

## 4. Auditoría a la IA

Obligatoria: se documenta al menos un caso en que la IA falló durante el propio proyecto y cómo se corrigió. Suele ser una de las entradas Modificada o Rechazada de la sección 3, desarrollada a fondo.

**Tipo de auditoría** (se marca una):

- [ ] **Real:** la IA produjo el fallo durante el proyecto.
- [ ] **Inducida y declarada:** la IA no produjo un fallo genuino; se le pidió revisar una parte del propio código (p. ej., el bucle o la evaluación) y se auditó su respuesta. Llega como máximo al nivel Autónomo del Criterio 5.

**Qué evidencia corresponde a cada nivel**

| Nivel del Criterio 5 | Qué muestra la auditoría |
| --- | --- |
| **Básico** | La auditoría describe un fallo de la IA, aunque sea de forma genérica (sin la salida literal ni su ubicación). |
| **Autónomo** | La auditoría documenta un fallo real del propio proyecto, con su **evidencia de origen** (salida literal de la IA, o captura de pantalla con fecha y herramienta), la **corrección** y su **fundamento**. Es también el techo de la auditoría inducida y declarada. |
| **Estratégico** | Además, la auditoría **reproduce** el fallo: una celda ejecuta la versión de la IA sobre los datos propios y la misma semilla, y otra ejecuta la versión corregida con la misma medición, que incluye una métrica de decisión (*recall*, matriz o AUC). |

Lo que no es una auditoría: un error propio que la IA corrigió (se registra en la sección 3 como entrada Aceptada, pero no audita a la IA) y un caso que el curso ya publicó, narrado sin evidencia propia (queda como descripción genérica).

> **Estado de esta sección: pendiente.** La auditoría es **obligatoria**: hace falta una entrada **Modificada o Rechazada** en la sección 3 para desarrollar el caso. Nota: el material del caso de escalas (`pres_grup_armados` como índice continuo 0–1, clústeres ordinales de 5 niveles y `null`→0) está documentado en el README y en la conversación de la sesión del 2026-11-08 — si se quiere conservar, basta re-registrarlo como entrada Modificada y desarrollar la ficha sobre él.

### Ficha del caso

| Campo | Registro |
| --- | --- |
| **Entrada de la bitácora** | E-5 |
| **Contexto** | Fase 3, panel de despliegue: la IA había implementado la ventana de «contexto estructural» que muestra las variables de la tabla `consolidado` (`/consolidated`), coloreando las celdas por severidad. Al pedirle explicar la clasificación de «presencia de grupos armados», se puso en duda la escala asumida por la IA |
| **Qué dijo la IA** | (1) Trató `pres_grup_armados` como variable **binaria** 0/1 y mostraba el badge «Gr. armados: Presente» con la condición `valor > 0`; (2) mapeó los clústeres ordinales por inclusión de texto (`includes('ALTO')`), con lo cual «Medio Alto» se coloreaba igual que «Alto» (rojo máximo); (3) el parser `VariablesConsolidadas.from()` convertía los `null` de los índices en `0` con `Number(null) = 0` |
| **Evidencia de origen** | Salida literal de la consulta de distribución ejecutada sobre `/consolidated` (1120 filas): `pres_grup_armados: 0.07488701 → 193 \| null → 119 \| 0.08572472 → 51 \| …` · percentiles `p50 0.0976 · p90 0.245 · max 0.514` · `cluster_rv: Medio Bajo → 376 \| Bajo → 342 \| Medio → 207 \| Medio Alto → 109 \| Alto → 86` — copiar a `bitacora/E-5.png` |
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
