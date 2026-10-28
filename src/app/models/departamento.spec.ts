import { Departamento } from "./departamento";
describe("Departamento", () => {
  it("should map the real API row (municipality shape)", () => {
    const fila = Departamento.from({
      codigo_dane: 5001,
      municipio: "Medell\xEDn",
      codigo_departamento: "05",
      departamento_nombre: "ANTIOQUIA",
      geometry: '{"type":"Point","coordinates":[-75.56,6.25]}'
    });
    expect(fila).not.toBeNull();
    expect(fila.codigo_dane).toBe(5001);
    expect(fila.municipio).toBe("Medell\xEDn");
    expect(fila.codigo_departamento).toBe("05");
    expect(fila.departamento_nombre).toBe("ANTIOQUIA");
    expect(fila.geometry).toContain("Point");
  });
  it("should fill missing fields with empty defaults", () => {
    const fila = Departamento.from({ departamento_nombre: "AMAZONAS", codigo_departamento: 91 });
    expect(fila.municipio).toBe("");
    expect(fila.codigo_dane).toBe("");
    expect(fila.geometry).toBe("");
    expect(fila.departamento_nombre).toBe("AMAZONAS");
    expect(String(fila.codigo_departamento)).toBe("91");
  });
  it("should return null for items that are not objects", () => {
    expect(Departamento.from(null)).toBeNull();
    expect(Departamento.from(void 0)).toBeNull();
    expect(Departamento.from("geojson")).toBeNull();
    expect(Departamento.from(7)).toBeNull();
  });
});
