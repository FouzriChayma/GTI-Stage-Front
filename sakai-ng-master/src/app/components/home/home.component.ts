import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { Button } from "primeng/button";
import { Card } from "primeng/card";

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  imports: [ Button]
})
export class HomeComponent {


  constructor(private router: Router) {
  }

  navigateToTransfer() {
    this.router.navigate(['/InitialTransfer']);
  }

  navigateToAppointment() {
    this.router.navigate(['/appointment']);
  }

  navigateToProfile() {
    this.router.navigate(['/profile']);
  }
}