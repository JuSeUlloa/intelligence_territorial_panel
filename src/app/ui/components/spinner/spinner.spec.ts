import { TestBed } from "@angular/core/testing";
import { Spinner } from "./spinner";
describe("Spinner", () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Spinner]
    }).compileComponents();
  });
  it("should create", () => {
    const fixture = TestBed.createComponent(Spinner);
    expect(fixture.componentInstance).toBeTruthy();
  });
  it("should render the label and the fa-spinner icon", () => {
    const fixture = TestBed.createComponent(Spinner);
    fixture.componentRef.setInput("label", "Cargando pol\xEDgonos\u2026");
    fixture.detectChanges();
    const el = fixture.nativeElement;
    expect(el.textContent).toContain("Cargando pol\xEDgonos\u2026");
    expect(el.querySelector(".fa-spinner")).toBeTruthy();
    expect(el.querySelector(".fa-spin")).toBeTruthy();
    expect(el.querySelector('[role="status"]')).toBeTruthy();
  });
  it("should render only the icon when the label is empty", () => {
    const fixture = TestBed.createComponent(Spinner);
    fixture.componentRef.setInput("label", "");
    fixture.detectChanges();
    const el = fixture.nativeElement;
    expect(el.querySelector(".fa-spinner")).toBeTruthy();
    expect(el.textContent?.trim()).toBe("");
    expect(el.querySelector('[role="status"]')?.getAttribute("aria-label")).toBe("Cargando");
  });
  it("should apply size classes", () => {
    const fixture = TestBed.createComponent(Spinner);
    const icon = () => fixture.nativeElement.querySelector(".fa-spinner");
    fixture.componentRef.setInput("size", "sm");
    fixture.detectChanges();
    expect(icon().classList).toContain("text-sm");
    fixture.componentRef.setInput("size", "lg");
    fixture.detectChanges();
    expect(icon().classList).toContain("text-4xl");
    const root = fixture.nativeElement.querySelector('[role="status"]');
    expect(root.classList).toContain("flex-col");
  });
});
