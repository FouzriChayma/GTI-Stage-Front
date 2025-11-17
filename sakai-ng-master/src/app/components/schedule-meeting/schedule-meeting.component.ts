import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AppointmentService } from '../../services/appointment.service';
import { MessageService } from 'primeng/api';
import { Appointment } from '../../models/appointment';
import { User } from '../../models/User';
import { AuthService } from '../../services/auth.service';
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
import { TopbarWidget } from '../home/topbarwidget.component';

interface DayInfo {
  date: Date;
  dayNumber: number;
  slotsAvailable: number;
  isFullyBooked: boolean;
  isSelected: boolean;
  isPast: boolean;
}

interface TimeSlot {
  time: string;
  dateTime: Date;
  isAvailable: boolean;
  isSelected: boolean;
}

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
    ProgressSpinnerModule,
    TopbarWidget
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

  // Calendar state
  currentMonth: Date = new Date();
  selectedDate: Date | null = null;
  days: DayInfo[] = [];
  totalAvailableSlots = 0;

  // Time slots
  timeSlots: TimeSlot[] = [];
  selectedTimeSlot: TimeSlot | null = null;

  durationOptions = [
    { label: '30 minutes', value: 30 },
    { label: '60 minutes', value: 60 },
    { label: '90 minutes', value: 90 }
  ];

  meetingTypeOptions = [
    { label: 'Video Call', value: 'VIDEO_CALL' },
    { label: 'Phone Call', value: 'PHONE_CALL' },
    { label: 'In Person', value: 'IN_PERSON' }
  ];

  constructor(
    private appointmentService: AppointmentService,
    private messageService: MessageService,
    private router: Router,
    private authService: AuthService
  ) {}

  async ngOnInit() {
    await this.loadCurrentUser();
    this.initializeCalendar();
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

  initializeCalendar() {
    this.generateDays();
    this.loadMonthAvailability();
  }

  generateDays() {
    const year = this.currentMonth.getFullYear();
    const month = this.currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay();

    this.days = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Add empty cells for days before month starts
    for (let i = 0; i < startDayOfWeek; i++) {
      this.days.push({
        date: new Date(year, month, -startDayOfWeek + i + 1),
        dayNumber: 0,
        slotsAvailable: 0,
        isFullyBooked: false,
        isSelected: false,
        isPast: true
      });
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      date.setHours(0, 0, 0, 0);
      const isPast = date < today;
      
      this.days.push({
        date: date,
        dayNumber: day,
        slotsAvailable: 0,
        isFullyBooked: false,
        isSelected: false,
        isPast: isPast
      });
    }
  }

  loadMonthAvailability() {
    // Get all appointments to calculate availability
    this.appointmentService.searchAppointments(undefined, undefined, undefined).subscribe({
      next: (allAppointments) => {
        const year = this.currentMonth.getFullYear();
        const month = this.currentMonth.getMonth();
        
        // Group appointments by date
        const appointmentsByDate = new Map<string, number>();
        allAppointments.forEach(apt => {
          const aptDate = new Date(apt.appointmentDateTime);
          if (aptDate.getFullYear() === year && aptDate.getMonth() === month) {
            const dateKey = aptDate.toISOString().split('T')[0];
            appointmentsByDate.set(dateKey, (appointmentsByDate.get(dateKey) || 0) + 1);
          }
        });

        // Calculate available slots per day (9 AM to 5 PM = 9 slots per day)
        const slotsPerDay = 9; // 9:00, 10:00, 11:00, 12:00, 13:00, 14:00, 15:00, 16:00, 17:00
        let totalAvailable = 0;

        // Update days with slot counts
        this.days.forEach(day => {
          if (day.dayNumber > 0 && !day.isPast) {
            const dateKey = day.date.toISOString().split('T')[0];
            const bookedCount = appointmentsByDate.get(dateKey) || 0;
            const available = slotsPerDay - bookedCount;
            day.slotsAvailable = Math.max(0, available);
            day.isFullyBooked = available <= 0;
            totalAvailable += available;
          } else if (day.dayNumber > 0 && day.isPast) {
            day.slotsAvailable = 0;
            day.isFullyBooked = true;
          }
        });

        this.totalAvailableSlots = totalAvailable;
      },
      error: (err: any) => {
        console.error('Failed to load month availability:', err);
        // Fallback: assume all future days have slots
        const slotsPerDay = 9;
        let totalAvailable = 0;
        this.days.forEach(day => {
          if (day.dayNumber > 0 && !day.isPast) {
            day.slotsAvailable = slotsPerDay;
            day.isFullyBooked = false;
            totalAvailable += slotsPerDay;
          }
        });
        this.totalAvailableSlots = totalAvailable;
      }
    });
  }

  selectDate(day: DayInfo) {
    if (day.dayNumber === 0 || day.isPast) return;

    // Deselect previous date
    this.days.forEach(d => d.isSelected = false);
    day.isSelected = true;
    this.selectedDate = new Date(day.date);
    this.selectedTimeSlot = null;

    this.loadTimeSlotsForDate(day.date);
  }

  loadTimeSlotsForDate(date: Date) {
    const dateStr = date.toISOString().split('T')[0];
    const start = `${dateStr}T00:00:00`;
    const end = `${dateStr}T23:59:59`;

    // First, get all existing appointments for this date
    this.appointmentService.searchAppointments(undefined, undefined, undefined).subscribe({
      next: (allAppointments) => {
        // Filter appointments for this specific date
        const dateAppointments = allAppointments.filter(apt => {
          const aptDate = new Date(apt.appointmentDateTime);
          return aptDate.toISOString().split('T')[0] === dateStr;
        });

        // Create a set of booked hours
        const bookedHours = new Set<number>();
        dateAppointments.forEach(apt => {
          const aptDate = new Date(apt.appointmentDateTime);
          bookedHours.add(aptDate.getHours());
        });

        // Generate all time slots for the day (9 AM to 5 PM)
        const allSlots: TimeSlot[] = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const selectedDateOnly = new Date(date);
        selectedDateOnly.setHours(0, 0, 0, 0);

        for (let hour = 9; hour <= 17; hour++) {
          const slotDate = new Date(date);
          slotDate.setHours(hour, 0, 0, 0);
          const timeStr = this.formatTime(slotDate);
          
          // Check if this slot is available (not booked and not in the past)
          const isPast = slotDate < new Date();
          const isBooked = bookedHours.has(hour);
          const isAvailable = !isPast && !isBooked;

          allSlots.push({
            time: timeStr,
            dateTime: slotDate,
            isAvailable: isAvailable,
            isSelected: false
          });
        }

        this.timeSlots = allSlots;
      },
      error: (err: any) => {
        console.error('Failed to load appointments:', err);
        // If error, show all slots as available (fallback)
        const allSlots: TimeSlot[] = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const selectedDateOnly = new Date(date);
        selectedDateOnly.setHours(0, 0, 0, 0);

        for (let hour = 9; hour <= 17; hour++) {
          const slotDate = new Date(date);
          slotDate.setHours(hour, 0, 0, 0);
          const timeStr = this.formatTime(slotDate);
          const isPast = slotDate < new Date();
          
          allSlots.push({
            time: timeStr,
            dateTime: slotDate,
            isAvailable: !isPast,
            isSelected: false
          });
        }
        this.timeSlots = allSlots;
      }
    });
  }

  selectTimeSlot(slot: TimeSlot) {
    if (!slot.isAvailable) return;

    this.timeSlots.forEach(s => s.isSelected = false);
    slot.isSelected = true;
    this.selectedTimeSlot = slot;

    // Update appointment
    this.appointment.appointmentDateTime = slot.dateTime;
  }

  previousMonth() {
    this.currentMonth = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth() - 1, 1);
    this.initializeCalendar();
  }

  nextMonth() {
    this.currentMonth = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth() + 1, 1);
    this.initializeCalendar();
  }

  getMonthYearString(): string {
    return this.currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }

  formatTime(date: Date): string {
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  }

  formatSelectedDate(): string {
    if (!this.selectedDate) return '';
    return this.selectedDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  }

  confirmMeeting() {
    if (!this.selectedDate || !this.selectedTimeSlot) {
      this.showError('Please select a date and time slot');
      return;
    }

    if (!this.currentUser || !this.currentUser.id) {
      this.showError('User information is missing. Please refresh the page.');
      return;
    }

    // Ensure appointment has all required fields
    this.appointment.user = this.currentUser;
    this.appointment.appointmentDateTime = this.selectedTimeSlot.dateTime;
    this.appointment.status = 'SCHEDULED';
    this.appointment.isNotified = false;

    if (!this.appointment.durationMinutes) {
      this.appointment.durationMinutes = 30;
    }

    // Validate the appointment
    if (!this.validateForm()) return;
    
    console.log('Creating appointment:', this.appointment);
    
    this.isSaving = true;
    this.appointmentService.createAppointment(this.appointment).subscribe({
      next: (createdAppointment) => {
        console.log('Appointment created successfully:', createdAppointment);
        this.showSuccess('Appointment scheduled successfully');
        // Reload calendar to reflect the new appointment
        this.initializeCalendar();
        // Reset selection
        this.selectedDate = null;
        this.selectedTimeSlot = null;
        this.timeSlots = [];
        this.isSaving = false;
        // Navigate after a short delay to show success message
        setTimeout(() => {
          this.router.navigate(['/home']);
        }, 1500);
      },
      error: (err: any) => {
        console.error('Failed to create appointment:', err);
        let errorMessage = 'Failed to schedule appointment';
        
        if (err?.error?.message) {
          errorMessage = err.error.message;
        } else if (err?.message) {
          errorMessage = err.message;
        } else if (err?.status === 400) {
          errorMessage = 'Invalid appointment data. Please check all fields.';
        } else if (err?.status === 401) {
          errorMessage = 'Authentication required. Please log in again.';
        } else if (err?.status === 403) {
          errorMessage = 'You do not have permission to create appointments.';
        } else if (err?.status === 404) {
          errorMessage = 'User not found. Please refresh the page.';
        } else if (err?.status === 500) {
          errorMessage = 'Server error. Please try again later.';
        }
        
        this.showError(errorMessage);
        this.isSaving = false;
      }
    });
  }

  private validateForm(): boolean {
    if (!this.currentUser || this.appointment.user.id === 0) {
      this.showError('User information is missing');
      return false;
    }
    if (!this.appointment.appointmentDateTime) {
      this.showError('Appointment date and time are required');
      return false;
    }
    if (this.isPastDate(this.appointment.appointmentDateTime)) {
      this.showError('Appointment cannot be in the past');
      return false;
    }
    if (this.appointment.durationMinutes <= 0) {
      this.showError('Duration must be greater than 0');
      return false;
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