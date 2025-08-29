import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AppointmentService } from '../../services/appointment.service';
import { MessageService } from 'primeng/api';
import { Appointment } from '../../models/appointment';
import { User } from '../../models/User';
import { AuthService } from '../../services/auth.service'; // Import AuthService
import { lastValueFrom } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { RippleModule } from 'primeng/ripple';
import { ToastModule } from 'primeng/toast';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/dropdown';
import { CalendarModule } from 'primeng/calendar';
import { ProgressSpinnerModule } from 'primeng/progressspinner';

@Component({
  selector: 'app-schedule-meeting',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    RippleModule,
    ToastModule,
    InputTextModule,
    DropdownModule,
    CalendarModule,
    ProgressSpinnerModule
  ],
  templateUrl: './schedule-meeting.component.html',
  styleUrls: ['./schedule-meeting.component.scss'],
  providers: [MessageService, AppointmentService]
})
export class ScheduleMeetingComponent implements OnInit {
  appointment: Appointment = this.createEmptyAppointment();
  isSaving = false;
  isLoading = false;
  currentUser: User | null = null;
  minDate: Date = new Date();

  durationOptions = [
    { label: '30 minutes', value: 30 },
    { label: '60 minutes', value: 60 },
    { label: '90 minutes', value: 90 }
  ];

  availableSlots: Date[] = [];

  constructor(
    private appointmentService: AppointmentService,
    private messageService: MessageService,
    private router: Router,
    private authService: AuthService // Inject AuthService instead of HttpClient
  ) {}

  async ngOnInit() {
    await this.loadCurrentUser();
  }

  private async loadCurrentUser() {
    this.isLoading = true;
    try {
      this.currentUser = await lastValueFrom(this.authService.getCurrentUser());
      if (!this.currentUser) {
        this.showError('User not authenticated');
        return;
      }
      this.appointment.user = this.currentUser;
    } catch (error) {
      console.error('User load error:', error);
      this.showError('Failed to load user information', error);
    } finally {
      this.isLoading = false;
    }
  }

  private createEmptyAppointment(): Appointment {
    const defaultDate = new Date();
    defaultDate.setHours(9, 0, 0, 0);
    return {
      user: { id: 0, email: '', password: '', firstName: '', lastName: '', phoneNumber: '', role: '', isActive: true, createdAt: '', updatedAt: '', profilePhotoPath: '' },
      appointmentDateTime: defaultDate,
      durationMinutes: 30,
      status: 'SCHEDULED',
      notes: '',
      isNotified: false
    };
  }

  loadAvailableSlots(dateTime: Date) {
    const dateStr = dateTime.toISOString().split('T')[0];
    const start = `${dateStr}T00:00:00`;
    const end = `${dateStr}T23:59:59`;
    this.appointmentService.getAvailableSlots(start, end).subscribe({
      next: slots => this.availableSlots = slots.map(slot => new Date(slot.appointmentDateTime)),
      error: (err: any) => this.showError('Failed to load available slots', err)
    });
  }

  saveAppointment() {
    if (!this.validateForm()) return;
    this.isSaving = true;
    this.appointmentService.createAppointment(this.appointment).subscribe({
      next: () => {
        this.showSuccess('Appointment scheduled successfully');
        this.router.navigate(['/home']);
      },
      error: (err: any) => {
        this.showError('Failed to schedule appointment', err);
        this.isSaving = false;
      },
      complete: () => this.isSaving = false
    });
  }

  private validateForm(): boolean {
    const requiredFields = [
      { field: this.currentUser && this.appointment.user.id > 0, message: 'User information is missing' },
      { field: this.appointment.appointmentDateTime, message: 'Appointment date and time are required' },
      { field: !this.isPastDate(this.appointment.appointmentDateTime), message: 'Appointment cannot be in the past' },
      { field: this.appointment.durationMinutes > 0, message: 'Duration must be greater than 0' }
    ];
    for (const { field, message } of requiredFields) {
      if (!field) {
        this.showError(message);
        return false;
      }
    }
    return true;
  }

  isPastDate(dateTime: Date): boolean {
    return dateTime < new Date();
  }

  cancel() {
    this.router.navigate(['/home']);
  }

  private showSuccess(message: string) {
    this.messageService.add({ severity: 'success', summary: 'Success', detail: message, life: 3000 });
  }

  private showError(message: string, error?: any) {
    const errorMessage = error?.error?.message || error?.message || 'Unknown error';
    this.messageService.add({ severity: 'error', summary: 'Error', detail: `${message}: ${errorMessage}`, life: 3000 });
  }
}