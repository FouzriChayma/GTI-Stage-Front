import { Component, OnInit, ChangeDetectorRef, ViewChild, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AppointmentService } from '../../services/appointment.service';
import { HttpClient } from '@angular/common/http';
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
import { FileUploadModule } from 'primeng/fileupload';
import { DropdownModule } from 'primeng/dropdown';
import { CheckboxModule } from 'primeng/checkbox';
import { TableModule } from 'primeng/table';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { CalendarModule } from 'primeng/calendar';
import { lastValueFrom } from 'rxjs';
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
    FileUploadModule,
    DropdownModule,
    CheckboxModule,
    TableModule,
    ProgressSpinnerModule,
    CalendarModule
  ],
  templateUrl: './appointment.component.html',
  styleUrls: ['./appointment.component.scss'],
  providers: [MessageService, AppointmentService, ConfirmationService]
})
export class AppointmentComponent implements OnInit {
  mode: 'list' | 'new' | 'edit' | 'details' = 'list';
  appointmentId = 0;
  appointments = signal<Appointment[]>([]);
  selectedAppointments: Appointment[] | null = null;
  submitted = false;
  selectedFiles: File[] = [];
  isSaving = false;
  isLoading = false;
  users: UserOption[] = [];
  availableSlots: string[] = [];

  searchCriteria = {
    userId: null as number | null,
    status: null as string | null,
    startDate: null as string | null,
    endDate: null as string | null,
    notes: '',
    isNotified: null as boolean | null
  };

  filtersExpanded = false;
  quickFilter = '';
  isSearching = false;

  appointment: Appointment = this.createEmptyAppointment();

  statuses = [
    { label: 'Scheduled', value: 'SCHEDULED' },
    { label: 'Confirmed', value: 'CONFIRMED' },
    { label: 'Completed', value: 'COMPLETED' },
    { label: 'Cancelled', value: 'CANCELLED' },
    { label: 'Rescheduled', value: 'RESCHEDULED' }
  ];

  durationOptions = [
    { label: '30 minutes', value: 30 },
    { label: '60 minutes', value: 60 },
    { label: '90 minutes', value: 90 }
  ];

  @ViewChild('dt') dt!: Table;
  exportColumns!: ExportColumn[];
  cols!: Column[];
  private apiUrl = 'http://localhost:8083/api/appointments';

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
    this.route.params.subscribe(params => {
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
    this.http.get<any[]>('http://localhost:8083/api/auth/users').subscribe({
      next: users => {
        this.users = users.map(user => ({
          label: `${user.firstName} ${user.lastName} (${user.email})`,
          value: user
        }));
      },
      error: err => this.showError('Failed to load users', err)
    });
  }

  private createEmptyAppointment(): Appointment {
    return {
      user: { id: 0, email: '', password: '', firstName: '', lastName: '', phoneNumber: '', role: '', isActive: true, createdAt: '', updatedAt: '', profilePhotoPath: '' },
      appointmentDateTime: new Date().toISOString().split('T')[0] + 'T09:00',
      durationMinutes: 30,
      status: 'SCHEDULED',
      notes: '',
      isNotified: false,
      documents: []
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
      { field: 'documents_count', header: 'Documents' }
    ];
    this.exportColumns = this.cols.map(col => ({
      title: col.header,
      dataKey: col.field === 'user' ? 'userFullName' : col.field
    }));
  }

  loadAppointments() {
    this.appointmentService.searchAppointments(
      this.searchCriteria.userId || undefined,
      this.searchCriteria.startDate || undefined,
      this.searchCriteria.endDate || undefined,
      this.searchCriteria.status || undefined,
      this.searchCriteria.notes || undefined,
      this.searchCriteria.isNotified !== null ? this.searchCriteria.isNotified : undefined
    ).subscribe({
      next: data => this.appointments.set(data),
      error: err => this.showError('Failed to load appointments', err)
    });
  }

  loadAppointmentDetails(id: number) {
    this.isLoading = true;
    this.appointmentService.getAppointment(id).subscribe({
      next: data => {
        this.appointment = this.normalizeAppointment(data);
        this.appointmentService.getDocuments(id).subscribe({
          next: documents => {
            this.appointment.documents = documents || [];
            this.isLoading = false;
            this.cdr.detectChanges();
          },
          error: err => {
            this.showError('Failed to load documents', err);
            this.isLoading = false;
            this.cdr.detectChanges();
          }
        });
      },
      error: err => {
        this.isLoading = false;
        this.showError('Failed to load appointment details', err);
        this.router.navigate(['/appointments']);
      }
    });
  }

  private normalizeAppointment(data: any): Appointment {
    return {
      idAppointment: data.idAppointment || this.appointmentId,
      user: data.user || { id: 0, email: '', password: '', firstName: '', lastName: '', phoneNumber: '', role: '', isActive: true, createdAt: '', updatedAt: '', profilePhotoPath: '' },
      appointmentDateTime: data.appointmentDateTime ? new Date(data.appointmentDateTime).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16),
      durationMinutes: data.durationMinutes || 30,
      status: data.status || 'SCHEDULED',
      notes: data.notes || '',
      isNotified: data.isNotified ?? false,
      documents: data.documents || []
    };
  }

  openNew() {
    this.mode = 'new';
    this.appointment = this.createEmptyAppointment();
    this.submitted = false;
    this.selectedFiles = [];
    this.loadAvailableSlots(this.appointment.appointmentDateTime);
    this.cdr.detectChanges();
  }

  editAppointment(appointment: Appointment) {
    this.mode = 'edit';
    this.appointmentId = appointment.idAppointment ?? 0;
    this.loadAppointmentDetails(this.appointmentId);
  }

  loadAvailableSlots(dateTime: string) {
    const date = dateTime.split('T')[0];
    const start = `${date}T00:00:00`;
    const end = `${date}T23:59:59`;
    this.appointmentService.getAvailableSlots(start, end).subscribe({
      next: slots => this.availableSlots = slots.map(slot => slot.appointmentDateTime),
      error: err => this.showError('Failed to load available slots', err)
    });
  }

  onFileSelected(event: any) {
    this.selectedFiles = event.files || [];
    const validFiles: File[] = [];
    for (const file of this.selectedFiles) {
      if (['application/pdf', 'image/png', 'image/jpeg'].includes(file.type)) {
        validFiles.push(file);
      } else {
        this.showError(`Invalid file type for "${file.name}". Only PDF, PNG, and JPEG are allowed`);
      }
    }
    this.selectedFiles = validFiles;
    this.cdr.detectChanges();
  }

  async deleteDocument(documentId: number) {
    this.confirmationService.confirm({
      message: 'Are you sure you want to delete this document?',
      header: 'Confirm',
      icon: 'pi pi-exclamation-triangle',
      accept: async () => {
        try {
          await lastValueFrom(this.appointmentService.deleteDocument(this.appointmentId, documentId));
          this.appointment.documents = (this.appointment.documents || []).filter(doc => doc.idDocument !== documentId);
          this.showSuccess('Document deleted successfully');
          this.cdr.detectChanges();
        } catch (error) {
          this.showError('Failed to delete document', error);
        }
      }
    });
  }

  async saveAppointment() {
    this.submitted = true;
    if (!this.validateForm()) return;
    this.isSaving = true;
    try {
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
      this.showError('Failed to save appointment', error);
    } finally {
      this.isSaving = false;
    }
  }

  private async createAppointment() {
    let result: Appointment;
    if (this.selectedFiles.length > 0) {
      result = await lastValueFrom(
        this.appointmentService.createAppointmentWithDocument(this.appointment, this.selectedFiles[0])
      );
      if (result.idAppointment && this.selectedFiles.length > 1) {
        await this.uploadDocumentsSequentially(result.idAppointment);
      }
    } else {
      result = await lastValueFrom(this.appointmentService.createAppointment(this.appointment));
    }
    this.showSuccess('Appointment created successfully');
  }

  private async updateAppointment() {
    if (!this.appointment || !this.appointment.idAppointment) {
      throw new Error('Appointment is null or missing ID');
    }
    const result = await lastValueFrom(
      this.appointmentService.updateAppointment(this.appointment.idAppointment, this.appointment)
    );
    if (this.selectedFiles.length > 0) {
      await this.uploadDocumentsSequentially(this.appointment.idAppointment);
    }
    this.showSuccess('Appointment updated successfully');
  }

  private async uploadDocumentsSequentially(appointmentId: number): Promise<void> {
    const filesToUpload = this.mode === 'new' ? this.selectedFiles.slice(1) : this.selectedFiles;
    for (const file of filesToUpload) {
      try {
        await lastValueFrom(this.appointmentService.uploadDocument(appointmentId, file));
        const tempDocument = {
          idDocument: -1,
          fileName: file.name,
          fileType: file.type,
          filePath: '',
          fileExtension: file.name.split('.').pop() || '',
          uploadDate: new Date().toISOString()
        };
        if (!this.appointment.documents) this.appointment.documents = [];
        this.appointment.documents.push(tempDocument as any);
        this.showSuccess(`Document "${file.name}" uploaded successfully`);
      } catch (error) {
        this.showError(`Failed to upload "${file.name}"`, error);
      }
    }
    this.selectedFiles = [];
    this.cdr.detectChanges();
  }

  private validateForm(): boolean {
    if (this.mode === 'edit' && (!this.appointment || !this.appointment.idAppointment)) {
      this.showError('Appointment data is not loaded');
      return false;
    }
    const requiredFields = [
      { field: this.appointment.user.id > 0, message: 'User is required' },
      { field: this.appointment.appointmentDateTime, message: 'Appointment date and time are required' },
      { field: !this.isPastDate(this.appointment.appointmentDateTime), message: 'Appointment cannot be in the past' },
      { field: this.appointment.durationMinutes > 0, message: 'Duration must be greater than 0' },
      { field: this.appointment.status, message: 'Status is required' }
    ];
    for (const { field, message } of requiredFields) {
      if (!field) {
        this.showError(message);
        return false;
      }
    }
    return true;
  }

  isPastDate(dateTime: string): boolean {
    return new Date(dateTime) < new Date();
  }

  exportCSV() {
    const originalData = this.appointments();
    const exportData = originalData.map(appointment => ({
      ...appointment,
      userFullName: `${appointment.user.firstName} ${appointment.user.lastName}`,
      isNotified: appointment.isNotified ? 'Yes' : 'No',
      documents_count: appointment.documents?.length || 0
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
      isNotified: null
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
      isNotified: null
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

  deleteSelectedAppointments() {
    this.confirmationService.confirm({
      message: 'Are you sure you want to delete the selected appointments?',
      header: 'Confirm',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        const ids = this.selectedAppointments?.map(a => a.idAppointment!).filter(id => id) || [];
        this.appointmentService.deleteMultipleAppointments(ids).subscribe({
          next: () => {
            this.appointments.set(this.appointments().filter(a => !ids.includes(a.idAppointment!)));
            this.showSuccess('Appointments deleted successfully');
            this.selectedAppointments = null;
          },
          error: err => this.showError('Failed to delete appointments', err)
        });
      }
    });
  }

  deleteAppointment(appointment: Appointment) {
    this.confirmationService.confirm({
      message: `Are you sure you want to cancel appointment ${appointment.idAppointment}?`,
      header: 'Confirm',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.appointmentService.cancelAppointment(appointment.idAppointment!).subscribe({
          next: () => {
            this.appointments.set(this.appointments().filter(a => a.idAppointment !== appointment.idAppointment));
            this.showSuccess('Appointment cancelled successfully');
          },
          error: err => this.showError('Failed to cancel appointment', err)
        });
      }
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
    console.error(message, error);
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
      case 'scheduled': this.searchCriteria.status = 'SCHEDULED'; break;
      case 'confirmed': this.searchCriteria.status = 'CONFIRMED'; break;
      case 'today':
        const today = new Date().toISOString().split('T')[0];
        this.searchCriteria.startDate = today;
        this.searchCriteria.endDate = today;
        break;
      case 'notified': this.searchCriteria.isNotified = true; break;
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

  async openDocument(documentId: number, fileName: string) {
    try {
      this.isLoading = true;
      const blob = await lastValueFrom(this.appointmentService.downloadDocument(this.appointmentId, documentId));
      const url = window.URL.createObjectURL(blob);
      if (fileName.toLowerCase().endsWith('.pdf')) {
        window.open(url, '_blank');
      } else {
        const img = new Image();
        img.src = url;
        const win = window.open('', '_blank');
        win?.document.write(img.outerHTML);
        win?.document.close();
      }
      setTimeout(() => window.URL.revokeObjectURL(url), 1000);
      this.showSuccess(`Document "${fileName}" opened successfully`);
    } catch (error) {
      this.showError(`Failed to open document "${fileName}"`, error);
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  async downloadDocument(documentId: number, fileName: string) {
    try {
      this.isLoading = true;
      const blob = await lastValueFrom(this.appointmentService.downloadDocument(this.appointmentId, documentId));
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.click();
      window.URL.revokeObjectURL(url);
      this.showSuccess(`Document "${fileName}" downloaded successfully`);
    } catch (error) {
      this.showError(`Failed to download document "${fileName}"`, error);
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  viewUserDetails(userId: number) {
    this.router.navigate(['/users', userId]);
  }
}