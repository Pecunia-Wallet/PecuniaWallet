import {
    AfterViewInit,
    Component,
    ElementRef,
    EventEmitter,
    HostBinding,
    HostListener,
    Input,
    OnChanges,
    OnInit,
    Output,
    SimpleChanges
} from "@angular/core";
import {FaIconComponent} from "@fortawesome/angular-fontawesome";
import {faChevronDown, faChevronUp} from "@fortawesome/free-solid-svg-icons";
import {NgForOf, NgIf, NgOptimizedImage, NgTemplateOutlet} from "@angular/common";
import {NgVarDirective} from "../../directives/ng-var.directive";
import {LogarithmicScale} from "chart.js";

export class DropdownItem {
    image?: {
        url: URL | string,
        width?: number,
        height?: number
    }
    spec?: string;
    text: string;

    equals(i: DropdownItem): boolean {
        return this.image?.url == i.image?.url &&
            this.image?.width == i.image?.width &&
            this.image?.height == i.image?.height &&
            this.spec == i.spec &&
            this.text == i.text;
    }
}

@Component({
    selector: "app-dropdown",
    standalone: true,
    imports: [
        FaIconComponent,
        NgOptimizedImage,
        NgIf,
        NgForOf,
        NgTemplateOutlet,
        NgVarDirective
    ],
    templateUrl: "./dropdown.component.html",
    styleUrl: "./dropdown.component.scss"
})
export class DropdownComponent implements OnInit {

    @HostBinding("class.loading") @Input() loading? = false;
    @HostBinding("class.disabled") @Input() disabled? = false;

    expanded: boolean;

    localTrigger: boolean;
    @Input() expandDirection: "up" | "down" = "down";

    @Input() items: (DropdownItem & { hidden?: boolean })[];
    @Input() selected: DropdownItem;
    @Output() selectedChange = new EventEmitter<DropdownItem>();

    constructor(protected ref: ElementRef) {}

    ngOnInit() {
        if (this.loading == undefined && (!this.items || this.items.length == 0))
            this.loading = true;
        if (!this.selected && this.items?.length > 0) this.selected = this.items[0];

        if (!this.selected?.image) this.loading = false;
    }

    toggle() {
        this.localTrigger = true;
        this.expanded = !this.expanded;
    }

    onItemClick(item: DropdownItem) {
        this.setSelected(item);
        this.expanded = false;
    }

    @HostListener("document:click", ["$event"])
    onClick(event: any) {
        if (!this.ref.nativeElement.contains(event.target) && !this.localTrigger)
            this.expanded = false;
        this.localTrigger = false;
    }

    setSelected(selected: DropdownItem) {
        this.selected = selected;
        this.selectedChange.emit(selected);
    }

    getSelected() {
        return this.selected;
    }

    protected readonly faChevronDown = faChevronDown;
    protected readonly faChevronUp = faChevronUp;
}
