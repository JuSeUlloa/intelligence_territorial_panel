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

/** Contexto estructural del municipio (tabla consolidado, estático). */
export interface ContextoEstructural {
  pdet: boolean;
  zomac: boolean;
  clusterRv: string | null;
  grupoArmados: boolean | null;
  presArmados: number | null;
  pibPeso: number | null;
  riesgoVictimizacion: number | null;
  seguridad: number | null;
  bdNegativa: number | null;
  hurto2025: number | null;
  hurtoAcum5: number | null;
  isla: string | null;
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

  @Input() contexto: ContextoEstructural | null = null;

  protected readonly contextoAbierto = signal(false);

  /** Ítems estructurales para la grilla del resumen (misma métrica que resumenStats). */
  protected get badgesContexto(): Array<{ texto: string; valor: string; rank: number | null; title: string }> {
    const contexto = this.contexto;
    if (!contexto) {
      return [];
    }
    const escala = (texto: string): number | null => {
      const s = texto.trim().toLowerCase();
      // Clústeres ordinales de 5 niveles (Bajo → Alto); el orden importa:
      // "Medio Alto" debe preceder al chequeo de "Alto" y "Medio Bajo" al de "Medio"
      if (s === 'bajo') return 0;
      if (s === 'medio bajo') return 0.25;
      if (s === 'medio') return 0.5;
      if (s === 'medio alto') return 0.75;
      if (s === 'alto') return 1;
      if (s.includes('medio alto')) return 0.75;
      if (s.includes('alto')) return 1;
      if (s.includes('medio bajo')) return 0.25;
      if (s.includes('medio')) return 0.5;
      if (s.includes('bajo')) return 0;
      const numero = Number(s);
      if (Number.isFinite(numero) && numero > 0) {
        return Math.min(1, numero / 3);
      }
      return null;
    };
    const badges: Array<{ texto: string; valor: string; rank: number | null; title: string }> = [];
    if (contexto.pdet) {
      badges.push({ texto: 'PDET', valor: 'Sí', rank: null, title: 'Programa de Desarrollo con Enfoque Territorial' });
    }
    if (contexto.zomac) {
      badges.push({ texto: 'ZOMAC', valor: 'Sí', rank: null, title: 'Zonas Más Afectadas por el Conflicto' });
    }
    if (contexto.clusterRv) {
      badges.push({
        texto: 'Cluster RV',
        valor: contexto.clusterRv,
        rank: escala(contexto.clusterRv),
        title: 'Clúster de riesgo de victimización (estructural)',
      });
    }
    if (contexto.riesgoVictimizacion != null) {
      badges.push({
        texto: 'R. victimización',
        valor: contexto.riesgoVictimizacion.toLocaleString('es-CO', { maximumFractionDigits: 2 }),
        rank: contexto.riesgoVictimizacion >= 2 / 3 ? 1 : contexto.riesgoVictimizacion >= 1 / 3 ? 0.5 : 0,
        title: 'Índice estructural de riesgo de victimización (0–1)',
      });
    }
    if (contexto.presArmados != null) {
      badges.push({
        texto: 'Índice armados',
        valor: contexto.presArmados.toLocaleString('es-CO', { maximumFractionDigits: 2 }),
        rank: contexto.presArmados >= 0.5 ? 1 : contexto.presArmados >= 0.3 ? 0.5 : 0,
        title:
          'Índice de presencia de grupos armados (0–1). Mediana nacional ≈ 0,10 · p90 ≈ 0,24 · solo unos pocos municipios superan 0,50. Eleva el crimen real y también el sesgo de denuncia',
      });
    }
    if (contexto.grupoArmados === true) {
      badges.push({ texto: 'Gr. armados', valor: 'Sí', rank: 1, title: 'Presencia de grupos armados establecida (índice ≥ 0,5)' });
    }
    if (contexto.seguridad != null) {
      badges.push({
        texto: 'Índice seguridad',
        valor: contexto.seguridad.toLocaleString('es-CO', { maximumFractionDigits: 2 }),
        rank: null,
        title: 'Índice estructural de victimización por seguridad (varianza casi nula: muy uniforme entre municipios)',
      });
    }
    if (contexto.bdNegativa != null) {
      badges.push({
        texto: 'BD neg. IMEI',
        valor: contexto.bdNegativa.toLocaleString('es-CO'),
        rank: null,
        title: 'Equipos en la base de datos negativa de terminales móviles (Art. 106 de la Ley 1453 de 2011: celulares reportados como robados/perdidos). Auditoría pendiente (A6): puede actuar como proxy de población',
      });
    }
    if (contexto.hurtoAcum5 != null) {
      badges.push({
        texto: 'Hurto acum. 5 años',
        valor: contexto.hurtoAcum5.toLocaleString('es-CO'),
        rank: null,
        title: 'Hurtos acumulados de los últimos 5 años (línea base histórica)',
      });
    }
    if (contexto.isla && contexto.isla.toUpperCase() !== 'MUNICIPIO') {
      badges.push({
        texto: 'Área no municipalizada / isla',
        valor: contexto.isla,
        rank: null,
        title: 'Categoría territorial: isla o área no municipalizada (afecta presencia logística y de servicios)',
      });
    }
    if (contexto.pibPeso != null) {
      badges.push({
        texto: 'PIB dpto (2024)',
        valor: contexto.pibPeso.toLocaleString('es-CO', { maximumFractionDigits: 1 }) + '%',
        rank: null,
        title: 'Peso del PIB municipal en el valor agregado departamental',
      });
    }
    return badges;
  }

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
    if (target.closest?.('[data-popup-barras]') || target.closest?.('[data-popup-contexto]')) {
      return;
    }
    if (this.seleccionada() !== null) {
      this.cerrar();
    }
    if (this.contextoAbierto()) {
      this.contextoAbierto.set(false);
    }
  }

  /** Abre/cierra la ventana flotante del contexto estructural (anclada al botón). */
  protected alternarContexto(event: MouseEvent): void {
    event.stopPropagation();
    this.contextoAbierto.set(!this.contextoAbierto());
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
