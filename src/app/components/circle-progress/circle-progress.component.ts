import {Component, HostBinding, Input} from '@angular/core';

@Component({
    selector: 'app-circle-progress',
    imports: [],
    templateUrl: './circle-progress.component.html',
    styleUrl: './circle-progress.component.scss'
})
export class CircleProgressComponent {

    @Input() percent = 0;

    @Input() fillColor: string = "blue";

    @Input() emptyColor: string = "green";

    @HostBinding("style.background")
    get background(): string {
        const deg = this.percent * 3.6;
        return `conic-gradient(
            ${this.fillColor}  0deg ${deg}deg,
            ${this.emptyColor} ${deg}deg 360deg
        )`;
    }

}
