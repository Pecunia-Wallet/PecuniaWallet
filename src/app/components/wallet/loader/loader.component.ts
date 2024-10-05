import {Component, HostBinding, Input} from "@angular/core";

@Component({
  selector: 'app-loader',
  standalone: true,
  imports: [],
  templateUrl: './loader.component.html',
  styleUrl: './loader.component.scss'
})
export class LoaderComponent {

    @HostBinding("class.active") @Input() show: boolean;

}
