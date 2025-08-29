import { Component, OnInit } from '@angular/core';
import { StyleClassModule } from 'primeng/styleclass';
import { Router, RouterModule } from '@angular/router';
import { RippleModule } from 'primeng/ripple';
import { ButtonModule } from 'primeng/button';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { User } from '../../models/User';
import { AvatarModule } from 'primeng/avatar';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

@Component({
  selector: 'topbar-widget',
  standalone: true,
  imports: [RouterModule, StyleClassModule, ButtonModule, RippleModule, CommonModule, AvatarModule],
  template: `
    <nav class="flex items-center justify-between w-full p-6">
      <div class="flex items-center">
        <span class="text-2xl font-bold text-gray-800">E-Trade Banking</span>
      </div>
      <div class="lg:flex items-center space-x-6 hidden lg:flex">
        <a (click)="router.navigate(['/landing'], { fragment: 'home' })" pRipple class="text-gray-800 hover:text-blue-600 text-lg font-medium">Home</a>
        <a (click)="router.navigate(['/landing'], { fragment: 'features' })" pRipple class="text-gray-800 hover:text-blue-600 text-lg font-medium">Appointment Scheduling</a>
        <a (click)="router.navigate(['/landing'], { fragment: 'features' })" pRipple class="text-gray-800 hover:text-blue-600 text-lg font-medium">Transfer Initiation</a>
        <a (click)="router.navigate(['/landing'], { fragment: 'features' })" pRipple class="text-gray-800 hover:text-blue-600 text-lg font-medium">Profile</a>
      </div>
      <div class="flex items-center space-x-4">
        <ng-container *ngIf="isAuthenticated && user; else notAuthenticated">
          <div class="flex items-center space-x-2">
            <p-avatar
              [image]="(profilePhotoUrl$ | async) ?? undefined"
              shape="circle"
              size="normal"
              styleClass="w-10 h-10"
              [style]="{'background-color': '#e2e8f0', 'border': '2px solid #ffffff'}"
              [label]="user.firstName ? (user.firstName[0] + (user.lastName ? user.lastName[0] : '')) : ''"
            ></p-avatar>
            <span class="text-gray-800 font-medium">{{ user.firstName }} {{ user.lastName }}</span>
          </div>
          <button pButton pRipple label="Logout" (click)="logout()" [rounded]="true" class="bg-red-500 text-white hover:bg-red-600"></button>
        </ng-container>
        <ng-template #notAuthenticated>
          <button pButton pRipple label="Login" (click)="navigateToAuth('login')" [rounded]="true" class="bg-transparent text-gray-800 hover:text-blue-600 border-none"></button>
          <button pButton pRipple label="Register" (click)="navigateToAuth('register')" [rounded]="true" class="bg-green-500 text-white hover:bg-green-600"></button>
        </ng-template>
        <a pButton [text]="true" severity="secondary" [rounded]="true" pRipple class="lg:hidden" pStyleClass="@next" enterClass="hidden" leaveToClass="hidden" [hideOnOutsideClick]="true" (click)="toggleMobileMenu()">
          <i class="pi pi-bars text-2xl"></i>
        </a>
      </div>
    </nav>
    <div class="lg:hidden items-center bg-white grow justify-between flex-col p-4 space-y-4 shadow-md" *ngIf="isMobileMenuOpen">
      <a (click)="router.navigate(['/landing'], { fragment: 'home' })" pRipple class="block text-gray-800 hover:text-blue-600 text-lg font-medium">Home</a>
      <a (click)="router.navigate(['/landing'], { fragment: 'features' })" pRipple class="block text-gray-800 hover:text-blue-600 text-lg font-medium">Features</a>
      <a (click)="router.navigate(['/landing'], { fragment: 'highlights' })" pRipple class="block text-gray-800 hover:text-blue-600 text-lg font-medium">Highlights</a>
      <a (click)="router.navigate(['/landing'], { fragment: 'pricing' })" pRipple class="block text-gray-800 hover:text-blue-600 text-lg font-medium">Pricing</a>
      <ng-container *ngIf="isAuthenticated && user">
        <div class="flex items-center space-x-2">
          <p-avatar
            [image]="(profilePhotoUrl$ | async) ?? undefined"
            shape="circle"
            size="normal"
            styleClass="w-10 h-10"
            [style]="{'background-color': '#e2e8f0', 'border': '2px solid #ffffff'}"
            [label]="user.firstName ? (user.firstName[0] + (user.lastName ? user.lastName[0] : '')) : ''"
          ></p-avatar>
          <span class="text-gray-800 font-medium">{{ user.firstName }} {{ user.lastName }}</span>
        </div>
        <button pButton pRipple label="Logout" (click)="logout()" [rounded]="true" class="bg-red-500 text-white hover:bg-red-600"></button>
      </ng-container>
      <ng-container *ngIf="!isAuthenticated || !user">
        <a pButton pRipple label="Login" routerLink="/auth/login" [rounded]="true" class="block text-gray-800 hover:text-blue-600"></a>
        <a pButton pRipple label="Register" routerLink="/auth/register" [rounded]="true" class="block bg-green-500 text-white hover:bg-green-600"></a>
      </ng-container>
    </div>
  `
})
export class TopbarWidget implements OnInit {
  isMobileMenuOpen = false;
  isAuthenticated: boolean = false;
  user: User | null = null;
  profilePhotoUrl$: Observable<string | undefined> = of(undefined);

  constructor(public router: Router, private authService: AuthService) {}

  ngOnInit(): void {
    this.checkAuthentication();
  }

  checkAuthentication(): void {
    this.isAuthenticated = this.authService.isAuthenticated();
    if (this.isAuthenticated) {
      this.user = this.authService.getStoredUser();
      if (this.user?.id) {
        this.loadProfilePhoto(this.user.id);
      }
    }
  }

  loadProfilePhoto(userId: number): void {
    this.profilePhotoUrl$ = this.authService.getProfilePhoto(userId).pipe(
      map((blob: Blob) => (blob.size > 0 ? URL.createObjectURL(blob) : undefined)),
      catchError(() => of(undefined))
    );
  }

  toggleMobileMenu(): void {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
  }
  navigateToAuth(mode: 'login' | 'register'): void {
    this.router.navigate(['/authentication'], { queryParams: { mode } });
  }

  logout(): void {
    this.authService.logout().subscribe({
      next: () => {
        this.isAuthenticated = false;
        this.user = null;
        this.profilePhotoUrl$ = of(undefined);
        this.router.navigate(['/home']);
      },
      error: (err) => {
        console.error('Logout error:', err);
        this.isAuthenticated = false;
        this.user = null;
        this.profilePhotoUrl$ = of(undefined);
        this.router.navigate(['/auth/login']);
      }
    });
  }
}