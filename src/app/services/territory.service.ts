import { HttpErrorResponse, HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { Feature, FeatureCollection, Geometry } from 'geojson';
import { Observable, catchError, forkJoin, map, mergeMap, of, shareReplay, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { Departamento } from '../models/departamento';
import { Barrio } from '../models/barrio';

@Injectable({ providedIn: 'root' })
export class TerritoryService {
  http = inject(HttpClient);
  cache = new Map<string, Observable<FeatureCollection>>();

  getDepartamentos(): Observable<FeatureCollection> {
    return this.fetch(environment.endpoints.departamentos);
  }

  getMunicipios(): Observable<FeatureCollection> {
    return this.reconstruirMunicipios();
  }

  private reconstruirMunicipios(): Observable<FeatureCollection> {
    return this.getDepartamentos().pipe(
      mergeMap((departamentos) => {
        const codigos = new Set(
          departamentos.features
            .map((feature) => featureCode(feature))
            .filter((code) => code.length > 0),
        );
        if (codigos.size === 0) {
          return throwError(
            () =>
              new Error('Sin departamentos: no se puede reconstituir la capa de municipios'),
          );
        }
        return forkJoin(
          [...codigos].map((code) =>
            this.getMunicipiosDepartamento(code).pipe(
              catchError(
                () =>
                  of({
                    type: 'FeatureCollection',
                    features: [],
                  } as FeatureCollection),
              ),
            ),
          ),
        ).pipe(
          map((capas) => ({
            type: 'FeatureCollection' as const,
            features: capas.flatMap((capa) => capa.features),
          })),
        );
      }),
    );
  }

  getMunicipiosDepartamento(departamentoCodigo: string): Observable<FeatureCollection> {
    const path = environment.endpoints.municipioDepartamento.replace(
      '{codigo_departamento}',
      encodeURIComponent(departamentoCodigo),
    );
    return this.fetch(path);
  }

  getBarrios(): Observable<FeatureCollection> {
    return this.fetch(environment.endpoints.barrios);
  }

  getPredicciones(mes?: number | null): Observable<FeatureCollection> {
    const path =
      mes == null || mes <= 0
        ? environment.endpoints.predicion
        : environment.endpoints.predicion_mes.replace(
            '{mes}',
            encodeURIComponent(String(mes)),
          );
    return this.fetch(path);
  }

  getPrediccionActual(): Observable<FeatureCollection> {
    return this.fetch(environment.endpoints.predicion_actual);
  }

  getPrediccionMunicipio(mes?: number | null): Observable<FeatureCollection> {
    const path =
      mes == null || mes <= 0
        ? environment.endpoints.predicion_municipio
        : environment.endpoints.predicion_municipio_mes.replace(
            '{mes}',
            encodeURIComponent(String(mes)),
          );
    return this.fetch(path);
  }

  getPrediccionMunicipioActual(): Observable<FeatureCollection> {
    return this.fetch(environment.endpoints.predicion_municipio_actual);
  }

  getMunicipiosConBarrios(
    departamentoCodigo?: string | null,
  ): Observable<FeatureCollection> {
    return this.getBarrios().pipe(
      mergeMap((barrios) => {
        const codes = new Set<string>();
        barrios.features.forEach((feature) => {
          const code = String(feature.properties?.['codigo_dane'] ?? '').trim();
          if (code) {
            codes.add(code);
          }
        });
        const source$ = departamentoCodigo
          ? this.getMunicipiosDepartamento(departamentoCodigo)
          : this.getMunicipios();
        return source$.pipe(
          map((collection) => ({
            type: 'FeatureCollection' as const,
            features: collection.features.filter(
              (feature) =>
                codes.has(String(feature.properties?.['codigo_dane'] ?? '').trim()),
            ),
          })),
        );
      }),
    );
  }

  private fetch(path: string): Observable<FeatureCollection> {
    const url = `${environment.apiBaseUrl}${path}`;
    let request$ = this.cache.get(url);
    if (!request$) {
      request$ = this.http.get(url).pipe(
        map(toFeatureCollection),
        catchError((error: unknown) => {
          this.cache.delete(url);
          return throwError(
            () => (error instanceof HttpErrorResponse ? error : new Error(String(error))),
          );
        }),
        shareReplay({ bufferSize: 1, refCount: false }),
      );
      this.cache.set(url, request$);
    }
    return request$;
  }
}

function toFeatureCollection(body: unknown): FeatureCollection {
  const payload =
    body && typeof body === 'object' && 'response' in body
      ? (body as Record<string, unknown>)['response']
      : body;
  if (payload && typeof payload === 'object') {
    const features = (payload as Record<string, unknown>)['features'];
    if (Array.isArray(features)) {
      return { type: 'FeatureCollection', features: toFeatures(features) };
    }
  }
  if (Array.isArray(payload)) {
    return { type: 'FeatureCollection', features: toFeatures(payload) };
  }
  throw new Error('La respuesta de la API no es un GeoJSON FeatureCollection válido.');
}

function toFeatures(items: unknown[]): Feature[] {
  return items.map(normalizeFeature).filter((feature) => feature !== null);
}

function normalizeFeature(item: unknown): Feature | null {
  if (!item || typeof item !== 'object') {
    return null;
  }
  const record = item as Record<string, unknown>;
  if (record['type'] === 'Feature') {
    const feature = item as Feature;
    return { ...feature, geometry: parseGeometry(feature.geometry) };
  }
  const fila = Departamento.from(record);
  const nested =
    record['properties'] && typeof record['properties'] === 'object'
      ? (record['properties'] as Record<string, unknown>)
      : {};
  const properties: Record<string, unknown> = { ...nested };
  if (fila) {
    if (fila.codigo_departamento !== '' && fila.codigo_departamento != null) {
      properties['codigo_departamento'] = fila.codigo_departamento;
    }
    if (fila.departamento_nombre) {
      properties['departamento_nombre'] = fila.departamento_nombre;
    }
    if (fila.municipio) {
      properties['municipio'] = fila.municipio;
    }
    if (fila.codigo_dane !== '' && fila.codigo_dane != null) {
      properties['codigo_dane'] = fila.codigo_dane;
    }
  }
  for (const [key, value] of Object.entries(record)) {
    if (key === 'type' || key === 'geometry' || key === 'properties') {
      continue;
    }
    if (properties[key] === undefined) {
      properties[key] = value;
    }
  }
  return {
    type: 'Feature',
    geometry: parseGeometry(record['geometry']),
    properties,
  };
}

function parseGeometry(value: unknown): Geometry | null {
  if (!value) {
    return null;
  }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === 'object' && 'type' in parsed) {
        return parsed as Geometry;
      }
    } catch {
      return null;
    }
    return null;
  }
  if (typeof value === 'object' && 'type' in value) {
    return value as Geometry;
  }
  return null;
}

export function featureName(feature: Feature): string {
  const props = feature.properties ?? {};
  const fila = Departamento.from(props);
  for (const candidate of [
    fila?.departamento_nombre,
    props['nombre'],
    props['name'],
    props['shapeName'],
    props['NOMBRE'],
    props['nom_dep'],
  ]) {
    const name = String(candidate ?? '').trim();
    if (name) {
      return name;
    }
  }
  if (typeof props === 'object') {
    for (const [key, value] of Object.entries(props)) {
      if (
        key.toLowerCase().endsWith('nombre') &&
        typeof value === 'string' &&
        value.trim()
      ) {
        return value.trim();
      }
    }
  }
  return '';
}

export function municipalityName(feature: Feature): string {
  const props = feature.properties ?? {};
  const fila = Departamento.from(props);
  for (const candidate of [
    fila?.municipio,
    props['municipio_nombre'],
    props['municipality_nombre'],
    props['nombre_municipio'],
    props['nom_mun'],
  ]) {
    const name = String(candidate ?? '').trim();
    if (name) {
      return name;
    }
  }
  if (typeof props === 'object') {
    for (const [key, value] of Object.entries(props)) {
      const lower = key.toLowerCase();
      if (
        lower.endsWith('nombre') &&
        !lower.includes('departamento') &&
        typeof value === 'string' &&
        value.trim()
      ) {
        return value.trim();
      }
    }
  }
  return '';
}

export function barrioName(feature: Feature): string {
  return Barrio.from(feature)?.barrio ?? '';
}

export function featureCode(feature: Feature): string {
  const props = feature.properties ?? {};
  const fila = Departamento.from(props);
  for (const candidate of [
    fila?.codigo_departamento,
    props['codigoDepartamento'],
    props['codigo'],
    props['code'],
    props['cod_dep'],
    props['id'],
    fila?.codigo_dane,
    props['codigo_municipio'],
    props['codigoMunicipio'],
  ]) {
    const code = String(candidate ?? '').trim();
    if (code) {
      return code;
    }
  }
  return '';
}
