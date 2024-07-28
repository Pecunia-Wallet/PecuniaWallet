import {
    AfterViewInit,
    Component,
    ElementRef,
    HostBinding,
    Input,
    OnChanges,
    OnInit,
    SimpleChanges
} from "@angular/core";
import {NgIf} from "@angular/common";

@Component({
    selector: "app-marquee",
    standalone: true,
    imports: [
        NgIf
    ],
    templateUrl: "./marquee.component.html",
    styleUrl: "./marquee.component.scss"
})
export class MarqueeComponent implements OnInit, AfterViewInit, OnChanges {
    @HostBinding("style.display") display: string;

    @Input() id: string = "marquee";
    @Input() closeable: boolean = true;
    @Input() gap: number = 20;
    @Input() speed: number = 1;

    constructor(private el: ElementRef) {}

    ngOnInit() {
        if (!this.closeable) return;
        const savedState = localStorage.getItem(this.id);
        this.display = savedState === "hidden" ? "none" : "unset";
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes["gap"]) {
            this.setGapProperty();
        }
    }

    ngAfterViewInit(): void {
        this.setGapProperty();
        this.initMarquee();
    }

    setGapProperty(): void {
        this.el.nativeElement.style.setProperty("--gap", `${this.gap}px`);
    }

    hideMarquee() {
        this.display = "none";
        localStorage.setItem(this.id, "hidden");
    }

    initMarquee() {
        const numerify = (str: string) => +str.replace(/[^\d-]/g, "");

        const marquee = this.el.nativeElement.querySelector("#marquee");

        const newItem = () => marquee.querySelector("div").cloneNode(true);

        const marqueeItems = (): HTMLElement[] => marquee.querySelectorAll("div");
        const fillMarquee = () => {
            const fewItems = (): boolean => marqueeItems().length < 10 && (marqueeItems().length < 3 ||
                (marqueeItems()[0].clientWidth + this.gap) * marqueeItems().length - this.gap <
                window.innerWidth);
            while (fewItems()) marquee.appendChild(newItem());

            marqueeItems().forEach((item: HTMLElement) => {
                if (item.style.position !== "absolute") item.style.position = "relative";
            });
        };
        fillMarquee();
        window.addEventListener("resize", fillMarquee);

        const render = () => {
            marqueeItems().forEach((item: HTMLElement) => {
                if (item.offsetLeft < 0 && item.offsetLeft < -item.offsetWidth) {
                    marqueeItems().forEach((e: HTMLElement) => {
                        e.style.left = this.gap / 2 - 1 + "px";
                    });
                    item.remove();
                    marquee.appendChild(newItem());
                }
                item.style.left = `${numerify(item.style.left) - this.speed}px`;
            });
            requestAnimationFrame(render);
        };

        requestAnimationFrame(render);
    }
}
