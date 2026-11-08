export class VariablesConsolidadas {
    codigo_departamento: number;
    departamento: string;
    codigo_municipio: number;
    municipio: string;
    pob_dane_2025: number;
    pdet: number;
    zomac: number;
    pdet_zomac: number;
    riesgo_victimizacion: number;
    cluster_rv: string;
    pres_grup_armados: number | null;
    cluster_pga: string;
    victimizacion_seguridad: number | null;
    cluster_vs: string;
    pib2024_peso_relativo_mun_valor_agregado_departamental: number;
    hurto_2025: number;
    hurto_acum_5: number;
    art95_num1_base_datos_negativa_del_articulo_106_ley_1453_2011: number;
    municipio_isla_area_no_municipalizada: boolean;
    longitud: number;
    latitud: number;
    
    constructor(cod_d:number, dep:string, cod_m:number, mun:string, pob:number, pdet:number, zomac:number, pdet_zomac:number, riesgo_victimizacion:number, cluster_rv:string, pres_grup_armados:number|null, cluster_pga:string, victimizacion_seguridad:number|null, cluster_vs:string, pib2024_peso_relativo_mun_valor_agregado_departamental:number, hurto_2025:number, hurto_acum_5:number, art95_num1_base_datos_negativa_del_articulo_106_ley_1453_2011:number, municipio_isla_area_no_municipalizada:boolean, longitud:number, latitud:number) {
        this.codigo_departamento = cod_d;
        this.departamento = dep;
        this.codigo_municipio = cod_m;
        this.municipio = mun;
        this.pob_dane_2025 = pob;
        this.pdet = pdet;
        this.zomac = zomac;
        this.pdet_zomac = pdet_zomac;
        this.riesgo_victimizacion = riesgo_victimizacion;
        this.cluster_rv = cluster_rv;
        this.pres_grup_armados = pres_grup_armados;
        this.cluster_pga = cluster_pga;
        this.victimizacion_seguridad = victimizacion_seguridad;
        this.cluster_vs = cluster_vs;
        this.pib2024_peso_relativo_mun_valor_agregado_departamental = pib2024_peso_relativo_mun_valor_agregado_departamental;
        this.hurto_2025 = hurto_2025;
        this.hurto_acum_5 = hurto_acum_5;
        this.art95_num1_base_datos_negativa_del_articulo_106_ley_1453_2011 = art95_num1_base_datos_negativa_del_articulo_106_ley_1453_2011;
        this.municipio_isla_area_no_municipalizada = municipio_isla_area_no_municipalizada;
        this.longitud = longitud;
        this.latitud = latitud;
    }

    /** Construye la instancia desde una fila cruda de la API (tabla consolidado). */
    static from(raw: unknown): VariablesConsolidadas | null {
        if (!raw || typeof raw !== 'object') {
            return null;
        }
        const r = raw as Record<string, unknown>;
        const codigo = Number(r['codigo_municipio'] ?? r['codigo_dane']);
        if (!Number.isFinite(codigo) || codigo <= 0) {
            return null;
        }
        const n = (v: unknown): number => {
            const value = Number(v);
            return Number.isFinite(value) ? value : 0;
        };
        // Los índices con nulos reales en la tabla (ej. 119 municipios sin
        // pres_grup_armados/victimizacion_seguridad) NO deben colapsar a 0
        const numONulo = (v: unknown): number | null => {
            if (v === null || v === undefined || v === '') {
                return null;
            }
            const value = Number(v);
            return Number.isFinite(value) ? value : null;
        };
        const binaria = (v: unknown): number =>
            v === true || v === 1 || v === '1' || v === 'true' ? 1 : 0;
        const texto = (v: unknown): string => String(v ?? '').trim();
        const isla = r['municipio_isla_area_no_municipalizada'];
        return new VariablesConsolidadas(
            Number(r['codigo_departamento']) || 0,
            texto(r['departamento']),
            codigo,
            texto(r['municipio']),
            n(r['pob_dane_2025']),
            binaria(r['pdet']),
            binaria(r['zomac']),
            binaria(r['pdet_zomac']),
            n(r['riesgo_victimizacion']),
            texto(r['cluster_rv']),
            numONulo(r['pres_grup_armados']),
            texto(r['cluster_pga']),
            numONulo(r['victimizacion_seguridad']),
            texto(r['cluster_vs']),
            n(r['pib2024_peso_relativo_mun_valor_agregado_departamental']),
            n(r['hurto_2025']),
            n(r['hurto_acum_5']),
            n(r['art95_num1_base_datos_negativa_del_articulo_106_ley_1453_2011']),
            isla === true || isla === 1 || isla === '1' || isla === 'true',
            n(r['longitud']),
            n(r['latitud']),
        );
    }
}