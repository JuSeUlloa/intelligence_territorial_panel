import { TestBed } from "@angular/core/testing";
import { App } from "./app";
import { ThemeService } from "./services/theme.service";
describe("App", () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App]
    }).compileComponents();
  });
  it("should create the app", () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });
  it("should render the header title", async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement;
    expect(compiled.textContent).toContain("Metodologia de Inteligencia Territorial");
  });
  it("should toggle between light and dark themes", async () => {
    const fixture = TestBed.createComponent(App);
    const theme = TestBed.inject(ThemeService);
    const root = document.documentElement;
    const initial = theme.isDark();
    theme.toggle();
    await fixture.whenStable();
    expect(theme.isDark()).toBe(!initial);
    expect(root.classList.contains("dark")).toBe(!initial);
    theme.toggle();
    await fixture.whenStable();
    expect(theme.isDark()).toBe(initial);
    expect(root.classList.contains("dark")).toBe(initial);
  });
});
