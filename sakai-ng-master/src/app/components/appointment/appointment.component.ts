import { Component, OnInit, ChangeDetectorRef, ViewChild, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AppointmentService } from '../../services/appointment.service';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { MessageService, ConfirmationService } from 'primeng/api';
import { Table } from 'primeng/table';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { RippleModule } from 'primeng/ripple';
import { ToastModule } from 'primeng/toast';
import { ToolbarModule } from 'primeng/toolbar';
import { TooltipModule } from 'primeng/tooltip';
import { InputTextModule } from 'primeng/inputtext';
import { DialogModule } from 'primeng/dialog';
import { TagModule } from 'primeng/tag';
import { InputIconModule } from 'primeng/inputicon';
import { IconFieldModule } from 'primeng/iconfield';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DropdownModule } from 'primeng/dropdown';
import { CheckboxModule } from 'primeng/checkbox';
import { TableModule } from 'primeng/table';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { CalendarModule } from 'primeng/calendar';
import { lastValueFrom, forkJoin } from 'rxjs';
import { Appointment } from '../../models/appointment';
import { User } from '../../models/User';

interface Column {
  field: string;
  header: string;
  customExportHeader?: string;
}

interface ExportColumn {
  title: string;
  dataKey: string;
}

interface UserOption {
  label: string;
  value: User;
}

@Component({
  selector: 'app-appointment',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    RippleModule,
    ToastModule,
    ToolbarModule,
    TooltipModule,
    InputTextModule,
    DialogModule,
    TagModule,
    InputIconModule,
    IconFieldModule,
    ConfirmDialogModule,
    DropdownModule,
    CheckboxModule,
    TableModule,
    ProgressSpinnerModule,
    CalendarModule,
  ],
  templateUrl: './appointment.component.html',
  styleUrls: ['./appointment.component.scss'],
  providers: [MessageService, AppointmentService, ConfirmationService],
})
export class AppointmentComponent implements OnInit {
  mode: 'list' | 'new' | 'edit' | 'details' = 'list';
  appointmentId = 0;
  appointments = signal<Appointment[]>([]);
  selectedAppointments: Appointment[] = []; // Initialize as empty array
  submitted = false;
  isSaving = false;
  isLoading = false;
  isSearching = false;
  users: UserOption[] = [];
  availableSlots: Date[] = [];
  usersLoaded = false;

  minDate: Date = new Date();

  searchCriteria = {
    userId: null as number | null,
    status: null as string | null,
    startDate: null as string | null,
    endDate: null as string | null,
    notes: '',
    isNotified: null as boolean | null,
  };

  filtersExpanded = false;
  quickFilter = '';

  appointment: Appointment = this.createEmptyAppointment();

  statuses = [
    { label: 'Scheduled', value: 'SCHEDULED' },
    { label: 'Confirmed', value: 'CONFIRMED' },
    { label: 'Completed', value: 'COMPLETED' },
    { label: 'Cancelled', value: 'CANCELLED' },
    { label: 'Rescheduled', value: 'RESCHEDULED' },
  ];

  durationOptions = [
    { label: '30 minutes', value: 30 },
    { label: '60 minutes', value: 60 },
    { label: '90 minutes', value: 90 },
  ];

  @ViewChild('dt') dt!: Table;
  exportColumns!: ExportColumn[];
  cols!: Column[];
  private apiUrl = '/api/appointments';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private appointmentService: AppointmentService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    private cdr: ChangeDetectorRef,
    private http: HttpClient
  ) {}

  async ngOnInit() {
    await this.loadUsers();
    this.route.params.subscribe((params) => {
      this.appointmentId = +params['id'] || 0;
      if (this.appointmentId > 0) {
        this.mode = 'details';
        this.loadAppointmentDetails(this.appointmentId);
      } else {
        this.mode = 'list';
        this.loadAppointments();
      }
    });
    this.initColumns();
  }

  loadUsers() {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({
      Authorization: token ? `Bearer ${token}` : '',
      'Content-Type': 'application/json',
      Accept: 'application/json',
    });

    return new Promise<void>((resolve) => {
      this.http.get<User[]>('/api/auth/users', { headers, responseType: 'json' }).subscribe({
        next: (users) => {
          console.log('Users loaded:', users);
          this.users = users?.map((user) => ({
            label: `${user.firstName} ${user.lastName} (${user.email})`,
            value: user,
          })) || [];
          this.usersLoaded = true;
          this.cdr.detectChanges();
          resolve();
        },
        error: (err: any) => {
          console.error('Error loading users:', err);
          this.showError('Failed to load users', err);
          this.users = []; // Fallback to empty array
          this.usersLoaded = true;
          this.cdr.detectChanges();
          resolve();
        },
      });
    });
  }

  private createEmptyAppointment(): Appointment {
    const defaultDate = new Date();
    defaultDate.setHours(9, 0, 0, 0);
    return {
      user: {
        id: 0,
        email: '',
        password: '',
        firstName: '',
        lastName: '',
        phoneNumber: '',
        role: '',
        isActive: true,
        createdAt: '',
        updatedAt: '',
        profilePhotoPath: '',
      },
      appointmentDateTime: defaultDate,
      durationMinutes: 30,
      status: 'SCHEDULED',
      notes: '',
      isNotified: false,
    };
  }

  initColumns() {
    this.cols = [
      { field: 'idAppointment', header: 'ID' },
      { field: 'user', header: 'User' },
      { field: 'appointmentDateTime', header: 'Date & Time' },
      { field: 'durationMinutes', header: 'Duration' },
      { field: 'status', header: 'Status' },
      { field: 'notes', header: 'Notes' },
      { field: 'isNotified', header: 'Notified' },
    ];
    this.exportColumns = this.cols.map((col) => ({
      title: col.header,
      dataKey: col.field === 'user' ? 'userFullName' : col.field,
    }));
  }

  loadAppointments() {
    this.isSearching = true;
    this.appointmentService
      .searchAppointments(
        this.searchCriteria.userId || undefined,
        this.searchCriteria.startDate || undefined,
        this.searchCriteria.endDate || undefined,
        this.searchCriteria.status || undefined,
        this.searchCriteria.notes || undefined,
        this.searchCriteria.isNotified !== null ? this.searchCriteria.isNotified : undefined
      )
      .subscribe({
        next: (data) => {
          console.log('Loaded appointments:', data);
          this.appointments.set(data || []); // Ensure fallback to empty array
          this.isSearching = false;
          this.cdr.detectChanges();
        },
        error: (err: any) => {
          console.error('Error loading appointments:', err);
          this.showError('Failed to load appointments', err);
          this.appointments.set([]); // Fallback to empty array
          this.isSearching = false;
          this.cdr.detectChanges();
        },
      });
  }

  loadAppointmentDetails(id: number) {
    this.isLoading = true;
    this.appointmentService.getAppointment(id).subscribe({
      next: (data) => {
        console.log('Raw appointment data:', data);
        this.appointment = this.normalizeAppointment(data);
        console.log('Normalized appointment:', this.appointment);
        if (this.usersLoaded && this.appointment.user?.id) {
          const matchingUserOption = this.users.find((u) => u.value.id === this.appointment.user.id);
          if (matchingUserOption) {
            this.appointment.user = matchingUserOption.value;
          }
        }
        this.isLoading = false;
        if (this.mode === 'edit') {
          this.loadAvailableSlots(this.appointment.appointmentDateTime);
        }
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        console.error('Error loading appointment details:', err);
        this.isLoading = false;
        this.appointment = this.createEmptyAppointment();
        this.showError('Failed to load appointment details', err);
        this.router.navigate(['/appointments']);
        this.cdr.detectChanges();
      },
    });
  }

  private normalizeAppointment(data: any): Appointment {
    return {
      idAppointment: data.idAppointment ?? this.appointmentId,
      user: data.user
        ? {
            id: data.user.id ?? 0,
            email: data.user.email ?? '',
            password: data.user.password ?? '',
            firstName: data.user.firstName ?? '',
            lastName: data.user.lastName ?? '',
            phoneNumber: data.user.phoneNumber ?? '',
            role: data.user.role ?? '',
            isActive: data.user.isActive ?? true,
            createdAt: data.user.createdAt ?? '',
            updatedAt: data.user.updatedAt ?? '',
            profilePhotoPath: data.user.profilePhotoPath ?? '',
          }
        : {
            id: 0,
            email: '',
            password: '',
            firstName: '',
            lastName: '',
            phoneNumber: '',
            role: '',
            isActive: true,
            createdAt: '',
            updatedAt: '',
            profilePhotoPath: '',
          },
      appointmentDateTime: data.appointmentDateTime ? new Date(data.appointmentDateTime) : new Date(),
      durationMinutes: data.durationMinutes ?? 30,
      status: data.status ?? 'SCHEDULED',
      notes: data.notes ?? '',
      isNotified: data.isNotified ?? false,
      createdAt: data.createdAt ?? '',
      updatedAt: data.updatedAt ?? '',
    };
  }

  openNew() {
    this.mode = 'new';
    this.appointment = this.createEmptyAppointment();
    this.submitted = false;
    this.loadAvailableSlots(this.appointment.appointmentDateTime);
    this.cdr.detectChanges();
  }

  editAppointment(appointment: Appointment) {
    this.mode = 'edit';
    this.appointmentId = appointment.idAppointment ?? 0;
    this.loadAppointmentDetails(this.appointmentId);
  }

  loadAvailableSlots(dateTime: Date) {
    const dateStr = dateTime.toISOString();
    const date = dateStr.split('T')[0];
    const start = `${date}T00:00:00`;
    const end = `${date}T23:59:59`;
    this.appointmentService.getAvailableSlots(start, end).subscribe({
      next: (slots) => {
        this.availableSlots = slots?.map((slot) => new Date(slot.appointmentDateTime)) || [];
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        console.error('Error loading available slots:', err);
        this.showError('Failed to load available slots', err);
        this.availableSlots = [];
        this.cdr.detectChanges();
      },
    });
  }

  async saveAppointment() {
    this.submitted = true;
    if (!this.validateForm()) {
      this.isSaving = false;
      return;
    }
    this.isSaving = true;
    try {
      console.log('Saving appointment:', this.appointment);
      if (this.mode === 'edit') {
        await this.updateAppointment();
      } else {
        await this.createAppointment();
      }
      this.showSuccess('Appointment saved successfully');
      this.mode = 'list';
      this.loadAppointments();
      this.router.navigate(['/appointments']);
    } catch (error: any) {
      console.error('Save error details:', error);
      this.showError('Failed to save appointment', error);
    } finally {
      this.isSaving = false;
      this.cdr.detectChanges();
    }
  }

  async createAppointment() {
    const result = await lastValueFrom(this.appointmentService.createAppointment(this.appointment));
    this.showSuccess('Appointment created successfully');
  }

  private async updateAppointment() {
    if (!this.appointment || !this.appointment.idAppointment) {
      throw new Error('Appointment is null or missing ID');
    }
    const result = await lastValueFrom(
      this.appointmentService.updateAppointment(this.appointment.idAppointment, this.appointment)
    );
    this.showSuccess('Appointment updated successfully');
  }

  private validateForm(): boolean {
    if (this.mode === 'edit' && (!this.appointment || !this.appointment.idAppointment)) {
      this.showError('Appointment data is not loaded');
      return false;
    }
    const requiredFields = [
      { field: this.appointment.user && this.appointment.user.id > 0, message: 'User is required' },
      { field: this.appointment.appointmentDateTime, message: 'Appointment date and time are required' },
      { field: !this.isPastDate(this.appointment.appointmentDateTime), message: 'Appointment cannot be in the past' },
      { field: this.appointment.durationMinutes > 0, message: 'Duration must be greater than 0' },
      { field: this.appointment.status, message: 'Status is required' },
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

  exportCSV() {
    const originalData = this.appointments();
    const exportData = originalData.map((appointment) => ({
      ...appointment,
      userFullName: `${appointment.user.firstName} ${appointment.user.lastName}`,
      isNotified: appointment.isNotified ? 'Yes' : 'No',
    }));
    this.dt.value = exportData;
    this.dt.exportCSV({ selectionOnly: false });
    this.dt.value = originalData;
  }

  onGlobalFilter(table: Table, event: Event) {
    table.filterGlobal((event.target as HTMLInputElement).value, 'contains');
  }

  onSearch() {
    this.loadAppointments();
  }

  clearSearch() {
    this.searchCriteria = {
      userId: null,
      status: null,
      startDate: null,
      endDate: null,
      notes: '',
      isNotified: null,
    };
    this.loadAppointments();
  }

  clearAllFilters() {
    this.searchCriteria = {
      userId: null,
      status: null,
      startDate: null,
      endDate: null,
      notes: '',
      isNotified: null,
    };
    this.quickFilter = '';
    this.loadAppointments();
  }

  goBack() {
    this.mode = 'list';
    this.router.navigate(['/appointments']);
    this.loadAppointments();
  }

  hideDialog() {
    this.mode = 'list';
    this.loadAppointments();
    this.submitted = false;
  }

  cancelSelectedAppointments() {
    console.log('Cancel Selected button clicked, selected IDs:', this.selectedAppointments?.map((a) => a.idAppointment));
    if (!this.selectedAppointments?.length) {
      this.showError('No appointments selected');
      return;
    }
    this.confirmationService.confirm({
      message: 'Are you sure you want to cancel the selected appointments?',
      header: 'Confirm',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        const ids = this.selectedAppointments.map((a) => a.idAppointment!).filter((id) => id);
        if (ids.length === 0) {
          this.showError('No valid appointments selected');
          return;
        }
        forkJoin(ids.map((id) => this.appointmentService.cancelAppointment(id))).subscribe({
          next: () => {
            this.showSuccess('Appointments cancelled successfully');
            this.selectedAppointments = [];
            this.loadAppointments();
          },
          error: (err: any) => {
            console.error('API error:', err);
            this.showError('Failed to cancel appointments', err);
          },
        });
      },
    });
  }

  cancelAppointment(appointment: Appointment) {
    console.log('Cancel button clicked for appointment:', appointment.idAppointment);
    if (!appointment.idAppointment) {
      this.showError('Invalid appointment ID');
      return;
    }
    this.confirmationService.confirm({
      message: `Are you sure you want to cancel appointment ${appointment.idAppointment}?`,
      header: 'Confirm',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.appointmentService.cancelAppointment(appointment.idAppointment!).subscribe({
          next: () => {
            console.log('API success for appointment:', appointment.idAppointment);
            this.showSuccess('Appointment cancelled successfully');
            this.loadAppointments();
          },
          error: (err: any) => {
            console.error('API error for appointment', appointment.idAppointment, ':', err);
            this.showError('Failed to cancel appointment', err);
          },
        });
      },
    });
  }

  viewDetails(id: number) {
    this.appointmentId = id;
    this.mode = 'details';
    this.loadAppointmentDetails(id);
  }

  private showSuccess(message: string) {
    this.messageService.add({ severity: 'success', summary: 'Success', detail: message, life: 3000 });
  }

  private showError(message: string, error?: any) {
    const errorMessage = error?.error?.message || error?.message || 'Unknown error';
    console.error(`${message}: ${errorMessage}`, error);
    this.messageService.add({ severity: 'error', summary: 'Error', detail: `${message}: ${errorMessage}`, life: 3000 });
  }

  toggleFilters() {
    this.filtersExpanded = !this.filtersExpanded;
  }

  getActiveFiltersCount(): number {
    let count = 0;
    if (this.searchCriteria.userId) count++;
    if (this.searchCriteria.status) count++;
    if (this.searchCriteria.startDate) count++;
    if (this.searchCriteria.endDate) count++;
    if (this.searchCriteria.notes) count++;
    if (this.searchCriteria.isNotified !== null) count++;
    return count;
  }

  setQuickFilter(filter: string) {
    this.quickFilter = this.quickFilter === filter ? '' : filter;
    switch (filter) {
      case 'scheduled':
        this.searchCriteria.status = 'SCHEDULED';
        break;
      case 'confirmed':
        this.searchCriteria.status = 'CONFIRMED';
        break;
      case 'today':
        const today = new Date().toISOString().split('T')[0];
        this.searchCriteria.startDate = today;
        this.searchCriteria.endDate = today;
        break;
      case 'notified':
        this.searchCriteria.isNotified = true;
        break;
    }
    if (this.quickFilter === '') this.clearAllFilters();
    this.onSearch();
  }

  applyFilters() {
    this.isSearching = true;
    setTimeout(() => {
      this.onSearch();
      this.isSearching = false;
    }, 1000);
  }

  getTotalResults(): number {
    return this.appointments().length || 0;
  }

  isEditDisabled(status: string | undefined): boolean {
    return status === 'COMPLETED' || status === 'CANCELLED';
  }

  viewUserDetails(userId: number) {
    this.router.navigate(['/users', userId]);
  }

  onUserChange(event: any) {
    this.appointment.user = event.value || this.createEmptyAppointment().user;
    this.cdr.detectChanges();
  }
}