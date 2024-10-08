import {AfterViewInit, Component, ElementRef, EventEmitter, OnInit, Output, ViewChild} from '@angular/core';
import {NgOptimizedImage} from "@angular/common";
import {base64, server} from "../../../app.config";
import {ApiService} from "../../../services/api.service";

@Component({
  selector: 'app-avatar',
    imports: [
        NgOptimizedImage
    ],
  templateUrl: './avatar.component.html',
  styleUrl: './avatar.component.scss'
})
export class AvatarComponent implements OnInit, AfterViewInit {

    @ViewChild('image') image: ElementRef;

    @Output() iload = new EventEmitter();

    imageUrl: string = "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs%3D";
    imageBinary: string;
    afterViewInitTaskQueue: Array<() => void> = [];
    viewInitialized = false;

    constructor(private api: ApiService) {
    }

    ngOnInit() {
        this.load();
    }

    ngAfterViewInit() {
        this.viewInitialized = true;
        this.afterViewInitTaskQueue.forEach(task => {
            try { task() } catch (e) { console.error(e); }
        });
    }

    load(force?: boolean) {
        this.api.getImage(force).subscribe(blob => {
            if (this.imageBinary && !force) return this.iload.emit();
            this.afterViewInit(() => {
                blob.arrayBuffer().then(b => {
                    this.imageBinary = base64(b);
                    this.iload.emit();
                });
                this.imageUrl = URL.createObjectURL(blob);
                this.image.nativeElement.src = this.imageUrl;
            });
        });
    }

    renew() {
        this.load(true);
    }

    private afterViewInit(task: () => void) {
        if (this.viewInitialized) task();
        else this.afterViewInitTaskQueue.push(task);
    }

    protected readonly server = server;
    protected readonly URL = URL;
}
