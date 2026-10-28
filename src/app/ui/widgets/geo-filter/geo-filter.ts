import { Component, EventEmitter, OnInit, Output, inject, signal } from '@angular/core';
import type { Feature, FeatureCollection } from 'geojson';
import { TerritoryService, featureCode, featureName } from '../../../services/territory.service';

export interface GeoSelection {
  nivel: 'departamento' | 'municipio' | 'barrio';
  departamento: string | null;
  departamentoCodigo: string | null;
  municipio: string | null;
}

@Component({
  selector: 'app-geo-filter',
  styleUrl: './geo-filter.css',
  templateUrl: './geo-filter.html',
  host: {
    '(document:keydown.escape)': 'onEscape()',
  },
})
export class GeoFilter implements OnInit {
  private readonly territory = inject(TerritoryService);

  @Output() readonly selectionChange = new EventEmitter<GeoSelection>();

  protected readonly open = signal(false);

  protected readonly nivel = signal<GeoSelection['nivel']>('departamento');
  protected readonly departamento = signal<string | null>(null);
  protected readonly departamentoCodigo = signal<string | null>(null);
  protected readonly municipio = signal<string | null>(null);

  protected readonly departamentos = signal<string[]>([]);
  private readonly codigos = signal<Record<string, string>>({});

  protected readonly levels: { value: GeoSelection['nivel']; label: string; icon: string }[] = [
    { value: 'departamento', label: 'Depto.', icon: 'fa-building' },
    { value: 'municipio', label: 'Municipio', icon: 'fa-city' },
    { value: 'barrio', label: 'Barrio', icon: 'fa-map-pin' },
  ];

  ngOnInit(): void {
    this.territory.getDepartamentos().subscribe({
      next: (collection) => {
        this.departamentos.set(sortedNames(collection, featureName));
        const codigos: Record<string, string> = {};
        collection.features.forEach((feature) => {
          const name = featureName(feature);
          const code = featureCode(feature);
          if (name && code) {
            codigos[name] = code;
          }
        });
        this.codigos.set(codigos);
      },
      error: () => this.departamentos.set([]),
    });
  }

  protected toggle(): void {
    this.open.update((value) => !value);
  }

  protected onEscape(): void {
    if (this.open()) {
      this.open.set(false);
    }
  }

  seleccionarDepartamento(departamento: string, codigo: string): void {
    this.nivel.set('departamento');
    this.departamento.set(departamento);
    this.departamentoCodigo.set(codigo);
    this.municipio.set(null);
    this.open.set(true);
    this.emit();
  }

  seleccionarMunicipio(
    municipio: string,
    departamento?: string | null,
    codigo?: string | null,
  ): void {
    this.nivel.set('municipio');
    this.departamento.set(departamento ?? null);
    this.departamentoCodigo.set(codigo ?? null);
    this.municipio.set(municipio);
    this.emit();
  }

  limpiarMunicipio(): void {
    if (this.municipio() === null) {
      return;
    }
    this.municipio.set(null);
    this.emit();
  }

  verMunicipios(departamento: string, codigo: string): void {
    this.nivel.set('municipio');
    this.departamento.set(departamento);
    this.departamentoCodigo.set(codigo);
    this.municipio.set(null);
    this.open.set(true);
    this.emit();
  }

  resetar(): void {
    this.nivel.set('departamento');
    this.departamento.set(null);
    this.departamentoCodigo.set(null);
    this.municipio.set(null);
    this.open.set(false);
    this.emit();
  }

  protected onNivelChange(nivel: GeoSelection['nivel']): void {
    this.nivel.set(nivel);
    this.emit();
  }

  protected onDepartamentoChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value || null;
    this.departamento.set(value);
    this.departamentoCodigo.set(value ? this.codigos()[value] ?? null : null);
    this.municipio.set(null);
    this.emit();
  }

  private emit(): void {
    this.selectionChange.emit({
      nivel: this.nivel(),
      departamento: this.departamento(),
      departamentoCodigo: this.departamentoCodigo(),
      municipio: this.municipio(),
    });
  }
}

function sortedNames(
  collection: FeatureCollection,
  extract: (feature: Feature) => string,
): string[] {
  const names = collection.features.map(extract).filter((name) => name.length > 0);
  return [...new Set(names)].sort((a, b) => a.localeCompare(b, 'es'));
}
