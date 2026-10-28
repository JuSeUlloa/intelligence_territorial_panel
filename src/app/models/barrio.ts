import type { Feature } from 'geojson';

export class Barrio {
  barrio = '';

  codigo_dane: number | string = '';

  id_barrio = '';

  static from(feature: Feature): Barrio | null {
    const props = feature.properties ?? {};
    const nombre = String(props['barrio'] ?? props['nombre'] ?? '').trim();
    if (!nombre) {
      return null;
    }
    const model = new Barrio();
    model.barrio = nombre;
    model.codigo_dane = String(props['codigo_dane'] ?? '').trim();
    model.id_barrio = String(props['id_barrio'] ?? '').trim();
    return model;
  }
}
