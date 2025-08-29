import { Injectable } from '@angular/core';
import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpErrorResponse,
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';
import { User } from '../models/User';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private isRefreshing = false;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const token = this.authService.getToken();
    let authReq = req;

    if (token && !req.url.includes('/api/auth/login') && !req.url.includes('/api/auth/refresh-token')) {
      authReq = req.clone({
        headers: req.headers.set('Authorization', `Bearer ${token}`),
      });
    }

    return next.handle(authReq).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401 && !req.url.includes('/api/auth/refresh-token') && !this.isRefreshing) {
          return this.handle401Error(authReq, next);
        }
        return throwError(() => error);
      })
    );
  }

  private handle401Error(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    this.isRefreshing = true;
    return this.authService.refreshToken().pipe(
      switchMap((response: User) => {
        this.isRefreshing = false;
        const authReq = req.clone({
          headers: req.headers.set('Authorization', `Bearer ${response.token}`),
        });
        return next.handle(authReq);
      }),
      catchError((error) => {
        this.isRefreshing = false;
        this.authService.logout().subscribe({
          next: () => {
            this.router.navigate(['/login']);
          },
        });
        return throwError(() => new Error('Session expired. Please log in again.'));
      })
    );
  }
}