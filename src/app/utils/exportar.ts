import type { FeatureCollection } from 'geojson';
import { Prediccion } from '../models/prediccion';

export type TipoExportar = 'csv' | 'xlsx';

/** Columnas del reporte: cabecera legible + campo del modelo Prediccion (o columna derivada). */
export const COLUMNAS_REPORTE: Array<{ titulo: string; campo: keyof Prediccion | 'tipo' }> = [
  { titulo: 'Municipio', campo: 'municipio' },
  { titulo: 'Departamento', campo: 'departamento' },
  { titulo: 'Código DANE', campo: 'codigo_dane' },
  { titulo: 'Mes', campo: 'mes' },
  { titulo: 'Año', campo: 'anio' },
  { titulo: 'Tipo registro', campo: 'tipo' },
  { titulo: 'Tasa real (por 100k)', campo: 'tasa_real' },
  { titulo: 'Tasa predicha', campo: 'tasa_predicha' },
  { titulo: 'Hurtos', campo: 'total_tematica' },
  { titulo: 'Hurtos mes anterior', campo: 'tematica_mes_anterior' },
  { titulo: 'Población DANE 2025', campo: 'pob_dane_2025' },
  { titulo: 'Nivel riesgo real', campo: 'nivel_riesgo_real' },
  { titulo: 'Nivel riesgo predicho', campo: 'nivel_riesgo_predicho' },
  { titulo: 'Error (real − predicha)', campo: 'error' },
  { titulo: 'Error absoluto', campo: 'abs_error' },
  { titulo: 'APE %', campo: 'ape_pct' },
  { titulo: 'P25', campo: 'p_25' },
  { titulo: 'P50', campo: 'p_50' },
  { titulo: 'P75', campo: 'p_75' },
];

/** Sufijo de alcance para el nombre del archivo según la selección del mapa.
 *  La exportación no se ofrece en nivel barrio (el botón se oculta con ese nivel). */
export function sufijoAlcance(
  departamento: string | null,
  municipio: string | null,
): string {
  const slug = (texto: string | null | undefined): string =>
    texto
      ? texto.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, '_')
      : '';
  // Municipio > Departamento > Nacional
  return slug(municipio) || slug(departamento) || 'nacional';
}

export interface FilaReporte extends Record<string, string | number | null> {
  tipo: string;
}

const NOMBRES_MES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

/**
 * Construye el reporte "gold" de un año dado para el nivel municipio:
 * filas observadas de la tabla gold + la predicción del mes en curso.
 * Respeta el recorte geográfico actual (departamentos/municipios visibles).
 */
export function filasReporteGold(
  gold: FeatureCollection,
  predicciones: FeatureCollection | null,
  anio: number,
  depsVisibles: Set<string> | null = null,
  munisVisibles: Set<string> | null = null,
): FilaReporte[] {
  const visibles = (pred: Prediccion): boolean => {
    const clave = String(pred.codigo_dane).padStart(5, '0');
    if (depsVisibles && !depsVisibles.has(clave.slice(0, 2))) {
      return false;
    }
    if (munisVisibles && !munisVisibles.has(clave)) {
      return false;
    }
    return true;
  };
  const fila = (pred: Prediccion, tipo: string): FilaReporte => {
    const fila: FilaReporte = { tipo };
    for (const col of COLUMNAS_REPORTE) {
      if (col.campo === 'tipo') {
        continue;
      }
      const valor = pred[col.campo];
      fila[col.campo] =
        valor === null || valor === undefined || valor === ('' as never)
          ? null
          : (valor as string | number);
    }
    // El código DANE se normaliza a 5 dígitos: los que empiezan por 0
    // (ej. Medellín 05001) perderían el prefijo si fueran numéricos
    fila['codigo_dane'] = String(pred.codigo_dane).padStart(5, '0');
    fila['mes'] = Number(pred.mes) || null;
    fila['mes_nombre'] = NOMBRES_MES[Number(pred.mes) - 1] ?? null;
    if (pred.tasa_real === 0) {
      // Mes de predicción: sin dato observado aún; se reporta vacío para no
      // inducir lectura de "cero medido", junto con las métricas de error
      // (solo tienen sentido contra una tasa real)
      fila['tasa_real'] = null;
      fila['error'] = null;
      fila['abs_error'] = null;
      fila['sq_error'] = null;
      fila['ape_pct'] = null;
      fila['nivel_riesgo_real'] = null;
    }
    return fila;
  };
  const ordenar = (prev: FilaReporte, sig: FilaReporte): number =>
    String(Number(prev['codigo_dane']) || '').padStart(5, '0').localeCompare(
      String(Number(sig['codigo_dane']) || '').padStart(5, '0'),
    ) ||
    Number(prev['mes']) - Number(sig['mes']) ||
    (prev['tipo'] === sig['tipo'] ? 0 : prev['tipo'] === 'Predicción' ? 1 : -1);

  const salida: FilaReporte[] = [];
  gold.features.forEach((feature) => {
    const pred = Prediccion.from(feature.properties ?? {});
    if (pred && pred.anio === anio && visibles(pred)) {
      salida.push(fila(pred, 'Observado'));
    }
  });
  // Meses ya cubiertos por filas observadas: el mes de predicción debe ser
  // UNA fila final por municipio (tipo "Predicción"), nunca un duplicado
  const yaObservada = new Set(
    salida.map((fila) => `${fila['codigo_dane']}|${fila['anio']}|${fila['mes']}`),
  );
  (predicciones?.features ?? []).forEach((feature) => {
    const pred = Prediccion.from(feature.properties ?? {});
    const clave = pred ? `${String(pred.codigo_dane).padStart(5, '0')}|${pred.anio}|${pred.mes}` : '';
    if (pred && pred.anio === anio && visibles(pred) && !yaObservada.has(clave)) {
      salida.push(fila(pred, 'Predicción'));
    }
  });
  return salida.sort(ordenar);
}

/** Números al estilo es-CO para el CSV que abrirá Excel en es-CO. */
function decimalCsv(valor: string | number | null | undefined): string {
  if (valor === null || valor === undefined || valor === '') {
    return '';
  }
  if (typeof valor === 'number') {
    return valor.toLocaleString('es-CO', { maximumFractionDigits: 2 });
  }
  return valor;
}

export function aCsv(filas: FilaReporte[]): string {
  const columnas: Array<{ titulo: string; campo: string }> = [
    ...COLUMNAS_REPORTE.map((c) => ({
      titulo: c.titulo,
      campo: c.campo === 'mes' ? 'mes' : String(c.campo),
    })),
    { titulo: 'Mes (nombre)', campo: 'mes_nombre' },
  ];
  const campo = (valor: string | number | null | undefined): string => {
    return '"' + String(valor ?? '').replace(/"/g, '""') + '"';
  };
  const lineas = [columnas.map((c) => campo(c.titulo)).join(';')];
  filas.forEach((fila) => {
    lineas.push(
      columnas.map((c) => campo(decimalCsv(fila[c.campo] as string | number | null))).join(';'),
    );
  });
  // BOM para que Excel detecte UTF-8 (nombres y tildes correctos)
  return '\ufeff' + lineas.join('\r\n');
}

export function descargarArchivo(contenido: string | Blob, nombre: string, mime: string): void {
  const blob = contenido instanceof Blob ? contenido : new Blob([contenido], { type: mime });
  const url = URL.createObjectURL(blob);
  const ancla = document.createElement('a');
  ancla.href = url;
  ancla.download = nombre;
  document.body.appendChild(ancla);
  ancla.click();
  ancla.remove();
  URL.revokeObjectURL(url);
}

/** XLSX con hoja única; la librería se carga perezosamente (no entra al bundle inicial). */
export async function exportarXlsx(
  filas: FilaReporte[],
  nombre: string,
): Promise<void> {
  const XLSX = await import('xlsx');
  const cabecera = [...COLUMNAS_REPORTE.map((c) => c.titulo), 'Mes (nombre)'];
  const datos = [
    cabecera,
    ...filas.map((fila) =>
      [
        ...COLUMNAS_REPORTE.map((c) => fila[c.campo] ?? ''),
        fila['mes_nombre'] ?? '',
      ],
    ),
  ];
  const hoja = XLSX.utils.aoa_to_sheet(datos);
  hoja['!cols'] = cabecera.map((titulo) => ({ wch: Math.max(10, Math.min(34, titulo.length + 4)) }));
  const libro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(libro, hoja, 'Gold 2026');
  XLSX.writeFile(libro, nombre);
}

/** Punto de entrada único: decide formato, genera y descarga el archivo. */
export async function exportarReporte(
  filas: FilaReporte[],
  formato: TipoExportar,
  nombreBase: string,
): Promise<void> {
  if (filas.length === 0) {
    throw new Error('No hay filas para exportar con los filtros actuales.');
  }
  if (formato === 'csv') {
    descargarArchivo(aCsv(filas), `${nombreBase}.csv`, 'text/csv;charset=utf-8');
    return;
  }
  await exportarXlsx(filas, `${nombreBase}.xlsx`);
}
