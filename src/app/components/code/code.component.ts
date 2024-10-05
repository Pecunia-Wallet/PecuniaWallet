import {Component, ElementRef, HostListener, OnInit} from "@angular/core";
import {AsyncPipe, NgClass, NgForOf, NgIf, NgOptimizedImage} from "@angular/common";
import {ApplyDirective} from "../../directives/apply.directive";
import {DomSanitizer, SafeHtml} from "@angular/platform-browser";
import {BehaviorSubject} from "rxjs";
import {HttpClient} from "@angular/common/http";
import {FooterComponent} from "../footer/footer.component";
import {MarqueeComponent} from "../marquee/marquee.component";
import {promo, server} from "../../app.config";

export interface FuncButton {
    render: (el: Element) => void,
    onclick: () => void
}

@Component({
    selector: "app-code",
    standalone: true,
    imports: [
        NgForOf,
        ApplyDirective,
        NgClass,
        AsyncPipe,
        FooterComponent,
        MarqueeComponent,
        NgOptimizedImage,
        NgIf
    ],
    templateUrl: "./code.component.html",
    styleUrls: ["./code.component.scss"]
})
export abstract class CodeComponent implements OnInit {

    protected static CODE_LENGTH = 6;
    code$ = new BehaviorSubject<string>("");

    loading = false;
    error: boolean;
    errorMessage?: string;
    buttons: FuncButton[];

    abstract header(): SafeHtml | undefined;
    abstract onInput(code: string): void;

    protected constructor(protected ref: ElementRef,
                          protected sanitizer: DomSanitizer,
                          protected http: HttpClient) {}

    ngOnInit() {
        this.buttons = [];
        for (let i = 0; i < 10; i++) {
            this.buttons.push({
                render: el => el.textContent = `${i}`,
                onclick: () => this.enter(i)
            });
        }
        this.buttons = this.shuffle(this.buttons);

        this.buttons.splice(-1, 0, this.funcButtonLeft());
        this.buttons.push(this.funcButtonRight());

        this.buttons.reverse();

        this.code$.subscribe(code => {
            if (code.length >= this.codeLength) {
                this.loading = true;
                this.onInput(code);
            }
        });
    }

    protected renderIcon(el: Element, name: string, width = 40, height = 40) {
        el.classList.add("key--icon");
        el.innerHTML = `<img src="${server}/images/${name}.svg" alt="${name}"
                             style="width: ${width}px; height: ${height}px">`
    };

    funcButtonLeft(): FuncButton {
        return {
            render: el => {
                this.renderIcon(el, "exit", 40, 37);
                el.classList.add("key--permanent");
            },
            onclick: () => window.location.href = "/logout"
        };
    }

    funcButtonRight(): FuncButton {
        return {
            render: p => this.renderIcon(p, "backspace"),
                onclick: () => this.backspace()
        };
    }

    showFooter(): boolean {
        return true;
    }

    showPromo(): boolean {
        return true;
    }

    get codeLength(): number {
        return CodeComponent.CODE_LENGTH;
    }

    @HostListener("window:keydown", ["$event.key"])
    backspaceEventListener(key: string) {
        if (key.toLowerCase() == "backspace" || key.toLowerCase() == "delete") this.backspace();
    }

    enter(num: number) {
        if (this.loading) return;
        const code = this.code$.value;
        if (code.length < this.codeLength) {
            this.code$.next(code.concat(`${num}`));
        }
    }

    backspace() {
        if (this.loading) return;
        const code = this.code$.value;
        this.code$.next(code.substring(0, code.length - 1));
    }

    observeAsterisk(a: Element, i: number) {
        this.code$.subscribe(code => {
            if (code.length - 1 >= i) a.classList.add("active");
            else a.classList.remove("active");
            if (code.length >= this.codeLength) {
                this.setTimeout(() => {
                    if (this.loading) a.classList.add("loading");
                }, i * 50);
                return;
            } else a.classList.remove("loading");
        });
    }

    splitToRows<T>(arr: T[]): T[][] {
        arr = [...arr];
        const res: T[][] = [];
        while (arr.length > 0) {
            res.push(arr.splice(-3));
        }
        return res;
    }

    reversed<T>(arr: T[]): T[] {
        arr.reverse();
        return arr;
    }

    shuffle<T>(arr: T[]): T[] {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }

    range(startInclusive: number, endExclusive: number): number[] {
        const range: number[] = [];
        for (let i = startInclusive; i < endExclusive; i++) {
            range.push(i);
        }
        return range;
    }

    touchCallback(el: Element): () => void {
        return () => {
            el.classList.remove("key--touched");
        };
    }

    getContentAttr(): string | undefined {
        const attrs = this.ref.nativeElement.attributes
        for (let i = 0, l = attrs.length; i < l; i++) {
            if (attrs[i].name.startsWith("_nghost")) {
                return `_ngcontent-${attrs[i].name.substring(8)}`
            }
        }
        return undefined;
    }

    nullTrack() {}

    protected readonly server = server;
    protected readonly setTimeout = setTimeout;
    protected readonly promo = promo;
}
