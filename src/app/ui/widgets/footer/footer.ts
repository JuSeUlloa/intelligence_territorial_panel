import { Component, computed, inject } from "@angular/core";
import { riskGradient, textoLegible } from "../../../services/riesgo-color";
import { ThemeService } from "../../../services/theme.service";
@Component({
  selector: "app-footer",
  styleUrl: "./footer.css",
  templateUrl: "./footer.html"
})
export class Footer {
  theme = inject(ThemeService);
    acento = computed(() => {
    const [low, mid, high] = riskGradient(this.theme.accentColor(), this.theme.isDark());
    return {
      fondo: `linear-gradient(90deg, ${low} 0%, ${mid} 50%, ${high} 100%)`,
      texto: textoLegible(mid)
    };
  });
    resumen = [
    {
      icono: "fa-solid fa-map-location-dot",
      titulo: "Mapa interactivo",
      texto: "Coropleta de riesgo con Mapbox GL: tres niveles territoriales y popups informativos.",
      items: [
        "Departamento \u2192 municipio \u2192 barrio",
        "Popups con riesgo, tasas y poblaci\xF3n",
        "Modo pr\xF3ximo mes (/prediction)"
      ]
    },
    {
      icono: "fa-solid fa-gauge-high",
      titulo: "KPIs del panel",
      texto: "Consolidaci\xF3n de las predicciones visibles, siguiendo los filtros.",
      items: ["municipios \xB7 hurtos", "tasa media \xB7 MAE", "alertas ALTO"]
    },
    {
      icono: "fa-solid fa-chart-simple",
      titulo: "Gr\xE1ficas a medida",
      texto: "Barras, l\xEDneas y donnut hechos con Tailwind/SVG (sin librer\xEDas de charts).",
      items: [
        "Barras: desglose por nivel o por mes",
        "Evoluci\xF3n real vs predicha + zoom",
        "Donnut SVG con sector resaltado"
      ]
    },
    {
      icono: "fa-solid fa-calculator",
      titulo: "C\xE1lculo de tasas",
      texto: "Dos pasos: promedio por municipio y luego la media por mes.",
      items: [
        "Universo com\xFAn real/predicha",
        "Sin datos ausentes",
        "Evoluci\xF3n con /gold completo"
      ]
    }
  ];
}
