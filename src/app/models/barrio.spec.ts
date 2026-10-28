import { Barrio } from "./barrio";
describe("Barrio", () => {
  const feature = (properties: Record<string, unknown>) => ({ type: "Feature" as const, geometry: null, properties });
  it("should map a /neighborhood feature", () => {
    const model = Barrio.from(
      feature({ barrio: "CABAL POMBO", codigo_dane: "76109", id_barrio: "abc" })
    );
    expect(model).not.toBeNull();
    expect(model.barrio).toBe("CABAL POMBO");
    expect(model.codigo_dane).toBe("76109");
    expect(model.id_barrio).toBe("abc");
  });
  it("should return null when the feature has no name", () => {
    expect(Barrio.from(feature({ codigo_dane: "76109" }))).toBeNull();
  });
});
