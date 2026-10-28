import { TestBed } from "@angular/core/testing";
import { Filters } from "./filters";
describe("Filters", () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Filters]
    }).compileComponents();
  });
  it("should create", () => {
    const fixture = TestBed.createComponent(Filters);
    expect(fixture.componentInstance).toBeTruthy();
  });
  it("should emit the default filters when applying (last available month)", () => {
    const fixture = TestBed.createComponent(Filters);
    fixture.detectChanges();
    let captured;
    fixture.componentInstance.applyFilters.subscribe((value) => captured = value);
    const root: HTMLElement = fixture.nativeElement as HTMLElement;
    const apply = Array.from(root.querySelectorAll("button")).find(
      (b: HTMLElement) => b.textContent?.includes("Aplicar")
    );
    apply.click();
    expect(captured).toEqual({ mes: null, riesgo: "todo" });
  });
  it("should emit the selected month and risk level with the applied badge", () => {
    const fixture = TestBed.createComponent(Filters);
    fixture.componentInstance.meses = [1, 2, 3];
    fixture.detectChanges();
    const root: HTMLElement = fixture.nativeElement as HTMLElement;
    const mesSelect = root.querySelectorAll<HTMLSelectElement>("select")[0];
    const riesgoSelect = root.querySelectorAll("select")[1];
    mesSelect.value = "3";
    mesSelect.dispatchEvent(new Event("change"));
    riesgoSelect.value = "ALTO";
    riesgoSelect.dispatchEvent(new Event("change"));
    fixture.detectChanges();
    let captured;
    fixture.componentInstance.applyFilters.subscribe((value) => captured = value);
    const apply = Array.from(root.querySelectorAll("button")).find(
      (b: HTMLElement) => b.textContent?.includes("Aplicar")
    );
    apply.click();
    fixture.detectChanges();
    expect(captured).toEqual({ mes: 3, riesgo: "ALTO" });
    expect(root.textContent).toContain("Filtros aplicados");
  });
  it("should not render a zone filter", () => {
    const fixture = TestBed.createComponent(Filters);
    fixture.detectChanges();
    const root: HTMLElement = fixture.nativeElement as HTMLElement;
    expect(root.textContent).not.toContain("Zona");
    expect(root.querySelectorAll("select")).toHaveLength(2);
  });
  it("should toggle the next-month prediction button (highlighted)", () => {
    const fixture = TestBed.createComponent(Filters);
    fixture.detectChanges();
    const root: HTMLElement = fixture.nativeElement as HTMLElement;
    const boton = Array.from(root.querySelectorAll("button")).find(
      (b: HTMLElement) => b.textContent?.includes("Mes en Curso")
    );
    expect(boton).toBeTruthy();
    expect(boton.getAttribute("aria-pressed")).toBe("false");
    expect(boton.className).toContain("btn-secondary");
    let toggles = 0;
    fixture.componentInstance.togglePrediccion.subscribe(() => toggles += 1);
    boton.click();
    fixture.detectChanges();
    expect(toggles).toBe(1);
  });
  it("should highlight the prediction button when the panel shows /prediction", () => {
    const fixture = TestBed.createComponent(Filters);
    fixture.componentInstance.verPrediccion = true;
    fixture.detectChanges();
    const root: HTMLElement = fixture.nativeElement as HTMLElement;
    const boton = Array.from(root.querySelectorAll("button")).find(
      (b: HTMLElement) => b.textContent?.includes("Mes en Curso")
    );
    expect(boton.getAttribute("aria-pressed")).toBe("true");
    expect(boton.className).toContain("btn-primary");
  });
  it("should list the months from the predictions with Spanish names", () => {
    const fixture = TestBed.createComponent(Filters);
    fixture.componentInstance.meses = [1, 2];
    fixture.detectChanges();
    const root: HTMLElement = fixture.nativeElement as HTMLElement;
    const mesSelect = root.querySelectorAll<HTMLSelectElement>("select")[0];
    expect(mesSelect.textContent).toContain("\xDAltimo disponible");
    expect(mesSelect.textContent).toContain("Enero");
    expect(mesSelect.textContent).toContain("Febrero");
  });
  it("should collapse and expand the filters with the mobile toggle", () => {
    const fixture = TestBed.createComponent(Filters);
    fixture.componentInstance.meses = [1];
    fixture.detectChanges();
    const root: HTMLElement = fixture.nativeElement as HTMLElement;
    const toggle = root.querySelector<HTMLButtonElement>("button[aria-expanded]")!;
    expect(toggle).toBeTruthy();
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    toggle.click();
    fixture.detectChanges();
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    toggle.click();
    fixture.detectChanges();
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
  });
  it("should reset to the full /gold state when cleaning", () => {
    const fixture = TestBed.createComponent(Filters);
    fixture.componentInstance.meses = [1, 2];
    fixture.detectChanges();
    const root: HTMLElement = fixture.nativeElement as HTMLElement;
    const mesSelect = root.querySelectorAll<HTMLSelectElement>("select")[0];
    mesSelect.value = "2";
    mesSelect.dispatchEvent(new Event("change"));
    fixture.detectChanges();
    const resetPromise = new Promise<void>(
      (resolve) => fixture.componentInstance.resetFilters.subscribe(() => resolve())
    );
    const clean = Array.from(root.querySelectorAll<HTMLButtonElement>("button")).find(
      (b: HTMLElement) => b.textContent?.includes("Limpiar")
    );
    clean.click();
    fixture.detectChanges();
    return resetPromise.then(() => {
      expect(mesSelect.value).toBe("");
      expect(root.textContent).not.toContain("Filtros aplicados");
    });
  });
});
