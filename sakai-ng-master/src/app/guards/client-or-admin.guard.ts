// src/app/guards/client-or-admin.guard.ts
import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class ClientOrAdminGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): boolean {
    // Only CLIENT and ADMINISTRATOR can access
    if (this.authService.hasAnyRole('CLIENT', 'ADMINISTRATOR')) {
      return true;
    } else {
      // Redirect to not-found page for unauthorized users
      this.router.navigate(['/notfound']);
      return false;
    }
  }
}

