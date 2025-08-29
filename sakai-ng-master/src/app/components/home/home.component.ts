import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { Button } from "primeng/button";
import { Card } from "primeng/card";
import { TopbarWidget } from './topbarwidget.component';
@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  imports: [ Button , TopbarWidget]
})
export class HomeComponent {


  constructor(private router: Router) {
  }

  navigateToTransfer() {
    this.router.navigate(['/InitialTransfer']);
  }

  navigateToAppointment() {
  console.log('Navigating to /meeting');
  this.router.navigate(['/meeting']);
}

  navigateToProfile() {
    this.router.navigate(['/profile']);
  }
}