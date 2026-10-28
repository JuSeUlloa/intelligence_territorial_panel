import { Component, Input, signal } from '@angular/core';
import { NO_DATA_COLOR, mixHex, textoLegible } from '../../../services/riesgo-color';

export interface BarraDatos {
  etiqueta: string;
  rank: number | null;
  desglose?: { bajo: number; medio: number; alto: number } | null;
  porMes?: Array<{ etiqueta: string; nivel: string; rank: number | null }> | null;
  departamento?: string | null;
}

export interface LineaMes {
  etiqueta: string;
  mes: number;
  anio: number;
  real: number | null;
  predicha: number;
}

export interface ResumenMunicipio {
  municipio: string;
  departamento: string | null;
  nivel: string;
  rank: number | null;
  tasaPredicha: number | null;
  tasaReal: number | null;
  hurtos: number;
  poblacion: number | null;
  meses: Array<{ etiqueta: string; nivel: string; rank: number | null }>;
}

@Component({
  imports: [],
  selector: 'app-barras',
  styleUrl: './barras.css',
  templateUrl: './barras.html',
  host: {
    '(document:click)': 'onDocumentoClick($event)',
  },
})
export class Barras {
  @Input() datos: BarraDatos[] = [];

  @Input() colores: [string, string, string] = [NO_DATA_COLOR, NO_DATA_COLOR, NO_DATA_COLOR];

  @Input() vista: 'departamento' | 'municipio' | 'barrio' = 'departamento';

  @Input() serieMensual: LineaMes[] = [];

  @Input() torta: { bajo: number; medio: number; alto: number } | null = null;

  @Input() resumen: ResumenMunicipio | null = null;

  protected get vistaEtiqueta(): string {
    switch (this.vista) {
      case 'municipio':
        return 'Eje X: municipios del nivel activo';
      case 'barrio':
        return 'Eje X: barrios';
      default:
        return 'Eje X: departamentos';
    }
  }

  protected readonly limite = signal<number>(10);
  protected readonly opcionesLimite = [
    { value: '10', label: 'Top 10' },
    { value: '20', label: 'Top 20' },
    { value: 'todos', label: 'Todos' },
  ];

  protected readonly modoDesglose = signal<'nivel' | 'mes'>('nivel');
  protected readonly opcionesModoDesglose = [
    { value: 'nivel', label: 'Por nivel' },
    { value: 'mes', label: 'Por mes' },
  ];

  protected get tienePorMes(): boolean {
    return this.datos.some((d) => (d.porMes?.length ?? 0) > 0);
  }

  protected get modoDesgloseSeleccion(): string {
    return this.modoDesglose();
  }

  protected onModoDesgloseChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.modoDesglose.set(value === 'mes' ? 'mes' : 'nivel');
  }

  protected onLimiteChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.limite.set(value === 'todos' ? Infinity : Number(value));
  }

  protected get limiteSeleccion(): string {
    return this.limite() === Infinity ? 'todos' : String(this.limite());
  }

  protected get datosRender(): BarraDatos[] {
    const suma = (barra: BarraDatos): number =>
      barra.desglose ? barra.desglose.bajo + barra.desglose.medio + barra.desglose.alto : 0;
    const comparadorRiesgo = (a: BarraDatos, b: BarraDatos): number => {
      const aVacio = a.rank === null ? 1 : 0;
      const bVacio = b.rank === null ? 1 : 0;
      if (aVacio !== bVacio) {
        return aVacio - bVacio;
      }
      const porRiesgo = (b.rank ?? 0) - (a.rank ?? 0);
      if (porRiesgo !== 0) {
        return porRiesgo;
      }
      return a.etiqueta.localeCompare(b.etiqueta, 'es', { sensitivity: 'base' });
    };
    return [...this.datos]
      .sort((a, b) => suma(b) - suma(a) || comparadorRiesgo(a, b))
      .slice(0, this.limite());
  }

  protected readonly seleccionada = signal<number | null>(null);
  protected readonly fijada = signal(false);
  protected readonly punto = signal<{ x: number; y: number } | null>(null);

  protected seleccionadaDatos(): BarraDatos | null {
    const indice = this.seleccionada();
    return indice === null ? null : this.datosRender[indice] ?? null;
  }

  protected readonly hoverLinea = signal<{
    x: number;
    y: number;
    p: LineaMes;
  } | null>(null);

  protected abrirPuntoLinea(event: MouseEvent, p: LineaMes): void {
    this.hoverLinea.set({ x: event.clientX, y: event.clientY, p });
  }

  protected cerrarPuntoLinea(): void {
    this.hoverLinea.set(null);
  }

  protected abrirEn(event: MouseEvent, indice: number): void {
    if (this.fijada()) {
      return;
    }
    this.seleccionada.set(indice);
    this.punto.set({ x: event.clientX, y: event.clientY });
  }

  protected siNoClick(): void {
    if (!this.fijada()) {
      this.cerrar();
    }
  }

  protected alternar(event: MouseEvent, indice: number): void {
    event.stopPropagation();
    if (this.fijada() && this.seleccionada() === indice) {
      this.fijada.set(false);
      this.cerrar();
      return;
    }
    this.seleccionada.set(indice);
    this.fijada.set(true);
    this.punto.set({ x: event.clientX, y: event.clientY });
  }

  cerrar(): void {
    this.seleccionada.set(null);
    this.fijada.set(false);
    this.punto.set(null);
  }

  protected onDocumentoClick(event: Event): void {
    const target = event.target as HTMLElement;
    if (target.closest?.('[data-popup-barras]')) {
      return;
    }
    if (this.seleccionada() !== null) {
      this.cerrar();
    }
  }

  protected ancho(): number {
    const visibles = Math.max(1, Math.min(this.limite(), this.datos.length));
    return 100 / visibles;
  }

  protected anchoBarra(): number {
    const visibles = Math.max(1, Math.min(this.limite(), this.datos.length));
    if (visibles <= 5) {
      return 40;
    }
    if (visibles <= 10) {
      return 30;
    }
    if (visibles <= 20) {
      return 25;
    }
    return 20.8;
  }

  protected get textoGradiente(): string {
    return `linear-gradient(90deg, ${this.colores[0]}, ${this.colores[1]} 50%, ${this.colores[2]})`;
  }

  protected altura(rank: number | null): number {
    if (rank === null) {
      return 0;
    }
    return Math.min(100, Math.max(0, rank * 100));
  }

  protected niveles: Array<{ min: number; texto: string }> = [
    { min: 0.75, texto: 'Alto' },
    { min: 0.25, texto: 'Medio' },
    { min: 0, texto: 'Bajo' },
  ];

  protected nivel(rank: number | null): string {
    if (rank === null) {
      return '';
    }
    return this.niveles.find((n) => rank >= n.min)?.texto ?? '';
  }

  protected color(rank: number | null): string {
    if (rank === null) {
      return NO_DATA_COLOR;
    }
    const [low, mid, high] = this.colores;
    const t = Math.min(1, Math.max(0, rank));
    return t <= 0.5 ? mixHex(low, mid, t * 2) : mixHex(mid, high, (t - 0.5) * 2);
  }

  protected leyenda(rank: number | null): string {
    if (rank === null) {
      return 'riesgo s/d';
    }
    return `riesgo ${rank.toFixed(2).replace('.', ',')}`;
  }

  protected titulo(barra: BarraDatos): string {
    if (this.modoDesglose() === 'mes' && barra.porMes) {
      const meses = (barra.porMes ?? []).map(
        (fila) => fila.etiqueta + ' ' + fila.nivel.trim().toLowerCase(),
      );
      const lista = meses.slice(0, 8).join(' · ');
      return `${barra.etiqueta} · ${lista}${meses.length > 8 ? ' …' : ''}`;
    }
    if (!barra.desglose) {
      return `${barra.etiqueta} · ${this.leyenda(barra.rank)}`;
    }
    return `${barra.etiqueta} · Alto ${barra.desglose.alto} · Medio ${barra.desglose.medio} · Bajo ${barra.desglose.bajo}`;
  }

  protected get ejeMax(): number {
    if (this.modoDesglose() === 'mes') {
      let max = 1;
      this.datos.forEach((d) => {
        if ((d.porMes?.length ?? 0) > max) {
          max = d.porMes!.length;
        }
      });
      return max;
    }
    const max = this.datosRender.reduce(
      (mayor, barra) =>
        barra.desglose
          ? Math.max(mayor, barra.desglose.bajo + barra.desglose.medio + barra.desglose.alto)
          : mayor,
      0,
    );
    return Math.max(1, max);
  }

  protected sumaTotal(barra: BarraDatos): number {
    if (this.modoDesglose() === 'mes' && barra.porMes) {
      return barra.porMes.length;
    }
    if (!barra.desglose) {
      return 0;
    }
    return barra.desglose.bajo + barra.desglose.medio + barra.desglose.alto;
  }

  protected fraccionTotal(barra: BarraDatos): number {
    return this.sumaTotal(barra) / this.ejeMax;
  }

  protected get ejeMedio(): number {
    return Math.round(this.ejeMax / 2);
  }

  protected bandas(barra: BarraDatos): Array<{ frac: number; color: string }> {
    if (this.modoDesglose() === 'mes' && barra.porMes) {
      return (barra.porMes ?? []).map((fila) => ({
        frac: 1 / this.ejeMax,
        color: this.color(fila.rank),
      }));
    }
    if (!barra.desglose) {
      return [{ frac: this.altura(barra.rank) / 100, color: this.color(barra.rank) }];
    }
    return [
      { frac: barra.desglose.bajo / this.ejeMax, color: this.colores[0] },
      { frac: barra.desglose.medio / this.ejeMax, color: this.colores[1] },
      { frac: barra.desglose.alto / this.ejeMax, color: this.colores[2] },
    ];
  }

  protected puntoX(indice: number): number {
    const n = this.serieMensual.length;
    return n <= 1 ? 50 : (indice / (n - 1)) * 100;
  }

  protected readonly ejeYMax = 50;

  protected readonly aumento = signal(false);
  protected readonly realOculta = signal(false);
  protected readonly predichaOculta = signal(false);

  protected alternarSerie(cual: 'real' | 'predicha'): void {
    if (cual === 'real') {
      this.realOculta.update((v) => !v);
    } else {
      this.predichaOculta.update((v) => !v);
    }
  }

  protected get verReal(): boolean {
    return !this.realOculta() && this.tieneLineaReal;
  }

  protected get verPredicha(): boolean {
    return !this.predichaOculta();
  }

  protected alternarAumento(): void {
    this.aumento.update((v) => !v);
  }

  protected get ventanaY(): { min: number; max: number } {
    if (!this.aumento()) {
      return { min: 0, max: this.ejeYMax };
    }
    let min = Infinity;
    let max = -Infinity;
    this.serieMensual.forEach((p) => {
      if (!this.realOculta() && p.real !== null) {
        min = Math.min(min, p.real);
        max = Math.max(max, p.real);
      }
      if (!this.predichaOculta()) {
        max = Math.max(max, p.predicha);
        min = Math.min(min, p.predicha);
      }
    });
    if (!Number.isFinite(min)) {
      return { min: 0, max: 1 };
    }
    const aire = ((max - min) || 1) * 0.25;
    const bajo = Math.max(0, Math.floor((min - aire) * 10) / 10);
    const alto = Math.ceil((max + aire) * 10) / 10;
    return { min: bajo, max: Math.max(alto, bajo + 0.5) };
  }

  protected get serieMax(): number {
    return this.ventanaY.max;
  }

  protected get serieMin(): number {
    return this.ventanaY.min;
  }

  protected textoEje(valor: number): string {
    return Number.isInteger(valor) ? String(valor) : this.formato(valor);
  }

  protected puntoY(valor: number): number {
    const { min, max } = this.ventanaY;
    const frac = Math.min(1, Math.max(0, (valor - min) / (max - min)));
    return 100 - (4 + frac * 92);
  }

  protected posY(valor: number): number {
    return 100 - this.puntoY(valor);
  }

  protected posYEtiquetaReal(p: LineaMes): number {
    const real = this.posY(p.real ?? 0);
    const predicha = this.posY(p.predicha);
    if (Math.abs(real - predicha) < 7) {
      return Math.max(96, Math.max(real, predicha) + 14);
    }
    return real;
  }

  protected puntos(cual: 'real' | 'predicha'): string[] {
    return this.serieMensual
      .map((p, i) => {
        const valor = cual === 'predicha' ? p.predicha : p.real;
        if (valor === null) {
          return null;
        }
        return `${this.puntoX(i).toFixed(2)},${this.puntoY(valor).toFixed(2)}`;
      })
      .filter((p): p is string => p !== null);
  }

  protected get tieneLineaReal(): boolean {
    return this.puntos('real').length >= 2;
  }

  protected get bandaLineas(): string | null {
    if (!this.verReal || !this.verPredicha || this.serieMensual.length < 2) {
      return null;
    }
    const indices: number[] = [];
    this.serieMensual.forEach((p, i) => {
      if (p.real !== null) {
        indices.push(i);
      }
    });
    if (indices.length < 2) {
      return null;
    }
    const arriba = indices.map(
      (i) => `${this.puntoX(i)},${this.puntoY(this.serieMensual[i].predicha)}`,
    );
    const abajo: string[] = [];
    [...indices].reverse().forEach((i) => {
      const p = this.serieMensual[i];
      if (p.real !== null) {
        abajo.push(`${this.puntoX(i)},${this.puntoY(p.real)}`);
      }
    });
    return [...arriba, ...abajo].join(' ');
  }

  protected get etiquetasMes(): string[] {
    const n = this.serieMensual.length;
    if (n <= 12) {
      return this.serieMensual.map((p) => p.etiqueta);
    }
    const media = Math.round((n - 1) / 2);
    return [
      this.serieMensual[0].etiqueta,
      this.serieMensual[media].etiqueta,
      this.serieMensual[n - 1].etiqueta,
    ];
  }

  protected formato(valor: number | null): string {
    if (valor === null) {
      return 's/d';
    }
    return valor.toFixed(2).replace('.', ',');
  }

  protected get tortaTotal(): number {
    return this.torta ? this.torta.bajo + this.torta.medio + this.torta.alto : 0;
  }

  protected porcentaje(valor: number): string {
    const total = this.tortaTotal || 1;
    return `${((valor / total) * 100).toLocaleString('es-CO', { maximumFractionDigits: 1 })}%`;
  }

  protected get nivelesTorta(): Array<{ texto: string; valor: number; color: string }> {
    if (!this.torta || this.tortaTotal === 0) {
      return [];
    }
    return [
      { texto: 'Bajo', valor: this.torta.bajo, color: this.colores[0] },
      { texto: 'Medio', valor: this.torta.medio, color: this.colores[1] },
      { texto: 'Alto', valor: this.torta.alto, color: this.colores[2] },
    ];
  }

  protected legible(color: string): string {
    return textoLegible(color);
  }

  protected formatoEntero(valor: number | null): string {
    if (valor === null) {
      return 's/d';
    }
    return Math.round(valor).toLocaleString('es-CO');
  }

  protected colorResumen(rank: number | null): string {
    return this.color(rank);
  }

  protected get resumenMes(): string | null {
    const meses = this.resumen?.meses ?? [];
    return meses.length > 0 ? meses[meses.length - 1].etiqueta : null;
  }

  protected get resumenStats(): Array<{ texto: string; valor: string }> {
    const r = this.resumen;
    if (!r) {
      return [];
    }
    return [
      { texto: 'Tasa real (última)', valor: this.formato(r.tasaReal) },
      { texto: 'Tasa predicha', valor: this.formato(r.tasaPredicha) },
      { texto: 'Hurtos estimados (mes)', valor: `≈ ${this.formatoEntero(r.hurtos)}` },
      { texto: 'Población DANE 2025', valor: this.formatoEntero(r.poblacion) },
    ];
  }

  protected readonly tortaRadioExterno = 49;
  protected readonly tortaRadioInterno = 31;
  protected readonly tortaRadioEtiqueta = 40;

  protected readonly tortaArcoMin = 15;
  protected readonly tortaFuente = 4.2;

  protected puntoRadial(radio: number, anguloGrados: number): { x: number; y: number } {
    const rad = (anguloGrados * Math.PI) / 180;
    return { x: 50 + radio * Math.sin(rad), y: 50 - radio * Math.cos(rad) };
  }

  protected arcoTorta(anguloInicio: number, anguloFin: number): string {
    const rEx = this.tortaRadioExterno;
    const rIn = this.tortaRadioInterno;
    const span = anguloFin - anguloInicio;
    if (span >= 359.9) {
      const t1 = this.puntoRadial(rEx, 0);
      const t2 = this.puntoRadial(rEx, 180);
      const b1 = this.puntoRadial(rIn, 0);
      const b2 = this.puntoRadial(rIn, 180);
      return (
        `M ${t1.x} ${t1.y} A ${rEx} ${rEx} 0 1 1 ${t2.x} ${t2.y} ` +
        `A ${rEx} ${rEx} 0 1 1 ${t1.x} ${t1.y} Z ` +
        `M ${b1.x} ${b1.y} A ${rIn} ${rIn} 0 1 0 ${b2.x} ${b2.y} ` +
        `A ${rIn} ${rIn} 0 1 0 ${b1.x} ${b1.y} Z`
      );
    }
    const pEx1 = this.puntoRadial(rEx, anguloInicio);
    const pEx2 = this.puntoRadial(rEx, anguloFin);
    const pIn2 = this.puntoRadial(rIn, anguloFin);
    const pIn1 = this.puntoRadial(rIn, anguloInicio);
    const grande = span > 180 ? 1 : 0;
    return (
      `M ${pEx1.x} ${pEx1.y} A ${rEx} ${rEx} 0 ${grande} 1 ${pEx2.x} ${pEx2.y} ` +
      `L ${pIn2.x} ${pIn2.y} A ${rIn} ${rIn} 0 ${grande} 0 ${pIn1.x} ${pIn1.y} Z`
    );
  }

  protected readonly sectorEscala = 'translate(50 50) scale(1.045) translate(-50 -50)';

  protected get sectoresTorta(): Array<{
    nivel: { texto: string; valor: number; color: string };
    inicio: number;
    fin: number;
    d: string;
  }> {
    const total = this.tortaTotal;
    if (!this.torta || total === 0) {
      return [];
    }
    let acumulado = 0;
    return this.nivelesTorta.map((nivel) => {
      const inicio = (acumulado / total) * 360;
      acumulado += nivel.valor;
      const fin = (acumulado / total) * 360;
      return { nivel, inicio, fin, d: this.arcoTorta(inicio, fin) };
    });
  }

  protected get etiquetasTorta(): Array<{
    texto: string;
    x: number;
    y: number;
    color: string;
  }> {
    const total = this.tortaTotal;
    if (!this.torta || total === 0) {
      return [];
    }
    let acumulado = 0;
    const salidas: Array<{ texto: string; x: number; y: number; color: string }> = [];
    for (const nivel of this.nivelesTorta) {
      const inicio = (acumulado / total) * 360;
      acumulado += nivel.valor;
      const fin = (acumulado / total) * 360;
      if (fin - inicio < this.tortaArcoMin) {
        continue;
      }
      const punto = this.puntoRadial(this.tortaRadioEtiqueta, (inicio + fin) / 2);
      salidas.push({
        texto: this.porcentaje(nivel.valor),
        x: punto.x,
        y: punto.y,
        color: nivel.color,
      });
    }
    return salidas;
  }

  protected readonly hoverTorta = signal<{
    x: number;
    y: number;
    nivel: { texto: string; valor: number; color: string };
  } | null>(null);

  protected hoverSector(
    event: MouseEvent,
    sector: { nivel: { texto: string; valor: number; color: string } },
  ): void {
    this.hoverTorta.set({ x: event.clientX, y: event.clientY, nivel: sector.nivel });
  }

  protected cerrarTorta(): void {
    this.hoverTorta.set(null);
  }
}
