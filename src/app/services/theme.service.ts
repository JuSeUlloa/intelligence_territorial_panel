import { Injectable, computed, effect, signal } from "@angular/core";
export const ACCENTS = [
  { id: "indigo", label: "\xCDndigo", light: "oklch(0.55 0.2 265)", dark: "oklch(0.65 0.19 265)" },
  { id: "blue", label: "Azul", light: "oklch(0.55 0.19 250)", dark: "oklch(0.65 0.18 250)" },
  { id: "teal", label: "Verde azulado", light: "oklch(0.55 0.15 195)", dark: "oklch(0.7 0.13 195)" },
  { id: "emerald", label: "Esmeralda", light: "oklch(0.55 0.15 160)", dark: "oklch(0.7 0.15 160)" },
  { id: "amber", label: "\xC1mbar", light: "oklch(0.62 0.16 75)", dark: "oklch(0.78 0.15 80)" },
  { id: "rose", label: "Rosado", light: "oklch(0.55 0.2 15)", dark: "oklch(0.65 0.19 15)" },
  { id: "violet", label: "Violeta", light: "oklch(0.52 0.2 300)", dark: "oklch(0.65 0.19 300)" }
];
const THEME_STORAGE_KEY = "itp-theme";
const ACCENT_STORAGE_KEY = "itp-accent";
const DEFAULT_ACCENT = "indigo";
const DARK_MEDIA_QUERY = "(prefers-color-scheme: dark)";
@Injectable({ providedIn: "root" })
export class ThemeService {
  _mode = signal(readStoredMode());
  _accentId = signal(readStoredAccent());
  _systemDark = signal(false);
  firstRun = true;
  mode = this._mode.asReadonly();
  accentId = this._accentId.asReadonly();
  accents = ACCENTS;
  resolvedTheme = computed(() => {
    const mode = this._mode();
    if (mode !== "system") {
      return mode;
    }
    return this._systemDark() ? "dark" : "light";
  });
  isDark = computed(() => this.resolvedTheme() === "dark");
    accentColor = computed(() => {
    const accent = ACCENTS.find((a) => a.id === this._accentId()) ?? ACCENTS[0];
    return this.isDark() ? accent.dark : accent.light;
  });
  constructor() {
    if (typeof window !== "undefined" && typeof window.matchMedia === "function") {
      const mq = window.matchMedia(DARK_MEDIA_QUERY);
      this._systemDark.set(mq.matches);
      mq.addEventListener("change", (event) => this._systemDark.set(event.matches));
    }
    effect(() => {
      this._mode();
      const accentId = this._accentId();
      const dark = this.isDark();
      applyDocumentTheme(dark);
      this.applyAccent(dark, accentId);
      if (this.firstRun) {
        this.firstRun = false;
        return;
      }
      try {
        localStorage.setItem(THEME_STORAGE_KEY, this._mode());
        localStorage.setItem(ACCENT_STORAGE_KEY, accentId);
      } catch {
      }
    });
  }
  setMode(mode) {
    this._mode.set(mode);
  }
  toggle() {
    this.setMode(this.isDark() ? "light" : "dark");
  }
  setAccent(accentId) {
    if (ACCENTS.some((accent) => accent.id === accentId)) {
      this._accentId.set(accentId);
    }
  }
  reset() {
    this.setMode("system");
    this.setAccent(DEFAULT_ACCENT);
  }
  applyAccent(dark, accentId) {
    if (typeof document === "undefined") {
      return;
    }
    const style = document.documentElement.style;
    const variables = ["--primary", "--primary-hover", "--primary-active", "--primary-soft", "--primary-fg"];
    if (accentId === DEFAULT_ACCENT) {
      variables.forEach((variable) => style.removeProperty(variable));
      return;
    }
    const accent = ACCENTS.find((a) => a.id === accentId) ?? ACCENTS[0];
    const base = dark ? accent.dark : accent.light;
    style.setProperty("--primary", base);
    style.setProperty("--primary-hover", `color-mix(in oklab, ${base}, black 12%)`);
    style.setProperty("--primary-active", `color-mix(in oklab, ${base}, black 22%)`);
    style.setProperty("--primary-soft", `color-mix(in oklab, ${base} 14%, transparent)`);
    style.setProperty(
      "--primary-fg",
      oklchLightness(base) > 0.6 ? "oklch(0.2 0.02 265)" : "oklch(1 0 0)"
    );
  }
}
function applyDocumentTheme(dark) {
  if (typeof document === "undefined") {
    return;
  }
  const root = document.documentElement;
  root.classList.toggle("dark", dark);
  root.style.colorScheme = dark ? "dark" : "light";
}
function oklchLightness(color) {
  const match = /oklch\(\s*([\d.]+)/i.exec(color);
  return match ? Number.parseFloat(match[1]) : 0;
}
function readStoredMode() {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === "light" || stored === "dark" || stored === "system") {
      return stored;
    }
  } catch {
  }
  return "system";
}
function readStoredAccent() {
  try {
    const stored = localStorage.getItem(ACCENT_STORAGE_KEY);
    if (stored && ACCENTS.some((accent) => accent.id === stored)) {
      return stored;
    }
  } catch {
  }
  return DEFAULT_ACCENT;
}
