import { Injectable, computed, effect, signal } from "@angular/core";
const CONFIG_STORAGE_KEY = "itp-config";
const DEFAULT_CONFIG = { tooltipMapa: true, animarMapa: true };
type PreferenciasMapa = typeof DEFAULT_CONFIG;
function leerPreferencias() {
  try {
    const stored = localStorage.getItem(CONFIG_STORAGE_KEY);
    if (stored) {
      const valor = JSON.parse(stored) as Partial<PreferenciasMapa>;
      if (valor && typeof valor === "object") {
        return {
          tooltipMapa: typeof valor.tooltipMapa === "boolean" ? valor.tooltipMapa : true,
          animarMapa: typeof valor.animarMapa === "boolean" ? valor.animarMapa : true
        };
      }
    }
  } catch {}
  return { ...DEFAULT_CONFIG };
}
@Injectable({ providedIn: "root" })
export class ConfigService {
  _tooltipMapa = signal(leerPreferencias().tooltipMapa);
  _animarMapa = signal(leerPreferencias().animarMapa);
  tooltipMapa = this._tooltipMapa.asReadonly();
  animarMapa = this._animarMapa.asReadonly();
  primerEjecucion = true;
  resumen = computed(
    () => "Tooltips " + (this._tooltipMapa() ? "activos" : "inactivos") + ", animaciones " + (this._animarMapa() ? "activas" : "inactivas")
  );
  constructor() {
    effect(() => {
      this._tooltipMapa();
      const animarMapa = this._animarMapa();
      if (this.primerEjecucion) {
        this.primerEjecucion = false;
        return;
      }
      try {
        localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify({ tooltipMapa: this._tooltipMapa(), animarMapa }));
      } catch {}
    });
  }
  setTooltipMapa(valor) {
    this._tooltipMapa.set(valor !== false);
  }
  setAnimarMapa(valor) {
    this._animarMapa.set(valor !== false);
  }
  reset() {
    this.setTooltipMapa(DEFAULT_CONFIG.tooltipMapa);
    this.setAnimarMapa(DEFAULT_CONFIG.animarMapa);
  }
}
