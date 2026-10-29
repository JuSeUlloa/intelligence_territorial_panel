import {
  Component,
  DestroyRef,
  ElementRef,
  computed,
  effect,
  inject,
  signal,
  viewChild
} from "@angular/core";
import { Observable, catchError, combineLatest, map, of } from "rxjs";
import type { Feature, FeatureCollection } from "geojson";
import type { Map as MapboxMap, MapLayerMouseEvent, MapLayerTouchEvent, MapboxGeoJSONFeature, Popup } from "mapbox-gl";
import { environment } from "../../../../environments/environment";
import { Prediccion } from "../../../models/prediccion";
import {
  buildFillColor,
  mixHex,
  plainColor,
  riesgoStop,
  riskGradient,
  textoLegible
} from "../../../services/riesgo-color";
import { Barras, BarraDatos, LineaMes, ResumenMunicipio } from "../../widgets/barras/barras";
import {
  Analisis,
  AlertaNivel,
  PuntosAtencion,
  type MunicipioAtencion,
} from "../../widgets/analisis/analisis";
import {
  TerritoryService,
  barrioName,
  featureName,
  municipalityName
} from "../../../services/territory.service";
import { ThemeService } from "../../../services/theme.service";
import { Filters, PanelFilters } from "../../widgets/filters/filters";
import { GeoFilter, GeoSelection } from "../../widgets/geo-filter/geo-filter";
import { Kpi, KpiPanel } from "../../widgets/kpi/kpi";
import { Footer } from "../../widgets/footer/footer";
import { Spinner } from "../../components/spinner/spinner";
const COLOMBIA_MAX_BOUNDS: [[number, number], [number, number]] = [
  [-92, -8],
  [-60, 14]
];
const COLOMBIA_CENTER = [-74.2974, 4.711];
const SOURCE_ID = "poligonos";
const FILL_LAYER = "poligonos-fill";
const LINE_LAYER = "poligonos-line";
const STYLE_LIGHT = "mapbox://styles/mapbox/light-v11";
const STYLE_DARK = "mapbox://styles/mapbox/dark-v11";
const EMPTY_COLLECTION: FeatureCollection = { type: "FeatureCollection", features: [] };
const MAX_ZOOM_BY_LEVEL = {
  departamento: 7,
  municipio: 11,
  barrio: 13
};
export {
  buildFillColor,
  mixHex,
  oklchToHex,
  plainColor,
  riesgoStop,
  riskGradient,
  textoLegible
} from "../../../services/riesgo-color";
@Component({
  imports: [Filters, GeoFilter, Kpi, Barras, Analisis, Footer, Spinner],
  selector: "app-dash",
  styleUrl: "./dash.css",
  templateUrl: "./dash.html"
})
export class Dash {
  theme = inject(ThemeService);
  territory = inject(TerritoryService);
  destroyRef = inject(DestroyRef);
  mapEl = viewChild<ElementRef<HTMLDivElement>>("mapContainer");

  loading = signal(true);
  mapError = signal<string | null>(null);
  dataError = signal(false);
  nivel = signal<GeoSelection["nivel"]>("departamento");
  verPrediccion = signal(false);
  meses = signal<number[]>([]);
  anioFuente = signal<number | null>(null);
  fuenteDatos = signal('Riesgo');
  subtituloDatos = signal('');
  kpis = signal<KpiPanel>({
    municipios: 0,
    hurtos: 0,
    tasaMedia: 0,
    mae: 0,
    sinMae: false,
    riesgosAltos: 0,
  });

  fillColor = computed(
    () => buildFillColor(this.theme.accentColor(), this.theme.isDark())
  );
  legendGradient = computed(() => {
    const [low, mid, high] = riskGradient(this.theme.accentColor(), this.theme.isDark());
    return `linear-gradient(0deg, ${low} 0%, ${mid} 50%, ${high} 100%)`;
  });
  riesgoStops = computed(
    () => riskGradient(this.theme.accentColor(), this.theme.isDark())
  );
  legendPlain = computed(
    () => plainColor(this.theme.accentColor(), this.theme.isDark())
  );

  barrasDatos = signal<BarraDatos[]>([]);
  serieMensual = signal<LineaMes[]>([]);
  conteoRiesgo = signal<{ bajo: number; medio: number; alto: number } | null>(
    null
  );
  resumenMunicipio = signal<ResumenMunicipio | null>(null);
  alertasCambio = signal<AlertaNivel[]>([]);
  puntosAtencion = signal<PuntosAtencion>({ elevados: [], ciegos: [] });
  map: MapboxMap | null = null;
  mapbox: typeof import('mapbox-gl') | null = null;
  hoverPopup: Popup | null = null;
  geo = viewChild<GeoFilter>("geo");
  activeCollection: FeatureCollection | null = null;
  currentSelection: GeoSelection = {
    nivel: "departamento",
    departamento: null,
    departamentoCodigo: null,
    municipio: null
  };
  hoverRegistered = false;
  rendicion = 0;  predsPool: Map<string, Prediccion> | null = null;
  barrasPorMes: Map<string, Array<{ etiqueta: string; nivel: string; rank: number | null }>> | null = null;
  currentMes: number | null = null;
  currentRiesgo: PanelFilters['riesgo'] = "todo";
  constructor() {
    effect(() => {
      const dark = this.theme.isDark();
      const map2 = this.map;
      if (!map2) {
        return;
      }
      this.hoverPopup?.remove();
      map2.setStyle(dark ? STYLE_DARK : STYLE_LIGHT);
      map2.setProjection("mercator");
      map2.on("styledata", () => this.retryAddLayers(map2));
    });
    effect(() => {
      const color = this.fillColor();
      const map2 = this.map;
      if (map2 && map2.isStyleLoaded() && map2.getLayer(FILL_LAYER)) {
        map2.setPaintProperty(FILL_LAYER, 'fill-color', color as unknown as string);
      }
    });
    this.destroyRef.onDestroy(() => {
      this.map?.remove();
      this.map = null;
    });
  }
  ngAfterViewInit() {
    void this.initMap();
  }
    onFiltersApply(filters) {
    const cambio = filters.mes !== this.currentMes || filters.riesgo !== this.currentRiesgo;
    const saliendoPrediccion = this.verPrediccion();
    this.currentMes = filters.mes;
    this.currentRiesgo = filters.riesgo;
    if (saliendoPrediccion) {
      this.verPrediccion.set(false);
    }
    if (cambio || saliendoPrediccion) {
      this.renderSelection(this.currentSelection);
    }
  }
    onFiltersReset() {
    this.currentMes = null;
    this.currentRiesgo = "todo";
    this.verPrediccion.set(false);
    if (this.geo()) {
      this.geo()?.resetar();
    } else {
      this.currentSelection = {
        nivel: "departamento",
        departamento: null,
        departamentoCodigo: null,
        municipio: null
      };
      this.renderSelection(this.currentSelection);
    }
  }
    onTogglePrediccion() {
    this.verPrediccion.set(!this.verPrediccion());
    this.renderSelection(this.currentSelection);
  }
    onGeoSelection(selection) {
    this.renderSelection(selection);
  }
    enAlertaSeleccion(alerta) {
    this.geo()?.verMunicipios(alerta.departamento, alerta.departamentoCodigo);
  }
    enAtencionSeleccion(municipio) {
    this.geo()?.verMunicipios(municipio.departamento, municipio.departamentoCodigo);
  }
    onMunicipioTypeahead(nombre) {
    if (nombre) {
      this.geo()?.seleccionarMunicipio(nombre);
    } else {
      this.geo()?.limpiarMunicipio();
    }
  }
    prediccionesParaVista(): Observable<FeatureCollection> {
    return this.verPrediccion() ? this.territory.getPrediccionActual() : this.territory.getPredicciones(this.currentMes);
  }
  prediccionesParaBarrio(): Observable<FeatureCollection> {
    if (!this.verPrediccion() && this.currentMes != null) {
      return this.territory.getPrediccionMunicipio(this.currentMes);
    }
    return this.territory.getPrediccionMunicipioActual();
  }
  datasetPrevio = '';

  renderSelection(selection: GeoSelection): void {
    const sesion = ++this.rendicion;
    const claveDataset = selection.nivel + '|' + String(this.verPrediccion());
    if (this.datasetPrevio !== claveDataset) {
      this.currentMes = null;
      this.datasetPrevio = claveDataset;
    }
    this.currentSelection = selection;
    this.nivel.set(selection.nivel);
    this.dataError.set(false);
    this.loading.set(true);
    const data$ = combineLatest([
      this.collectionFor(selection),
      selection.nivel === "barrio"
        ? (this.verPrediccion()
            ? this.prediccionesParaBarrio().pipe(catchError(() => of(EMPTY_COLLECTION)))
            : this.territory.getPrediccionMunicipio().pipe(catchError(() => of(EMPTY_COLLECTION))))
      : this.prediccionesParaVista(),
                        this.territory.getPredicciones(null),
      selection.nivel === "barrio"
        ? this.territory.getPrediccionMunicipio().pipe(catchError(() => of(EMPTY_COLLECTION)))
        : of(EMPTY_COLLECTION)
    ]).pipe(
      map(
        (
          [collection, predicciones, goldCompleto, barriosTodas]: [
            FeatureCollection,
            FeatureCollection,
            FeatureCollection,
            FeatureCollection,
          ],
        ) => {
        const barrioSinPrediccion = selection.nivel === "barrio" && !this.verPrediccion();
        let datosPredicciones = predicciones;
        let oroBarrio: FeatureCollection | null = null;
        if (barrioSinPrediccion) {
          const fechaActual = (function maxFecha(col: FeatureCollection): number {
            let max = -1;
            col.features.forEach((feature) => {
              const pred = Prediccion.from(feature.properties ?? {});
              if (pred) {
                max = Math.max(max, pred.anio * 100 + pred.mes);
              }
            });
            return max;
          })(barriosTodas);
          oroBarrio = {
            type: "FeatureCollection",
            features: barriosTodas.features.filter((feature) => {
              const pred = Prediccion.from(feature.properties ?? {});
              return pred && pred.anio * 100 + pred.mes !== fechaActual;
            }),
          };
          datosPredicciones =
            this.currentMes === null
              ? oroBarrio
              : {
                  type: "FeatureCollection",
                  features: oroBarrio.features.filter(
                    (feature) =>
                      Prediccion.from(feature.properties ?? {})?.mes === this.currentMes,
                  ),
                };
        }
        const fuenteMeses = barrioSinPrediccion
          ? oroBarrio!
          : this.verPrediccion()
            ? predicciones
            : goldCompleto;
        const mesesFuente = selection.nivel === "barrio" && !this.verPrediccion()
          ? mesesUnicos(fuenteMeses)
          : mesesDisponibles(fuenteMeses);
        this.meses.set(mesesFuente);
        this.anioFuente.set(anioBase(fuenteMeses));
        this.fuenteDatos.set(
          selection.nivel === "barrio"
            ? (this.verPrediccion() ? "Riesgo próx. mes" : "Riesgo por barrio")
            : (this.verPrediccion() ? "Riesgo próximo mes" : "Riesgo"),
        );
        const mesReviso = mesesFuente.length
          ? String(mesesFuente[mesesFuente.length - 1]).padStart(2, "0")
          : null;
        this.subtituloDatos.set(
          this.verPrediccion()
            ? "predicción " + (mesReviso ? NOMBRES_MES[Number(mesReviso) - 1] ?? mesReviso : "")
            : mesesFuente.length
              ? (mesesFuente.length > 1
                  ? NOMBRES_MES[mesesFuente[0] - 1] + "–" + NOMBRES_MES[mesesFuente[mesesFuente.length - 1] - 1]
                  : (NOMBRES_MES[mesesFuente[0] - 1] ?? ""))
              : "sin meses",
        );
        if (this.currentMes === null && this.meses().length === 0) {
          this.meses.set(mesesDisponibles(goldCompleto));
        }
        const preds = selection.nivel === "barrio"
          ? latestPrediccionesBarrio(datosPredicciones, this.currentMes)
          : latestPredicciones(predicciones);
        this.predsPool = preds;
        const nombresBarrio = /* @__PURE__ */ new Map();
        const esBarrio = selection.nivel === "barrio";
        if (esBarrio || selection.nivel === "municipio") {
          const claveDe = (props) => esBarrio ? String(props["id_barrio"] ?? "").trim() : String(props["codigo_dane"] ?? "").padStart(5, "0");
          const filasPorClave = /* @__PURE__ */ new Map();
          datosPredicciones.features.forEach((feature) => {
            const props = feature.properties ?? {};
            const pred = Prediccion.from(props);
            const rank = pred ? Prediccion.riesgoEscala(pred.nivel_riesgo_predicho) : null;
            const clave = pred ? claveDe(props) : "";
            if (!pred || rank === null || !clave) {
              return;
            }
            if (esBarrio) {
              const municipio = String(props["municipio"] ?? "").trim();
              if (municipio && !nombresBarrio.has(clave)) {
                nombresBarrio.set(clave, municipio);
              }
            }
            const lista = filasPorClave.get(clave) ?? [];
            lista.push({
              anio: pred.anio,
              mes: pred.mes,
              etiqueta: etiquetaMes(pred.mes, pred.anio),
              nivel: String(pred.nivel_riesgo_predicho).trim(),
              rank
            });
            filasPorClave.set(clave, lista);
          });
          filasPorClave.forEach((lista) => {
            lista.sort((a, b) => a.anio * 12 + a.mes - (b.anio * 12 + b.mes));
          });
          this.barrasPorMes = new Map(
            [...filasPorClave.entries()].map(([key, lista]) => [
              key,
              lista.map(({ etiqueta, nivel, rank }) => ({ etiqueta, nivel, rank }))
            ])
          );
        } else {
          this.barrasPorMes = null;
        }
        const depsVisibles: Set<string> | null = selection.nivel === "departamento" ? new Set(
          collection.features.map(
            (feature) => departmentCode(feature.properties ?? {})
          )
        ) : null;
        const munisVisibles: Set<string> | null = selection.nivel === "municipio" || selection.nivel === "barrio" ? new Set(
          collection.features.map(
            (feature) => daneKey(feature.properties?.["codigo_dane"])
          )
        ) : null;
        this.serieMensual.set(
          selection.nivel === "barrio"
            ? serieMensualBarrioTasas(
                oroBarrio ?? datosPredicciones,
                new Set(
                  collection.features.map(
                    (feature) => String(feature.properties?.["id_barrio"] ?? "").trim(),
                  ),
                ),
              )
            : (() => {
                let serie = serieMensualTasas(goldCompleto, depsVisibles, munisVisibles);
                if (this.verPrediccion()) {
                  const extra = serieMensualTasas(predicciones, depsVisibles, munisVisibles);
                  const mesExtra = extra[extra.length - 1];
                  if (mesExtra) {
                    serie = [...serie, mesExtra];
                  }
                } else if (this.currentMes !== null) {
                  serie = serie.filter((p) => p.mes <= this.currentMes);
                }
                return serie;
              })(),
        );
        this.conteoRiesgo.set(
          conteoRiesgoPredicho(
            preds,
            selection.nivel === "departamento" ? depsVisibles : null,
            selection.nivel === "municipio" ? munisVisibles : null
          )
        );
        if (selection.nivel === "municipio" && collection.features.length === 1) {
          const feature = collection.features[0];
          const key = daneKey(feature.properties?.["codigo_dane"]);
          const pred = preds.get(key);
          this.resumenMunicipio.set(
            pred ? {
              municipio: pred.municipio || municipalityName(feature) || "s/d",
              departamento: pred.departamento || null,
              nivel: String(pred.nivel_riesgo_predicho).trim().toUpperCase(),
              rank: Prediccion.riesgoEscala(pred.nivel_riesgo_predicho),
              tasaPredicha: pred.tasa_predicha,
              tasaReal: pred.tasa_real > 0 ? pred.tasa_real : null,
              hurtos: pred.tasa_predicha * (pred.pob_dane_2025 ?? 0) / 1e5,
              poblacion: pred.pob_dane_2025 > 0 ? pred.pob_dane_2025 : null,
              meses: this.barrasPorMes?.get(key) ?? []
            } : null
          );
        } else {
          this.resumenMunicipio.set(null);
        }
        if (esBarrio) {
          const conteos = /* @__PURE__ */ new Map();
          this.barrasPorMes?.forEach((lista, clave) => {
            const entry = [0, 0, 0];
            lista.forEach((fila) => {
              if (fila.rank === 0) {
                entry[0] += 1;
              } else if (fila.rank === 0.5) {
                entry[1] += 1;
              } else if (fila.rank === 1) {
                entry[2] += 1;
              }
            });
            conteos.set(clave, entry);
          });
          this.barrasDatos.set(
            collection.features.map((feature) => {
              const props = feature.properties ?? {};
              const id = String(props["id_barrio"] ?? "").trim();
              const entry = conteos.get(id);
              const pred = preds.get(id);
              return {
                etiqueta: barrioName(feature) || "s/d",
                departamento: nombresBarrio.get(id) ?? null,
                rank: pred ? Prediccion.riesgoEscala(pred.nivel_riesgo_predicho) : null,
                desglose: entry ? { bajo: entry[0], medio: entry[1], alto: entry[2] } : null,
                porMes: this.barrasPorMes?.get(id) ?? []
              };
            })
          );
        }
        this.alertasCambio.set(
          alertasTransicion(
            selection.nivel === "barrio" ? datosPredicciones : goldCompleto,
            depsVisibles,
            munisVisibles,
            selection.nivel === "barrio"
          )
        );
        this.puntosAtencion.set(
          puntosAtencion(
            preds,
            selection.nivel === "barrio" ? datosPredicciones : goldCompleto,
            depsVisibles,
            munisVisibles,
            selection.nivel === "barrio"
          )
        );
        this.kpis.set(
          kpiPredicciones(
            collection,
            datosPredicciones,
            selection.nivel,
            this.currentRiesgo,
            this.verPrediccion(),
            barrioSinPrediccion && this.currentMes === null
          )
        );
        return adaptCollection(
          collection,
          preds,
          selection.nivel,
          this.currentRiesgo
        );
      })
    );
    data$.subscribe({
      next: (data) => {
        if (sesion !== this.rendicion) {
          return;
        }
        this.loading.set(false);
        this.activeCollection = data;
        if (selection.nivel === "departamento") {
          const depsVisibles = new Set(
            data.features.map((feature) => departmentCode(feature.properties ?? {}))
          );
          const porDept = /* @__PURE__ */ new Map();
          (this.predsPool ??  new Map()).forEach((pred) => {
            const dep = daneKey(pred.codigo_dane).slice(0, 2);
            if (!depsVisibles.has(dep)) {
              return;
            }
            const escala = Prediccion.riesgoEscala(pred.nivel_riesgo_predicho);
            const entry = porDept.get(dep) ?? [0, 0, 0];
            if (escala === 0) {
              entry[0] += 1;
            } else if (escala === 0.5) {
              entry[1] += 1;
            } else if (escala === 1) {
              entry[2] += 1;
            }
            porDept.set(dep, entry);
          });
          this.barrasDatos.set(
            data.features.map((feature) => {
              const entry = porDept.get(departmentCode(feature.properties ?? {}));
              return {
                etiqueta: featureName(feature) || "s/d",
                rank: typeof feature.properties?.["riesgo_rank"] === "number" ? feature.properties["riesgo_rank"] : null,
                desglose: entry ? { bajo: entry[0], medio: entry[1], alto: entry[2] } : null
              };
            })
          );
        } else if (selection.nivel === "municipio") {
          const porMuni = /* @__PURE__ */ new Map();
          (this.predsPool ??  new Map()).forEach((pred) => {
            const key = daneKey(pred.codigo_dane);
            const escalaPred = Prediccion.riesgoEscala(pred.nivel_riesgo_predicho);
            const entry = porMuni.get(key) ?? [0, 0, 0];
            if (escalaPred === 0) {
              entry[0] += 1;
            } else if (escalaPred === 0.5) {
              entry[1] += 1;
            } else if (escalaPred === 1) {
              entry[2] += 1;
            }
            porMuni.set(key, entry);
          });
          this.barrasDatos.set(
            data.features.map((feature) => {
              const entry = porMuni.get(daneKey(feature.properties?.["codigo_dane"]));
              return {
                etiqueta: municipalityName(feature) || "s/d",
                departamento: String(feature.properties?.["departamento"] ?? "") || null,
                rank: typeof feature.properties?.["riesgo_rank"] === "number" ? feature.properties["riesgo_rank"] : null,
                desglose: entry ? { bajo: entry[0], medio: entry[1], alto: entry[2] } : null,
                porMes: this.barrasPorMes?.get(daneKey(feature.properties?.["codigo_dane"])) ?? []
              };
            })
          );
        }
        const map2 = this.map;
        if (!map2) {
          return;
        }
        const source = map2.getSource(SOURCE_ID);
        if (source && "setData" in source) {
          source.setData(data);
        }
        this.fitToCollection(data, selection.nivel);
      },
      error: () => {
        this.loading.set(false);
        this.dataError.set(true);
      }
    });
  }
  collectionFor(selection: GeoSelection): Observable<FeatureCollection> {
    const { nivel, departamento, departamentoCodigo, municipio } = selection;
    if (nivel === 'departamento') {
      const all$2 = this.territory.getDepartamentos();
      return departamento
        ? all$2.pipe(map((c) => filterByFeatureName(c, departamento)))
        : all$2;
    }
    if (nivel === 'barrio') {
      return this.territory.getBarrios();
    }
    const all$: Observable<FeatureCollection> = departamentoCodigo
      ? this.territory.getMunicipiosDepartamento(departamentoCodigo)
      : this.territory.getMunicipios();
    return municipio
      ? all$.pipe(map((c) => filterByFeatureName(c, municipio, municipalityName)))
      : all$;
  }
  async initMap() {
    const container = this.mapEl()?.nativeElement;
    if (!container) {
      return;
    }
    if (!environment.mapboxAccessToken) {
      this.loading.set(false);
      this.mapError.set("Falta el token de Mapbox en src/environments/environment.ts.");
      return;
    }
    if (typeof window === "undefined" || !("WebGLRenderingContext" in window)) {
      this.loading.set(false);
      this.mapError.set("Tu navegador no soporta WebGL, necesario para renderizar el mapa.");
      return;
    }
    try {
      const mapboxgl = ((await import("mapbox-gl")) as { default: unknown }).default as unknown as {
        accessToken: string;
        Map: new (options: Record<string, unknown>) => MapboxMap;
        NavigationControl: new (options?: Record<string, unknown>) => {
          onAdd(): HTMLElement;
          onRemove(): void;
        };
        Popup: new (options?: Record<string, unknown>) => Popup;
      };
      this.mapbox = mapboxgl as unknown as typeof import("mapbox-gl");
      mapboxgl.accessToken = environment.mapboxAccessToken;
      const map2 = new mapboxgl.Map({
        container,
        style: this.theme.isDark() ? STYLE_DARK : STYLE_LIGHT,
        center: COLOMBIA_CENTER as [number, number],
        zoom: 4.6,
        minZoom: 3,
        maxZoom: 13,
                        maxBounds: COLOMBIA_MAX_BOUNDS,
                        attributionControl: false
      });
      this.map = map2;
      map2.setProjection("mercator");
      map2.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "bottom-left");
      map2.on("error", (event) => {
        const message = String(event.error?.message ?? "");
        if (this.loading() && /token|style|unauthor|401|403/i.test(message)) {
          this.loading.set(false);
          this.mapError.set(
            "No se pudo cargar el estilo del mapa. Verifica el token de Mapbox en environment.ts."
          );
        }
      });
      map2.on("load", () => {
        this.loading.set(false);
        map2.setProjection("mercator");
        const encuadre = map2.cameraForBounds(COLOMBIA_MAX_BOUNDS);
        const zoomDeEncuadre = encuadre?.zoom ?? 4.4;
        map2.setMinZoom(Math.max(3.5, zoomDeEncuadre - 0.4));
        this.addTerritoryLayers(map2);
        this.renderSelection(this.currentSelection);
      });
    } catch (e) {
      this.loading.set(false);
      console.error("[dash] No se pudo cargar Mapbox GL:", e);
      this.mapError.set("No se pudo cargar Mapbox GL. Revisa la conexi\xF3n e int\xE9ntalo de nuevo.");
    }
  }
    retryAddLayers(map2) {
    if (!map2.isStyleLoaded()) {
      map2.once("styledata", () => this.retryAddLayers(map2));
      return;
    }
    this.addTerritoryLayers(map2);
  }
    addTerritoryLayers(map2) {
    const data = this.activeCollection ?? EMPTY_COLLECTION;
    this.hideCityLabels(map2);
    const source = map2.getSource(SOURCE_ID);
    if (source && "setData" in source) {
      source.setData(data);
    } else if (!source) {
      map2.addSource(SOURCE_ID, { type: "geojson", data });
    }
    if (!map2.getLayer(FILL_LAYER)) {
      map2.addLayer({
        id: FILL_LAYER,
        type: "fill",
        source: SOURCE_ID,
        paint: {
          "fill-color": this.fillColor(),
                                        "fill-opacity": ["case", ["get", "riesgo_fade"], 0.08, 0.55]
        }
      });
    }
    if (!map2.getLayer(LINE_LAYER)) {
      map2.addLayer({
        id: LINE_LAYER,
        type: "line",
        source: SOURCE_ID,
        paint: {
          "line-color": this.theme.isDark() ? "#94a3b8" : "#ffffff",
          "line-width": 1,
          "line-opacity": 0.9
        }
      });
    }
    if (!this.hoverRegistered) {
      this.hoverRegistered = true;
      this.registerHover(map2);
    }
  }
    hideCityLabels(map2) {
    const OCULTAS = [
      "settlement-major-label",
      "settlement-minor-label",
      "settlement-subdivision-label"
    ];
    OCULTAS.forEach((id) => {
      if (map2.getLayer(id)) {
        map2.setLayoutProperty(id, "visibility", "none");
      }
    });
  }
    registerHover(map2) {
    const popup = this.mapbox ? new this.mapbox.Popup({ closeButton: false, closeOnClick: false, offset: 12 }) : null;
    this.hoverPopup = popup;
    const show = (event) => {
      const feature = event.features?.[0];
      if (!feature || !popup) {
        return;
      }
      map2.getCanvas().style.cursor = "pointer";
      const extract = this.currentSelection.nivel === "barrio" ? barrioName : this.currentSelection.nivel === "municipio" ? municipalityName : featureName;
      const name = extract(feature) || "Territorio";
      const props = feature.properties ?? {};
      const parts = [`<strong>${name}</strong>`];
      const rank = typeof props["riesgo_rank"] === "number" ? props["riesgo_rank"] : null;
      const stop = riesgoStop(rank, this.theme.accentColor(), this.theme.isDark());
      if (this.currentSelection.nivel === "municipio") {
        const nombreDep = String(props["departamento"] ?? "").trim();
        if (nombreDep) {
          parts.push(`<br><em>${nombreDep}</em>`);
        }
      }
      const riesgo = String(props["riesgo"] ?? "").trim();
      if (riesgo) {
        parts.push(
          `<br><span class="chip-riesgo" style="background:${stop};color:${textoLegible(stop)}"><span class="punto"></span>${riesgo}</span>`
        );
      }
      const real = valorTasa(props["tasa_real"]);
      const predicha = valorTasa(props["tasa_predicha"]);
      if (predicha !== null) {
        parts.push(`<br>Tasa predicha: ${formatNumero(predicha)}`);
      }
      if (this.verPrediccion()) {
        const total = valorTasa(props["total_tematica"]);
        if (total !== null && total > 0) {
          parts.push(`<br>Total hurtos: ${Math.round(total).toLocaleString("es-CO")}`);
        }
      } else if (real !== null) {
        parts.push(`<br>Tasa real: ${formatNumero(real)}`);
      }
      if (this.currentSelection.nivel === "municipio") {
        const poblacion = valorTasa(props["pob_dane_2025"]);
        if (poblacion !== null && poblacion > 0) {
          parts.push(`<br>Poblaci\xF3n: ${poblacion.toLocaleString("es-CO")}`);
        }
      }
      popup.setLngLat(event.lngLat).setHTML(parts.join("")).addTo(map2);
      if (rank !== null) {
        const contentElement = popup.getElement()?.querySelector<HTMLElement>(".mapboxgl-popup-content");
        if (contentElement) {
          contentElement.style.borderTopColor = stop;
        }
      }
    };
    map2.on("mousemove", FILL_LAYER, show);
    map2.on("click", FILL_LAYER, show);
    map2.on("click", (event) => {
      const painted = map2.queryRenderedFeatures(event.point, { layers: [FILL_LAYER] });
      if (!painted.length) {
        popup?.remove();
      }
    });
    map2.on("mouseleave", FILL_LAYER, () => {
      map2.getCanvas().style.cursor = "";
      popup?.remove();
    });
    this.registerLongPress(map2);
  }
    registerLongPress(map2) {
    let timer = null;
    let featureEnPresion;
    const cancelar = () => {
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
    };
    const presionar = (event) => {
      if (this.currentSelection.nivel !== "departamento") {
        return;
      }
      const target = event.features?.[0];
      if (!target) {
        return;
      }
      cancelar();
      featureEnPresion = target;
      timer = setTimeout(() => {
        const props = featureEnPresion?.properties ?? {};
        const codigo = departmentCode(props);
        const nombre = featureName(featureEnPresion) || "";
        if (codigo && nombre) {
          this.hoverPopup?.remove();
          this.geo()?.seleccionarDepartamento(nombre, codigo);
        }
        timer = null;
      }, 1e3);
    };
    map2.on("mousedown", FILL_LAYER, presionar);
    map2.on("touchstart", FILL_LAYER, presionar);
    ["mouseup", "mouseleave", "touchend", "touchcancel", "move"].forEach(
      (evento) => map2.on(evento, cancelar)
    );
  }
    fitToCollection(collection, nivel) {
    const map2 = this.map;
    if (!map2) {
      return;
    }
    const bounds = this.boundsOf(collection);
    if (!bounds) {
      if (collection.features.length > 0) {
        console.warn(
          "[dash] No se encontraron coordenadas en la respuesta; primer feature:",
          collection.features[0]
        );
      }
      return;
    }
    map2.fitBounds(bounds, {
      padding: 48,
      maxZoom: MAX_ZOOM_BY_LEVEL[nivel],
      duration: 1100
    });
  }
    boundsOf(collection) {
    const box = computeBounds(collection);
    if (!box || !this.mapbox) {
      return null;
    }
    return new this.mapbox.LngLatBounds([box[0], box[1]], [box[2], box[3]]);
  }
}
export function computeBounds(collection: FeatureCollection): [number, number, number, number] | null {
  let west = Infinity;
  let south = Infinity;
  let east = -Infinity;
  let north = -Infinity;
  let found = false;
  const add = (lng: number, lat: number): void => {
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
      return;
    }
    west = Math.min(west, lng);
    east = Math.max(east, lng);
    south = Math.min(south, lat);
    north = Math.max(north, lat);
    found = true;
  };
  const walk = (coords: unknown): void => {
    if (!Array.isArray(coords)) {
      if (coords && typeof coords === "object") {
        const point = coords as Record<string, unknown>;
        add(
          Number(point["lng"] ?? point["longitude"] ?? point["lon"] ?? point["x"]),
          Number(point["lat"] ?? point["latitude"] ?? point["y"])
        );
      }
      return;
    }
    if (coords.length >= 2 && !Array.isArray(coords[0])) {
      const lng = Number(coords[0]);
      const lat = Number(coords[1]);
      if (Number.isFinite(lng) && Number.isFinite(lat)) {
        add(lng, lat);
        return;
      }
    }
    coords.forEach(walk);
  };
  const walkGeometry = (geometry: unknown): void => {
    if (!geometry || typeof geometry !== "object") {
      return;
    }
    const geo = geometry as Record<string, unknown>;
    if (geo["type"] === "GeometryCollection" && Array.isArray(geo["geometries"])) {
      geo["geometries"].forEach(walkGeometry);
      return;
    }
    walk(geo["coordinates"]);
  };
  collection.features.forEach((feature) => {
    const record = feature as unknown as Record<string, unknown>;
    const before = found;
    walkGeometry(record["geometry"]);
    if (found !== before) {
      return;
    }
    walk(record["coordinates"]);
    if (found !== before) {
      const props = record["properties"];
      if (props && typeof props === "object") {
        walk((props as Record<string, unknown>)["coordinates"]);
      }
    }
  });
  return found ? [west, south, east, north] : null;
}
export function daneKey(value: unknown): string {
  const num = Number(value);
  return Number.isFinite(num) && num > 0 ? String(num).padStart(5, "0") : "";
}
export function latestPredicciones(collection: FeatureCollection, mes: number | null = null): Map<string, Prediccion> {
  const byCode = new Map<string, Prediccion>();
  collection.features.forEach((feature) => {
    const pred = Prediccion.from(feature.properties ?? {});
    if (!pred || mes !== null && pred.mes !== mes) {
      return;
    }
    const key = String(pred.codigo_dane).padStart(5, "0");
    const current = byCode.get(key);
    if (!current || pred.anio * 12 + pred.mes > current.anio * 12 + current.mes) {
      byCode.set(key, pred);
    }
  });
  return byCode;
}
export function latestPrediccionesBarrio(collection: FeatureCollection, mes: number | null = null): Map<string, Prediccion> {
  const byId = new Map<string, Prediccion>();
  collection.features.forEach((feature) => {
    const props = feature.properties ?? {};
    const pred = Prediccion.from(props);
    if (!pred || mes !== null && pred.mes !== mes) {
      return;
    }
    const id = String(props["id_barrio"] ?? "").trim();
    if (!id) {
      return;
    }
    const current = byId.get(id);
    if (!current || pred.anio * 12 + pred.mes > current.anio * 12 + current.mes) {
      byId.set(id, pred);
    }
  });
  return byId;
}
export function mesesUnicos(collection: FeatureCollection): number[] {
  const meses = new Set<number>();
  collection.features.forEach((feature) => {
    const pred = Prediccion.from(feature.properties ?? {});
    if (pred && pred.mes >= 1 && pred.mes <= 12) {
      meses.add(pred.mes);
    }
  });
  return [...meses].sort((a, b) => a - b);
}
export function anioBase(collection: FeatureCollection): number | null {
  let min = Infinity;
  collection.features.forEach((feature) => {
    const pred = Prediccion.from(feature.properties ?? {});
    if (pred && pred.anio > 0 && pred.anio < min) {
      min = pred.anio;
    }
  });
  return Number.isFinite(min) ? min : null;
}
export function mesesDisponibles(collection: FeatureCollection): number[] {
  let maxAnio = -1;
  collection.features.forEach((feature) => {
    const pred = Prediccion.from(feature.properties ?? {});
    if (pred) {
      maxAnio = Math.max(maxAnio, pred.anio);
    }
  });
  const meses = new Set<number>();
  collection.features.forEach((feature) => {
    const pred = Prediccion.from(feature.properties ?? {});
    if (pred && pred.anio === maxAnio) {
      meses.add(pred.mes);
    }
  });
  return [...meses].filter((mes) => mes >= 1 && mes <= 12).sort((a, b) => a - b);
}
const NOMBRES_MES = [
  "Ene",
  "Feb",
  "Mar",
  "Abr",
  "May",
  "Jun",
  "Jul",
  "Ago",
  "Sep",
  "Oct",
  "Nov",
  "Dic"
];
export function etiquetaMes(mes: number, anio: number): string {
  const nombre = NOMBRES_MES[mes - 1] ?? String(mes);
  return `${nombre} ${String(anio % 100).padStart(2, "0")}`;
}
export function serieMensualTasas(
  predicciones: FeatureCollection,
  depsVisibles: Set<string> | null = null,
  munisVisibles: Set<string> | null = null,
): LineaMes[] {
  const porMes = new Map<
    string,
    {
      mes: number;
      anio: number;
      predPorMuni: Map<string, { suma: number; cuenta: number }>;
      realPorMuni: Map<string, { suma: number; cuenta: number }>;
    }
  >();
  predicciones.features.forEach((feature) => {
    const pred = Prediccion.from(feature.properties ?? {});
    if (!pred || pred.mes < 1 || pred.mes > 12) {
      return;
    }
    const key = String(pred.codigo_dane).padStart(5, "0");
    if (depsVisibles && !depsVisibles.has(key.slice(0, 2))) {
      return;
    }
    if (munisVisibles && !munisVisibles.has(key)) {
      return;
    }
    const mesKey = `${pred.anio}-${String(pred.mes).padStart(2, "0")}`;
    const entry = porMes.get(mesKey) ?? {
      mes: pred.mes,
      anio: pred.anio,
      predPorMuni: new Map<string, { suma: number; cuenta: number }>(),
      realPorMuni: new Map<string, { suma: number; cuenta: number }>(),
    };
    if (pred.tasa_real > 0) {
      acumulaPorMuni(entry.realPorMuni, key, pred.tasa_real);
      acumulaPorMuni(entry.predPorMuni, key, pred.tasa_predicha);
    }
    porMes.set(mesKey, entry);
  });
  return [...porMes.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, e]) => ({
    etiqueta: etiquetaMes(e.mes, e.anio),
    mes: e.mes,
    anio: e.anio,
    real: promedioDePromedios(e.realPorMuni),
    predicha: promedioDePromedios(e.predPorMuni) ?? 0
  }));
}
export function serieMensualBarrioTasas(
  predicciones: FeatureCollection,
  idsVisibles: Set<string> | null = null,
): LineaMes[] {
  const porMes = new Map<
    string,
    {
      mes: number;
      anio: number;
      predPorBarrio: Map<string, { suma: number; cuenta: number }>;
      realPorBarrio: Map<string, { suma: number; cuenta: number }>;
    }
  >();
  predicciones.features.forEach((feature) => {
    const pred = Prediccion.from(feature.properties ?? {});
    if (!pred || pred.mes < 1 || pred.mes > 12) {
      return;
    }
    const key = String(feature.properties?.['id_barrio'] ?? '').trim();
    if (!key || (idsVisibles && !idsVisibles.has(key))) {
      return;
    }
    const mesKey = `${pred.anio}-${String(pred.mes).padStart(2, "0")}`;
    const entry = porMes.get(mesKey) ?? {
      mes: pred.mes,
      anio: pred.anio,
      predPorBarrio: new Map<string, { suma: number; cuenta: number }>(),
      realPorBarrio: new Map<string, { suma: number; cuenta: number }>(),
    };
    if (pred.tasa_real !== null && pred.tasa_real > 0) {
      acumulaPorMuni(entry.realPorBarrio, key, pred.tasa_real);
    }
    acumulaPorMuni(entry.predPorBarrio, key, pred.tasa_predicha);
    porMes.set(mesKey, entry);
  });
  return [...porMes.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, e]) => ({
    etiqueta: etiquetaMes(e.mes, e.anio),
    mes: e.mes,
    anio: e.anio,
    real: promedioDePromedios(e.realPorBarrio),
    predicha: promedioDePromedios(e.predPorBarrio) ?? 0,
  }));
}
function acumulaPorMuni(  mapa: Map<string, { suma: number; cuenta: number }>,
  muniKey: string,
  valor: number,
): void {
  const entry = mapa.get(muniKey) ?? { suma: 0, cuenta: 0 };
  entry.suma += valor;
  entry.cuenta += 1;
  mapa.set(muniKey, entry);
}
function promedioDePromedios(
  mapa: Map<string, { suma: number; cuenta: number }>,
): number | null {
  if (mapa.size === 0) {
    return null;
  }
  let suma = 0;
  mapa.forEach((acc) => {
    suma += acc.cuenta > 0 ? acc.suma / acc.cuenta : 0;
  });
  return suma / mapa.size;
}
export function conteoRiesgoPredicho(
  preds: Map<string, Prediccion>,
  depsVisibles: Set<string> | null = null,
  munisVisibles: Set<string> | null = null,
): { bajo: number; medio: number; alto: number } | null {
  const conteo = { bajo: 0, medio: 0, alto: 0 };
  let total = 0;
  preds.forEach((pred, key) => {
    if (depsVisibles && !depsVisibles.has(key.slice(0, 2))) {
      return;
    }
    if (munisVisibles && !munisVisibles.has(key)) {
      return;
    }
    const escala = Prediccion.riesgoEscala(pred.nivel_riesgo_predicho);
    if (escala === null) {
      return;
    }
    total += 1;
    if (escala === 0) {
      conteo.bajo += 1;
    } else if (escala === 0.5) {
      conteo.medio += 1;
    } else {
      conteo.alto += 1;
    }
  });
  return total > 0 ? conteo : null;
}
export function filasAlcanzadas(
  predicciones: FeatureCollection,
  depsVisibles: Set<string> | null,
  munisVisibles: Set<string> | null,
): Array<{ pred: Prediccion; props: Record<string, unknown>; key: string }> {
  const filas: Array<{ pred: Prediccion; props: Record<string, unknown>; key: string }> = [];
  predicciones.features.forEach((feature) => {
    const props = feature.properties ?? {};
    const pred = Prediccion.from(props);
    const key = pred ? String(pred.codigo_dane).padStart(5, "0") : "";
    if (!pred) {
      return;
    }
    if (depsVisibles && !depsVisibles.has(key.slice(0, 2))) {
      return;
    }
    if (munisVisibles && !munisVisibles.has(key)) {
      return;
    }
    filas.push({ pred, props, key });
  });
  return filas;
}
export function puntosAtencion(
  preds: Map<string, Prediccion>,
  predicciones: FeatureCollection,
  depsVisibles: Set<string> | null,
  munisVisibles: Set<string> | null,
  porBarrio = false,
): PuntosAtencion {
  const enAlcance = (key: string): boolean =>
    porBarrio ? true : (!depsVisibles || depsVisibles.has(key.slice(0, 2))) && (!munisVisibles || munisVisibles.has(key));
  const nombres = new Map<string, { nombre: string; municipio: string }>();
  if (porBarrio) {
    predicciones.features.forEach((feature) => {
      const props = feature.properties ?? {};
      const id = String(props["id_barrio"] ?? "").trim();
      if (id && !nombres.has(id)) {
        nombres.set(id, {
          nombre: String(props["barrio"] ?? "").trim(),
          municipio: String(props["municipio"] ?? "").trim()
        });
      }
    });
  }
  const elevados: MunicipioAtencion[] = [];
  preds.forEach((pred, key) => {
    if (!enAlcance(key)) {
      return;
    }
    if (Prediccion.riesgoEscala(pred.nivel_riesgo_predicho) !== 1) {
      return;
    }
    const info = porBarrio ? nombres.get(key) : void 0;
    elevados.push({
      codigoDane: key,
      municipio: info?.nombre || pred.municipio,
      departamento: info?.municipio || pred.departamento,
      departamentoCodigo: key.slice(0, 2),
      nivel: "ALTO",
      rank: 1,
      tasaReal: pred.tasa_real > 0 ? pred.tasa_real : null,
      tasaPredicha: pred.tasa_predicha,
      hurtos: pred.tasa_predicha * (pred.pob_dane_2025 ?? 0) / 1e5,
      mesEtiqueta: etiquetaMes(pred.mes, pred.anio)
    });
  });
  elevados.sort(
    (a, b) => b.tasaPredicha - a.tasaPredicha || a.municipio.localeCompare(b.municipio, "es", { sensitivity: "base" })
  );
  const filas = filasAlcanzadas(
    predicciones,
    porBarrio ? null : depsVisibles,
    porBarrio ? null : munisVisibles
  );
  let ultimo = -1;
  filas.forEach(({ pred }) => {
    ultimo = Math.max(ultimo, pred.anio * 12 + pred.mes);
  });
  const conUltimo = new Set<string>();
  const vistosAhora = new Map<
    string,
    { pred: Prediccion; props: Record<string, unknown> }
  >();
  filas.forEach(({ pred, props }) => {
    const clave = porBarrio
      ? String(props['id_barrio'] ?? '').trim()
      : String(pred.codigo_dane).padStart(5, '0');
    if (!clave) {
      return;
    }
    if (porBarrio && munisVisibles && !munisVisibles.has(String(pred.codigo_dane).padStart(5, '0'))) {
      return;
    }
    if (pred.anio * 12 + pred.mes === ultimo) {
      conUltimo.add(clave);
    }
    const actual = vistosAhora.get(clave);
    if (!actual || pred.anio * 12 + pred.mes > actual.pred.anio * 12 + actual.pred.mes) {
      vistosAhora.set(clave, { pred, props });
    }
  });
  const ciegos: MunicipioAtencion[] = [];
  vistosAhora.forEach(({ pred, props }, clave) => {
    if (conUltimo.has(clave)) {
      return;
    }
    const info = porBarrio ? nombres.get(clave) : undefined;
    ciegos.push({
      codigoDane: clave,
      municipio: info?.nombre || pred.municipio,
      departamento: info?.municipio || pred.departamento,
      departamentoCodigo: clave.slice(0, 2),
      nivel: 'SIN_DATO',
      rank: null,
      tasaReal: null,
      tasaPredicha: pred.tasa_real > 0 ? pred.tasa_predicha : 0,
      hurtos: (pred.tasa_predicha * (pred.pob_dane_2025 ?? 0)) / 100000,
      mesEtiqueta: etiquetaMes(pred.mes, pred.anio),
    });
  });
  ciegos.sort((a, b) => a.municipio.localeCompare(b.municipio, 'es', { sensitivity: 'base' }));
  return { elevados, ciegos };
}
export function alertasTransicion(
  predicciones: FeatureCollection,
  depsVisibles: Set<string> | null,
  munisVisibles: Set<string> | null,
  porBarrio = false,
): AlertaNivel[] {
  const porClave = new Map<
    string,
    Array<{
      anio: number;
      mes: number;
      etiqueta: string;
      nivel: string;
      rank: number | null;
      municipio: string;
      departamento: string;
    }>
  >();
  filasAlcanzadas(
    predicciones,
    porBarrio ? null : depsVisibles,
    porBarrio ? null : munisVisibles
  ).forEach(({ pred, props }) => {
    const rank = Prediccion.riesgoEscala(pred.nivel_riesgo_predicho);
    if (rank === null || pred.mes < 1 || pred.mes > 12) {
      return;
    }
    const clave = porBarrio ? String(props["id_barrio"] ?? "").trim() : String(pred.codigo_dane).padStart(5, "0");
    if (!clave) {
      return;
    }
    if (porBarrio && munisVisibles && !munisVisibles.has(String(pred.codigo_dane).padStart(5, "0"))) {
      return;
    }
    const lista = porClave.get(clave) ?? [];
    lista.push({
      anio: pred.anio,
      mes: pred.mes,
      etiqueta: etiquetaMes(pred.mes, pred.anio),
      nivel: String(pred.nivel_riesgo_predicho).trim().toUpperCase(),
      rank,
      municipio: porBarrio ? String(props["barrio"] ?? "").trim() || pred.municipio : pred.municipio,
      departamento: porBarrio ? String(props["municipio"] ?? "").trim() : pred.departamento
    });
    porClave.set(clave, lista);
  });
  const alertas: AlertaNivel[] = [];
  porClave.forEach((lista, key) => {
    lista.sort((a2, b) => a2.anio * 12 + a2.mes - (b.anio * 12 + b.mes));
    if (lista.length < 2) {
      return;
    }
    const de = lista[lista.length - 2];
    const a = lista[lista.length - 1];
    if (de.nivel === a.nivel) {
      return;
    }
    alertas.push({
      municipio: a.municipio,
      departamento: a.departamento,
      departamentoCodigo: key.slice(0, 2),
      de: { etiqueta: de.etiqueta, nivel: de.nivel, rank: de.rank },
      a: { etiqueta: a.etiqueta, nivel: a.nivel, rank: a.rank }
    });
  });
  return alertas;
}
export function adaptCollection(
  collection: FeatureCollection,
  preds: Map<string, Prediccion>,
  nivel: GeoSelection['nivel'],
  riesgo: PanelFilters['riesgo'] = 'todo',
): FeatureCollection {
  const agregados = nivel === 'departamento' ? aggregateRiskByDepartment(preds) : null;
  const fueraDelFiltro = (nivelDelFeature: string | null) =>
    riesgo !== 'todo' && nivelDelFeature?.toUpperCase() !== riesgo;
  return {
    type: 'FeatureCollection' as const,
    features: collection.features.map((feature) => {
      const props = feature.properties ?? {};
      if (nivel === "barrio") {
        const idBarrio = String(props["id_barrio"] ?? "").trim();
        const pred2 = preds.get(idBarrio) ?? preds.get(daneKey(props["codigo_dane"]));
        const rank2 = pred2 ? Prediccion.riesgoEscala(pred2.nivel_riesgo_predicho) : null;
        const nivelRiesgo2 = rank2 === null ? null : pred2?.nivel_riesgo_predicho ?? null;
        return {
          ...feature,
          properties: {
            ...props,
                        plano: rank2 === null,
            riesgo: nivelRiesgo2,
            riesgo_rank: rank2,
            riesgo_fade: fueraDelFiltro(nivelRiesgo2),
            tasa_predicha: pred2?.tasa_predicha ?? null,
            tasa_real: pred2?.tasa_real ?? null,
            total_tematica: pred2?.total_tematica ?? null,
            pob_dane_2025: pred2?.pob_dane_2025 ?? null
          }
        };
      }
      if (nivel === "departamento") {
        const agg = agregados?.get(departmentCode(props));
        return {
          ...feature,
          properties: {
            ...props,
            riesgo: agg?.moda ?? null,
            riesgo_rank: agg?.promedio ?? null,
            riesgo_fade: fueraDelFiltro(agg?.moda ?? null),
            tasa_predicha: agg?.tasaPredicha ?? null,
            tasa_real: agg?.tasaReal ?? null,
            total_tematica: agg?.totalHurto ?? null
          }
        };
      }
      const pred = preds.get(daneKey(props["codigo_dane"]));
      const rank = pred ? Prediccion.riesgoEscala(pred.nivel_riesgo_predicho) : null;
      const nivelRiesgo = rank === null ? null : pred?.nivel_riesgo_predicho ?? null;
      return {
        ...feature,
        properties: {
          ...props,
          riesgo: nivelRiesgo,
          riesgo_rank: rank,
          riesgo_fade: fueraDelFiltro(nivelRiesgo),
          departamento: pred?.departamento ?? null,
          tasa_predicha: pred?.tasa_predicha ?? null,
          tasa_real: pred?.tasa_real ?? null,
          total_tematica: pred?.total_tematica ?? null,
          pob_dane_2025: pred?.pob_dane_2025 ?? null
        }
      };
    })
  };
}
function departmentCode(props: Record<string, unknown>): string {
  const raw = String(props["codigo_departamento"] ?? "").trim();
  if (raw) {
    return raw.padStart(2, "0");
  }
  return daneKey(props["codigo_dane"]).slice(0, 2);
}
const SEVERIDAD: Record<string, number> = { BAJO: 0, MEDIO: 1, ALTO: 2 };
function aggregateRiskByDepartment(
  preds: Map<string, Prediccion>,
): Map<
  string,
  {
    moda: string | null;
    promedio: number | null;
    tasaPredicha: number;
    tasaReal: number;
    totalHurto: number;
  }
> {
  const sums = new Map<
    string,
    {
      niveles: Record<string, number>;
      rankSum: number;
      rankCount: number;
      tasaPredicha: number;
      tasaReal: number;
      totalSuma: number;
      count: number;
    }
  >();
  preds.forEach((pred, code) => {
    const dept = code.slice(0, 2);
    const entry = sums.get(dept) ?? {
      niveles: {},
      rankSum: 0,
      rankCount: 0,
      tasaPredicha: 0,
      tasaReal: 0,
      totalSuma: 0,
      count: 0
    };
    const nivel = pred.nivel_riesgo_predicho.trim().toUpperCase();
    if (Prediccion.riesgoEscala(nivel) !== null) {
      entry.niveles[nivel] = (entry.niveles[nivel] ?? 0) + 1;
      entry.rankSum += Prediccion.riesgoEscala(nivel);
      entry.rankCount += 1;
    }
    entry.tasaPredicha += pred.tasa_predicha;
    entry.tasaReal += pred.tasa_real ?? 0;
    entry.totalSuma += pred.total_tematica ?? 0;
    entry.count += 1;
    sums.set(dept, entry);
  });
  const agg = new Map<
    string,
    {
      moda: string | null;
      promedio: number | null;
      tasaPredicha: number;
      tasaReal: number;
      totalHurto: number;
    }
  >();
  sums.forEach((entry, dept) => {
    let moda = null;
    let modaCount = -1;
    let modaSeveridad = -1;
    Object.entries(entry.niveles).forEach(([nivel, count]) => {
      const severidad = SEVERIDAD[nivel] ?? -1;
      if (count > modaCount || count === modaCount && severidad > modaSeveridad) {
        moda = nivel;
        modaCount = count;
        modaSeveridad = severidad;
      }
    });
    agg.set(dept, {
      moda,
      promedio: entry.rankCount === 0 ? null : entry.rankSum / entry.rankCount,
      tasaPredicha: entry.count === 0 ? 0 : entry.tasaPredicha / entry.count,
      tasaReal: entry.count === 0 ? 0 : entry.tasaReal / entry.count,
      totalHurto: entry.totalSuma
    });
  });
  return agg;
}
function formatNumero(value: number): string {
  return value.toFixed(2).replace('.', ',');
}
function valorTasa(value: unknown): number | null {
  if (value === null || value === void 0 || value === "") {
    return null;
  }
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}
export function kpiPredicciones(
  collection: FeatureCollection,
  predicciones: FeatureCollection,
  nivel: GeoSelection['nivel'],
  riesgo: PanelFilters['riesgo'] = 'todo',
  esProximoMes = false,
  acumularOro = false,
): KpiPanel {
  const depsVisibles = new Set<string>(
    nivel === 'departamento'
      ? collection.features.map((feature) => departmentCode(feature.properties ?? {}))
      : [],
  );
  const munisVisibles = new Set<string>(
    collection.features.map((feature) => daneKey(feature.properties?.['codigo_dane'])),
  );
  if (nivel === 'barrio') {
    const idBarrios = new Set<string>(
      collection.features.map(
        (feature) => String((feature.properties ?? {})['id_barrio'] ?? '').trim(),
      ),
    );
    const porBarrio = new Map<string, Prediccion[]>();
    predicciones.features.forEach((feature) => {
      const props = feature.properties ?? {};
      const pred = Prediccion.from(props);
      const id = String(props['id_barrio'] ?? '').trim();
      if (!pred || !id || !idBarrios.has(id)) {
        return;
      }
      const lista = porBarrio.get(id) ?? [];
      lista.push(pred);
      porBarrio.set(id, lista);
    });
    porBarrio.forEach((lista) => {
      lista.sort((a, b) => a.anio * 12 + a.mes - (b.anio * 12 + b.mes));
    });
    const elegidos = new Set<string>();
    porBarrio.forEach((lista, id) => {
      const ultimaFila = lista[lista.length - 1];
      if (riesgo === 'todo' || ultimaFila.nivel_riesgo_predicho.toUpperCase() === riesgo) {
        elegidos.add(id);
      }
    });
    let hurtos = 0;
    let tasaSuma = 0;
    let errorSuma = 0;
    let conReal = 0;
    let filasContadas = 0;
    let riesgosAltos = 0;
    elegidos.forEach((id) => {
      const lista = porBarrio.get(id)!;
      const filas = acumularOro ? lista : lista.slice(-1);
      filas.forEach((pred) => {
        hurtos += pred.total_tematica ?? pred.conteo_predicho;
        tasaSuma +=
          pred.tasa_real !== null && pred.tasa_real > 0 ? pred.tasa_real : pred.tasa_predicha;
        if (pred.tasa_real !== null && pred.tasa_real > 0) {
          conReal += 1;
          errorSuma += pred.abs_error;
        }
      });
      filasContadas += filas.length;
      if (lista[lista.length - 1].nivel_riesgo_predicho.toUpperCase() === 'ALTO') {
        riesgosAltos += 1;
      }
    });
    return {
      municipios: elegidos.size,
      hurtos,
      hurtosEstimados: conReal === 0,
      tasaMedia: filasContadas ? tasaSuma / filasContadas : 0,
      mae: conReal > 0 ? errorSuma / conReal : 0,
      sinMae: esProximoMes || conReal === 0,
      riesgosAltos,
    };
  }
  const filas = predicciones.features.map((feature) => Prediccion.from(feature.properties ?? {})).filter((pred) => pred !== null).filter((pred) => {
    const key = String(pred.codigo_dane).padStart(5, "0");
    return nivel === "departamento" ? depsVisibles.has(key.slice(0, 2)) : munisVisibles.has(key);
  });
  const ultima = new Map<string, Prediccion>();
  filas.forEach((pred) => {
    const key = String(pred.codigo_dane).padStart(5, "0");
    const current = ultima.get(key);
    if (!current || pred.anio * 12 + pred.mes > current.anio * 12 + current.mes) {
      ultima.set(key, pred);
    }
  });
  const elegidos = new Set<string>();
  ultima.forEach((pred, key) => {
    if (riesgo === "todo" || pred.nivel_riesgo_predicho.toUpperCase() === riesgo) {
      elegidos.add(key);
    }
  });
  const filasElegidas = filas.filter(
    (pred) => elegidos.has(String(pred.codigo_dane).padStart(5, "0"))
  );
  let hurtos = 0;
  let faltantes = 0;
  let tasaSuma = 0;
  let errorSuma = 0;
  filasElegidas.forEach((pred) => {
    if (pred.total_tematica === null) {
      faltantes += 1;
      hurtos += (pred.tasa_predicha * pred.pob_dane_2025) / 100000;
    } else {
      hurtos += pred.total_tematica;
    }
    tasaSuma += pred.tasa_real > 0 ? pred.tasa_real : pred.tasa_predicha;
    errorSuma += pred.abs_error;
  });
  return {
    municipios: elegidos.size,
    hurtos,
    hurtosEstimados: faltantes > 0,
    tasaMedia: filasElegidas.length ? tasaSuma / filasElegidas.length : 0,
    mae: filasElegidas.length ? errorSuma / filasElegidas.length : 0,
    sinMae: esProximoMes,
    riesgosAltos: [...elegidos].filter(
      (key) => ultima.get(key)!.nivel_riesgo_predicho.toUpperCase() === "ALTO"
    ).length
  };
}
function filterByFeatureName(
  collection: FeatureCollection,
  name: string,
  extract: (feature: Feature) => string = featureName,
): FeatureCollection {
  return {
    type: "FeatureCollection",
    features: collection.features.filter((feature) => extract(feature) === name)
  };
}
