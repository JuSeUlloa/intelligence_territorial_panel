import { Component, HostListener, inject, signal } from "@angular/core";
import { ConfigService } from "../../../services/config.service";
import { Pipeline } from "../pipeline/pipeline";
import { Diccionario } from "../diccionario/diccionario";
import { Arquitectura } from "../arquitecturas/arquitecturas";
@Component({
  imports: [Pipeline, Diccionario, Arquitectura],
  selector: "app-config",
  styleUrl: "./config.css",
  templateUrl: "./config.html"
})
export class Config {
  config = inject(ConfigService);
  open = signal(false);
  vista = signal<"nada" | "pipeline" | "diccionario" | "arquitecturas">("nada");
  abrirDocumento(x) {
    if (x === "pipeline" || x === "diccionario" || x === "arquitecturas") {
      this.vista.set(x);
    }
    this.syncScrollLock();
  }
  cerrarDocumento() {
    this.vista.set("nada");
    this.syncScrollLock();
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
    if (this.vista() !== "nada") {
      this.cerrarDocumento();
    } else {
      this.close();
    }
  }
  ngOnDestroy() {
    if (typeof document !== "undefined") {
      document.body.style.overflow = "";
    }
  }
  syncScrollLock() {
    if (typeof document !== "undefined") {
      document.body.style.overflow = this.open() || this.vista() !== "nada" ? "hidden" : "";
    }
  }
}
