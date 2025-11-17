import { Component, OnInit, OnDestroy } from '@angular/core';
import { StyleClassModule } from 'primeng/styleclass';
import { Router, RouterModule } from '@angular/router';
import { RippleModule } from 'primeng/ripple';
import { ButtonModule } from 'primeng/button';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';
import { User } from '../../models/User';
import { AvatarModule } from 'primeng/avatar';
import { TooltipModule } from 'primeng/tooltip';
import { Observable, of, Subject } from 'rxjs';
import { catchError, map, takeUntil } from 'rxjs/operators';
import { NotificationBellComponent } from '../notifications/notification-bell.component';

@Component({
  selector: 'topbar-widget',
  standalone: true,
  imports: [RouterModule, StyleClassModule, ButtonModule, RippleModule, CommonModule, AvatarModule, TooltipModule, NotificationBellComponent],
  template: `
    <nav class="flex items-center justify-between w-full p-6">
      <div class="flex items-center">
        <a (click)="router.navigate(['/home'])" pRipple class="cursor-pointer">
          <span class="text-2xl font-bold text-gray-800">E-Trade Banking</span>
        </a>
      </div>
      <!-- Desktop Navigation Links -->
      <div class="lg:flex items-center space-x-6 hidden lg:flex">
        <!-- Not Authenticated -->
        <ng-container *ngIf="!isAuthenticated">
          <a (click)="router.navigate(['/home'])" pRipple class="text-gray-800 hover:text-blue-600 text-lg font-medium cursor-pointer">Home</a>
          <a (click)="router.navigate(['/landing'], { fragment: 'features' })" pRipple class="text-gray-800 hover:text-blue-600 text-lg font-medium cursor-pointer">Features</a>
        </ng-container>
        
        <!-- CLIENT Navigation -->
        <ng-container *ngIf="isAuthenticated && isClient">
          <a (click)="router.navigate(['/home'])" pRipple class="text-gray-800 hover:text-blue-600 text-lg font-medium cursor-pointer">Home</a>
          <a (click)="router.navigate(['/InitialTransfer'])" pRipple class="text-gray-800 hover:text-blue-600 text-lg font-medium cursor-pointer">Initiate Transfer</a>
          <a (click)="router.navigate(['/meeting'])" pRipple class="text-gray-800 hover:text-blue-600 text-lg font-medium cursor-pointer">Schedule Meeting</a>
          <a (click)="router.navigate(['/discussion'])" pRipple class="text-gray-800 hover:text-blue-600 text-lg font-medium cursor-pointer">
            <i class="pi pi-comments mr-1"></i>Chat Support
          </a>
          <a (click)="router.navigate(['/profile'])" pRipple class="text-gray-800 hover:text-blue-600 text-lg font-medium cursor-pointer">Profile</a>
        </ng-container>
        
        <!-- CHARGE_CLIENTELE Navigation -->
        <ng-container *ngIf="isAuthenticated && isChargeClientele">
          <a (click)="router.navigate(['/home'])" pRipple class="text-gray-800 hover:text-blue-600 text-lg font-medium cursor-pointer">Home</a>
          <a (click)="router.navigate(['/discussion'])" pRipple class="text-gray-800 hover:text-blue-600 text-lg font-medium cursor-pointer">
            <i class="pi pi-comments mr-1"></i>Customer Support
          </a>
          <a (click)="router.navigate(['/profile'])" pRipple class="text-gray-800 hover:text-blue-600 text-lg font-medium cursor-pointer">Profile</a>
        </ng-container>
        
        <!-- ADMINISTRATOR Navigation -->
        <ng-container *ngIf="isAuthenticated && isAdmin">
          <a (click)="router.navigate(['/home'])" pRipple class="text-gray-800 hover:text-blue-600 text-lg font-medium cursor-pointer">Home</a>
          <a (click)="router.navigate(['/dashboard'])" pRipple class="text-gray-800 hover:text-blue-600 text-lg font-medium cursor-pointer">Dashboard</a>
          <a (click)="router.navigate(['/users'])" pRipple class="text-gray-800 hover:text-blue-600 text-lg font-medium cursor-pointer">Users</a>
          <a (click)="router.navigate(['/transfer-requests'])" pRipple class="text-gray-800 hover:text-blue-600 text-lg font-medium cursor-pointer">Transfer Requests</a>
          <a (click)="router.navigate(['/admin-profile'])" pRipple class="text-gray-800 hover:text-blue-600 text-lg font-medium cursor-pointer">Profile</a>
        </ng-container>
      </div>
      <div class="flex items-center space-x-4">
        <ng-container *ngIf="isAuthenticated && user; else notAuthenticated">
          <app-notification-bell *ngIf="isAuthenticated"></app-notification-bell>
          <div class="flex items-center space-x-2">
            <p-avatar
              *ngIf="(profilePhotoUrl$ | async) as photoUrl"
              [image]="photoUrl"
              shape="circle"
              size="normal"
              styleClass="w-10 h-10"
              [style]="{'border': '2px solid #ffffff'}"
            ></p-avatar>
            <p-avatar
              *ngIf="!(profilePhotoUrl$ | async)"
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
    <!-- Mobile Navigation Menu -->
    <div class="lg:hidden items-center bg-white grow justify-between flex-col p-4 space-y-4 shadow-md" *ngIf="isMobileMenuOpen">
      <!-- Not Authenticated Mobile Menu -->
      <ng-container *ngIf="!isAuthenticated">
        <a (click)="router.navigate(['/home']); toggleMobileMenu()" pRipple class="block text-gray-800 hover:text-blue-600 text-lg font-medium cursor-pointer">Home</a>
        <a (click)="router.navigate(['/landing'], { fragment: 'features' }); toggleMobileMenu()" pRipple class="block text-gray-800 hover:text-blue-600 text-lg font-medium cursor-pointer">Features</a>
      </ng-container>
      
      <!-- CLIENT Mobile Menu -->
      <ng-container *ngIf="isAuthenticated && isClient">
        <a (click)="router.navigate(['/home']); toggleMobileMenu()" pRipple class="block text-gray-800 hover:text-blue-600 text-lg font-medium cursor-pointer">Home</a>
        <a (click)="router.navigate(['/InitialTransfer']); toggleMobileMenu()" pRipple class="block text-gray-800 hover:text-blue-600 text-lg font-medium cursor-pointer">Initiate Transfer</a>
        <a (click)="router.navigate(['/meeting']); toggleMobileMenu()" pRipple class="block text-gray-800 hover:text-blue-600 text-lg font-medium cursor-pointer">Schedule Meeting</a>
        <a (click)="router.navigate(['/discussion']); toggleMobileMenu()" pRipple class="block text-gray-800 hover:text-blue-600 text-lg font-medium cursor-pointer">
          <i class="pi pi-comments mr-1"></i>Chat Support
        </a>
        <a (click)="router.navigate(['/profile']); toggleMobileMenu()" pRipple class="block text-gray-800 hover:text-blue-600 text-lg font-medium cursor-pointer">Profile</a>
      </ng-container>
      
      <!-- CHARGE_CLIENTELE Mobile Menu -->
      <ng-container *ngIf="isAuthenticated && isChargeClientele">
        <a (click)="router.navigate(['/home']); toggleMobileMenu()" pRipple class="block text-gray-800 hover:text-blue-600 text-lg font-medium cursor-pointer">Home</a>
        <a (click)="router.navigate(['/discussion']); toggleMobileMenu()" pRipple class="block text-gray-800 hover:text-blue-600 text-lg font-medium cursor-pointer">
          <i class="pi pi-comments mr-1"></i>Customer Support
        </a>
        <a (click)="router.navigate(['/profile']); toggleMobileMenu()" pRipple class="block text-gray-800 hover:text-blue-600 text-lg font-medium cursor-pointer">Profile</a>
      </ng-container>
      
      <!-- ADMINISTRATOR Mobile Menu -->
      <ng-container *ngIf="isAuthenticated && isAdmin">
        <a (click)="router.navigate(['/home']); toggleMobileMenu()" pRipple class="block text-gray-800 hover:text-blue-600 text-lg font-medium cursor-pointer">Home</a>
        <a (click)="router.navigate(['/dashboard']); toggleMobileMenu()" pRipple class="block text-gray-800 hover:text-blue-600 text-lg font-medium cursor-pointer">Dashboard</a>
        <a (click)="router.navigate(['/users']); toggleMobileMenu()" pRipple class="block text-gray-800 hover:text-blue-600 text-lg font-medium cursor-pointer">Users</a>
        <a (click)="router.navigate(['/transfer-requests']); toggleMobileMenu()" pRipple class="block text-gray-800 hover:text-blue-600 text-lg font-medium cursor-pointer">Transfer Requests</a>
        <a (click)="router.navigate(['/admin-profile']); toggleMobileMenu()" pRipple class="block text-gray-800 hover:text-blue-600 text-lg font-medium cursor-pointer">Profile</a>
      </ng-container>
      
      <!-- User Info and Logout -->
      <ng-container *ngIf="isAuthenticated && user">
        <div class="flex items-center justify-center pt-4 border-t mb-2">
          <app-notification-bell></app-notification-bell>
        </div>
        <div class="flex items-center space-x-2">
          <p-avatar
            *ngIf="(profilePhotoUrl$ | async) as photoUrl"
            [image]="photoUrl"
            shape="circle"
            size="normal"
            styleClass="w-10 h-10"
            [style]="{'border': '2px solid #ffffff'}"
          ></p-avatar>
          <p-avatar
            *ngIf="!(profilePhotoUrl$ | async)"
            shape="circle"
            size="normal"
            styleClass="w-10 h-10"
            [style]="{'background-color': '#e2e8f0', 'border': '2px solid #ffffff'}"
            [label]="user.firstName ? (user.firstName[0] + (user.lastName ? user.lastName[0] : '')) : ''"
          ></p-avatar>
          <span class="text-gray-800 font-medium">{{ user.firstName }} {{ user.lastName }}</span>
        </div>
        <button pButton pRipple label="Logout" (click)="logout(); toggleMobileMenu()" [rounded]="true" class="bg-red-500 text-white hover:bg-red-600 w-full"></button>
      </ng-container>
      
      <!-- Login/Register for Not Authenticated -->
      <ng-container *ngIf="!isAuthenticated || !user">
        <a pButton pRipple label="Login" (click)="navigateToAuth('login'); toggleMobileMenu()" [rounded]="true" class="block text-gray-800 hover:text-blue-600 w-full text-center"></a>
        <a pButton pRipple label="Register" (click)="navigateToAuth('register'); toggleMobileMenu()" [rounded]="true" class="block bg-green-500 text-white hover:bg-green-600 w-full text-center"></a>
      </ng-container>
    </div>
  `
})
export class TopbarWidget implements OnInit, OnDestroy {
  isMobileMenuOpen = false;
  isAuthenticated: boolean = false;
  user: User | null = null;
  profilePhotoUrl$: Observable<string | undefined> = of(undefined);
  isClient: boolean = false;
  isChargeClientele: boolean = false;
  isAdmin: boolean = false;
  private destroy$ = new Subject<void>();

  constructor(
    public router: Router, 
    private authService: AuthService,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    this.checkAuthentication();
    
    // Connect to notification service when authenticated
    if (this.isAuthenticated) {
      this.notificationService.connect();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  checkAuthentication(): void {
    this.isAuthenticated = this.authService.isAuthenticated();
    if (this.isAuthenticated) {
      this.user = this.authService.getStoredUser();
      this.isClient = this.authService.isClient();
      this.isChargeClientele = this.authService.isChargeClientele();
      this.isAdmin = this.authService.isAdmin();
      if (this.user?.id) {
        // Load profile photo if user has one
        if (this.user.profilePhotoPath && this.user.profilePhotoPath.trim() !== "") {
          this.loadProfilePhoto(this.user.id);
        } else {
          this.profilePhotoUrl$ = of(undefined);
        }
      }
    }
  }

  loadProfilePhoto(userId: number): void {
    this.profilePhotoUrl$ = this.authService.getProfilePhoto(userId).pipe(
      map((blob: Blob) => {
        if (blob && blob.size > 0) {
          return URL.createObjectURL(blob);
        }
        return undefined;
      }),
      catchError((err) => {
        console.error('Failed to load profile photo:', err);
        return of(undefined);
      })
    );
  }

  toggleMobileMenu(): void {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
  }
  navigateToAuth(mode: 'login' | 'register'): void {
    this.router.navigate(['/authentication'], { queryParams: { mode } });
  }

  logout(): void {
    // Disconnect notifications before logout
    this.notificationService.disconnect();
    
    this.authService.logout().subscribe({
      next: () => {
        this.isAuthenticated = false;
        this.user = null;
        this.isClient = false;
        this.isChargeClientele = false;
        this.isAdmin = false;
        this.profilePhotoUrl$ = of(undefined);
        this.router.navigate(['/home']);
      },
      error: (err) => {
        console.error('Logout error:', err);
        this.isAuthenticated = false;
        this.user = null;
        this.isClient = false;
        this.isChargeClientele = false;
        this.isAdmin = false;
        this.profilePhotoUrl$ = of(undefined);
        this.router.navigate(['/auth/login']);
      }
    });
  }
}