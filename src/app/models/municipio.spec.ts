import { Municipio } from "./municipio";
describe("Municipio", () => {
  const feature = (properties: Record<string, unknown>) => ({ type: "Feature" as const, geometry: null, properties });
  it("should relate a /municipality feature with its model", () => {
    const model = Municipio.from(
      feature({ codigo_dane: "76109", municipio: "BUENAVENTURA", codigo_departamento: "76" })
    );
    expect(model).not.toBeNull();
    expect(model.codigo_dane).toBe("76109");
    expect(model.municipio).toBe("BUENAVENTURA");
  });
  it("should return null when the feature has no DANEC code", () => {
    expect(Municipio.from(feature({ municipio: "SIN CODIGO" }))).toBeNull();
    expect(Municipio.from(feature({ codigo_dane: "  ", municipio: "VACIO" }))).toBeNull();
  });
});
