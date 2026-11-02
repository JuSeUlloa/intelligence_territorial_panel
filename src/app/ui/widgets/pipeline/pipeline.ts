import { output } from "@angular/core";
import { Component } from "@angular/core";
const TAREAS = [
  {
    paso: "quality",
    nombre: "Calidad de datos",
    capa: "INGESTA",
    capaClase: "capa-info",
    detalle:
      "Validaciones configurables sobre la fuente cruda: nulos, duplicados y estadísticas básicas (bronze/quality.py). Detiene el flujo si la fuente no cumple los umbrales.",
    icono: "fa-magnifying-glass",
  },
  {
    paso: "encode_bronze",
    nombre: "Bronze · encoder",
    capa: "BRONZE",
    capaClase: "capa-bronze",
    detalle:
      "SchemaGenerator mapea las columnas originales a nombres normalizados y BronzeEncoder codifica las categóricas (género, zona, armas, edad) en tablas Delta de Unity Catalog (bronze/bronce.py).",
    icono: "fa-database",
  },
  {
    paso: "transform_silver",
    nombre: "Silver · base curada",
    capa: "SILVER",
    capaClase: "capa-silver",
    detalle:
      "Malla completa municipio × mes × año con features temporales: composición porcentual (zona, arma, género, edad, día), medias móviles 3/6 meses, tendencia, crecimiento intermensual/interanual y lags (silver/silver.py).",
    icono: "fa-layer-group",
  },
  {
    paso: "train_model",
    nombre: "Modelo XGBoost",
    capa: "MODELO",
    capaClase: "capa-modelo",
    detalle:
      "Entrena el XGBRegressor (2021–2024) para la tasa por 100k del próximo mes, con backtest temporal y métricas RMSE, MAE y R² (models/xgboots_model.py).",
    icono: "fa-vial",
  },
  {
    paso: "consolidated_gold",
    nombre: "Gold · consolidado",
    capa: "GOLD",
    capaClase: "capa-gold",
    detalle:
      "Enlaza tasas reales y predichas con población DANE, umbrales percentiles, niveles de riesgo, errores (abs, sq, ape) y geometrías para consumo analítico.",
    icono: "fa-gem",
  },
  {
    paso: "municipality_carril",
    nombre: "Carril municipal",
    capa: "ANALÍTICA",
    capaClase: "capa-analitica",
    detalle:
      "Carril independiente del flujo nacional: agrega los eventos para municipios y barrios, alimentando el dashboard geográfico y los análisis por municipio (step municipality).",
    icono: "fa-map-location-dot",
  },
];
@Component({
  imports: [],
  selector: "app-pipeline",
  styleUrl: "./pipeline.css",
  templateUrl: "./pipeline.html",
})
export class Pipeline {
  cerrarSolicitud = output();
  tareas = TAREAS;
  cerrar() {
    this.cerrarSolicitud.emit();
  }
}
