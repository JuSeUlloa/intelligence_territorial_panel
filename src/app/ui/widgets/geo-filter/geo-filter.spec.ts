import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import type { Feature, FeatureCollection } from 'geojson';
import { TerritoryService } from '../../../services/territory.service';
import { GeoFilter, GeoSelection } from './geo-filter';

function departmentCollection(): FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: { type: 'Polygon', coordinates: [] },
        properties: { departamento_nombre: 'Antioquia', codigo_departamento: '05' },
      },
      {
        type: 'Feature',
        geometry: { type: 'Polygon', coordinates: [] },
        properties: { departamento_nombre: 'Cundinamarca', codigo_departamento: '25' },
      },
    ],
  };
}

describe('GeoFilter', () => {
  let fixture: __ng_fixture;

  const el = (): HTMLElement => fixture.nativeElement as HTMLElement;

  const select = (index: number): HTMLSelectElement =>
    Array.from(el().querySelectorAll('select'))[index] as HTMLSelectElement;

  const button = (label: string): HTMLButtonElement =>
    Array.from(el().querySelectorAll('button')).find(
      (b: HTMLButtonElement) => b.textContent?.includes(label),
    )! as HTMLButtonElement;

  const hamburger = (): HTMLButtonElement =>
    el().querySelector('button[aria-expanded]') as HTMLButtonElement;

  const openPanel = (): void => {
    if (!el().querySelector('#geo-filter-panel')) {
      hamburger().click();
      fixture.detectChanges();
    }
  };

  const change = (element: HTMLSelectElement, value: string): void => {
    element.value = value;
    element.dispatchEvent(new Event('change'));
    fixture.detectChanges();
  };

  const changeAsync = async (element: HTMLSelectElement, value: string): Promise<void> => {
    change(element, value);
    await fixture.whenStable();
    fixture.detectChanges();
  };

  interface __ng_fixture {
    componentInstance: GeoFilter;
    nativeElement: HTMLElement;
    detectChanges(): void;
    whenStable(): Promise<void>;
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GeoFilter],
      providers: [
        {
          provide: TerritoryService,
          useValue: {
            getDepartamentos: () => of(departmentCollection()),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(GeoFilter);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    openPanel();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should list the departments and show ONE select with three level buttons', () => {
    const options = Array.from(select(0).options).map((o) => o.textContent?.trim());
    expect(options).toContain('Todo el país');
    expect(options).toContain('Antioquia');
    expect(options).toContain('Cundinamarca');

    expect(el().querySelectorAll('select')).toHaveLength(1);
    const levelButtons = el().querySelectorAll('[aria-label="Nivel de polígonos a cargar"] button');
    expect(levelButtons).toHaveLength(3);
    expect(el().textContent).toContain('Barrio');
  });

  it('should emit the barrio level when pressing Barrio', () => {
    let captured: GeoSelection | undefined;
    fixture.componentInstance.selectionChange.subscribe((value) => (captured = value));

    button('Barrio').click();
    fixture.detectChanges();

    expect(captured).toEqual({
      nivel: 'barrio',
      departamento: null,
      departamentoCodigo: null,
      municipio: null,
    });
  });

  it('should toggle the panel from the hamburger button', () => {
    openPanel();
    expect(el().querySelector('#geo-filter-panel')).toBeTruthy();
    expect(hamburger().getAttribute('aria-expanded')).toBe('true');

    hamburger().click();
    fixture.detectChanges();
    expect(el().querySelector('#geo-filter-panel')).toBeNull();
    expect(hamburger().getAttribute('aria-expanded')).toBe('false');

    hamburger().click();
    fixture.detectChanges();
    const panel = el().querySelector('#geo-filter-panel') as HTMLElement;
    expect(panel).toBeTruthy();
    expect(panel.classList).toContain('w-72');
    expect(panel.classList).toContain('mt-2');
    expect(hamburger().getAttribute('aria-expanded')).toBe('true');
  });

  it('should close the panel on Escape', () => {
    expect(el().querySelector('#geo-filter-panel')).toBeTruthy();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();

    expect(el().querySelector('#geo-filter-panel')).toBeNull();
  });

  it('should isolate the department when selected from the map (seleccionarDepartamento)', async () => {
    let capturado: GeoSelection | null = null;
    fixture.componentInstance.selectionChange.subscribe((value) => (capturado = value));

    fixture.componentInstance.seleccionarDepartamento('Valle del Cauca', '76');
    await fixture.whenStable();

    expect(capturado).toEqual({
      nivel: 'departamento',
      departamento: 'Valle del Cauca',
      departamentoCodigo: '76',
      municipio: null,
    });
  });

  it('should isolate a municipality chosen in the typeahead (seleccionarMunicipio)', async () => {
    let capturado: GeoSelection | undefined;
    fixture.componentInstance.selectionChange.subscribe((value) => (capturado = value));

    fixture.componentInstance.seleccionarMunicipio('Buenaventura');
    await fixture.whenStable();

    expect(capturado).toEqual({
      nivel: 'municipio',
      departamento: null,
      departamentoCodigo: null,
      municipio: 'Buenaventura',
    });

    let limpio: GeoSelection | undefined;
    fixture.componentInstance.selectionChange.subscribe((value) => (limpio = value));
    fixture.componentInstance.limpiarMunicipio();
    await fixture.whenStable();

    expect(limpio).toEqual({
      nivel: 'municipio',
      departamento: null,
      departamentoCodigo: null,
      municipio: null,
    });
  });

  it('should jump to the municipality level from the map popup (verMunicipios)', async () => {
    let capturado: GeoSelection | null = null;
    fixture.componentInstance.selectionChange.subscribe((value) => (capturado = value));

    fixture.componentInstance.verMunicipios('Antioquia', '05');
    await fixture.whenStable();

    expect(capturado).toEqual({
      nivel: 'municipio',
      departamento: 'Antioquia',
      departamentoCodigo: '05',
      municipio: null,
    });
  });

  it('should reset to the department layer with no selection (resetar)', async () => {
    fixture.componentInstance.verMunicipios('Antioquia', '05');
    await fixture.whenStable();

    let capturado: GeoSelection | null = null;
    fixture.componentInstance.selectionChange.subscribe((value) => (capturado = value));

    fixture.componentInstance.resetar();
    await fixture.whenStable();

    expect(capturado).toEqual({
      nivel: 'departamento',
      departamento: null,
      departamentoCodigo: null,
      municipio: null,
    });
  });
});
