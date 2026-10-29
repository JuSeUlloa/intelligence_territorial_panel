import { Component, Input } from '@angular/core';

export interface KpiPanel {
  municipios: number;
  hurtos: number;
  hurtosEstimados?: boolean;
  tasaMedia: number;
  mae: number;
  sinMae: boolean;
  riesgosAltos: number;
}

@Component({
  imports: [],
  selector: 'app-kpi',
  styleUrl: './kpi.css',
  templateUrl: './kpi.html',
})
export class Kpi {
  @Input() kpis: KpiPanel = {
    municipios: 0,
    hurtos: 0,
    tasaMedia: 0,
    mae: 0,
    sinMae: false,
    riesgosAltos: 0,
  };

  protected get tarjetas(): Array<{
    id: string;
    icono: string;
    etiqueta: string;
    valor: string;
    mutado: boolean;
  }> {
    const { municipios, hurtos, tasaMedia, mae, sinMae, riesgosAltos } = this.kpis;
    return [
      {
        id: 'municipios',
        icono: 'fa-solid fa-city',
        etiqueta: 'Municipios',
        valor: entero(municipios),
        mutado: false,
      },
      {
        id: 'hurtos',
        icono: 'fa-solid fa-cart-shopping',
        etiqueta: this.kpis.hurtosEstimados ? 'Hurtos estimados' : 'Hurtos',
        valor: entero(hurtos),
        mutado: false,
      },
      {
        id: 'tasa',
        icono: 'fa-solid fa-percent',
        etiqueta: 'Tasa promedio',
        valor: decimal(tasaMedia),
        mutado: false,
      },
      {
        id: 'mae',
        icono: 'fa-solid fa-bullseye',
        etiqueta: sinMae ? 'MAE (próx. mes)' : 'MAE',
        valor: sinMae ? '—' : decimal(mae),
        mutado: sinMae,
      },
      {
        id: 'riesgos',
        icono: 'fa-solid fa-triangle-exclamation',
        etiqueta: 'Riesgo ALTO',
        valor: entero(riesgosAltos),
        mutado: false,
      },
    ];
  }
}

function entero(value: number): string {
  return Math.round(value).toLocaleString('es-CO');
}

function decimal(value: number): string {
  return value.toLocaleString('es-CO', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
