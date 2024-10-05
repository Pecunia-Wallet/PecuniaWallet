import {
    Component,
    ElementRef, TemplateRef, ViewChild, ViewRef
} from "@angular/core";
import {CodeComponent} from "../code.component";
import {DomSanitizer, SafeHtml} from "@angular/platform-browser";
import {AsyncPipe, NgClass, NgForOf, NgIf, NgOptimizedImage} from "@angular/common";
import {ApplyDirective} from "../../../directives/apply.directive";
import {HttpClient} from "@angular/common/http";
import {FooterComponent} from "../../footer/footer.component";
import {MarqueeComponent} from "../../marquee/marquee.component";
import {AuthService} from "../../../services/auth.service";
import {Router} from "@angular/router";
import {take, takeLast} from "rxjs";
import {CookieService} from "ngx-cookie-service";
import {server} from "../../../app.config";
import {AppComponent} from "../../../app.component";

@Component({
    selector: 'app-unlock',
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
    templateUrl: '../code.component.html',
    styleUrls: ['../code.component.scss', './unlock.component.scss'],
})
export class UnlockComponent extends CodeComponent {

    protected readonly MAX_TRIES = 5;
    protected tries = 0;

    constructor(ref: ElementRef,
                http: HttpClient,
                sanitizer: DomSanitizer,
                private auth: AuthService,
                private cookies: CookieService) {
        super(ref, sanitizer, http);
    }

    override header(): SafeHtml {
        return this.sanitizer.bypassSecurityTrustHtml(
            `<h1 ${this.getContentAttr()}>Enter Your PIN</h1>`);
    }

    override onInput(pin: string) {
        this.error = false;
        this.auth.restoreAuth(pin).subscribe(auth => {
            if (!auth) {
                if (++this.tries >= this.MAX_TRIES) {
                    for (let cookieName of Object.keys(this.cookies.getAll())) {
                        this.cookies.set(cookieName, "", {
                            expires: new Date(0),
                            path: "/"
                        });
                    }
                    window.location.href = `${server}/logout`;
                    return;
                }
                this.code$.next("");
                this.loading = false;
                this.error = true;
                this.errorMessage = `Remaining attempts: ${this.MAX_TRIES - this.tries}.
                                     You will be logged out on attempts are over`;
            }
        });
    }

}
