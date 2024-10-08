import {AfterViewInit, Component, HostBinding, HostListener, ViewChild} from '@angular/core';
import {Accordion, AccordionContent, AccordionHeader, AccordionPanel} from "primeng/accordion";
import {AvatarPickerComponent, Error} from "../avatar-picker/avatar-picker.component";
import {AvatarComponent} from "../avatar/avatar.component";
import {FormControl, FormGroup, ReactiveFormsModule, ValidatorFn, Validators} from "@angular/forms";
import {ApiService, Settings} from "../../../services/api.service";
import {WalletService} from "../../../services/wallet.service";
import {AuthService} from "../../../services/auth.service";
import {catchError, EMPTY, forkJoin, Observable, of, take} from "rxjs";
import {faCopy, faQuestionCircle} from "@fortawesome/free-regular-svg-icons";
import {FaIconComponent} from "@fortawesome/angular-fontawesome";
import {ToggleSwitch} from "primeng/toggleswitch";
import {ToggleButton} from "primeng/togglebutton";
import {Ripple} from "primeng/ripple";
import {faArrowRightFromBracket, faArrowUpRightFromSquare, faHeadset} from "@fortawesome/free-solid-svg-icons";
import {InputComponent} from "../../input/input.component";
import {AsyncPipe, NgIf, NgTemplateOutlet} from "@angular/common";
import {faFileLines} from "@fortawesome/free-regular-svg-icons/faFileLines";
import {HotToastService} from "@ngxpert/hot-toast";
import {Select} from "primeng/select";
import BigNumber from "bignumber.js";

interface Preferences {
    openTabs?: string[];
}

@Component({
    selector: 'app-settings',
    imports: [
        Accordion,
        AccordionPanel,
        AccordionHeader,
        AccordionContent,
        AvatarPickerComponent,
        ReactiveFormsModule,
        FaIconComponent,
        ToggleSwitch,
        ToggleButton,
        Ripple,
        InputComponent,
        NgIf,
        NgTemplateOutlet,
        Select,
        AsyncPipe
    ],
    templateUrl: './settings.component.html',
    styleUrl: './settings.component.scss'
})
export class SettingsComponent {

    readonly PREFERENCES_KEY = "settingsPreferences";
    readonly INACCURACY_TYPES = ["None", "Both", "Underpayment", "Overpayment"];

    readonly URL_VALIDATOR: (httpOnly: boolean) => ValidatorFn = httpOnly => control => {
        const value = control.value;
        if (!value || value === "") return null;
        try {
            const url = new URL(value);
            if (httpOnly) {
                return url.protocol?.startsWith("http") ? null : {badSchema: true};
            } else return null;
        } catch (_) {
            return {malformedUrl: true};
        }
    };

    @HostBinding("class.loading") loading = true;

    @ViewChild("avatarPicker", {read: AvatarPickerComponent}) avatarPicker: AvatarPickerComponent;
    form = new FormGroup({
        name: new FormControl("", [Validators.minLength(2), Validators.maxLength(25)]),
        email: new FormControl("", [Validators.email]),
        grantAccess: new FormControl(""),
        inaccuracyPercent: new FormControl("", [Validators.min(0), Validators.max(99)]),
        inaccuracyType: new FormControl(""),
        aboutUrl: new FormControl("", this.URL_VALIDATOR(false)),
        supportUrl: new FormControl("", this.URL_VALIDATOR(false)),
        defaultCallbackUrl: new FormControl("", this.URL_VALIDATOR(true)),
        successCallbackUrl: new FormControl("", this.URL_VALIDATOR(true)),
        failureCallbackUrl: new FormControl("", this.URL_VALIDATOR(true)),
        notifyOnChange: new FormControl(""),
        notifyOnSuccess: new FormControl(""),
        notifyOnFailure: new FormControl(""),
    });
    settings: Settings;

    avatarError: Error;
    submitting = false;
    accordionSelection: string[] = [/*"General"*/];

    constructor(private api: ApiService,
                private toast: HotToastService,
                protected wallet: WalletService,
                protected auth: AuthService) {
        forkJoin([
            this.api.getSettings().pipe(take(1)),
            this.api.isAccessGranted().pipe(take(1))
        ]).subscribe(([s, accessGranted]) => {
            this.settings = s;
            this.loadSettingsToForm(accessGranted);
            this.loading = false;
        });
        this.loadPreferences();
    }

    loadSettingsToForm(accessGranted?: boolean) {
        for (const setting in this.settings) {
            if (setting == "name" || setting == "id" || setting == "inaccuracyType") continue;
            try {
                this.form.get(setting)?.setValue((this.settings as any)[setting]);
            } catch (e) {
                console.error(e);
            }
        }
        this.form.get("name")?.setValue(this.settings.name || this.settings.id);

        const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);
        this.form.get("inaccuracyType")?.setValue(capitalize(this.settings.inaccuracyType));

        if (accessGranted) this.form.get("grantAccess")?.setValue(true as any);
    }

    submit() {
        if (this.submitting || !this.form.valid) return;
        const name = this.form.get("name")?.value;

        const str = (str: any) => str == "" ? null : str;

        const percent = this.form.get("inaccuracyPercent")?.value;
        const settings: any = {
            name: str(name == this.settings.id ? undefined : name),
            email: str(this.form.get("email")?.value),
            inaccuracyType: this.form.get("inaccuracyType")?.value,
            inaccuracyPercent: percent ? +percent : percent,
            aboutUrl: str(this.form.get("aboutUrl")?.value),
            supportUrl: str(this.form.get("supportUrl")?.value),
            defaultCallbackUrl: str(this.form.get("defaultCallbackUrl")?.value),
            successCallbackUrl: str(this.form.get("successCallbackUrl")?.value),
            failureCallbackUrl: str(this.form.get("failureCallbackUrl")?.value),
            notifyOnChange: this.form.get("notifyOnChange")?.value,
            notifyOnSuccess: this.form.get("notifyOnSuccess")?.value,
            notifyOnFailure: this.form.get("notifyOnFailure")?.value,
        };
        if (this.avatarPicker.hasChanged()) settings.image = this.avatarPicker.imageBinary;
        this.submitting = true;
        const keyTask: Observable<any> = !this.form.get("grantAccess")?.touched ? of(null)
            : this.form.get("grantAccess")?.value
                ? this.wallet.grantKeys()
                : this.wallet.revokeKeys();
        forkJoin([
            this.api.patchSettings(settings).pipe(take(1)),
            keyTask.pipe(take(1))
        ]).pipe(catchError(e => {
            this.submitting = false;
            this.toast.error("Settings rejected", {
                id: `settingsRejected`
            });
            return EMPTY;
        })).subscribe(([s]) => {
            s.id = this.settings.id;
            s.inaccuracyPercent = s.inaccuracyPercent ? new BigNumber(s.inaccuracyPercent) : null as any;
            s.inaccuracyType = s.inaccuracyType?.toLowerCase() as any;
            this.settings = s;
            this.loadSettingsToForm();
            this.api.settings$.next(null as any);
            this.api.name$.next(null as any);
            this.api.image$.next(null as any);
            this.submitting = false;
            this.toast.success("Settings updated!", {
                id: `settingsUpdated`
            });
        });
    }

    protected copyApiToken() {
        this.wallet.getApiToken().subscribe(token => {
            window.navigator.clipboard.writeText(token).then(() => {
                this.toast.info("Copied to clipboard!", {
                    id: `apiTokenCopied`
                });
            })
        });
    }

    loadPreferences() {
        try {
            const json = localStorage.getItem(this.PREFERENCES_KEY) || "{}";
            this.accordionSelection = JSON.parse(json).openTabs ?? ["Intro"];
        } catch (e) {
            console.error(e);
        }
    }

    savePreferences() {
        const preferences: Preferences = {
            openTabs: this.accordionSelection
        };
        localStorage.setItem(this.PREFERENCES_KEY, JSON.stringify(preferences));
    }

    protected toSupport() {
        window.open("https://pecuniawallet.com/about/support", "_blank");
    }

    protected toDocs() {
        window.open("https://pecuniawallet.com/docs/index.html", "_blank");
    }

    protected readonly faQuestionCircle = faQuestionCircle;
    protected readonly faArrowUpRightFromSquare = faArrowUpRightFromSquare;
    protected readonly faArrowRightFromBracket = faArrowRightFromBracket;
    protected readonly faFileLines = faFileLines;
    protected readonly faCopy = faCopy;
    protected readonly faHeadset = faHeadset;
    protected readonly take = take;
}
