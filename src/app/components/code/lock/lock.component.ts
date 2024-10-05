import {Component, ElementRef} from '@angular/core';
import {CodeComponent} from "../code.component";
import {DomSanitizer, SafeHtml} from "@angular/platform-browser";
import {AsyncPipe, NgClass, NgForOf, NgIf, NgOptimizedImage} from "@angular/common";
import {ApplyDirective} from "../../../directives/apply.directive";
import {HttpClient} from "@angular/common/http";
import {FooterComponent} from "../../footer/footer.component";
import {MarqueeComponent} from "../../marquee/marquee.component";
import {AuthService} from "../../../services/auth.service";
import {NotifyService} from "../../../services/notify.service";
import {Router} from "@angular/router";

@Component({
    selector: 'app-lock',
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
    styleUrls: ['../code.component.scss', './lock.component.scss']
})
export class LockComponent extends CodeComponent {

    constructor(ref: ElementRef,
                http: HttpClient,
                sanitizer: DomSanitizer,
                protected auth: AuthService,
                private notify: NotifyService,
                private router: Router) {
        super(ref, sanitizer, http);
    }

    override showFooter(): boolean {
        return false;
    }

    override showPromo(): boolean {
        return false;
    }

    override header(): SafeHtml {
        return this.sanitizer.bypassSecurityTrustHtml(
            `<h1 ${this.getContentAttr()}>Set a PIN</h1>
                   <h2 ${this.getContentAttr()}>for quick access</h2>`);
    }

    override onInput(pin: string) {
        this.auth.requestLock().subscribe(permission => {
            if (!permission) {
                this.notify.errorOverlay();
                return;
            }
            this.auth.checkTokenAndPersist(pin).subscribe(success => {
                if (!success) {
                    this.notify.errorOverlay();
                    return;
                }
                this.router.navigate(["/"], {
                    queryParamsHandling: "preserve"
                });
            });
        });
    }
}
