import { Component } from "@angular/core";
import { Themes } from "../../widgets/themes/themes";
@Component({
  imports: [Themes],
  selector: "app-header",
  styleUrl: "./header.css",
  templateUrl: "./header.html"
})
export class Header {
}
