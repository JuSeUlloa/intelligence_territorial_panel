import {
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
  inject,
  signal,
} from '@angular/core';
import type { Feature, FeatureCollection } from 'geojson';
import { forkJoin } from 'rxjs';
import { Municipio } from '../../../models/municipio';
import {
  TerritoryService,
  featureCode,
  featureName,
} from '../../../services/territory.service';

export interface PanelFilters {
  mes: number | null;
  riesgo: 'todo' | 'BAJO' | 'MEDIO' | 'ALTO';
}

export interface MunicipioOpcion {
  nombre: string;
  departamento: string | null;
}

export const MESES = [
  '',
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
] as const;

function normaliza(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

@Component({
  selector: 'app-filters',
  styleUrl: './filters.css',
  templateUrl: './filters.html',
})
export class Filters implements OnInit {
  private readonly territory = inject(TerritoryService);

  @Output() readonly applyFilters = new EventEmitter<PanelFilters>();
  @Output() readonly resetFilters = new EventEmitter<void>();
  @Output() readonly togglePrediccion = new EventEmitter<void>();
  @Output() readonly seleccionMunicipio = new EventEmitter<string | null>();

  @Input() meses: number[] = [];
  @Input() verPrediccion = false;

  protected readonly mes = signal<number | null>(null);
  protected readonly riesgo = signal<'todo' | 'BAJO' | 'MEDIO' | 'ALTO'>('todo');
  protected readonly applied = signal(false);
  protected readonly abierto = signal(false);

  protected readonly nombresMes = MESES;

  protected readonly nivelesRiesgo = [
    { value: 'todo', label: 'Todo' },
    { value: 'BAJO', label: 'Bajo' },
    { value: 'MEDIO', label: 'Medio' },
    { value: 'ALTO', label: 'Alto' },
  ];

  private readonly catalogo = signal<MunicipioOpcion[]>([]);
  protected readonly consulta = signal('');
  protected readonly typeaheadAbierto = signal(false);
  protected readonly municipioElegido = signal<string | null>(null);

  ngOnInit(): void {
    forkJoin({
      municipios: this.territory.getMunicipios(),
      departamentos: this.territory.getDepartamentos(),
    }).subscribe({
      next: ({ municipios, departamentos }) => {
        const nombresDep = new Map<string, string>();
        departamentos.features.forEach((feature: Feature) => {
          const code = featureCode(feature);
          if (code) {
            nombresDep.set(code, featureName(feature));
          }
        });
        const lista: MunicipioOpcion[] = [];
        municipios.features.forEach((feature) => {
          const modelo = Municipio.from(feature);
          if (!modelo) {
            return;
          }
          const codigo = String(modelo.codigo_dane).padStart(5, '0');
          const nombreDep = nombresDep.get(codigo.slice(0, 2)) ?? null;
          lista.push({ nombre: modelo.municipio, departamento: nombreDep });
        });
        const unicos = new Map<string, MunicipioOpcion>();
        lista.forEach((opcion) => {
          const clave = `${normaliza(opcion.nombre)}|${opcion.departamento ?? ''}`;
          if (!unicos.has(clave)) {
            unicos.set(clave, opcion);
          }
        });
        this.catalogo.set(
          [...unicos.values()].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')),
        );
      },
      error: () => this.catalogo.set([]),
    });
  }

  protected get sugerencias(): MunicipioOpcion[] {
    const q = normaliza(this.consulta());
    if (q.length < 3) {
      return [];
    }
    return this.catalogo()
      .filter((opcion) => normaliza(opcion.nombre).startsWith(q))
      .slice(0, 8);
  }

  protected onConsultaInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.consulta.set(value);
    if (this.municipioElegido() && value !== this.municipioElegido()) {
      this.municipioElegido.set(null);
    }
    this.typeaheadAbierto.set(true);
  }

  protected onConsultaKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      const primera = this.sugerencias[0];
      if (primera) {
        this.elegirSugerencia(primera);
      }
    } else if (event.key === 'Escape') {
      this.typeaheadAbierto.set(false);
    }
  }

  protected elegirSugerencia(opcion: MunicipioOpcion): void {
    this.consulta.set(opcion.nombre);
    this.municipioElegido.set(opcion.nombre);
    this.typeaheadAbierto.set(false);
    this.seleccionMunicipio.emit(opcion.nombre);
  }

  protected limpiarSeleccion(): void {
    this.consulta.set('');
    this.municipioElegido.set(null);
    this.typeaheadAbierto.set(false);
    this.seleccionMunicipio.emit(null);
  }

  protected toggle(): void {
    this.abierto.set(!this.abierto());
  }

  protected onMesChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.mes.set(value === '' ? null : Number(value));
  }

  protected onRiesgoChange(event: Event): void {
    this.riesgo.set((event.target as HTMLSelectElement).value as PanelFilters['riesgo']);
  }

  protected emit(): void {
    this.applyFilters.emit({ mes: this.mes(), riesgo: this.riesgo() });
  }

  protected onApply(): void {
    this.applied.set(true);
    this.emit();
  }

  protected onReset(): void {
    this.mes.set(null);
    this.riesgo.set('todo');
    this.applied.set(false);
    this.consulta.set('');
    this.municipioElegido.set(null);
    this.typeaheadAbierto.set(false);
    this.resetFilters.emit();
  }
}
