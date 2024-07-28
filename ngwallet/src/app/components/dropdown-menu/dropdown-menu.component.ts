import {AfterViewInit, Component, ElementRef, HostBinding, Input} from "@angular/core";
import {IconProp} from "@fortawesome/angular-fontawesome/types";
import {NgForOf, NgIf, NgOptimizedImage} from "@angular/common";
import {FaIconComponent} from "@fortawesome/angular-fontawesome";
import _default from "chart.js/dist/plugins/plugin.tooltip";
import {server} from "../../app.config";

export interface MenuItem {
    text: string;
    icon?: IconProp | string;
    iconColor?: string;
    onClick?: () => void;
}

@Component({
    selector: "app-dropdown-menu",
    standalone: true,
    imports: [
        NgForOf,
        FaIconComponent,
        NgIf,
        NgOptimizedImage
    ],
    templateUrl: "./dropdown-menu.component.html",
    styleUrl: "./dropdown-menu.component.scss"
})
export class DropdownMenuComponent implements AfterViewInit {

    @HostBinding("class.active") @Input() active: boolean;

    @Input() items: MenuItem[];

    constructor(private ref: ElementRef) {}

    protected isIconProp(src: MenuItem["icon"]) {
        return typeof src !== "string";
    }

    ngAfterViewInit() {
        const windowWidth = document.body.clientWidth;
        const rect = this.ref.nativeElement.getBoundingClientRect();
        const left = Math.round(this.ref.nativeElement.offsetWidth / 2.7);
        if (rect.right + left > windowWidth) {
            this.ref.nativeElement.style.left = `-${left - (windowWidth - rect.right - left)}px`;
            this.ref.nativeElement.style.transformOrigin = "top right";
        } else this.ref.nativeElement.style.left = `-${left}px`;
    }

    protected readonly server = server;
}
