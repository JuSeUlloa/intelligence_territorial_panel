import { Prediccion } from "./prediccion";
describe("Prediccion", () => {
  const raw = {
    municipio: "BUENAVENTURA",
    codigo_dane: "76109",
    departamento: "VALLE DEL CAUCA",
    mes: "1",
    anio: "2026",
    tasa_predicha: "12.5",
    tasa_real: "11.1",
    total_tematica: "3",
    tematica_mes_anterior: "4",
    pob_dane_2025: "400000",
    error: "-1.4",
    abs_error: "1.4",
    sq_error: "1.96",
    ape_pct: "12.6",
    nivel_riesgo_real: "MEDIO",
    nivel_riesgo_predicho: "ALTO",
    p_25: "9.1",
    p_50: "12.4",
    p_75: "16.2"
  };
  it("should map a raw /gold row (numbers serialized as strings)", () => {
    const model = Prediccion.from(raw);
    expect(model).not.toBeNull();
    expect(model.municipio).toBe("BUENAVENTURA");
    expect(model.codigo_dane).toBe(76109);
    expect(model.anio).toBe(2026);
    expect(model.mes).toBe(1);
    expect(model.tasa_predicha).toBe(12.5);
    expect(model.nivel_riesgo_predicho).toBe("ALTO");
    expect(model.nivel_riesgo_real).toBe("MEDIO");
  });
  it("should return null when codigo_dane is missing or unusable", () => {
    expect(Prediccion.from(null)).toBeNull();
    expect(Prediccion.from("no-object")).toBeNull();
    expect(Prediccion.from({ municipio: "SIN CODIGO" })).toBeNull();
    expect(Prediccion.from({ codigo_dane: "abc" })).toBeNull();
  });
  it("should default missing numeric fields to 0", () => {
    const model = Prediccion.from({ codigo_dane: "91001", municipio: "LETICIA" });
    expect(model.anio).toBe(0);
    expect(model.tasa_predicha).toBe(0);
    expect(model.nivel_riesgo_predicho).toBe("");
  });
  it("should scale the risk levels for the gradient (0\u20131)", () => {
    expect(Prediccion.riesgoEscala("BAJO")).toBe(0);
    expect(Prediccion.riesgoEscala("MEDIO")).toBe(0.5);
    expect(Prediccion.riesgoEscala("ALTO")).toBe(1);
    expect(Prediccion.riesgoEscala("medio")).toBe(0.5);
    expect(Prediccion.riesgoEscala("CRITICO")).toBeNull();
    expect(Prediccion.riesgoEscala(null)).toBeNull();
    expect(Prediccion.riesgoEscala(void 0)).toBeNull();
  });
});
