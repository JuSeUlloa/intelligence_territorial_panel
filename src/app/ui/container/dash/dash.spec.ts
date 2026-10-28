import { TestBed } from "@angular/core/testing";
import { of } from "rxjs";
import type { Feature, FeatureCollection } from "geojson";
import { Prediccion } from "../../../models/prediccion";
import { TerritoryService } from "../../../services/territory.service";
import {
  adaptCollection,
  buildFillColor,
  computeBounds,
  Dash,
  daneKey,
  kpiPredicciones,
  latestPredicciones,
  latestPrediccionesBarrio,
  mesesDisponibles,
  mixHex,
  oklchToHex,
  riesgoStop,
  riskGradient,
  serieMensualTasas,
  conteoRiesgoPredicho,
  textoLegible
} from "./dash";
const EMPTY: FeatureCollection = { type: "FeatureCollection", features: [] };
const muniAllCalls: string[] = [];
const muniDeptCalls: string[] = [];
let barrioCalls = 0;
let predCalls = 0;
let predMunCalls = 0;
let deptCalls = 0;
const territoryStub = {
  getDepartamentos: () => {
    deptCalls += 1;
    return of(EMPTY);
  },
  getMunicipios: () => {
    muniAllCalls.push("todos");
    return of(EMPTY);
  },
  getMunicipiosDepartamento: (codigo: string) => {
    muniDeptCalls.push(codigo);
    return of(EMPTY);
  },
  getBarrios: () => {
    barrioCalls += 1;
    return of(EMPTY);
  },
  getPredicciones: () => {
    predCalls += 1;
    return of(EMPTY);
  },
  getPrediccionMunicipio: () => {
    predMunCalls += 1;
    return of(EMPTY);
  },
  getPrediccionMunicipioActual: () => {
    predMunCalls += 1;
    return of(EMPTY);
  }
};
describe("Dash", () => {
  beforeEach(async () => {
    muniAllCalls.length = 0;
    muniDeptCalls.length = 0;
    barrioCalls = 0;
    predCalls = 0;
    predMunCalls = 0;
    deptCalls = 0;
    await TestBed.configureTestingModule({
      imports: [Dash],
      providers: [{ provide: TerritoryService, useValue: territoryStub }]
    }).compileComponents();
  });
  it("should create", () => {
    const fixture = TestBed.createComponent(Dash);
    expect(fixture.componentInstance).toBeTruthy();
  });
  it("should render the filters bar before the map", async () => {
    const fixture = TestBed.createComponent(Dash);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const el = fixture.nativeElement;
    const filters = el.querySelector("app-filters");
    const mapCard = el.querySelector("section > .card");
    expect(filters).toBeTruthy();
    expect(filters.textContent).toContain("Mes");
    expect(filters.textContent).toContain("Nivel riesgo");
    expect(filters.textContent).not.toContain("Zona");
    expect(
      !!filters && !!mapCard && !!(filters.compareDocumentPosition(mapCard) & Node.DOCUMENT_POSITION_FOLLOWING)
    ).toBe(true);
  });
  it("should request the municipality layer of the selected department", () => {
    const fixture = TestBed.createComponent(Dash);
    fixture.componentInstance.onGeoSelection({
      nivel: "municipio",
      departamento: "Antioquia",
      departamentoCodigo: "05",
      municipio: null
    });
    expect(muniDeptCalls).toEqual(["05"]);
    expect(muniAllCalls).toEqual([]);
    expect(predCalls).toBe(2);
  });
  it("should request ALL municipalities when municipio level has no department", () => {
    const fixture = TestBed.createComponent(Dash);
    fixture.componentInstance.onGeoSelection({
      nivel: "municipio",
      departamento: null,
      departamentoCodigo: null,
      municipio: null
    });
    expect(muniAllCalls).toEqual(["todos"]);
    expect(muniDeptCalls).toEqual([]);
    expect(predCalls).toBe(2);
  });
  it("should request the barrio layer when barrio level is selected", () => {
    const fixture = TestBed.createComponent(Dash);
    fixture.componentInstance.onGeoSelection({
      nivel: "barrio",
      departamento: null,
      departamentoCodigo: null,
      municipio: null
    });
    expect(barrioCalls).toBe(1);
    expect(muniAllCalls).toEqual([]);
    expect(muniDeptCalls).toEqual([]);
    expect(predMunCalls).toBe(1);
    expect(predCalls).toBe(1);
  });
  it("should reset the map to the department layer on filters reset", () => {
    const fixture = TestBed.createComponent(Dash);
    fixture.componentInstance.onGeoSelection({
      nivel: "municipio",
      departamento: "Antioquia",
      departamentoCodigo: "05",
      municipio: null
    });
    expect(muniDeptCalls).toEqual(["05"]);
    fixture.componentInstance.onFiltersReset();
    expect(deptCalls).toBe(1);
    expect(predCalls).toBe(4);
    expect(muniAllCalls).toEqual([]);
    expect(muniDeptCalls).toEqual(["05"]);
  });
  it("should show a WebGL fallback in environments without WebGL (jsdom)", async () => {
    const fixture = TestBed.createComponent(Dash);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const el = fixture.nativeElement;
    expect(el.textContent).toContain("WebGL");
  });
});
describe("computeBounds", () => {
  const feature = (geometry: unknown, extra?: Record<string, unknown>): Feature => ({ type: "Feature", geometry, properties: {}, ...extra } as unknown as Feature);
  const collection = (...features: Feature[]): FeatureCollection => ({
    type: "FeatureCollection",
    features
  });
  it("should compute bounds from standard polygon coordinates", () => {
    const data = collection(
      feature({
        type: "Polygon",
        coordinates: [
          [
            [-74, 4],
            [-73, 5],
            [-72, 4.5],
            [-74, 4]
          ]
        ]
      })
    );
    expect(computeBounds(data)).toEqual([-74, 4, -72, 5]);
  });
  it("should tolerate coordinates serialized as strings", () => {
    const data = collection(
      feature({
        type: "LineString",
        coordinates: [
          ["-75.5", "7.1"],
          ["-74.1", "8.9"]
        ]
      })
    );
    expect(computeBounds(data)).toEqual([-75.5, 7.1, -74.1, 8.9]);
  });
  it("should tolerate points given as objects", () => {
    const data = collection(
      feature({
        type: "MultiPoint",
        coordinates: [
          { lng: -74.1, lat: 4.6 },
          { longitude: -73.9, latitude: 4.7 }
        ]
      })
    );
    expect(computeBounds(data)).toEqual([-74.1, 4.6, -73.9, 4.7]);
  });
  it("should use coordinates outside of a null geometry", () => {
    const data = collection(
      feature(null, { coordinates: [[-74.2, 4.7], [-73.8, 5.1]] })
    );
    expect(computeBounds(data)).toEqual([-74.2, 4.7, -73.8, 5.1]);
  });
  it("should return null when there are no usable coordinates", () => {
    expect(computeBounds(collection())).toBeNull();
    expect(computeBounds(collection(feature(null)))).toBeNull();
    expect(computeBounds(collection(feature({ type: "Polygon", coordinates: [] })))).toBeNull();
  });
});
describe("theme risk gradient", () => {
  it("should convert the oklch accent to a hex color Mapbox understands", () => {
    expect(oklchToHex("oklch(1 0 0)")).toBe("#ffffff");
    expect(oklchToHex("oklch(0 0 0)")).toBe("#000000");
    expect(oklchToHex("oklch(0.55 0.2 265)")).toMatch(/^#[0-9a-f]{6}$/);
  });
  it("should keep non-oklch values untouched", () => {
    expect(oklchToHex("#123456")).toBe("#123456");
  });
  it("should mix two hex colors", () => {
    expect(mixHex("#000000", "#ffffff", 0)).toBe("#000000");
    expect(mixHex("#000000", "#ffffff", 0.5)).toBe("#808080");
    expect(mixHex("#000000", "#ffffff", 1)).toBe("#ffffff");
  });
  it("should build a three-stop gradient from the accent", () => {
    const [low, mid, high] = riskGradient("oklch(0.55 0.2 265)", false);
    expect([low, mid, high].every((color) => /^#[0-9a-f]{6}$/.test(color))).toBe(true);
    expect(mid).toBe(oklchToHex("oklch(0.55 0.2 265)"));
    expect((/* @__PURE__ */ new Set([low, mid, high])).size).toBe(3);
  });
  it("should produce the case/interpolate expression for the choropleth", () => {
    const expression = buildFillColor("oklch(0.55 0.2 265)", false);
    expect(expression[0]).toBe("case");
    const gradient = JSON.stringify(expression[2]);
    expect(gradient).toContain("riesgo_rank");
    expect(gradient).toContain('"interpolate"');
    expect(JSON.stringify(expression[3])).toContain("plano");
  });
});
describe("risk join with /gold predictions", () => {
  const pred = (codigo_dane, nivel, tasa_predicha = "12", tasa_real = "10", pob_dane_2025 = "400000") => Prediccion.from({
    municipio: "X",
    codigo_dane,
    departamento: "Y",
    mes: "1",
    anio: "2026",
    nivel_riesgo_predicho: nivel,
    tasa_predicha,
    tasa_real,
    pob_dane_2025
  });
  const collection = (...features: Feature[]): FeatureCollection => ({
    type: "FeatureCollection",
    features
  });
  const poly = (props: Record<string, unknown>): Feature => ({ type: "Feature", geometry: { type: "Polygon", coordinates: [] }, properties: props });
  it("should normalize codigo_dane to five digits", () => {
    expect(daneKey(5001)).toBe("05001");
    expect(daneKey("76109")).toBe("76109");
    expect(daneKey("")).toBe("");
    expect(daneKey(null)).toBe("");
  });
  it("should keep the newest prediction per municipality", () => {
    const map = latestPredicciones(
      collection(
        poly({ codigo_dane: "76109", nivel_riesgo_predicho: "BAJO", anio: "2025", mes: "12" }),
        poly({ codigo_dane: "76109", nivel_riesgo_predicho: "ALTO", anio: "2026", mes: "1" })
      )
    );
    expect(map.size).toBe(1);
    expect(map.get("76109")?.nivel_riesgo_predicho).toBe("ALTO");
  });
  it("should paint a municipality with its full /gold prediction", () => {
    const preds = /* @__PURE__ */ new Map([["76109", pred("76109", "ALTO")]]);
    const data = adaptCollection(collection(poly({ codigo_dane: 76109 })), preds, "municipio");
    expect(data.features[0].properties?.["riesgo"]).toBe("ALTO");
    expect(data.features[0].properties?.["riesgo_rank"]).toBe(1);
    expect(data.features[0].properties?.["tasa_predicha"]).toBe(12);
    expect(data.features[0].properties?.["tasa_real"]).toBe(10);
    expect(data.features[0].properties?.["pob_dane_2025"]).toBe(4e5);
    expect(data.features[0].properties?.["departamento"]).toBe("Y");
  });
  it("should leave municipalities without prediction as no-data", () => {
    const data = adaptCollection(collection(poly({ codigo_dane: 99999 })), /* @__PURE__ */ new Map(), "municipio");
    expect(data.features[0].properties?.["riesgo"]).toBeNull();
    expect(data.features[0].properties?.["riesgo_rank"]).toBeNull();
  });
  it("should paint a department with the MODA of its municipalities (info grouped per municipio)", () => {
    const preds = /* @__PURE__ */ new Map([
      ["05001", pred("05001", "BAJO", "6", "5")],
            ["05002", pred("05002", "MEDIO", "12", "11")],
            ["05800", pred("05800", "ALTO", "15", "13")],
            ["05099", pred("05099", "ALTO", "14", "13")],
            ["76109", pred("76109", "MEDIO", "99", "99")]
      // otro departamento
    ]);
    const data = adaptCollection(
      collection(poly({ codigo_departamento: "05" })),
      preds,
      "departamento"
    );
    expect(data.features[0].properties?.["riesgo"]).toBe("ALTO");
    expect(data.features[0].properties?.["riesgo_rank"]).toBeCloseTo(0.625, 5);
    expect(data.features[0].properties?.["tasa_predicha"]).toBeCloseTo(11.75, 5);
    expect(data.features[0].properties?.["tasa_real"]).toBeCloseTo(10.5, 5);
  });
  it("should keep only the predictions of the selected month", () => {
    const mes2 = latestPredicciones(
      collection(
        poly({ codigo_dane: "76109", mes: "1", anio: "2026", nivel_riesgo_predicho: "BAJO" }),
        poly({ codigo_dane: "76109", mes: "2", anio: "2026", nivel_riesgo_predicho: "ALTO" }),
        poly({ codigo_dane: "76109", mes: "2", anio: "2025", nivel_riesgo_predicho: "MEDIO" })
      ),
      2
    );
    expect(mes2.get("76109")?.nivel_riesgo_predicho).toBe("ALTO");
    const todo = latestPredicciones(collection(
      poly({ codigo_dane: "76109", mes: "1", anio: "2026", nivel_riesgo_predicho: "BAJO" })
    ));
    expect(todo.size).toBe(1);
  });
  it("should extract the available months from the predictions", () => {
    const meses = mesesDisponibles(
      collection(
        poly({ codigo_dane: "76109", mes: "2", anio: "2026" }),
        poly({ codigo_dane: "76001", mes: "1", anio: "2026" }),
        poly({ codigo_dane: "05001", mes: "12", anio: "2025" }),
                poly({ codigo_dane: "76110", mes: "3", anio: "2026" })
      )
    );
    expect(meses).toEqual([1, 2, 3]);
  });
  it("should consolidate the panel KPIs from ALL /gold rows", () => {
    const row = (codigo, nivel, total, tasa, mes = "1", anio = "2026") => Prediccion.from({
      municipio: "X",
      codigo_dane: codigo,
      departamento: "Y",
      mes,
      anio,
      nivel_riesgo_predicho: nivel,
      total_tematica: total,
      tasa_real: tasa,
      abs_error: "1"
    });
    const gold = collection(
      poly({ codigo_dane: "76109", mes: "1", anio: "2026", nivel_riesgo_predicho: "ALTO", total_tematica: "5", tasa_real: "12", abs_error: "1" }),
      poly({ codigo_dane: "76109", mes: "2", anio: "2026", nivel_riesgo_predicho: "ALTO", total_tematica: "5", tasa_real: "10", abs_error: "1" }),
      poly({ codigo_dane: "76001", mes: "1", anio: "2026", nivel_riesgo_predicho: "MEDIO", total_tematica: "3", tasa_real: "8", abs_error: "2" })
    );
    const kpis = kpiPredicciones(
      collection(poly({ codigo_dane: "76109" }), poly({ codigo_dane: 76001 })),
      gold,
      "municipio"
    );
    expect(kpis.municipios).toBe(2);
    expect(kpis.hurtos).toBe(13);
    expect(kpis.tasaMedia).toBeCloseTo(10, 5);
    expect(kpis.mae).toBeCloseTo(4 / 3, 5);
    expect(kpis.sinMae).toBe(false);
    expect(kpis.riesgosAltos).toBe(1);
  });
  it("should scope the department KPIs to the displayed departments", () => {
    const row = (codigo, nivel, total) => Prediccion.from({
      municipio: "X",
      codigo_dane: codigo,
      departamento: "Y",
      mes: "1",
      anio: "2026",
      nivel_riesgo_predicho: nivel,
      total_tematica: total
    });
    const predicciones = collection(
      poly({ codigo_dane: "05001", nivel_riesgo_predicho: "ALTO", total_tematica: "5" }),
      poly({ codigo_dane: "05002", nivel_riesgo_predicho: "BAJO", total_tematica: "3" }),
      poly({ codigo_dane: "76109", nivel_riesgo_predicho: "ALTO", total_tematica: "99" })
      // fuera de vista
    );
    const kpis = kpiPredicciones(
      collection(poly({ codigo_departamento: "05" })),
      predicciones,
      "departamento"
    );
    expect(kpis.municipios).toBe(2);
    expect(kpis.hurtos).toBe(8);
    expect(kpis.riesgosAltos).toBe(1);
  });
  it("should fade the features outside the selected risk level", () => {
    const preds = /* @__PURE__ */ new Map([
      ["76109", pred("76109", "ALTO")],
      ["76001", pred("76001", "BAJO")]
    ]);
    const data = adaptCollection(
      collection(
        poly({ codigo_dane: "76109" }),
        poly({ codigo_dane: "76001" }),
        poly({ codigo_dane: "76002", barrio: "X" })
      ),
      preds,
      "municipio",
      "ALTO"
    );
    expect(data.features[0].properties?.["riesgo_fade"]).toBe(false);
    expect(data.features[1].properties?.["riesgo_fade"]).toBe(true);
    expect(data.features[2].properties?.["riesgo_fade"]).toBe(true);
  });
  it('should not fade anything when the risk filter is "todo"', () => {
    const preds = /* @__PURE__ */ new Map([["76109", pred("76109", "ALTO")]]);
    const data = adaptCollection(
      collection(poly({ codigo_dane: "76109" }), poly({ codigo_dane: "76001" })),
      preds,
      "municipio"
    );
    expect(data.features[0].properties?.["riesgo_fade"]).toBe(false);
    expect(data.features[1].properties?.["riesgo_fade"]).toBe(false);
  });
  it("should pick a legible text color for the risk chip", () => {
    expect(textoLegible("#ffffff")).not.toBe("#ffffff");
    expect(textoLegible("#000000")).toBe("#ffffff");
  });
  it("should keep the risk chip color consistent with the gradient stops", () => {
    const accent = "oklch(0.55 0.2 265)";
    const [low, , high] = riskGradient(accent, false);
    expect(riesgoStop(0, accent, false)).toBe(low);
    expect(riesgoStop(1, accent, false)).toBe(high);
    expect(riesgoStop(2, accent, false)).toBe(high);
    expect(riesgoStop(-1, accent, false)).toBe(low);
  });
  it("should carry total_tematica to map popups (municipio and department SUM)", () => {
    const gold = collection(
      poly({ codigo_dane: "05201", nivel_riesgo_predicho: "ALTO", total_tematica: "5" }),
      poly({ codigo_dane: "05300", nivel_riesgo_predicho: "BAJO", total_tematica: "3" }),
      poly({ codigo_dane: "76109", nivel_riesgo_predicho: "ALTO", total_tematica: "99" })
      // fuera
    );
    const muni = adaptCollection(collection(poly({ codigo_dane: "05201" })), latestPredicciones(gold), "municipio");
    expect(muni.features[0].properties?.["total_tematica"]).toBe(5);
    const depto = adaptCollection(collection(poly({ codigo_departamento: "05" })), latestPredicciones(gold), "departamento");
    expect(depto.features[0].properties?.["total_tematica"]).toBe(8);
  });
  it("should scope the KPIs to the selected risk level", () => {
    const chaina = collection(
      poly({ codigo_dane: "76109", mes: "1", anio: "2026", nivel_riesgo_predicho: "ALTO", total_tematica: "5", tasa_real: "12", abs_error: "1" }),
      poly({ codigo_dane: "76109", mes: "2", anio: "2026", nivel_riesgo_predicho: "ALTO", total_tematica: "5", tasa_real: "10", abs_error: "1" }),
      poly({ codigo_dane: "76001", mes: "1", anio: "2026", nivel_riesgo_predicho: "BAJO", total_tematica: "3", tasa_real: "8", abs_error: "2" })
    );
    const vista = collection(poly({ codigo_dane: "76109" }), poly({ codigo_dane: 76001 }));
    const altos = kpiPredicciones(vista, chaina, "municipio", "ALTO");
    expect(altos.municipios).toBe(1);
    expect(altos.hurtos).toBe(10);
    expect(altos.tasaMedia).toBeCloseTo(11, 5);
    expect(altos.mae).toBeCloseTo(1, 5);
    expect(altos.riesgosAltos).toBe(1);
    const bajos = kpiPredicciones(vista, chaina, "municipio", "BAJO");
    expect(bajos.municipios).toBe(1);
    expect(bajos.hurtos).toBe(3);
    expect(bajos.riesgosAltos).toBe(0);
  });
  it("should mark the MAE card as unavailable in the next-month view", () => {
    const prediction = collection(
      poly({ codigo_dane: "76109", mes: "9", anio: "2026", nivel_riesgo_predicho: "ALTO", tasa_predicha: "11", abs_error: null }),
      poly({ codigo_dane: "76001", mes: "9", anio: "2026", nivel_riesgo_predicho: "BAJO", tasa_predicha: "9", abs_error: null })
    );
    const vista = collection(poly({ codigo_dane: "76109" }), poly({ codigo_dane: 76001 }));
    const kpis = kpiPredicciones(vista, prediction, "municipio", "todo", true);
    expect(kpis.sinMae).toBe(true);
    expect(kpis.mae).toBe(0);
  });
  it("should break moda ties preferring the most severe level", () => {
    const preds = /* @__PURE__ */ new Map([
      ["05001", pred("05001", "BAJO", "6", "5")],
      ["05002", pred("05002", "BAJO", "6", "5")],
      ["05003", pred("05003", "BAJO", "6", "5")],
      ["05004", pred("05004", "MEDIO", "12", "11")],
      ["05005", pred("05005", "MEDIO", "12", "11")],
      ["05006", pred("05006", "MEDIO", "12", "11")]
    ]);
    const data = adaptCollection(
      collection(poly({ codigo_departamento: "05" })),
      preds,
      "departamento"
    );
    expect(data.features[0].properties?.["riesgo"]).toBe("MEDIO");
  });
  it("should paint barrios with the risk of their municipality", () => {
    const preds = /* @__PURE__ */ new Map([["76109", pred("76109", "ALTO")]]);
    const data = adaptCollection(collection(poly({ codigo_dane: "76109", barrio: "CABAL POMBO" })), preds, "barrio");
    expect(data.features[0].properties?.["riesgo"]).toBe("ALTO");
    expect(data.features[0].properties?.["riesgo_rank"]).toBe(1);
    expect(data.features[0].properties?.["plano"]).toBe(false);
    expect(data.features[0].properties?.["tasa_predicha"]).toBe(12);
  });
  it("should join the barrio prediction by id_barrio (fila de /prediction/neighborhood)", () => {
    const filas = collection(
      poly({ codigo_dane: "76109", id_barrio: "aaa", barrio: "B1", mes: "9", anio: "2024", nivel_riesgo_predicho: "ALTO" }),
      poly({ codigo_dane: "76109", id_barrio: "bbb", barrio: "B2", mes: "9", anio: "2024", nivel_riesgo_predicho: "BAJO" })
    );
    const preds = latestPrediccionesBarrio(filas);
    expect(preds.size).toBe(2);
    const capa = collection(
      poly({ codigo_dane: "76109", id_barrio: "aaa", barrio: "B1" }),
      poly({ codigo_dane: "76109", id_barrio: "bbb", barrio: "B2" })
    );
    const data = adaptCollection(capa, preds, "barrio");
    expect(data.features[0].properties?.["riesgo"]).toBe("ALTO");
    expect(data.features[1].properties?.["riesgo"]).toBe("BAJO");
  });
  it("should mark barrios without municipality prediction as plain", () => {
    const data = adaptCollection(collection(poly({ codigo_dane: "76109", barrio: "CABAL POMBO" })), /* @__PURE__ */ new Map(), "barrio");
    expect(data.features[0].properties?.["plano"]).toBe(true);
    expect(data.features[0].properties?.["riesgo"]).toBeNull();
    expect(data.features[0].properties?.["riesgo_rank"]).toBeNull();
  });
});
describe("charts below the bars (serie mensual y torta vs. filtros)", () => {
  const collection = (...features: Feature[]): FeatureCollection => ({
    type: "FeatureCollection",
    features
  });
  const poly = (props: Record<string, unknown>): Feature => ({ type: "Feature", geometry: { type: "Polygon", coordinates: [] }, properties: props });
  const row = (codigo, mes, anio, nivel, tasa_predicha = "10", tasa_real = "8") => poly({
    codigo_dane: codigo,
    mes,
    anio,
    nivel_riesgo_predicho: nivel,
    tasa_predicha,
    tasa_real
  });
  it("should average tasas per month in chronological order (line chart)", () => {
    const serie = serieMensualTasas(
      collection(
        row("76109", "2", "2026", "ALTO", "10", "8"),
        row("76001", "2", "2026", "BAJO", "12", "12"),
        row("76109", "1", "2026", "MEDIO", "6", "5")
      )
    );
    expect(serie.map((p) => p.etiqueta)).toEqual(["Ene 26", "Feb 26"]);
    expect(serie[1].real).toBeCloseTo(10, 5);
    expect(serie[1].predicha).toBeCloseTo(11, 5);
  });
  it("should average per municipality FIRST, then the monthly mean (equal city weight)", () => {
    const serie = serieMensualTasas(
      collection(
        row("76109", "2", "2026", "ALTO", "10", "8"),
        row("76109", "2", "2026", "ALTO", "12", "8"),
        row("76001", "2", "2026", "BAJO", "4", "4")
      )
    );
    expect(serie).toHaveLength(1);
    expect(serie[0].predicha).toBeCloseTo(7.5, 5);
    expect(serie[0].real).toBeCloseTo(6, 5);
  });
  it("should scope the serie to the visible departments (nivel departamento)", () => {
    const depsVisibles = /* @__PURE__ */ new Set(["05"]);
    const serie = serieMensualTasas(
      collection(
        row("05001", "3", "2026", "ALTO", "14", "12"),
        row("76109", "3", "2026", "BAJO", "2", "2"),
                row("05900", "2", "2026", "BAJO", "4", "4")
      ),
      depsVisibles
    );
    expect(serie.map((p) => p.mes)).toEqual([2, 3]);
    expect(serie[1].predicha).toBeCloseTo(14, 5);
  });
  it("should scope the serie to the visible municipalities (nivel municipio)", () => {
    const munisVisibles = /* @__PURE__ */ new Set(["76109"]);
    const serie = serieMensualTasas(
      collection(
        row("76109", "1", "2026", "ALTO", "10", "8"),
        row("76001", "1", "2026", "BAJO", "2", "2")
        // fuera de vista
      ),
      null,
      munisVisibles
    );
    expect(serie).toHaveLength(1);
    expect(serie[0].predicha).toBeCloseTo(10, 5);
  });
  it("should keep a single point when the month filter is active (/gold/<mes>)", () => {
    const serie = serieMensualTasas(collection(row("76109", "5", "2026", "ALTO", "10", "8")));
    expect(serie).toHaveLength(1);
    expect(serie[0].etiqueta).toBe("May 26");
  });
  it("should keep both series on the same universe (rows without tasa real go out of BOTH)", () => {
    const serie = serieMensualTasas(
      collection(
        row("76109", "4", "2026", "BAJO", "10", "0"),
                row("76001", "4", "2026", "BAJO", "2", "12")
      )
    );
    expect(serie).toHaveLength(1);
    expect(serie[0].real).toBeCloseTo(12, 5);
    expect(serie[0].predicha).toBeCloseTo(2, 5);
  });
  it("should count one pie entry per territory with valid predicted level", () => {
    const counts = conteoRiesgoPredicho(
       new Map([
        ["76109", Prediccion.from({ codigo_dane: 76109, mes: 5, anio: 2026, nivel_riesgo_predicho: "ALTO" })],
        ["76001", Prediccion.from({ codigo_dane: 76001, mes: 5, anio: 2026, nivel_riesgo_predicho: "MEDIO" })],
        ["05001", Prediccion.from({ codigo_dane: 5001, mes: 5, anio: 2026, nivel_riesgo_predicho: "BAJO" })]
      ])
    );
    expect(counts).toEqual({ bajo: 1, medio: 1, alto: 1 });
  });
  it("should scope the pie counts to the visible departments", () => {
    const depsVisibles = /* @__PURE__ */ new Set(["76"]);
    const counts = conteoRiesgoPredicho(
       new Map([
        ["76109", Prediccion.from({ codigo_dane: 76109, mes: 5, anio: 2026, nivel_riesgo_predicho: "ALTO" })],
        ["76001", Prediccion.from({ codigo_dane: 76001, mes: 5, anio: 2026, nivel_riesgo_predicho: "MEDIO" })],
        ["05001", Prediccion.from({ codigo_dane: 5001, mes: 5, anio: 2026, nivel_riesgo_predicho: "BAJO" })]
        // fuera
      ]),
      depsVisibles
    );
    expect(counts).toEqual({ bajo: 0, medio: 1, alto: 1 });
  });
  it("should scope the pie counts to the visible municipalities", () => {
    const counts = conteoRiesgoPredicho(
       new Map([
        ["76109", Prediccion.from({ codigo_dane: 76109, mes: 5, anio: 2026, nivel_riesgo_predicho: "ALTO" })],
        ["05001", Prediccion.from({ codigo_dane: 5001, mes: 5, anio: 2026, nivel_riesgo_predicho: "BAJO" })]
      ]),
      null,
       new Set(["76109"])
    );
    expect(counts).toEqual({ bajo: 0, medio: 0, alto: 1 });
  });
  it("should return null pie counts when nothing has a valid level", () => {
    const counts = conteoRiesgoPredicho(
       new Map([
        ["76109", Prediccion.from({ codigo_dane: 76109, mes: 5, anio: 2026, nivel_riesgo_predicho: "SIN DATO" })]
      ])
    );
    expect(counts).toBeNull();
  });
  it("should ignore invalid mes rows in the serie", () => {
    const serie = serieMensualTasas(
      collection(
        row("76109", "13", "2026", "ALTO", "10", "8"),
                row("76109", "0", "2026", "ALTO", "10", "8"),
                row("76001", "6", "2026", "BAJO", "10", "8")
      )
    );
    expect(serie).toHaveLength(1);
    expect(serie[0].mes).toBe(6);
  });
});
