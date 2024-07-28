import {Component, OnInit, TemplateRef, ViewChild} from "@angular/core";
import {NgIf, NgOptimizedImage, NgTemplateOutlet} from "@angular/common";
import {NotifyService} from "../../services/notify.service";
import {server} from "../../app.config";
import {faCheckCircle} from "@fortawesome/free-solid-svg-icons";
import {FaIconComponent} from "@fortawesome/angular-fontawesome";
import {NotificationsService} from "angular2-notifications";

@Component({
    selector: "app-notify",
    standalone: true,
    imports: [
        NgOptimizedImage,
        NgTemplateOutlet,
        FaIconComponent,
        NgIf
    ],
    templateUrl: "./notify.component.html",
    styleUrl: "./notify.component.scss"
})
export class NotifyComponent implements OnInit {

    @ViewChild("errorOverlay") errorOverlayTemplate: TemplateRef<any>;
    @ViewChild("notification") notification: TemplateRef<any>;

    overlayTemplate: TemplateRef<any>;
    showOverlay: boolean;

    constructor(private notifyService: NotifyService,
                private simpleNotify: NotificationsService) {}

    ngOnInit() {
        this.notifyService.overlay$.subscribe(
            state => {
                this.showOverlay = state.show;
                switch (state.variation) {
                    case "error":
                        this.overlayTemplate = this.errorOverlayTemplate;
                        break;
                }
            });
        this.notifyService.notification$.subscribe(
            notification => {
                this.simpleNotify.html(
                    this.notification,
                    undefined, {
                        timeOut: notification.hideAfter || 0,
                        showProgressBar: false
                    }, undefined,
                    notification);
            });
    }

    protected readonly window = window;
    protected readonly server = server;
    protected readonly faCheckCircle = faCheckCircle;
}
