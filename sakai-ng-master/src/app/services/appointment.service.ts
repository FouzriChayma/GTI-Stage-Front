import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { Appointment } from '../models/appointment';

@Injectable({
  providedIn: 'root',
})
export class AppointmentService {
  private apiUrl = '/api/appointments';

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      Authorization: token ? `Bearer ${token}` : '',
      'Content-Type': 'application/json',
      Accept: 'application/json',
    });
  }

  createAppointment(appointment: Appointment): Observable<Appointment> {
    return this.http
      .post<Appointment>(this.apiUrl, appointment, { headers: this.getHeaders(), responseType: 'json' })
      .pipe(
        catchError((error) => {
          console.error('Error creating appointment:', error);
          return throwError(() => error);
        })
      );
  }

  updateAppointment(id: number, appointment: Appointment): Observable<Appointment> {
    return this.http
      .put<Appointment>(`${this.apiUrl}/${id}`, appointment, { headers: this.getHeaders(), responseType: 'json' })
      .pipe(
        catchError((error) => {
          console.error(`Error updating appointment ${id}:`, error);
          return throwError(() => error);
        })
      );
  }

  cancelAppointment(id: number): Observable<void> {
    return this.http
      .delete<void>(`${this.apiUrl}/${id}`, { headers: this.getHeaders(), responseType: 'json' })
      .pipe(
        catchError((error) => {
          console.error(`Error cancelling appointment ${id}:`, error);
          return throwError(() => error);
        })
      );
  }

  getAppointment(id: number): Observable<Appointment> {
    return this.http
      .get<Appointment>(`${this.apiUrl}/${id}`, { headers: this.getHeaders(), responseType: 'json' })
      .pipe(
        catchError((error) => {
          console.error(`Error fetching appointment ${id}:`, error);
          return throwError(() => error);
        })
      );
  }

  getAvailableSlots(start: string, end: string): Observable<Appointment[]> {
    const params = new HttpParams().set('start', start).set('end', end);
    return this.http
      .get<Appointment[]>(`${this.apiUrl}/available`, { headers: this.getHeaders(), params, responseType: 'json' })
      .pipe(
        map((data) => data || []),
        catchError((error) => {
          console.error('Error fetching available slots:', error);
          return throwError(() => error);
        })
      );
  }

  getUserAppointments(userId: number): Observable<Appointment[]> {
    return this.http
      .get<Appointment[]>(`${this.apiUrl}/user/${userId}`, { headers: this.getHeaders(), responseType: 'json' })
      .pipe(
        map((data) => data || []),
        catchError((error) => {
          console.error(`Error fetching user appointments for user ${userId}:`, error);
          return throwError(() => error);
        })
      );
  }

  searchAppointments(
    userId?: number,
    startDate?: string,
    endDate?: string,
    status?: string,
    notes?: string,
    isNotified?: boolean
  ): Observable<Appointment[]> {
    let params = new HttpParams();
    if (userId) params = params.set('userId', userId.toString());
    if (startDate) params = params.set('startDate', startDate);
    if (endDate) params = params.set('endDate', endDate);
    if (status) params = params.set('status', status);
    if (notes) params = params.set('notes', notes);
    if (isNotified !== undefined) params = params.set('isNotified', isNotified.toString());

    return this.http
      .get<Appointment[]>(`${this.apiUrl}/search`, { headers: this.getHeaders(), params, responseType: 'json' })
      .pipe(
        map((data) => data || []),
        catchError((error) => {
          console.error('Error searching appointments:', error);
          return throwError(() => error);
        })
      );
  }
}