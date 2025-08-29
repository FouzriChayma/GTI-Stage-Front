import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { User } from '../models/User';
import { environment } from '../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class AuthService {

    private user = {
    isAuthenticated: true, // Example: Check if user is logged in
    isAdmin: false        // Example: Check if user is admin
  };

  isAdmin(): boolean {
    const user = this.getStoredUser();
    // Check if user exists and has the 'admin' role
    return this.isAuthenticated() && user?.role === 'ADMINISTRATOR';
  }

  private apiUrl = `${environment.apiUrl}/api/auth`;

  constructor(private http: HttpClient) {}

  getApiUrl(): string {
    return this.apiUrl;
  }

  login(credentials: { email: string; password: string }): Observable<User> {
    return this.http.post<User>(`${this.apiUrl}/login`, credentials).pipe(
      map((response: User) => {
        if (!response || !response.token || !response.refreshToken) {
          throw new Error('Invalid login response: Missing user data or tokens');
        }
        this.storeUserData(response);
        return response;
      }),
      catchError((error) => {
        console.error('Login error:', error);
        return throwError(() => new Error(error.error?.message || 'Login failed'));
      })
    );
  }

  register(user: Partial<User>): Observable<User> {
    const payload = {
      email: user.email?.trim(),
      password: user.password?.trim(),
      firstName: user.firstName?.trim(),
      lastName: user.lastName?.trim(),
      phoneNumber: user.phoneNumber?.trim(),
      role: user.role,
    };
    return this.http.post<User>(`${this.apiUrl}/register`, payload).pipe(
      map((response: User) => {
        if (!response || !response.token || !response.refreshToken) {
          throw new Error('Invalid register response: Missing user data or tokens');
        }
        this.storeUserData(response);
        return response;
      }),
      catchError((error) => {
        console.error('Register error:', error);
        return throwError(() => new Error(error.error?.message || 'Registration failed'));
      })
    );
  }

  refreshToken(): Observable<User> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      return throwError(() => new Error('No refresh token available'));
    }
    return this.http.post<User>(`${this.apiUrl}/refresh-token`, { refreshToken }).pipe(
      map((response: User) => {
        if (!response || !response.token) {
          throw new Error('Invalid refresh token response');
        }
        this.storeUserData(response);
        return response;
      }),
      catchError((error) => {
        console.error('Refresh token error:', error);
        return throwError(() => new Error(error.error?.message || 'Failed to refresh token'));
      })
    );
  }

  logout(): Observable<void> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      this.clearUserData();
      return of(undefined);
    }
    return this.http.post<void>(`${this.apiUrl}/logout`, { refreshToken }).pipe(
      map(() => {
        this.clearUserData();
        return undefined;
      }),
      catchError((error) => {
        console.error('Logout error:', error);
        this.clearUserData();
        return of(undefined);
      })
    );
  }

  getCurrentUser(): Observable<User> {
    const headers = this.getAuthHeaders();
    return this.http.get<User>(`${this.apiUrl}/me`, { headers }).pipe(
      catchError((error) => {
        console.error('Get current user error:', error);
        return throwError(() => new Error(error.error?.message || 'Failed to fetch current user'));
      })
    );
  }

  getAllUsers(): Observable<User[]> {
    const headers = this.getAuthHeaders();
    return this.http.get<User[]>(`${this.apiUrl}/users`, { headers }).pipe(
      map((users) => (Array.isArray(users) ? users : [])),
      catchError((error) => {
        console.error('Get all users error:', error);
        return throwError(() => new Error(error.error?.message || 'Failed to fetch users'));
      })
    );
  }

  searchUsers(criteria: {
    email?: string;
    firstName?: string;
    lastName?: string;
    phoneNumber?: string;
    role?: string | null;
    isActive?: boolean | null;
  }): Observable<User[]> {
    let params = new HttpParams();
    if (criteria.email) params = params.set('email', criteria.email.trim());
    if (criteria.firstName) params = params.set('firstName', criteria.firstName.trim());
    if (criteria.lastName) params = params.set('lastName', criteria.lastName.trim());
    if (criteria.phoneNumber) params = params.set('phoneNumber', criteria.phoneNumber.trim());
    if (criteria.role) params = params.set('role', criteria.role);
    if (criteria.isActive !== null && criteria.isActive !== undefined) {
      params = params.set('isActive', criteria.isActive.toString());
    }

    const headers = this.getAuthHeaders();
    return this.http.get<User[]>(`${this.apiUrl}/users/search`, { headers, params }).pipe(
      map((response) => (Array.isArray(response) ? response : [])),
      catchError((error) => {
        console.error('Search users error:', error);
        return throwError(() => new Error(error.error?.message || 'Failed to search users'));
      })
    );
  }

  getUserById(id: number): Observable<User> {
    const headers = this.getAuthHeaders();
    return this.http.get<User>(`${this.apiUrl}/users/${id}`, { headers }).pipe(
      catchError((error) => {
        console.error('Get user by ID error:', error);
        return throwError(() => new Error(error.error?.message || 'Failed to fetch user'));
      })
    );
  }

  updateUser(id: number, user: Partial<User>): Observable<User> {
    const headers = this.getAuthHeaders();
    const payload = {
      email: user.email?.trim(),
      firstName: user.firstName?.trim(),
      lastName: user.lastName?.trim(),
      phoneNumber: user.phoneNumber?.trim(),
      role: user.role,
      password: user.password?.trim() || undefined, // Password is now valid due to updated User interface
    };
    return this.http.put<User>(`${this.apiUrl}/users/${id}`, payload, { headers }).pipe(
      catchError((error) => {
        console.error('Update user error:', error);
        return throwError(() => new Error(error.error?.message || 'Failed to update user'));
      })
    );
  }

  deleteUser(id: number): Observable<void> {
    const headers = this.getAuthHeaders();
    return this.http.delete<void>(`${this.apiUrl}/users/${id}`, { headers }).pipe(
      catchError((error) => {
        console.error('Delete user error:', error);
        return throwError(() => new Error(error.error?.message || 'Failed to delete user'));
      })
    );
  }

  uploadProfilePhoto(userId: number, file: File): Observable<User> {
    const headers = this.getAuthHeaders();
    const formData = new FormData();
    formData.append('file', file);
    return this.http
      .post<User>(`${this.apiUrl}/users/${userId}/profile-photo`, formData, { headers })
      .pipe(
        catchError((error) => {
          console.error('Upload profile photo error:', error);
          return throwError(() => new Error(error.error?.message || 'Failed to upload profile photo'));
        })
      );
  }

  deleteProfilePhoto(userId: number): Observable<void> {
    const headers = this.getAuthHeaders();
    return this.http.delete<void>(`${this.apiUrl}/users/${userId}/profile-photo`, { headers }).pipe(
      catchError((error) => {
        console.error('Delete profile photo error:', error);
        return throwError(() => new Error(error.error?.message || 'Failed to delete profile photo'));
      })
    );
  }

  storeUserData(user: User): void {
    localStorage.setItem('token', user.token || '');
    localStorage.setItem('refreshToken', user.refreshToken || '');
    localStorage.setItem(
      'user',
      JSON.stringify({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phoneNumber: user.phoneNumber,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        profilePhotoPath: user.profilePhotoPath,
      })
    );
  }

  getToken(): string | null {
    const token = localStorage.getItem('token');
    return token && token !== '' ? token : null;
  }

  getRefreshToken(): string | null {
    const refreshToken = localStorage.getItem('refreshToken');
    return refreshToken && refreshToken !== '' ? refreshToken : null;
  }

  getStoredUser(): User | null {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  }

  isAuthenticated(): boolean {
    const token = this.getToken();
    return !!token;
  }

  private clearUserData(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
  }

  private getAuthHeaders(): HttpHeaders {
    const token = this.getToken();
    return new HttpHeaders({
      Authorization: token ? `Bearer ${token}` : '',
    });
  }
  getProfilePhoto(userId: number): Observable<Blob> {
  const headers = this.getAuthHeaders();
  return this.http.get(`${this.apiUrl}/users/${userId}/profile-photo`, { headers, responseType: 'blob' }).pipe(
    catchError((error) => {
      console.error('Get profile photo error:', error);
      return throwError(() => new Error(error.error?.message || 'Failed to fetch profile photo'));
    })
  );
}
}