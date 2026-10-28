import { provideHttpClient } from "@angular/common/http";
import { HttpTestingController, provideHttpClientTesting } from "@angular/common/http/testing";
import { TestBed } from "@angular/core/testing";
import { firstValueFrom } from "rxjs";
import type { HttpRequest } from "@angular/common/http";
import type { Feature, FeatureCollection } from "geojson";
import { TerritoryService, barrioName, featureCode, featureName, municipalityName } from "./territory.service";
const FEATURES: Feature[] = [
  {
    type: "Feature",
    geometry: { type: "Polygon", coordinates: [] },
    properties: { nombre: "Antioquia", codigo_departamento: "05" }
  }
];
describe("TerritoryService", () => {
  let http: HttpTestingController;
  let service: TerritoryService;
  const isDepartments = (req: { url: string }) => req.url.endsWith("/department");
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    http = TestBed.inject(HttpTestingController);
    service = TestBed.inject(TerritoryService);
  });
  afterEach(() => http.verify());
  it('should unwrap the JSON "response" key of the API', async () => {
    const result = firstValueFrom(service.getDepartamentos());
    http.expectOne(isDepartments).flush({ response: { type: "FeatureCollection", features: FEATURES } });
    const collection: FeatureCollection = await result;
    expect(collection.type).toBe("FeatureCollection");
    expect(collection.features).toHaveLength(1);
    expect(featureName(collection.features[0])).toBe("Antioquia");
    expect(featureCode(collection.features[0])).toBe("05");
  });
  it('should accept an array of features inside "response"', async () => {
    const result = firstValueFrom(service.getDepartamentos());
    http.expectOne(isDepartments).flush({ response: FEATURES });
    const collection: FeatureCollection = await result;
    expect(collection.type).toBe("FeatureCollection");
    expect(collection.features).toHaveLength(1);
  });
  it("should accept a raw FeatureCollection without wrapper", async () => {
    const result = firstValueFrom(service.getDepartamentos());
    http.expectOne(isDepartments).flush({ type: "FeatureCollection", features: FEATURES });
    const collection: FeatureCollection = await result;
    expect(collection.features).toHaveLength(1);
  });
  it("should request the nested municipality route with the department code", async () => {
    const result = firstValueFrom(service.getMunicipiosDepartamento("05"));
    http.expectOne((req: HttpRequest<unknown>) => req.url.endsWith("/department/05/municipality")).flush({ response: { type: "FeatureCollection", features: FEATURES } });
    const collection: FeatureCollection = await result;
    expect(collection.features).toHaveLength(1);
  });
  it("should rebuild the municipality layer WITHOUT the flat /municipality route", async () => {
    const result = firstValueFrom(service.getMunicipios());
    http.expectOne(isDepartments).flush({
      response: [
        { codigo_departamento: "05", departamento_nombre: "ANTIOQUIA" },
        { codigo_departamento: "76", departamento_nombre: "VALLE DEL CAUCA" }
      ]
    });
    http.expectOne((req: HttpRequest<unknown>) => req.url.endsWith("/department/05/municipality")).flush({ response: [{ municipio: "APARTADO", codigo_dane: "05201", codigo_departamento: "05" }] });
    http.expectOne((req: HttpRequest<unknown>) => req.url.endsWith("/department/76/municipality")).flush({ response: [{ municipio: "CALI", codigo_dane: "76001", codigo_departamento: "76" }] });
    const collection: FeatureCollection = await result;
    expect(collection.features.map((f) => f.properties?.["municipio"])).toEqual([
      "APARTADO",
      "CALI"
    ]);
  });
  it("should tolerate one department failing during the rebuild", async () => {
    const result = firstValueFrom(service.getMunicipios());
    http.expectOne(isDepartments).flush({
      response: [
        { codigo_departamento: "05", departamento_nombre: "ANTIOQUIA" },
        { codigo_departamento: "76", departamento_nombre: "VALLE DEL CAUCA" }
      ]
    });
    http.expectOne((req: HttpRequest<unknown>) => req.url.endsWith("/department/05/municipality")).flush("boom", { status: 500, statusText: "Server Error" });
    http.expectOne((req: HttpRequest<unknown>) => req.url.endsWith("/department/76/municipality")).flush({ response: [{ municipio: "CALI", codigo_dane: "76001", codigo_departamento: "76" }] });
    const collection: FeatureCollection = await result;
    expect(collection.features.map((f) => f.properties?.["municipio"])).toEqual(["CALI"]);
  });
  it("should request the neighborhoods from /neighborhood", async () => {
    const result = firstValueFrom(service.getBarrios());
    http.expectOne((req: HttpRequest<unknown>) => req.url.endsWith("/neighborhood")).flush({
      response: [
        {
          barrio: "CIUDADELA COLPUERTOS",
          id_barrio: "e8a66c94",
          geometry: '{"type":"Polygon","coordinates":[]}'
        }
      ]
    });
    const collection: FeatureCollection = await result;
    expect(collection.features).toHaveLength(1);
    expect(collection.features[0].properties?.["barrio"]).toBe("CIUDADELA COLPUERTOS");
  });
  it("should extract the neighborhood name with barrioName", () => {
    const feature: Feature = {
      type: "Feature",
      geometry: null,
      properties: { barrio: "CABAL POMBO", codigo_dane: "76109", id_barrio: "1" }
    };
    expect(barrioName(feature)).toBe("CABAL POMBO");
    const empty: Feature = { type: "Feature", geometry: null, properties: {} };
    expect(barrioName(empty)).toBe("");
  });
  it("should relate barrio codes with municipality polygons (getMunicipiosConBarrios)", async () => {
    const result = firstValueFrom(service.getMunicipiosConBarrios());
    http.expectOne((req: HttpRequest<unknown>) => req.url.endsWith("/neighborhood")).flush({
      response: [
        { barrio: "CABAL POMBO", codigo_dane: "76109", id_barrio: "1", geometry: null },
        { barrio: "OTRO", codigo_dane: "76001", id_barrio: "2", geometry: null }
      ]
    });
    http.expectOne(isDepartments).flush({
      response: [{ codigo_departamento: "76", departamento_nombre: "VALLE DEL CAUCA" }]
    });
    http.expectOne((req: HttpRequest<unknown>) => req.url.endsWith("/department/76/municipality")).flush({
      response: [
        { municipio: "BUENAVENTURA", codigo_dane: "76109", codigo_departamento: "76" },
        { municipio: "CALI", codigo_dane: "76001", codigo_departamento: "76" }
      ]
    });
    const collection: FeatureCollection = await result;
    const names = collection.features.map((f) => f.properties?.["municipio"]);
    expect(names).toEqual(["BUENAVENTURA", "CALI"]);
  });
  it("should use the nested department route inside getMunicipiosConBarrios", async () => {
    const result = firstValueFrom(service.getMunicipiosConBarrios("76"));
    http.expectOne((req: HttpRequest<unknown>) => req.url.endsWith("/neighborhood")).flush({
      response: [{ barrio: "CABAL POMBO", codigo_dane: "76109", id_barrio: "1", geometry: null }]
    });
    http.expectOne((req: HttpRequest<unknown>) => req.url.endsWith("/department/76/municipality")).flush({
      response: [
        { municipio: "BUENAVENTURA", codigo_dane: "76109", codigo_departamento: "76" },
        { municipio: "BUGA", codigo_dane: "76111", codigo_departamento: "76" }
      ]
    });
    const collection: FeatureCollection = await result;
    expect(collection.features).toHaveLength(1);
    expect(collection.features[0].properties?.["municipio"]).toBe("BUENAVENTURA");
  });
  it("should share one cached request per URL", async () => {
    const first = firstValueFrom(service.getDepartamentos());
    const second = firstValueFrom(service.getDepartamentos());
    const requests = http.match(isDepartments);
    expect(requests).toHaveLength(1);
    requests[0].flush({ response: { type: "FeatureCollection", features: FEATURES } });
    const [a, b] = await Promise.all([first, second]);
    expect(a.features).toEqual(b.features);
  });
  it("should allow a retry after a failed request", async () => {
    const failing = firstValueFrom(service.getDepartamentos());
    http.expectOne(isDepartments).flush("boom", { status: 500, statusText: "Server Error" });
    await expect(failing).rejects.toBeTruthy();
    const retry = firstValueFrom(service.getDepartamentos());
    http.expectOne(isDepartments).flush({ response: { type: "FeatureCollection", features: FEATURES } });
    const collection = await retry;
    expect(collection.features).toHaveLength(1);
  });
  it("should normalize plain API objects with a serialized geometry string", async () => {
    const item = {
      codigo_departamento: "91",
      departamento_nombre: "AMAZONAS",
      geometry: '{"type":"Polygon","coordinates":[[[-71.3,0.1],[-71.2,0.1],[-71.25,0.2],[-71.3,0.1]]]}',
      properties: { extra: "x" }
    };
    const result = firstValueFrom(service.getDepartamentos());
    http.expectOne(isDepartments).flush({ response: [item] });
    const collection: FeatureCollection = await result;
    expect(collection.features).toHaveLength(1);
    const feature = collection.features[0];
    expect(feature.type).toBe("Feature");
    expect(feature.geometry?.type).toBe("Polygon");
    expect(featureName(feature)).toBe("AMAZONAS");
    expect(featureCode(feature)).toBe("91");
  });
  it("should read the model fields (municipio / codigo_dane) of models/departamento.ts", async () => {
    const item = {
      codigo_dane: 5001,
      municipio: "Medell\xEDn",
      codigo_departamento: "05",
      departamento_nombre: "ANTIOQUIA",
      geometry: '{"type":"Point","coordinates":[-75.56,6.25]}'
    };
    const result = firstValueFrom(service.getDepartamentos());
    http.expectOne(isDepartments).flush({ response: [item] });
    const feature = (await result).features[0];
    expect(feature.geometry?.type).toBe("Point");
    expect(featureName(feature)).toBe("ANTIOQUIA");
    expect(municipalityName(feature)).toBe("Medell\xEDn");
    expect(featureCode(feature)).toBe("05");
  });
  it("should request the predictions from /gold", async () => {
    const result = firstValueFrom(service.getPredicciones());
    http.expectOne((req: HttpRequest<unknown>) => req.url.endsWith("/gold")).flush({
      response: [
        {
          municipio: "BUENAVENTURA",
          codigo_dane: "76109",
          departamento: "VALLE DEL CAUCA",
          mes: "1",
          anio: "2026",
          nivel_riesgo_predicho: "ALTO",
          nivel_riesgo_real: "MEDIO",
          tasa_predicha: "12.5",
          tasa_real: "11.1"
        }
      ]
    });
    const collection: FeatureCollection = await result;
    expect(collection.features).toHaveLength(1);
    const props = collection.features[0].properties;
    expect(props?.["codigo_dane"]).toBe("76109");
    expect(props?.["nivel_riesgo_predicho"]).toBe("ALTO");
  });
  it("should request the selected month from the nested /gold/<mes> route", async () => {
    const result = firstValueFrom(service.getPredicciones(3));
    http.expectOne((req: HttpRequest<unknown>) => req.url.endsWith("/gold/3")).flush({
      response: [
        {
          municipio: "BUENAVENTURA",
          codigo_dane: "76109",
          mes: "3",
          anio: "2026",
          nivel_riesgo_predicho: "BAJO"
        }
      ]
    });
    const collection: FeatureCollection = await result;
    expect(collection.features).toHaveLength(1);
    expect(collection.features[0].properties?.["mes"]).toBe("3");
  });
  it("should request the next-month prediction from /prediction", async () => {
    const result = firstValueFrom(service.getPrediccionActual());
    http.expectOne((req: HttpRequest<unknown>) => req.url.endsWith("/prediction")).flush({
      response: [
        {
          municipio: "ALEJANDR\xCDA",
          codigo_dane: "05021",
          departamento: "ANTIOQUIA",
          mes: "9",
          anio: "2026",
          nivel_riesgo_predicho: "MEDIO",
          nivel_riesgo_real: "SIN_DATO"
        }
      ]
    });
    const collection: FeatureCollection = await result;
    expect(collection.features).toHaveLength(1);
    expect(collection.features[0].properties?.["mes"]).toBe("9");
    expect(collection.features[0].properties?.["nivel_riesgo_predicho"]).toBe("MEDIO");
  });
  it("should reject payloads that are not a FeatureCollection", async () => {
    const result = firstValueFrom(service.getDepartamentos());
    http.expectOne(isDepartments).flush({ something: "else" });
    await expect(result).rejects.toThrow(/FeatureCollection/);
  });
});
