import { TestBed } from "@angular/core/testing";
import { Kpi } from "./kpi";
describe("Kpi", () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Kpi]
    }).compileComponents();
  });
  it("should create", () => {
    const fixture = TestBed.createComponent(Kpi);
    expect(fixture.componentInstance).toBeTruthy();
  });
  it("should render the 5 KPI cards", () => {
    const fixture = TestBed.createComponent(Kpi);
    fixture.componentInstance.kpis = {
      municipios: 734,
      hurtos: 1234,
      tasaMedia: 11.5,
      mae: 0.6,
      sinMae: false,
      riesgosAltos: 40
    };
    fixture.detectChanges();
    const root = fixture.nativeElement;
    const cards = Array.from(root.children[0].children);
    expect(cards).toHaveLength(5);
    expect(root.textContent).toContain("Municipios");
    expect(root.textContent).toContain("Hurtos");
    expect(root.textContent).toContain("Riesgo ALTO");
  });
  it("should show \u2014 on the MAE card and Total hurto in the next-month view", () => {
    const fixture = TestBed.createComponent(Kpi);
    fixture.componentInstance.kpis = {
      municipios: 1101,
      hurtos: 1234,
      tasaMedia: 10,
      mae: 0,
      sinMae: true,
      riesgosAltos: 162
    };
    fixture.detectChanges();
    const root = fixture.nativeElement;
    expect(root.textContent).toContain("\u2014");
    expect(root.textContent).toContain("MAE (pr\xF3x. mes)");
    expect(root.textContent).toContain("Tasa promedio");
    expect(root.textContent).not.toContain("Total hurto");
  });
  it("should format the values with es-CO conventions", () => {
    const fixture = TestBed.createComponent(Kpi);
    fixture.componentInstance.kpis = {
      municipios: 734,
      hurtos: 1234,
      tasaMedia: 11.5,
      mae: 0.6,
      sinMae: false,
      riesgosAltos: 40
    };
    fixture.detectChanges();
    const root = fixture.nativeElement;
    expect(root.textContent).toContain("734");
    expect(root.textContent).toContain("1.234");
    expect(root.textContent).toContain("11,50");
    expect(root.textContent).toContain("0,60");
    expect(root.textContent).toContain("40");
  });
  it("should show zeros before any data", () => {
    const fixture = TestBed.createComponent(Kpi);
    fixture.detectChanges();
    const root = fixture.nativeElement;
    expect(root.textContent.match(/0/g)?.length).toBeGreaterThanOrEqual(5);
  });
});
