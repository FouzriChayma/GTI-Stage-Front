// src/app/guards/client.guard.ts
import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class ClientGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): boolean {
    if (this.authService.isClient()) {
      return true; // Allow access if user is CLIENT
    } else {
      // Redirect to not-found page for unauthorized users
      this.router.navigate(['/notfound']);
      return false;
    }
  }
}

