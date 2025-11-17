import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Button } from "primeng/button";
import { Card } from "primeng/card";
import { TopbarWidget } from './topbarwidget.component';
import { AuthService } from '../../services/auth.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  imports: [ Button , TopbarWidget, CommonModule]
})
export class HomeComponent implements OnInit {
  isAuthenticated: boolean = false;
  isClient: boolean = false;
  isAdmin: boolean = false;
  isChargeClientele: boolean = false;
  canCreateTransfer: boolean = false;

  constructor(
    private router: Router,
    private authService: AuthService
  ) {
  }

  ngOnInit(): void {
    this.isAuthenticated = this.authService.isAuthenticated();
    if (this.isAuthenticated) {
      this.isClient = this.authService.isClient();
      this.isAdmin = this.authService.isAdmin();
      this.isChargeClientele = this.authService.isChargeClientele();
      // Only CLIENT and ADMINISTRATOR can create transfers
      this.canCreateTransfer = this.isClient || this.isAdmin;
    }
  }

  navigateToTransfer() {
    if (this.isAuthenticated) {
      this.router.navigate(['/InitialTransfer']);
    } else {
      this.router.navigate(['/authentication'], { queryParams: { mode: 'login' } });
    }
  }

  navigateToAppointment() {
    if (this.isAuthenticated) {
      console.log('Navigating to /meeting');
      this.router.navigate(['/meeting']);
    } else {
      this.router.navigate(['/authentication'], { queryParams: { mode: 'login' } });
    }
  }

  navigateToAppointments() {
    if (this.isAuthenticated) {
      this.router.navigate(['/appointments']);
    } else {
      this.router.navigate(['/authentication'], { queryParams: { mode: 'login' } });
    }
  }

  navigateToProfile() {
    if (this.isAuthenticated) {
      this.router.navigate(['/profile']);
    } else {
      this.router.navigate(['/authentication'], { queryParams: { mode: 'login' } });
    }
  }

  navigateToLogin() {
    this.router.navigate(['/authentication'], { queryParams: { mode: 'login' } });
  }

  navigateToRegister() {
    this.router.navigate(['/authentication'], { queryParams: { mode: 'register' } });
  }

  navigateToDashboard() {
    // Only ADMINISTRATOR can access dashboard
    if (this.isAuthenticated && this.isAdmin) {
      this.router.navigate(['/dashboard']);
    } else if (this.isAuthenticated) {
      // Other authenticated users stay on home page
      this.router.navigate(['/home']);
    } else {
      this.router.navigate(['/authentication'], { queryParams: { mode: 'login' } });
    }
  }
}