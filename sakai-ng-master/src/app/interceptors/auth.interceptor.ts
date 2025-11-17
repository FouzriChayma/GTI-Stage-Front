import { HttpInterceptorFn, HttpErrorResponse, HttpEvent } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

let isRefreshing = false;

export const authInterceptor: HttpInterceptorFn = (req, next): Observable<HttpEvent<unknown>> => {
  const authService = inject(AuthService);
  const router = inject(Router);
  
  const token = authService.getToken();
  let authReq = req;

  if (token && !req.url.includes('/api/auth/login') && !req.url.includes('/api/auth/refresh-token')) {
    // For FormData requests, don't set Content-Type (browser will set it with boundary)
    const isFormData = req.body instanceof FormData;
    if (isFormData) {
      authReq = req.clone({
        setHeaders: {
          'Authorization': `Bearer ${token}`
        }
      });
    } else {
      authReq = req.clone({
        headers: req.headers.set('Authorization', `Bearer ${token}`),
      });
    }
  }

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && !req.url.includes('/api/auth/refresh-token') && !isRefreshing) {
        return handle401Error(authReq, next, authService, router);
      }
      return throwError(() => error) as Observable<HttpEvent<unknown>>;
    })
  );
};

function handle401Error(
  req: any,
  next: any,
  authService: AuthService,
  router: Router
): Observable<HttpEvent<unknown>> {
  isRefreshing = true;
  return authService.refreshToken().pipe(
    switchMap((response: any) => {
      isRefreshing = false;
      const authReq = req.clone({
        headers: req.headers.set('Authorization', `Bearer ${response.token}`),
      });
      return next(authReq) as Observable<HttpEvent<unknown>>;
    }),
    catchError((error) => {
      isRefreshing = false;
      authService.logout().subscribe({
        next: () => {
          router.navigate(['/login']);
        },
      });
      return throwError(() => new Error('Session expired. Please log in again.')) as Observable<HttpEvent<unknown>>;
    })
  );
}