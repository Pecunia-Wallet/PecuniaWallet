import {Component} from "@angular/core";
import {WindowComponent} from "../../window/window.component";
import {MenuComponent} from "../menu/menu.component";
import {ActivatedRoute} from "@angular/router";

@Component({
    selector: "app-sidebar",
    standalone: true,
    imports: [
        MenuComponent
    ],
    templateUrl: "./sidebar.component.html",
    styleUrl: "./sidebar.component.scss"
})
export class SidebarComponent {

    constructor(protected window: WindowComponent,
                protected route: ActivatedRoute) {
    }

}
