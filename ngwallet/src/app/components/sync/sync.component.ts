import { Component } from '@angular/core';
import {FaIconComponent} from "@fortawesome/angular-fontawesome";
import {faArrowsRotate} from "@fortawesome/free-solid-svg-icons";
import {FooterComponent} from "../footer/footer.component";

@Component({
  selector: 'app-sync',
  standalone: true,
    imports: [
        FaIconComponent,
        FooterComponent
    ],
  templateUrl: './sync.component.html',
  styleUrl: './sync.component.scss'
})
export class SyncComponent {

    protected readonly faArrowsRotate = faArrowsRotate;
}
