import { Component, DOCUMENT, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  imports: [RouterLink],
  selector: 'app-empy-page',
  styleUrl: './empy-page.css',
  templateUrl: './empy-page.html'
})
export class EmpyPage {
  private readonly ventana = inject(DOCUMENT).defaultView;
  /** Ruta que no coincidió con ninguna vista (informativa). */
  ruta(): string {
    const valor = this.ventana?.location.pathname ?? '';
    return valor || null;
  }
  recargar(): void {
    this.ventana?.location.reload();
  }
}
