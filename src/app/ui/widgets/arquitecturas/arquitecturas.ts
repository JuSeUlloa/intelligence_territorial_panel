import { Component, output, signal } from "@angular/core";

type NodoArquitectura = {
  etapa: string;
  icono: string;
  color: string;
  detalle: string;
  mapeo?: string;
  salidas?: string;
};

const KDD: NodoArquitectura[] = [
  {
    etapa: "Selección de datos",
    icono: "fa-crosshairs",
    color: "ingesta",
    detalle:
      "Fuente Parquet de hurtos contra personas + tabla consolidado (variables socioeconómicas y geográficas por municipio: PDET, ZOMAC, PIB, población DANE).",
    mapeo: "Fuentes → Volumen → bronze/quality.py",
  },
  {
    etapa: "Preprocesamiento",
    icono: "fa-filter",
    color: "bronze",
    detalle:
      "Validación de nulos/duplicados, normalización de columnas y codificación de categóricas (género, zona, armas, edad).",
    mapeo: "bronze/quality.py · schema.py · bronce.py",
  },
  {
    etapa: "Transformación",
    icono: "fa-layer-group",
    color: "silver",
    detalle:
      "Malla municipio × mes con features: composiciones %, medias móviles 3/6/12 con gate de observaciones, lags 1/2/3/6/12, cobertura de histórico y estructurales del consolidado.",
    mapeo: "silver/silver.py · utils/domains.py",
  },
  {
    etapa: "Minería de datos",
    icono: "fa-vial",
    color: "modelo",
    detalle:
      "XGBoost Regressor (tasa por 100k) con train 2021–2024, holdout temporal y variable importance; frontal del Knowledge Discovery.",
    mapeo: "models/xgboots_model.py · ModelStore (.pkl)",
  },
  {
    etapa: "Interpretación y evaluación",
    icono: "fa-gauge-high",
    color: "gold",
    detalle:
      "Tasas reales vs predichas, umbrales percentiles, niveles de riesgo, RMSE/MAE/R² y construcción de la salida analítica para dashboards.",
    mapeo: "gold/consolidated.py → dashboard IT Panel · AI/BI",
  },
];

const SERVIDOR: NodoArquitectura[] = [
  {
    etapa: "Cliente",
    icono: "fa-display",
    color: "ingesta",
    detalle:
      "Panel Angular (este navegador): mapa Mapbox, KPIs y gráficas. También el dashboard AI/BI de Databricks.",
    mapeo: "intelligence_territorial_panel · fetch /api/dbx/*",
  },
  {
    etapa: "BFF serverless",
    icono: "fa-cloud",
    color: "ingesta",
    detalle:
      "Vercel Function: proxy que reenvía las rutas previas a la API y ajusta timeouts (api/dbx.mjs).",
    mapeo: "api/dbx.mjs · vercel.json rewrites",
  },
  {
    etapa: "Servidor de aplicación",
    icono: "fa-server",
    color: "bronze",
    detalle:
      "API REST Flask desplegada como Databricks App: routes.py (Blueprint) → controller.py (status 400/503) → services.py (SQL por tabla).",
    mapeo: "src/…/app/ · /api/territorial_intelligence/*",
  },
  {
    etapa: "Motor analítico",
    icono: "fa-gears",
    color: "silver",
    detalle:
      "SQL warehouse de Databricks: ejecuta las consultas SqlExecutor → execute_statement; nunca accede a volúmenes ni clusters.",
    mapeo: "utils/sql_executor.py · workspace.territorial_inteligence",
  },
  {
    etapa: "Almacén de datos",
    icono: "fa-database",
    color: "gold",
    detalle:
      "Tablas Delta en Unity Catalog: gold de ambas fases y GeoJSON (departamentos, municipios, barrios).",
    mapeo: "hurtos_personas_gold · *_geo · catastros",
  },
];

const MEDALLION: NodoArquitectura[] = [
  {
    etapa: "BRONZE (crudo)",
    icono: "fa-database",
    color: "bronze",
    detalle:
      "Parquet → Delta con el backfill: 735,802 hechos normalizados y codificados. Carril independiente: hurto_personas_bronce_municipio (3,531 eventos homologados con id_barrio, sin BronzeEncoder).",
    salidas: "hurto_personas_bronce · hurto_personas_bronce_municipio",
  },
  {
    etapa: "SILVER (curado)",
    icono: "fa-layer-group",
    color: "silver",
    detalle:
      "Malla completa (spine): 1 fila = municipio × mes aunque no haya hurtos. 46 features numéricos + 4 categóricos + calendario; NULL = sin dato, 0 = cero medido.",
    salidas: "hurto_personas_silver",
  },
  {
    etapa: "MODEL (predicción)",
    icono: "fa-vial",
    color: "modelo",
    detalle:
      "XGBoost entrenado con las features de Silver + consolidado. Salidas de predicción del próximo mes por municipio.",
    salidas: "hurto_personas_prediccion · hurto_personas_forecast",
  },
  {
    etapa: "GOLD (analítica)",
    icono: "fa-gem",
    color: "gold",
    detalle:
      "Tasas reales/predichas por 100k, umbrales percentiles, niveles de riesgo, errores (abs, sq, ape) y geometrías para el mapa.",
    salidas: "hurtos_personas_consolidado · hurtos_personas_gold",
  },
  {
    etapa: "Consumo",
    icono: "fa-chart-line",
    color: "analitica",
    detalle:
      "Dashboard AI/BI (3 hojas) + panel geográfico Angular: KPIs, coropleta y carril barrial (piloto Buenaventura).",
    salidas: "IT Panel · AI/BI · /api/dbx/*",
  },
];
@Component({
  imports: [],
  selector: "app-arquitecturas",
  styleUrl: "./arquitecturas.css",
  templateUrl: "./arquitecturas.html",
})
export class Arquitectura {
  cerrarSolicitud = output();
  vistas = [
    { id: "kdd", nombre: "KDD", icono: "fa-bullseye" },
    { id: "servidor", nombre: "Cliente-servidor", icono: "fa-network-wired" },
    { id: "medallion", nombre: "Medallion", icono: "fa-medal" },
  ];
  vista = signal<"kdd" | "servidor" | "medallion" | "nada">("kdd");
  setVista(v) {
    if (v === "kdd" || v === "servidor" || v === "medallion") {
      this.vista.set(v);
    }
  }
  opciones() {
    return (
      this.vista() === "kdd" ? KDD : this.vista() === "servidor" ? SERVIDOR : MEDALLION
    );
  }
  mostrarTablas() {
    return this.vista() === "medallion";
  }
  cerrar() {
    this.cerrarSolicitud.emit();
  }
}
