import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { TitleService } from './app/services/title.service';

@Component({
    selector: 'app-root',
    standalone: true,
    imports: [RouterModule],
    template: `<router-outlet></router-outlet>`
})
export class AppComponent implements OnInit {
    constructor(private titleService: TitleService) {}

    ngOnInit(): void {
        this.titleService.initialize();
    }
}
