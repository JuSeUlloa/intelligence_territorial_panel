export class Prediccion {
  id_barrio = '';
  barrio = '';
  municipio: string;
  codigo_dane: number;
  departamento: string;
  mes: number;
  anio: number;
  tasa_predicha: number;
  tasa_real: number;
  total_tematica: number;
  tematica_mes_anterior: number;
  pob_dane_2025: number;
  error: number;
  abs_error: number;
  sq_error: number;
  ape_pct: number;
  nivel_riesgo_real: string;
  nivel_riesgo_predicho: string;
  p_25: number;
  p_50: number;
  p_75: number;

  constructor(
    mun: string,
    codD: number,
    depar: string,
    mes: number,
    ani: number,
    tasap: number,
    tasar: number,
    total: number,
    temat: number,
    pob: number,
    err: number,
    abs: number,
    sq: number,
    apc: number,
    nivelR: string,
    nivelP: string,
    p25: number,
    p50: number,
    p75: number,
  ) {
    this.municipio = mun;
    this.codigo_dane = codD;
    this.departamento = depar;
    this.mes = mes;
    this.anio = ani;
    this.tasa_predicha = tasap;
    this.tasa_real = tasar;
    this.total_tematica = total;
    this.tematica_mes_anterior = temat;
    this.pob_dane_2025 = pob;
    this.error = err;
    this.abs_error = abs;
    this.sq_error = sq;
    this.ape_pct = apc;
    this.nivel_riesgo_predicho = nivelP;
    this.nivel_riesgo_real = nivelR;
    this.p_25 = p25;
    this.p_50 = p50;
    this.p_75 = p75;
  }

  static from(raw: unknown): Prediccion | null {
    if (!raw || typeof raw !== 'object') {
      return null;
    }
    const r = raw as Record<string, unknown>;
    const codigo = Number(r['codigo_dane']);
    if (!Number.isFinite(codigo) || codigo <= 0) {
      return null;
    }
    const s = (v: unknown): string => String(v ?? '').trim();
    const n = (v: unknown): number => {
      const value = Number(v);
      return Number.isFinite(value) ? value : 0;
    };
    if (r['id_barrio'] !== undefined && r['id_barrio'] !== null) {
      const modelo = new Prediccion(
        s(r['municipio']),
        codigo,
        s(r['departamento']),
        n(r['mes']),
        n(r['anio']),
        n(r['tasa_predicha']),
        n(r['tasa_real']),
        n(r['total_tematica']),
        n(r['tematica_mes_anterior']),
        n(r['pob_dane_2025']),
        n(r['error']),
        n(r['abs_error']),
        n(r['sq_error']),
        n(r['ape_pct']),
        s(r['nivel_riesgo_real']),
        s(r['nivel_riesgo_predicho']),
        n(r['p_25']),
        n(r['p_50']),
        n(r['p_75']),
      );
      modelo.id_barrio = String(r['id_barrio']).trim();
      modelo.barrio = String(r['barrio'] ?? '').trim();
      return modelo;
    }
    return new Prediccion(
      s(r['municipio']),
      codigo,
      s(r['departamento']),
      n(r['mes']),
      n(r['anio']),
      n(r['tasa_predicha']),
      n(r['tasa_real']),
      n(r['total_tematica']),
      n(r['tematica_mes_anterior']),
      n(r['pob_dane_2025']),
      n(r['error']),
      n(r['abs_error']),
      n(r['sq_error']),
      n(r['ape_pct']),
      s(r['nivel_riesgo_real']),
      s(r['nivel_riesgo_predicho']),
      n(r['p_25']),
      n(r['p_50']),
      n(r['p_75']),
    );
  }

  static riesgoEscala(nivel: string | null | undefined): number | null {
    switch (String(nivel ?? '').trim().toUpperCase()) {
      case 'ALTO':
        return 1;
      case 'MEDIO':
        return 0.5;
      case 'BAJO':
        return 0;
      default:
        return null;
    }
  }
}
