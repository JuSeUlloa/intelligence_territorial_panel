import { Component, HostListener, inject, signal } from "@angular/core";
import { ThemeService } from "../../../services/theme.service";
@Component({
  imports: [],
  selector: "app-themes",
  styleUrl: "./themes.css",
  templateUrl: "./themes.html"
})
export class Themes {
  theme = inject(ThemeService);
  open = signal(false);
  modes = [
    { value: "light", label: "Claro" },
    { value: "dark", label: "Oscuro" },
    { value: "system", label: "Sistema" }
  ];
      previewValue = signal(66);
    previewAction = signal("none");
  feedbackTimer;
    simulateValue() {
    this.previewValue.set(15 + Math.floor(Math.random() * 81));
  }
    onPreviewAction(action) {
    this.previewAction.set(action);
    if (this.feedbackTimer) {
      clearTimeout(this.feedbackTimer);
    }
    this.feedbackTimer = setTimeout(() => this.previewAction.set("none"), 1600);
  }
  accentColor(accent) {
    return this.theme.isDark() ? accent.dark : accent.light;
  }
  toggle() {
    this.open.update((value) => !value);
    this.syncScrollLock();
  }
  close() {
    if (this.open()) {
      this.open.set(false);
      this.syncScrollLock();
    }
  }
  @HostListener("document:keydown.escape")
  onEscape() {
    this.close();
  }
  ngOnDestroy() {
    if (this.feedbackTimer) {
      clearTimeout(this.feedbackTimer);
    }
    if (typeof document !== "undefined") {
      document.body.style.overflow = "";
    }
  }
  syncScrollLock() {
    if (typeof document !== "undefined") {
      document.body.style.overflow = this.open() ? "hidden" : "";
    }
  }
}
