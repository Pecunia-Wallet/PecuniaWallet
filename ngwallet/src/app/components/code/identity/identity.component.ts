import {Component, ElementRef, HostBinding} from "@angular/core";
import {CodeComponent, FuncButton} from "../code.component";
import {DomSanitizer, SafeHtml, Title} from "@angular/platform-browser";
import {AsyncPipe, Location, NgClass, NgForOf, NgIf, NgOptimizedImage} from "@angular/common";
import {ApplyDirective} from "../../../directives/apply.directive";
import {HttpClient} from "@angular/common/http";
import {FooterComponent} from "../../footer/footer.component";
import {MarqueeComponent} from "../../marquee/marquee.component";
import {AuthService} from "../../../services/auth.service";
import _default from "chart.js/dist/plugins/plugin.decimation";
import algorithm = _default.defaults.algorithm;
import {IdentityService} from "../../../services/identity.service";
import {ActivatedRoute, Router} from "@angular/router";

@Component({
    selector: "app-identity",
    standalone: true,
    imports: [
        NgIf,
        NgForOf,
        ApplyDirective,
        NgClass,
        AsyncPipe,
        FooterComponent,
        MarqueeComponent,
        NgOptimizedImage
    ],
    templateUrl: "../code.component.html",
    styleUrls: ["../code.component.scss", "./identity.component.scss"],
})
export class IdentityComponent extends CodeComponent {

    @HostBinding("class.show") show: boolean;

    constructor(ref: ElementRef,
                http: HttpClient,
                sanitizer: DomSanitizer,
                private auth: AuthService,
                private title: Title,
                private id: IdentityService) {
        super(ref, sanitizer, http);
        this.id.approvalRequested$.subscribe(req => {
            this.show = req;
            if (!req) {
                this.loading = false;
                this.code$.next("");
            }
        });
    }

    override showFooter(): boolean {
        return false;
    }

    override showPromo(): boolean {
        return false;
    }

    override header(): SafeHtml {
        return this.sanitizer.bypassSecurityTrustHtml(
            `<h1 ${this.getContentAttr()}>Enter Your PIN</h1>
                   <h2 ${this.getContentAttr()}>to confirm the action</h2>`);
    }

    override funcButtonLeft(): FuncButton {
        return {
            render: el =>
                this.renderIcon(el, "back", 35, 35),
            onclick: () => window.location.hash = ""
        };
    }

    override onInput(code: string) {
        this.error = false;
        setTimeout(() => {
            if (code != this.auth.key) {
                this.code$.next("");
                this.loading = false;
                this.error = true;
            } else this.id.proved$.next(true);
        }, 1000);
    }

}
