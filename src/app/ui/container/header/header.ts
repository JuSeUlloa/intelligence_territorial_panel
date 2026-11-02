import { Component } from "@angular/core";
import { Config } from "../../widgets/config/config";
import { Themes } from "../../widgets/themes/themes";
@Component({
  imports: [Config, Themes],
  selector: "app-header",
  styleUrl: "./header.css",
  templateUrl: "./header.html"
})
export class Header {
}
