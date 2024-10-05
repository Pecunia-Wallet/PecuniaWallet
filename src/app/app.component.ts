import {AfterViewInit, Component, TemplateRef, ViewChild} from "@angular/core";
import {RouterOutlet} from "@angular/router";
import {NotifyComponent} from "./components/notify/notify.component";
import {NotificationsService, NotificationType, SimpleNotificationsModule} from "angular2-notifications";
import {BrowserAnimationsModule} from "@angular/platform-browser/animations";
import {FaIconComponent} from "@fortawesome/angular-fontawesome";
import {faCheck, faCheckCircle, faCircleCheck} from "@fortawesome/free-solid-svg-icons";
import {NgOptimizedImage} from "@angular/common";
import {server} from "./app.config";
import {NotifyService} from "./services/notify.service";
import {DomSanitizer} from "@angular/platform-browser";
import {WalletService} from "./services/wallet.service";
import {HttpClient} from "@angular/common/http";
import {map} from "rxjs";
import {saveAs} from "file-saver";
import {IdentityComponent} from "./components/code/identity/identity.component";

@Component({
    selector: "app-root",
    standalone: true,
    imports: [
        RouterOutlet,
        NotifyComponent,
        SimpleNotificationsModule,
        FaIconComponent,
        NgOptimizedImage,
        IdentityComponent
    ],
    templateUrl: "./app.component.html",
    styleUrl: "./app.component.scss"
})
export class AppComponent {

    constructor() {}

}
