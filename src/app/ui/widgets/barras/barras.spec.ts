import { TestBed } from "@angular/core/testing";
import { Barras } from "./barras";
import type { BarraDatos } from "./barras";
describe("Barras", () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Barras]
    }).compileComponents();
  });
  const fila = (etiqueta: string, rank: number | null): BarraDatos => ({ etiqueta, rank });
  it("should create", () => {
    const fixture = TestBed.createComponent(Barras);
    expect(fixture.componentInstance).toBeTruthy();
  });
  it("should render one column per territory", () => {
    const fixture = TestBed.createComponent(Barras);
    fixture.componentInstance.datos = [
      fila("ANTIOQUIA", 1),
      fila("VALLE", 0.5),
      fila("AMAZONAS", 0),
      fila("SIN DATO", null)
    ];
    fixture.detectChanges();
    const root = fixture.nativeElement;
    const contenedor = root.querySelector('div[role="img"]') as HTMLElement;
    expect(contenedor.children).toHaveLength(4);
  });
  it("should size the bars by the risk rank (0\u20131 \u2192 %)", () => {
    const fixture = TestBed.createComponent(Barras);
    fixture.componentInstance.datos = [
      fila("ALTO", 1),
      fila("MEDIO", 0.5),
      fila("BAJO", 0),
      fila("sd", null)
    ];
    fixture.detectChanges();
    const root = fixture.nativeElement;
    const contenedor = root.querySelector('div[role="img"]') as HTMLElement;
    const barras = contenedor.querySelectorAll<HTMLElement>('div[style*="height"]');
    expect(barras[0].style.height).toBe("100%");
    expect(barras[1].style.height).toBe("50%");
    expect(barras[2].style.height).toBe("0%");
    expect(barras[3].style.height).toBe("0%");
  });
  it("should color the bars with the accent gradient stops", () => {
    const fixture = TestBed.createComponent(Barras);
    fixture.componentInstance.colores = ["#111111", "#222222", "#333333"];
    fixture.componentInstance.datos = [fila("ALTO", 1), fila("sd", null)];
    fixture.detectChanges();
    const root = fixture.nativeElement;
    const contenedor = root.querySelector('div[role="img"]') as HTMLElement;
    const barras = contenedor.querySelectorAll<HTMLElement>('div[style*="background"]');
    expect(barras[0].style.background).toContain("51");
    expect(barras[1].style.background).toContain("148");
  });
  it("should segment the risk level over each bar (Alto/Medio/Bajo)", () => {
    const fixture = TestBed.createComponent(Barras);
    fixture.componentInstance.colores = ["#111111", "#222222", "#333333"];
    fixture.componentInstance.datos = [
      fila("ALTO", 1),
      fila("MEDIO", 0.5),
      fila("BAJO", 0.1),
      fila("sd", null)
    ];
    fixture.detectChanges();
    const root = fixture.nativeElement;
    const contenedor = root.querySelector('div[role="img"]') as HTMLElement;
    const niveles = Array.from(contenedor.querySelectorAll<HTMLElement>('span[style*="bottom"]')).map(
      (el) => el.textContent?.trim()
    );
    expect(niveles).toEqual(["Alto", "Medio", "Bajo"]);
    expect(niveles).not.toContain("");
  });
  it("should stack bars as the SUM per risk level (bajo at the base)", () => {
    const fixture = TestBed.createComponent(Barras);
    fixture.componentInstance.colores = ["#111111", "#222222", "#333333"];
    fixture.componentInstance.datos = [
      { etiqueta: "ANTIOQUIA", rank: 0.625, desglose: { bajo: 6, medio: 4, alto: 2 } },
      { etiqueta: "SIN DATO", rank: null, desglose: null }
    ];
    fixture.detectChanges();
    const root = fixture.nativeElement;
    const contenedor = root.querySelector('div[role="img"]') as HTMLElement;
    const barras = contenedor.querySelectorAll<HTMLElement>('div[style*="background"]');
    expect(parseFloat(barras[0].style.height)).toBeCloseTo(50, 1);
    expect(parseFloat(barras[1].style.height)).toBeCloseTo(33.3, 1);
    expect(parseFloat(barras[2].style.height)).toBeCloseTo(16.7, 1);
    expect(barras[0].style.background).toContain("17");
    expect(root.textContent).toContain("12");
    expect(root.textContent).toContain("6");
    const encima = Array.from(contenedor.querySelectorAll<HTMLElement>('span[style*="bottom"]')).map(
      (el) => el.textContent?.trim()
    );
    expect(encima).toEqual(["12"]);
  });
  it("should order the columns by risk descending (no-data last)", () => {
    const fixture = TestBed.createComponent(Barras);
    fixture.componentInstance.datos = [
      fila("BAJO", 0),
      fila("SD", null),
      fila("ALTO", 1),
      fila("MEDIO", 0.5)
    ];
    fixture.detectChanges();
    const root = fixture.nativeElement;
    const contenedor = root.querySelector('div[role="img"]') as HTMLElement;
    const titulos = Array.from(contenedor.children as unknown as HTMLElement[]).map((el: HTMLElement) => el.getAttribute("title"));
    expect(titulos[0]).toContain("ALTO");
    expect(titulos[1]).toContain("MEDIO");
    expect(titulos[2]).toContain("BAJO");
    expect(titulos[3]).toContain("SD");
  });
  it("should show the empty state without territories", () => {
    const fixture = TestBed.createComponent(Barras);
    fixture.componentInstance.datos = [];
    fixture.detectChanges();
    const root = fixture.nativeElement;
    expect(root.textContent).toContain("Sin territorios para graficar");
  });
  it("should label the x axis according to the active map level", () => {
    const fixture = TestBed.createComponent(Barras);
    fixture.componentInstance.vista = "municipio";
    fixture.detectChanges();
    const root = fixture.nativeElement;
    expect(root.textContent).toContain("Eje X: municipios del nivel activo");
  });
  it("should list a limited number of columns with the internal filter (default 10)", () => {
    const fixture = TestBed.createComponent(Barras);
    fixture.componentInstance.datos = Array.from(
      { length: 25 },
      (_, i) => fila(`DEPT ${i}`, i / 25)
    );
    fixture.detectChanges();
    const root = fixture.nativeElement;
    const contenedor = root.querySelector('div[role="img"]') as HTMLElement;
    expect(contenedor.children).toHaveLength(10);
    const columnas = contenedor.querySelectorAll<HTMLElement>('button[style*="width"]');
    expect(columnas[0].style.width).toBe("10%");
  });
  it("should thicken the bars proportionally with the internal filter", () => {
    const fixture = TestBed.createComponent(Barras);
    fixture.componentInstance.datos = Array.from(
      { length: 25 },
      (_, i) => fila(`DEPT ${i}`, i / 25)
    );
    fixture.detectChanges();
    const root = fixture.nativeElement;
    const contenedor = root.querySelector('div[role="img"]') as HTMLElement;
    const banda = contenedor.querySelector<HTMLElement>('button[style*="width"] div[style*="width"]')!;
    expect(banda.style.width).toBe("30%");
  });
  it('should show all columns when the internal filter is "todos"', () => {
    const fixture = TestBed.createComponent(Barras);
    fixture.componentInstance.datos = Array.from(
      { length: 25 },
      (_, i) => fila(`DEPT ${i}`, i / 25)
    );
    fixture.detectChanges();
    const el = fixture.nativeElement;
    const filtro = el.querySelector('select[aria-label="Cantidad de territorios en el gr\xE1fico"]');
    filtro.value = "todos";
    filtro.dispatchEvent(new Event("change"));
    fixture.detectChanges();
    const contenedor = el.querySelector('div[role="img"]');
    expect(contenedor.children).toHaveLength(25);
  });
  it("should order department bars by the TOTAL sum (mayor a menor)", () => {
    const fixture = TestBed.createComponent(Barras);
    fixture.componentInstance.datos = [
      { etiqueta: "MENOR", rank: 0.9, desglose: { bajo: 2, medio: 1, alto: 0 } },
            { etiqueta: "MAYOR", rank: 0.3, desglose: { bajo: 1, medio: 1, alto: 4 } },
            { etiqueta: "MEDIO", rank: 0.5, desglose: null }
    ];
    fixture.detectChanges();
    const root = fixture.nativeElement;
    const contenedor = root.querySelector('div[role="img"]') as HTMLElement;
    const titulos = Array.from(contenedor.children as unknown as HTMLElement[]).map((el: HTMLElement) => el.getAttribute("title"));
    expect(titulos[0]).toContain("MAYOR");
    expect(titulos[1]).toContain("MENOR");
    expect(titulos[2]).toContain("MEDIO");
  });
  it("should open a popup with the territory info on bar click", () => {
    const fixture = TestBed.createComponent(Barras);
    fixture.componentInstance.colores = ["#111111", "#222222", "#333333"];
    fixture.componentInstance.datos = [
      {
        etiqueta: "Aparatado",
        departamento: "ANTIOQUIA",
        rank: 0.6,
        desglose: { bajo: 5, medio: 3, alto: 1 }
      }
    ];
    fixture.detectChanges();
    const root = fixture.nativeElement;
    expect(root.querySelector("[data-popup-barras]")).toBeNull();
    const columna = root.querySelector(".columna-barras");
    columna.click();
    fixture.detectChanges();
    const detalle = root.querySelector("[data-popup-barras]");
    expect(detalle).toBeTruthy();
    expect(detalle.textContent).toContain("Aparatado");
    expect(detalle.textContent).toContain("ANTIOQUIA");
    expect(detalle.textContent).toContain("Alto");
    expect(detalle.textContent).toContain("1");
    columna.click();
    fixture.detectChanges();
    expect(root.querySelector("[data-popup-barras]")).toBeNull();
  });
  it("should open the detail popup on HOVER and close on mouseleave", () => {
    const fixture = TestBed.createComponent(Barras);
    fixture.componentInstance.datos = [
      { etiqueta: "ANTIOQUIA", rank: 0.8, desglose: { bajo: 3, medio: 2, alto: 1 } }
    ];
    fixture.detectChanges();
    const root = fixture.nativeElement;
    const columna = root.querySelector(".columna-barras");
    expect(root.querySelector("[data-popup-barras]")).toBeNull();
    columna.dispatchEvent(new MouseEvent("mouseenter", { clientX: 40, clientY: 60 }));
    fixture.detectChanges();
    expect(root.querySelector("[data-popup-barras]")).toBeTruthy();
    columna.dispatchEvent(new Event("mouseleave"));
    fixture.detectChanges();
    expect(root.querySelector("[data-popup-barras]")).toBeNull();
  });
  it("should show the risk levels legend with the accent gradient", () => {
    const fixture = TestBed.createComponent(Barras);
    fixture.componentInstance.colores = ["#111111", "#222222", "#333333"];
    fixture.componentInstance.datos = [fila("ALTO", 1)];
    fixture.detectChanges();
    const root = fixture.nativeElement;
    expect(root.textContent).toContain("Bajo");
    expect(root.textContent).toContain("Alto");
    const leyenda = root.querySelector('span[style*="linear-gradient"]');
    expect(leyenda.style.background).toContain("rgb(34, 34, 34)");
  });
});
