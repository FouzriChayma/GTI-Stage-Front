import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { Appointment } from '../models/appointment';

@Injectable({
  providedIn: 'root',
})
export class AppointmentService {
  private apiUrl = 'http://localhost:8083/api/appointments';

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
    // Transform Appointment to AppointmentRequestDTO format expected by backend
    if (!appointment.user?.id) {
      return throwError(() => new Error('User ID is required'));
    }

    // Ensure appointmentDateTime is a Date object
    let appointmentDateTime: Date;
    if (appointment.appointmentDateTime instanceof Date) {
      appointmentDateTime = appointment.appointmentDateTime;
    } else if (typeof appointment.appointmentDateTime === 'string') {
      appointmentDateTime = new Date(appointment.appointmentDateTime);
    } else {
      return throwError(() => new Error('Invalid appointment date and time'));
    }

    // Format as ISO string for backend (LocalDateTime expects ISO format)
    const requestBody = {
      userId: appointment.user.id,
      appointmentDateTime: appointmentDateTime.toISOString(),
      durationMinutes: appointment.durationMinutes,
      notes: appointment.notes || null
    };

    console.log('Sending appointment request:', requestBody);

    return this.http
      .post<Appointment>(this.apiUrl, requestBody, { headers: this.getHeaders(), responseType: 'json' })
      .pipe(
        catchError((error) => {
          console.error('Error creating appointment:', error);
          console.error('Error details:', {
            status: error?.status,
            statusText: error?.statusText,
            message: error?.message,
            error: error?.error
          });
          return throwError(() => error);
        })
      );
  }

  updateAppointment(id: number, appointment: Appointment): Observable<Appointment> {
    // Transform Appointment to AppointmentRequestDTO format expected by backend
    if (!appointment.user?.id) {
      return throwError(() => new Error('User ID is required'));
    }

    let appointmentDateTime: Date;
    if (appointment.appointmentDateTime instanceof Date) {
      appointmentDateTime = appointment.appointmentDateTime;
    } else if (typeof appointment.appointmentDateTime === 'string') {
      appointmentDateTime = new Date(appointment.appointmentDateTime);
    } else {
      return throwError(() => new Error('Invalid appointment date and time'));
    }

    const requestBody = {
      userId: appointment.user.id,
      appointmentDateTime: appointmentDateTime.toISOString(),
      durationMinutes: appointment.durationMinutes,
      notes: appointment.notes || null
    };

    return this.http
      .put<any>(`${this.apiUrl}/${id}`, requestBody, { headers: this.getHeaders(), responseType: 'json' })
      .pipe(
        map((data) => {
          // Transform response to Appointment format
          return {
            idAppointment: data.idAppointment,
            id: data.idAppointment,
            user: data.user || appointment.user,
            appointmentDateTime: data.appointmentDateTime ? new Date(data.appointmentDateTime) : appointmentDateTime,
            durationMinutes: data.durationMinutes || appointment.durationMinutes,
            status: data.status || appointment.status,
            notes: data.notes || appointment.notes,
            isNotified: data.isNotified || appointment.isNotified,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt
          } as Appointment;
        }),
        catchError((error) => {
          console.error(`Error updating appointment ${id}:`, error);
          return throwError(() => error);
        })
      );
  }

  confirmAppointment(id: number): Observable<Appointment> {
    return this.http
      .post<any>(`${this.apiUrl}/${id}/confirm`, {}, { headers: this.getHeaders(), responseType: 'json' })
      .pipe(
        map((data) => {
          // Transform backend response to frontend Appointment format
          return {
            idAppointment: data.idAppointment,
            id: data.idAppointment,
            user: data.user || {},
            appointmentDateTime: data.appointmentDateTime ? new Date(data.appointmentDateTime) : new Date(),
            durationMinutes: data.durationMinutes || 30,
            status: data.status || 'CONFIRMED',
            notes: data.notes || null,
            isNotified: data.isNotified || false,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt
          } as Appointment;
        }),
        catchError((error) => {
          console.error(`Error confirming appointment ${id}:`, error);
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

  completeAppointment(id: number): Observable<Appointment> {
    return this.http
      .post<any>(`${this.apiUrl}/${id}/complete`, {}, { headers: this.getHeaders(), responseType: 'json' })
      .pipe(
        map((data) => {
          // Transform backend response to frontend Appointment format
          return {
            idAppointment: data.idAppointment,
            id: data.idAppointment,
            user: data.user || {},
            appointmentDateTime: data.appointmentDateTime ? new Date(data.appointmentDateTime) : new Date(),
            durationMinutes: data.durationMinutes || 30,
            status: data.status || 'COMPLETED',
            notes: data.notes || null,
            isNotified: data.isNotified || false,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt
          } as Appointment;
        }),
        catchError((error) => {
          console.error(`Error completing appointment ${id}:`, error);
          return throwError(() => error);
        })
      );
  }

  getAppointment(id: number): Observable<Appointment> {
    return this.http
      .get<any>(`${this.apiUrl}/${id}`, { headers: this.getHeaders(), responseType: 'json' })
      .pipe(
        map((data) => {
          // Transform backend response to frontend Appointment format
          return {
            idAppointment: data.idAppointment,
            id: data.idAppointment,
            user: data.user || {},
            appointmentDateTime: data.appointmentDateTime ? new Date(data.appointmentDateTime) : new Date(),
            durationMinutes: data.durationMinutes || 30,
            status: data.status || 'SCHEDULED',
            notes: data.notes || null,
            isNotified: data.isNotified || false,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt
          } as Appointment;
        }),
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
      .get<any[]>(`${this.apiUrl}/user/${userId}`, { headers: this.getHeaders(), responseType: 'json' })
      .pipe(
        map((data) => {
          if (!data || !Array.isArray(data)) return [];
          // Transform backend response to frontend Appointment format
          return data.map(item => ({
            idAppointment: item.idAppointment,
            id: item.idAppointment, // For compatibility
            user: item.user || {},
            appointmentDateTime: item.appointmentDateTime ? new Date(item.appointmentDateTime) : new Date(),
            durationMinutes: item.durationMinutes || 30,
            status: item.status || 'SCHEDULED',
            notes: item.notes || null,
            isNotified: item.isNotified || false,
            createdAt: item.createdAt,
            updatedAt: item.updatedAt
          } as Appointment));
        }),
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
      .get<any[]>(`${this.apiUrl}/search`, { headers: this.getHeaders(), params, responseType: 'json' })
      .pipe(
        map((data) => {
          if (!data || !Array.isArray(data)) return [];
          // Transform backend response to frontend Appointment format
          return data.map(item => ({
            idAppointment: item.idAppointment,
            id: item.idAppointment, // For compatibility
            user: item.user || {},
            appointmentDateTime: item.appointmentDateTime ? new Date(item.appointmentDateTime) : new Date(),
            durationMinutes: item.durationMinutes || 30,
            status: item.status || 'SCHEDULED',
            notes: item.notes || null,
            isNotified: item.isNotified || false,
            createdAt: item.createdAt,
            updatedAt: item.updatedAt
          } as Appointment));
        }),
        catchError((error) => {
          console.error('Error searching appointments:', error);
          return throwError(() => error);
        })
      );
  }
}