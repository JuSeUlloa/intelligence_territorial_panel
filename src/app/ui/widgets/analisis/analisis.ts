import { Component, Input, output, signal } from '@angular/core';
import { mixHex, textoLegible } from '../../../services/riesgo-color';

export interface AlertaNivel {
  municipio: string;
  departamento: string;
  departamentoCodigo: string;
  de: { etiqueta: string; nivel: string; rank: number | null };
  a: { etiqueta: string; nivel: string; rank: number | null };
}

export interface MunicipioAtencion {
  codigoDane: string;
  municipio: string;
  departamento: string;
  departamentoCodigo: string;
  nivel: string;
  rank: number | null;
  tasaReal: number | null;
  tasaPredicha: number;
  hurtos: number;
  mesEtiqueta: string;
}

export interface PuntosAtencion {
  elevados: MunicipioAtencion[];
  ciegos: MunicipioAtencion[];
}

@Component({
  selector: 'app-analisis',
  styleUrl: './analisis.css',
  templateUrl: './analisis.html',
})
export class Analisis {
  @Input() alertas: AlertaNivel[] = [];
  @Input() atencion: PuntosAtencion = { elevados: [], ciegos: [] };

  @Input() colores: [string, string, string] = ['#94a3b8', '#94a3b8', '#94a3b8'];

  @Input() vista: 'departamento' | 'municipio' | 'barrio' = 'departamento';

  readonly alertaSeleccionada = output<AlertaNivel>();
  readonly atencionSeleccionada = output<MunicipioAtencion>();

  protected legible(color: string): string {
    return textoLegible(color);
  }

  protected esEscalada(alerta: AlertaNivel): boolean {
    return (alerta.a.rank ?? 0) > (alerta.de.rank ?? 0);
  }

  protected readonly direccionFiltro = signal<'todos' | 'subidas' | 'bajadas'>('todos');
  protected readonly departamentoFiltro = signal<string>('todos');

  protected get departamentosAlertas(): string[] {
    const set = new Set<string>();
    this.alertas.forEach((a) => {
      if (a.departamento) {
        set.add(a.departamento);
      }
    });
    return [...set].sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));
  }

  protected get direccionSeleccion(): string {
    return this.direccionFiltro();
  }

  protected get departamentoSeleccion(): string {
    return this.departamentoFiltro();
  }

  protected onDireccionChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.direccionFiltro.set(value === 'subidas' || value === 'bajadas' ? value : 'todos');
    this.alertasPagina.set(1);
  }

  protected onDepartamentoChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.departamentoFiltro.set(value === 'todos' ? 'todos' : value);
    this.alertasPagina.set(1);
  }

  protected get alertasFiltradas(): AlertaNivel[] {
    const dep = this.departamentoFiltro();
    const direccion = this.direccionFiltro();
    const filtraDep = this.vista === 'departamento';
    return this.alertas.filter((a) => {
      if (filtraDep && dep !== 'todos' && a.departamento !== dep) {
        return false;
      }
      if (direccion === 'subidas' && !this.esEscalada(a)) {
        return false;
      }
      if (direccion === 'bajadas' && this.esEscalada(a)) {
        return false;
      }
      return true;
    });
  }

  protected get subidas(): AlertaNivel[] {
    return this.alertasFiltradas
      .filter((a) => this.esEscalada(a))
      .sort(
        (a, b) =>
          (b.a.rank ?? 0) - (a.a.rank ?? 0) ||
          (b.de.rank ?? 0) - (a.de.rank ?? 0) ||
          a.municipio.localeCompare(b.municipio, 'es', { sensitivity: 'base' }),
      );
  }

  protected get bajadas(): AlertaNivel[] {
    return this.alertasFiltradas
      .filter((a) => !this.esEscalada(a))
      .sort(
        (a, b) =>
          (a.a.rank ?? 0) - (b.a.rank ?? 0) ||
          (a.de.rank ?? 0) - (b.de.rank ?? 0) ||
          a.municipio.localeCompare(b.municipio, 'es', { sensitivity: 'base' }),
      );
  }

  protected readonly alertasPorPagina = signal(5);
  protected readonly alertasPagina = signal(1);

  protected get alertasPorPaginaSeleccion(): string {
    return String(this.alertasPorPagina());
  }

  protected onAlertasPorPaginaChange(event: Event): void {
    const value = Number((event.target as HTMLSelectElement).value);
    this.alertasPorPagina.set(value === 5 ? 5 : 10);
    this.alertasPagina.set(1);
  }

  protected get alertasTotalPaginas(): number {
    return Math.max(1, Math.ceil(this.alertasFiltradas.length / this.alertasPorPagina()));
  }

  protected get alertasPaginaVisible(): number {
    return Math.min(this.alertasPagina(), this.alertasTotalPaginas);
  }

  protected get listaAlertasPagina(): AlertaNivel[] {
    const por = this.alertasPorPagina();
    const inicio = (this.alertasPaginaVisible - 1) * por;
    return [...this.subidas, ...this.bajadas].slice(inicio, inicio + por);
  }

  protected get alertasPaginaSubidas(): AlertaNivel[] {
    return this.listaAlertasPagina.filter((a) => this.esEscalada(a));
  }

  protected get alertasPaginaBajadas(): AlertaNivel[] {
    return this.listaAlertasPagina.filter((a) => !this.esEscalada(a));
  }

  protected paginaPrevAlertas(): void {
    this.alertasPagina.set(Math.max(1, this.alertasPagina() - 1));
  }

  protected paginaNextAlertas(): void {
    this.alertasPagina.set(Math.min(this.alertasTotalPaginas, this.alertasPagina() + 1));
  }

  protected readonly detalleAbierto = signal<{
    x: number;
    y: number;
    titulo: string;
    subtitulo: string | null;
    filas: Array<{ texto: string; valor: string; color?: string }>;
  } | null>(null);

  protected abrirDetalleAlerta(event: MouseEvent, alerta: AlertaNivel): void {
    event.stopPropagation();
    this.detalleAbierto.set({
      x: event.clientX,
      y: event.clientY,
      titulo: alerta.municipio,
      subtitulo: alerta.departamento,
      filas: [
        {
          texto: `Mes anterior (${alerta.de.etiqueta})`,
          valor: alerta.de.nivel,
          color: this.colorAtencion(alerta.de.rank),
        },
        {
          texto: `Último mes (${alerta.a.etiqueta})`,
          valor: alerta.a.nivel,
          color: this.colorAtencion(alerta.a.rank),
        },
        { texto: 'Dirección', valor: this.esEscalada(alerta) ? 'Escalada ⚠️' : 'Mejora ⬇️' },
        { texto: 'Departamento', valor: alerta.departamento },
      ],
    });
  }

  protected cerrarDetalle(): void {
    this.detalleAbierto.set(null);
  }

  protected elegir(alerta: AlertaNivel): void {
    this.alertaSeleccionada.emit(alerta);
  }

  protected colorAtencion(rank: number | null): string {
    if (rank === null) {
      return '#94a3b8';
    }
    const [low, mid, high] = this.colores;
    const t = Math.min(1, Math.max(0, rank));
    return t <= 0.5 ? mixHex(low, mid, t * 2) : mixHex(mid, high, (t - 0.5) * 2);
  }

  protected get listaAtencionTotal(): Array<{ tipo: 'alto' | 'ciego'; datos: MunicipioAtencion }> {
    return [
      ...this.atencion.elevados.map((datos) => ({ tipo: 'alto' as const, datos })),
      ...this.atencion.ciegos.map((datos) => ({ tipo: 'ciego' as const, datos })),
    ];
  }

  protected readonly atencionPorPagina = signal(5);
  protected readonly atencionPagina = signal(1);

  protected get atencionPorPaginaSeleccion(): string {
    return String(this.atencionPorPagina());
  }

  protected onAtencionPorPaginaChange(event: Event): void {
    const value = Number((event.target as HTMLSelectElement).value);
    this.atencionPorPagina.set(value === 5 ? 5 : 10);
    this.atencionPagina.set(1);
  }

  protected get atencionTotalPaginas(): number {
    return Math.max(1, Math.ceil(this.listaAtencionTotal.length / this.atencionPorPagina()));
  }

  protected get atencionPaginaVisible(): number {
    return Math.min(this.atencionPagina(), this.atencionTotalPaginas);
  }

  protected get listaAtencionPagina(): Array<{
    tipo: 'alto' | 'ciego';
    datos: MunicipioAtencion;
  }> {
    const por = this.atencionPorPagina();
    const inicio = (this.atencionPaginaVisible - 1) * por;
    return this.listaAtencionTotal.slice(inicio, inicio + por);
  }

  protected paginaPrevAtencion(): void {
    this.atencionPagina.set(Math.max(1, this.atencionPagina() - 1));
  }

  protected paginaNextAtencion(): void {
    this.atencionPagina.set(Math.min(this.atencionTotalPaginas, this.atencionPagina() + 1));
  }

  protected get atencionHayAltoEnPagina(): boolean {
    return this.listaAtencionPagina.some((fila) => fila.tipo === 'alto');
  }

  protected get atencionHayCiegoEnPagina(): boolean {
    return this.listaAtencionPagina.some((fila) => fila.tipo === 'ciego');
  }

  protected abrirDetalleAtencion(
    event: MouseEvent,
    fila: { tipo: 'alto' | 'ciego'; datos: MunicipioAtencion },
  ): void {
    event.stopPropagation();
    const datos = fila.datos;
    this.detalleAbierto.set({
      x: event.clientX,
      y: event.clientY,
      titulo: datos.municipio,
      subtitulo: datos.departamento,
      filas: [
        {
          texto: 'Nivel en el mes',
          valor: fila.tipo === 'alto' ? 'ALTO' : 'SIN DATO',
          color: fila.tipo === 'alto' ? this.colorAtencion(1) : undefined,
        },
        { texto: 'Tasa predicha', valor: this.formatoTasa(datos.tasaPredicha) },
        { texto: 'Tasa real (última)', valor: this.formatoTasa(datos.tasaReal) },
        { texto: 'Hurtos estimados (mes)', valor: `≈ ${this.formatoHurtos(datos.hurtos)}` },
        { texto: 'Mes de la fila', valor: datos.mesEtiqueta },
      ],
    });
  }

  protected formatoTasa(valor: number | null): string {
    if (valor === null) {
      return 's/d';
    }
    return valor.toFixed(2).replace('.', ',');
  }

  protected formatoHurtos(valor: number): string {
    return Math.round(valor).toLocaleString('es-CO');
  }

  protected get mesRevisado(): string | null {
    return this.listaAtencionTotal[0]?.datos.mesEtiqueta ?? null;
  }

  protected elegirAtencion(municipio: MunicipioAtencion): void {
    this.atencionSeleccionada.emit(municipio);
  }
}
