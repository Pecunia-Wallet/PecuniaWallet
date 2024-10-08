import {
    AfterViewInit,
    Component,
    ElementRef,
    EventEmitter,
    Input,
    OnInit,
    Output,
    ViewChild,
    ViewRef
} from '@angular/core';
import {base64, server} from "../../../app.config";
import {AsyncPipe, NgIf, NgOptimizedImage} from "@angular/common";
import {FaIconComponent} from "@fortawesome/angular-fontawesome";
import {faImage, faPencil} from "@fortawesome/free-solid-svg-icons";
import {HttpClient} from "@angular/common/http";
import {ApiService} from "../../../services/api.service";
import {ControlValueAccessor} from "@angular/forms";
import {AvatarComponent} from "../avatar/avatar.component";
import {detectImageMime} from "../../../utils/image.util";

export interface Error {
    type: "empty" | "type" | "io" | "size";
    message: string;
}

@Component({
    selector: 'app-avatar-picker',
    imports: [
        NgOptimizedImage,
        FaIconComponent,
        AvatarComponent,
        NgIf,
        AsyncPipe
    ],
    templateUrl: './avatar-picker.component.html',
    styleUrl: './avatar-picker.component.scss'
})
export class AvatarPickerComponent implements OnInit, AfterViewInit {

    @ViewChild("input") _input: ElementRef;
    @ViewChild("avatar", {read: AvatarComponent}) avatar: AvatarComponent;
    @ViewChild("wrapper") wrapper: ElementRef;

    imageUrl: string;
    imageBinary: string;
    initialBinary: string;
    loading = true;
    drag = false;

    afterViewInitTaskQueue: Array<() => void> = [];
    viewInitialized = false;

    @Output() ierror: EventEmitter<Error> = new EventEmitter();
    @Output() iload: EventEmitter<void> = new EventEmitter();
    @Output() ichange: EventEmitter<string> = new EventEmitter();

    private readonly errors: {[key: string]: Error} = {
        type: {
            type: "type",
            message: "Wrong filetype"
        },
        empty: {
            type: "empty",
            message: "Nothing selected"
        },
        io: {
            type: "io",
            message: "Failed to read"
        },
        size: {
            type: "size",
            message: "Image is too heavy"
        }
    };

    protected readonly webImageTypes = [
        "image/apng",
        "image/avif",
        "image/gif",
        "image/jpeg",
        "image/png",
        "image/svg+xml",
        "image/webp"
    ];
    
    ngOnInit() {
        this.afterViewInit(() => {
            this.avatar.iload.subscribe(() => {
                this.loading = false;
                this.imageBinary = this.avatar.imageBinary;
                this.initialBinary = this.imageBinary;
                this.iload.emit();
            });
        });
    }

    ngAfterViewInit() {
        this.viewInitialized = true;
        this.afterViewInitTaskQueue.forEach(task => {
            try { task() } catch (e) { console.error(e); }
        });
    }

    renew() {
        this.avatar.renew();
    }

    setImage(image: string) {
        this.imageBinary = image;
        this.avatar.imageBinary = image;
        const bytes = atob(image);
        const byteNumbers = new Array(bytes.length);
        for (let i = 0; i < bytes.length; i++) {
            byteNumbers[i] = bytes.charCodeAt(i);
        }
        const blob = new Blob([new Uint8Array(byteNumbers)]);
        this.imageUrl = URL.createObjectURL(blob);
        this.afterViewInit(() => this.avatar.imageUrl = this.imageUrl);
    }

    onDrop(event: DragEvent) {
        event.preventDefault();
        this.drag = false;

        if (event.dataTransfer?.items) {
            [...(event.dataTransfer! as any).items].forEach((item, i) => {
                if (item.kind === "file") {
                    this.processFile(item.getAsFile());
                }
            });
        } else {
            [...(event.dataTransfer! as any).files].forEach((file, i) => {
                this.processFile(file);
            });
        }
    }

    onInput() {
        this.processFile(this.input.files![0]);
        this.input.value = null as any;
    }

    processFile(file: File) {
        if (!file) {
            this.ierror.emit(this.errors["empty"]);
            return;
        }

        if (!this.webImageTypes.includes(file.type)) {
            this.ierror.emit(this.errors["type"]);
            return;
        }

        const reader = new FileReader();

        reader.onerror = (error) => {
            console.error("io error", error);
            this.ierror.emit(this.errors["io"]);
        };
        reader.onload = () => {
            const res: ArrayBuffer = reader.result as ArrayBuffer;
            if (res.byteLength > 5_242_880) {
                this.ierror.emit(this.errors["size"]);
                return;
            }
            this.imageUrl = URL.createObjectURL(file);
            this.avatar.imageUrl = this.imageUrl;
            this.imageBinary = base64(res);
            this.ierror.emit(undefined);
            this.ichange.emit(this.imageBinary);
        };

        reader.readAsArrayBuffer(file);
    }

    onDrag(ev: any) {
        ev.preventDefault();
        this.drag = true;
    }

    onDragged(ev: any) {
        ev.preventDefault();
        if (!this.wrapper.nativeElement.contains(ev.fromElement)) {
            this.drag = false;
        }
    }

    hasChanged() {
        return this.initialBinary !== this.imageBinary;
    }

    private get input(): HTMLInputElement {
        return this._input.nativeElement;
    }

    private afterViewInit(task: () => void) {
        if (this.viewInitialized) task();
        else this.afterViewInitTaskQueue.push(task);
    }

    protected readonly server = server;
    protected readonly faPencil = faPencil;
    protected readonly faImage = faImage;
}
