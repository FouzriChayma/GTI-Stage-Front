import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Appointment } from '../models/appointment';
import { Document } from '../models/document';

@Injectable({
  providedIn: 'root'
})
export class AppointmentService {
  private apiUrl = 'http://localhost:8083/api/appointments';

  constructor(private http: HttpClient) {}

  getAppointments(): Observable<Appointment[]> {
    return this.http.get<Appointment[]>(this.apiUrl);
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

    return this.http.get<Appointment[]>(`${this.apiUrl}/search`, { params });
  }

  getAppointment(id: number): Observable<Appointment> {
    return this.http.get<Appointment>(`${this.apiUrl}/${id}`);
  }

  createAppointment(appointment: Appointment): Observable<Appointment> {
    const requestBody = {
      userId: appointment.user.id,
      appointmentDateTime: appointment.appointmentDateTime,
      durationMinutes: appointment.durationMinutes,
      notes: appointment.notes
    };
    return this.http.post<Appointment>(this.apiUrl, requestBody);
  }

  createAppointmentWithDocument(appointment: Appointment, file: File): Observable<Appointment> {
    const formData = new FormData();
    const requestBody = {
      userId: appointment.user.id,
      appointmentDateTime: appointment.appointmentDateTime,
      durationMinutes: appointment.durationMinutes,
      notes: appointment.notes
    };
    formData.append('appointment', new Blob([JSON.stringify(requestBody)], { type: 'application/json' }));
    formData.append('document', file);
    return this.http.post<Appointment>(this.apiUrl, formData);
  }

  updateAppointment(id: number, appointment: Appointment): Observable<Appointment> {
    const requestBody = {
      userId: appointment.user.id,
      appointmentDateTime: appointment.appointmentDateTime,
      durationMinutes: appointment.durationMinutes,
      notes: appointment.notes,
      status: appointment.status
    };
    return this.http.put<Appointment>(`${this.apiUrl}/${id}`, requestBody);
  }

  cancelAppointment(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  getAvailableSlots(start: string, end: string): Observable<Appointment[]> {
    let params = new HttpParams()
      .set('start', start)
      .set('end', end);
    return this.http.get<Appointment[]>(`${this.apiUrl}/available`, { params });
  }

  uploadDocument(appointmentId: number, file: File): Observable<string> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post(`${this.apiUrl}/${appointmentId}/documents`, formData, { responseType: 'text' });
  }

  getDocuments(appointmentId: number): Observable<Document[]> {
    return this.http.get<Document[]>(`${this.apiUrl}/${appointmentId}/documents`);
  }

  deleteDocument(appointmentId: number, documentId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${appointmentId}/documents/${documentId}`);
  }

  downloadDocument(appointmentId: number, documentId: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/${appointmentId}/documents/${documentId}/download`, { responseType: 'blob' });
  }

  deleteMultipleAppointments(ids: number[]): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/batch`, { body: ids });
  }
}