export class Departamento {
  codigo_dane: number | string = '';

  municipio = '';

  codigo_departamento = '';

  departamento_nombre = '';

  geometry = '';

  static from(raw: unknown): Departamento | null {
    if (!raw || typeof raw !== 'object') {
      return null;
    }
    const record = raw as Record<string, unknown>;
    const fila = new Departamento();
    if (record['codigo_dane'] !== undefined && record['codigo_dane'] !== null) {
      fila.codigo_dane = record['codigo_dane'] as number | string;
    }
    if (typeof record['municipio'] === 'string') {
      fila.municipio = record['municipio'];
    }
    fila.codigo_departamento = String(
      record['codigo_departamento'] ?? record['codigoDepartamento'] ?? '',
    );
    fila.departamento_nombre = String(record['departamento_nombre'] ?? '');
    if (typeof record['geometry'] === 'string') {
      fila.geometry = record['geometry'];
    }
    return fila;
  }
}
