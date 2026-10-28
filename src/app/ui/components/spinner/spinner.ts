import { Component, input } from "@angular/core";
@Component({
  imports: [],
  selector: "app-spinner",
  styleUrl: "./spinner.css",
  templateUrl: "./spinner.html"
})
export class Spinner {
    label = input("Cargando\u2026");
    size = input("md");
}
