import { Component, ViewEncapsulation, inject, output, signal } from "@angular/core";
import { DomSanitizer, SafeHtml } from "@angular/platform-browser";
import { marked } from "marked";
@Component({
  imports: [],
  selector: "app-diccionario",
  styleUrl: "./diccionario.css",
  templateUrl: "./diccionario.html",
  encapsulation: ViewEncapsulation.None,
})
export class Diccionario {
  private sanitize = inject(DomSanitizer);
  cerrarSolicitud = output();
  estado = signal<"cargando" | "listo" | "error">("cargando");
  contenido = signal<SafeHtml | null>(null);
  indice = signal<Array<{ id: string; texto: string }>>([]);
  seccionActiva = signal("");
  constructor() {
    this.cargar();
  }
  async cargar() {
    this.estado.set("cargando");
    this.indice.set([]);
    try {
      const respuesta = await fetch("diccionario/diccionario_datos.md");
      if (!respuesta.ok) {
        throw new Error(String(respuesta.status));
      }
      const markdown = await respuesta.text();
      const html = marked.parse(markdown, { async: false }) as string;
      // Envolver cada tabla para soportar scroll horizontal en pantallas estrechas
      const htmlTablas = html.replace(/<table>/g, '<div class="md-tabla"><table>').replace(/<\/table>/g, "</table></div>");
      this.contenido.set(this.sanitize.bypassSecurityTrustHtml(htmlTablas));
      this.estado.set("listo");
      // Construir el índice una vez que Angular pinta el HTML
      setTimeout(() => this.prepararIndice(), 0);
    } catch {
      this.estado.set("error");
    }
  }
  prepararIndice() {
    const documento = document.querySelector(".diccionario-md");
    if (!documento) {
      return void 0;
    }
    const capitulos = documento.querySelectorAll<HTMLElement>("h2");
    const lista = Array.from(capitulos).map((capitulo, i) => {
      const id = "seccion-" + i;
      capitulo.setAttribute("id", id);
      return { id, texto: (capitulo.textContent || "").trim() };
    });
    this.indice.set(lista);
  }
  irA(id) {
    const destino = document.getElementById(id);
    if (destino) {
      destino.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }
  onScrollDocumento($event) {
    const contenedor = $event?.target;
    if (!contenedor || !this.indice().length) {
      return;
    }
    const rasgo = 48;
    let activa = this.indice()[0]?.id ?? "";
    for (const item of this.indice()) {
      const nodo = document.getElementById(item.id);
      if (nodo && nodo.getBoundingClientRect().top - contenedor.getBoundingClientRect().top <= rasgo) {
        activa = item.id;
      }
    }
    this.seccionActiva.set(activa);
  }
}
