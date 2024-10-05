import {Component} from "@angular/core";
import {FaIconComponent} from "@fortawesome/angular-fontawesome";
import {FiatSelectorComponent} from "../../fiat-selector/fiat-selector.component";
import {AsyncPipe, CurrencyPipe, NgForOf, NgIf, NgOptimizedImage, NgTemplateOutlet} from "@angular/common";
import {ApplyDirective} from "../../../directives/apply.directive";
import {NgVarDirective} from "../../../directives/ng-var.directive";
import {OverviewComponent} from "../overview/overview.component";
import {FloatBarComponent} from "../../window/float-bar/float-bar.component";
import {WindowComponent} from "../../window/window.component";
import {MenuComponent} from "../menu/menu.component";
import {ActivatedRoute} from "@angular/router";

@Component({
    selector: "app-sidebar",
    standalone: true,
    imports: [
        FaIconComponent,
        FiatSelectorComponent,
        NgForOf,
        AsyncPipe,
        NgOptimizedImage,
        NgIf,
        ApplyDirective,
        NgVarDirective,
        CurrencyPipe,
        NgTemplateOutlet,
        OverviewComponent,
        FloatBarComponent,
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
