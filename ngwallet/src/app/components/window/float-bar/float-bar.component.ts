import {AfterViewInit, Component, ElementRef, HostBinding, HostListener, Input, OnInit} from "@angular/core";
import {IconProp} from "@fortawesome/angular-fontawesome/types";
import {NgForOf, NgIf} from "@angular/common";
import {FaIconComponent} from "@fortawesome/angular-fontawesome";
import {Router, RouterLink} from "@angular/router";

interface Settings {
    hideByDefault?: boolean;
}

export interface BarLink {
    uri: string;
    text: string;
    image?: IconProp;
}

@Component({
    selector: "app-float-bar",
    standalone: true,
    imports: [
        NgForOf,
        NgIf,
        FaIconComponent,
        RouterLink
    ],
    templateUrl: "./float-bar.component.html",
    styleUrl: "./float-bar.component.scss"
})
export class FloatBarComponent implements OnInit, AfterViewInit {

    @HostBinding("class.hover") protected hover = false;
    @HostBinding("class.hidden") @Input() hidden: boolean;

    @Input() animationDuration = 650;
    @Input() id = "navbar";
    @Input() float = true;
    @HostBinding("class.relative") @Input() relative = false;
    @Input() links: BarLink[];

    constructor(protected router: Router,
                protected ref: ElementRef) {}

    ngOnInit() {
        if (this.float) this.restoreSettings();
    }

    ngAfterViewInit() {
        this.ref.nativeElement.style.setProperty(
            "--spring-duration", `${this.animationDuration}ms`);

    }

    @HostListener("mouseenter")
    onMouseEnter() {
        if (this.float) this.hover = true;
    }

    @HostListener("mouseleave")
    onMouseLeave() {
        this.hover = false;
    }

    toggleTo(hidden: boolean) {
        this.persistSettings({
            hideByDefault: hidden
        });

        if (!this.hidden && hidden) this.hover = false;
        this.hidden = hidden;
    }

    toggle() {
        this.toggleTo(!this.hidden)
    }

    restoreSettings() {
        const settings: Settings = JSON.parse(localStorage.getItem(this.id) || "{}");
        if (this.hidden == undefined) {
            const hidden = !!settings.hideByDefault;
            let transition = this.ref.nativeElement.style.transition;
            if (hidden) {
                this.ref.nativeElement.style.transition = "none";
            }
            this.hidden = hidden;
            setTimeout(() => this.ref.nativeElement.style.transition = transition, 50);
                // this.ref.nativeElement.style.transform = "translateY(calc(var(--control-gap) * 2 + 2px - 100%))";
        }
    }

    persistSettings(settings: Settings) {
        localStorage.setItem(this.id, JSON.stringify(settings));
    }

}
