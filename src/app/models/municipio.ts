import type { Feature } from 'geojson';
import { Departamento } from './departamento';

export class Municipio {
  codigo_dane: number | string = '';

  municipio = '';

  static from(feature: Feature): Municipio | null {
    const fila = Departamento.from(feature.properties ?? {});
    const codigo = fila?.codigo_dane;
    if (codigo === undefined || codigo === null || String(codigo).trim() === '') {
      return null;
    }
    const model = new Municipio();
    model.codigo_dane = codigo;
    model.municipio = String(fila?.municipio ?? '').trim();
    return model;
  }
}
