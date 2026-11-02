# Diccionario de Datos — Silver y Features del Modelo

> Referencia de las variables que genera la capa **SILVER**
> (`utils/domains.py`) y las que consume el **modelo XGBoost**
> (`models/xgboots_model.py`). Complementa `tecnical-analisis.md`
> (análisis técnico) y `README.md` (operación).
>
> Resumen: **46 features numéricos + 4 categóricos + 2 calendario**,
> target = tasa por 100k habitantes.

---

## 0. Convenciones

- **Grano de Silver**: 1 fila = `codigo_dane` (municipio) × `anio` × `mes`.
  Es una **malla completa** (spine): todo municipio tiene fila cada mes
  aunque no haya hurtos.
- **Integridad**: `NULL` = mes sin dato observado; `0` = cero medido.
  Nunca se imputa con ceros (directiva del proyecto).
- **Filtro de entrenamiento**: solo filas con `hay_observacion = 1`
  (o ceros "plausibles": municipios con ≈3 casos/mes — ver
  `LAMBDA_MAX_CERO_PLAUSIBLE`).
- **Fuentes**: columnas marcadas `silver` nacen en las CTEs de
  `utils/domains.py`; marcadas `consolidado` vienen de la tabla
  `consolidado` (una fila por municipio, estáticas) y se cruzan con
  `INNER JOIN … ON codigo_dane = codigo_municipio`.

---

## Bloque 1 · Identificación (no entras como features)

| Variable | Tipo | Fuente | Significado |
|---|---|---|---|
| `municipio` | string | silver | Nombre del municipio (DANE) |
| `codigo_dane` | string | silver | Código DANE normalizado a 5 dígitos (ej. `05001`). **Llave** de cruce con `consolidado` y de partición de las ventanas |
| `departamento` | string | silver | Nombre del departamento |
| `hay_observacion` | 0/1 | silver | 1 = mes con dato real en la fuente; 0 = fila generada por la malla. **Filtro de entrenamiento** |

---

## Bloque 2 · Calendario (features)

| Variable | Tipo | Fuente | Definición | Por qué entra |
|---|---|---|---|---|
| `mes` | int | silver | Mes 1–12 | Estacionalidad (dic≈alzas, feb≈bajas). El árbol la captura con splits, sin one-hot. |
| `anio` | int | silver | Año 2021+ | Tendencia de largo plazo / efecto año. |

---

## Bloque 3 · Autorregresivo temporal (10 features) — la señal dominante

Todas nacen en la CTE `temporal` con
`LAG(total_tematica, n) OVER (PARTITION BY codigo_dane ORDER BY anio, mes)`:

| Variable | Definición | Importancia vigente |
|---|---|---|
| `total_lag_1` | Total de hurtos del mes t−1 | **18.7%** — señal más fuerte; disponible al momento de predecir (es t−1), sin fuga |
| `total_lag_2` | t−2 | Momentum corto |
| `total_lag_3` | t−3 | Trimestre anterior |
| `total_lag_6` | t−6 | Semestre anterior |
| `total_lag_12` | t−12 | "Mismo mes del año anterior". **Cuidado**: si hay huecos en la serie NO es el mismo mes del año anterior — lo complementan los `n_obs_*`. |
| `media_movil_3_meses` | `AVG(total_tematica)` de 3 meses, **gated**: solo se emite si `n_obs_3 = 3` exacto; si no → NULL + flag | **16.8%** — suaviza ruido, línea base trimestral |
| `media_movil_6_meses` | ídem con 6 | Línea base semestral |
| `media_movil_12_meses` | ídem con 12 | Línea base anual / estacionalidad completa |

> **Gate de medias móviles**: un promedio sobre 2 de 12 meses reales sería
> engañoso; el pipeline prefiere `NULL` + indicador. XGBoost consume NULL
> de forma nativa.

---

## Bloque 4 · Cobertura del histórico (7 features)

Le dicen al modelo **cuánta evidencia respalda cada feature**
(≈930 de 1,120 municipios tienen < 60 meses de historia):

| Variable | Definición |
|---|---|
| `n_obs_3` | Meses con dato (`total_tematica IS NOT NULL`) dentro de la ventana de 3 |
| `n_obs_6` | ídem ventana de 6 |
| `n_obs_12` | ídem ventana de 12 |
| `historia_meses` | Meses totales con dato del municipio (desde 2021) |
| `historia_insuficiente_3` | Flag binario: 1 si `n_obs_3 < 3` |
| `historia_insuficiente_6` | Flag binario: 1 si `n_obs_6 < 6` |
| `historia_insuficiente_12` | Flag binario: 1 si `n_obs_12 < 12` |

---

## Bloque 5 · Momentum / desviación (4 features) — ⚠️ con fuga conocida

| Variable | Definición actual | Problema |
|---|---|---|
| `crecimiento_intermensual` | `(t / t−1 − 1) × 100` | ⚠️ Usa el `total_tematica` **del mes a predecir** (fuga en train; skew en forecast). Fix propuesto: `lag_1 vs lag_2` |
| `crecimiento_interanual` | `(t / t−12 − 1) × 100` | ⚠️ ídem. Fix: `lag_1 vs lag_12` |
| `max_mes_anterior` | `t − lag_1` | ⚠️ ídem (nombre engañoso: mide desviación del mes actual vs anterior) |
| `max_anio_anterior` | `t − lag_12` | ⚠️ ídem |

> Hallazgo A3 de `tecnical-analisis.md` §5: estas 4 son candidatas a estar
> inflando el R² 0.98 y el flip de sesgo del bin >200k del backtest.

---

## Bloque 6 · Composición del hecho (9 features, todas rezagadas)

Nacen en la CTE `composicion`
(`pct_x = categoría / total × 100`, solo si `total > 0`) y se rezagan con
`LAG(pct_x, 1)` → disponibles al corte t−1:

| Variable | Medida (lag t−1) | Por qué entra |
|---|---|---|
| `pct_zona_urbana_lag_1` | % hurtos en zona urbana | Perfil territorial; su cambio anticipa dinámica del volumen |
| `pct_zona_rural_lag_1` | % zona rural | ídem |
| `pct_arma_fuego_lag_1` | % arma de fuego | **Modus operandi**: migración a arma de fuego anticipa alzas |
| `pct_arma_blanca_lag_1` | % arma blanca/cortopunzante | ídem |
| `pct_arma_contundente_lag_1` | % contundentes | ídem |
| `pct_genero_masculino_lag_1` | % víctimas masculinas | Perfil de víctima; cambia con la moda del crimen |
| `pct_genero_femenino_lag_1` | % femeninas | ídem (p. ej. robos a mujeres con celulares) |
| `pct_edad_adultos_lag_1` | % adultos (>28) | Segmento etario: hurtos laborales/callejeros |
| `pct_edad_jovenes_lag_1` | % jóvenes (18–28) | ídem |
| `pct_edad_menores_lag_1` | % menores (<18) | ídem (hurtos escolares) |

> Las versiones **sin** `_lag_1` existen en Silver pero están **excluidas**
> del modelo por fuga directa (el denominador incluye el total del mes
> objetivo).

---

## Bloque 7 · Estructurales de `consolidado` (16 deriven del join → 12 numéricas + 4 categóricas)

Estáticas por municipio; el join es
`INNER JOIN consolidado c ON a.codigo_dane = c.codigo_municipio`.

| Variable | Fuente | Significado | Nota |
|---|---|---|---|
| `codigo_departamento` | consolidado | Código DANE del departamento | Efecto fijo regional (policía, denuncia) |
| `pob_dane_2025` | consolidado | Población proyección DANE 2025 | **Denominador del target**. 6.8% de importancia |
| `log_pob_dane` | derivada | `LOG1P(pob_dane_2025)` | Comprime la cola asimétrica (8k → 11M); mejoró RMSE 14.27→14.14 |
| `pdet` | consolidado | Municipio PDET (conflicto armado) | Contexto estructural |
| `zomac` | consolidado | ZOOMAC (rezago socioeconómico) | Segmentación de política pública |
| `pdet_zomac` | consolidado | Interacción PDET×ZOMAC | Cruce relevante para política |
| `riesgo_victimizacion` | consolidado | Índice continuo 0–1 | Riesgo de victimización |
| `pres_grup_armados` | consolidado | Presencia de grupos armados | Altera crimen **y** propensión a denunciar (sesgo de reporte) |
| `victimizacion_seguridad` | consolidado | Índice de victimización por seguridad | Varianza ≈ 0 — mantenida, aporta poco |
| `pib2024_peso_relativo_mun_valor_agregado_departamental` | consolidado | Peso relativo PIB municipal | Contexto económico (oportunismo) |
| `art95_num1_base_datos_negativa_del_articulo_106_ley_1453_2011` | consolidado | Base de datos negativa rural | ⚠️ **14.5% de importancia — posible proxy de población; auditoría pendiente (A6)** |
| `longitud` / `latitud` | consolidado | Coordenadas del municipio | Proxy espacial: regionalización (costa/interior/Eje Cafetero) |
| `cluster_rv` | consolidado | Cluster ordinal (Bajo→Alto) de riesgo victimización | **Categórica** (`enable_categorical=True`) |
| `cluster_pga` | consolidado | ídem presencia de grupos armados | ídem. **119 NULL** (filtrar o avisar en dashboard) |
| `cluster_vs` | consolidado | ídem victimización por seguridad | ídem |
| `municipio_isla_area_no_municipalizada` | consolidado | Binaria islas / áreas no municipalizadas | Dinámica distinta (turismo, aislamiento) |

> **Alineación de categóricas**: `train_categories` se guarda en el fit y se
> reaplica en `prepare_X` con `pd.Categorical` → evita skew train/forecast
> en los clusters.

---

## Bloque 8 · Target

| Variable | Definición |
|---|---|
| `target` | `(COALESCE(total_tematica, 0) / pob_dane_2025) × 100000` — **tasa por 100k hab** (no conteo: evita dominancia por escala). Clip de predicción: `max(pred, 0)`. |

---

## Bloque 9 · Excluidas del modelo (y por qué)

| Variable | Razón de exclusión |
|---|---|
| `holidays` / `n_festivos` / `tiene_festivo` | Decisión explícita: backfill inconsistente 2021-2025 introduce ruido estacional confundido con efecto año. Solo dashboard. |
| `pct_*` sin `_lag_1` | **Fuga**: el denominador usa el total del mes objetivo. |
| Imputación de meses faltantes con 0 | Directiva: 0 = cero medido; rellenar fabricaría tasas bajas ficticias. |
| `victimizacion_seguridad` como algoritmónica eliminada | Varianza ≈ 0 (no aporta splits) — quedó en la lista de columns del modelo, solo aporta ruido diminuto. |
| `total_lag_4`, `total_lag_5` | Generadas en silver pero **no** incluidas en `NUM_VARS_SILVER` (cota de lag se agota en 1/2/3/6/12). |

---

## Bloque 10 · Uso en el carril barrio (fase B)

`models/municipality_test.py::generate_training_municipio()` reusa el
subset de bloques **2–5** (yecto calendario + autorregresivo + cobertura +
momentum) + el target re-escalado con población por barrio, y añade el
contexto estructural del bloque 7 (`pres_grup_armados`, `pdet_zomac`,
`riesgo_victimizacion`…). El `.pkl` cargado es el **modelo nacional de
fase A** (`ModelStore`).

---

## Apéndice · Definiciones SQL de las ventanas

```sql
-- lags
LAG(total_tematica, 1)  OVER w AS total_lag_1,
LAG(total_tematica, 2)  OVER w AS total_lag_2,
LAG(total_tematica, 3)  OVER w AS total_lag_3,
LAG(total_tematica, 6)  OVER w AS total_lag_6,
LAG(total_tematica, 12) OVER w AS total_lag_12
-- WINDOW w AS (PARTITION BY codigo_dane ORDER BY anio, mes)

-- cobertura de ventana (3, idéntica lógica para 6 y 12)
COUNT(total_tematica) OVER (PARTITION BY codigo_dane ORDER BY anio, mes
    ROWS BETWEEN 2 PRECEDING AND CURRENT ROW) AS n_obs_3

-- gate de medias móviles
CASE WHEN n_obs_3 = 3 THEN AVG(total_tematica) OVER … END AS media_movil_3_meses

-- crecimiento (con fuga — pendiente A3)
(total_lag_1 - total_lag_2) / NULLIF(total_lag_2, 0) * 100  -- versión corregida
```

Mantenimiento: cualquier cambio de features debe reflejarse aquí y en
`tecnical-analisis.md` §3. Última actualización: 2026-11-02.
