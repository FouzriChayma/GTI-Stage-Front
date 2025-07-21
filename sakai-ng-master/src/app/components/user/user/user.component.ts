import { Component, OnInit, ChangeDetectorRef, ViewChild } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import type { User } from '../../../models/User';
import { lastValueFrom, Observable } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MessageService, ConfirmationService } from 'primeng/api';
import type { Table } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/dropdown';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TableModule } from 'primeng/table';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { FileUploadModule } from 'primeng/fileupload';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { environment } from '../../../environments/environment';



interface Role {
  label: string;
  value: string | null;
}

interface ActiveStatus {
  label: string;
  value: boolean | null;
}

@Component({
  selector: 'app-user',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    InputTextModule,
    DropdownModule,
    ToastModule,
    ConfirmDialogModule,
    TableModule,
    ProgressSpinnerModule,
    FileUploadModule,
  ],
  templateUrl: './user.component.html',
  styleUrls: ['./user.component.scss'],
  providers: [MessageService, ConfirmationService],
})
export class UserComponent implements OnInit {
  mode: 'list' | 'new' | 'edit' | 'details' = 'list';
  users: User[] = [];
  selectedUser: User | null = null;
  formUser: User = this.resetFormUser();
  isLoading = false;
  isSaving = false;
  isSearching = false;
  submitted = false;
  selectedFile: File | null = null;
  profilePhotoUrl: SafeUrl | null = null;
  profilePhotoUrls: { [key: number]: SafeUrl | null } = {};
  filtersExpanded = true; // Initially expanded
  quickFilter: string | null = 'all';

  // Search form model
  searchCriteria = {
    email: '',
    firstName: '',
    lastName: '',
    phoneNumber: '',
    role: null as string | null,
    isActive: null as boolean | null,
  };

  roles: Role[] = [
    { label: 'All', value: null },
    { label: 'Client', value: 'CLIENT' },
    { label: 'Administrator', value: 'ADMINISTRATOR' },
    { label: 'Charge Clientele', value: 'CHARGE_CLIENTELE' },
  ];

  activeStatuses: ActiveStatus[] = [
    { label: 'All', value: null },
    { label: 'Active', value: true },
    { label: 'Inactive', value: false },
  ];

  @ViewChild('dt') dt!: Table;

  private apiUrl = environment.apiUrl;

  constructor(
    private http: HttpClient,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    private cdr: ChangeDetectorRef,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    this.loadUsers();
  }

  private resetFormUser(): User {
    return {
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
    };
  }

  toggleFilters(): void {
    this.filtersExpanded = !this.filtersExpanded;
    this.cdr.detectChanges();
  }

  getActiveFiltersCount(): number {
    return Object.values(this.searchCriteria).filter(
      (value) => value !== null && value !== '' && value !== undefined
    ).length;
  }

  setQuickFilter(filter: string): void {
    this.quickFilter = filter;
    this.searchCriteria.role = filter === 'all' ? null : filter.toUpperCase();
    this.searchCriteria.email = '';
    this.searchCriteria.firstName = '';
    this.searchCriteria.lastName = '';
    this.searchCriteria.phoneNumber = '';
    this.searchCriteria.isActive = null;
    this.searchUsers();
  }

  openNew(): void {
    this.mode = 'new';
    this.formUser = this.resetFormUser();
    this.submitted = false;
    this.selectedFile = null;
    this.profilePhotoUrl = null;
    console.log('Opening new user form, initial role:', this.formUser.role);
    this.cdr.detectChanges();
  }

  async loadUsers(): Promise<void> {
    this.isLoading = true;
    try {
      const users = await lastValueFrom(this.http.get<User[]>(`${this.apiUrl}/users`));
      this.users = users;
      for (const user of this.users) {
        if (user.profilePhotoPath) {
          await this.loadProfilePhotoForUser(user.id);
        } else {
          this.profilePhotoUrls[user.id] = null;
        }
      }
      this.showSuccess('Users loaded successfully');
    } catch (err) {
      this.showError('Failed to load users', err);
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  async searchUsers(): Promise<void> {
    this.isSearching = true;
    try {
      let params = new HttpParams();
      if (this.searchCriteria.email) params = params.set('email', this.searchCriteria.email.trim());
      if (this.searchCriteria.firstName) params = params.set('firstName', this.searchCriteria.firstName.trim());
      if (this.searchCriteria.lastName) params = params.set('lastName', this.searchCriteria.lastName.trim());
      if (this.searchCriteria.phoneNumber) params = params.set('phoneNumber', this.searchCriteria.phoneNumber.trim());
      if (this.searchCriteria.role) params = params.set('role', this.searchCriteria.role);
      if (this.searchCriteria.isActive !== null) params = params.set('isActive', this.searchCriteria.isActive.toString());

      const users = await lastValueFrom(this.http.get<User[]>(`${this.apiUrl}/users/search`, { params }));
      this.users = users;
      for (const user of this.users) {
        if (user.profilePhotoPath) {
          await this.loadProfilePhotoForUser(user.id);
        } else {
          this.profilePhotoUrls[user.id] = null;
        }
      }
      this.showSuccess(users.length ? 'Users found' : 'No users found');
    } catch (err) {
      this.showError('Search failed', err);
    } finally {
      this.isSearching = false;
      this.cdr.detectChanges();
    }
  }

  resetSearch(): void {
    this.searchCriteria = {
      email: '',
      firstName: '',
      lastName: '',
      phoneNumber: '',
      role: null,
      isActive: null,
    };
    this.quickFilter = 'all';
    this.loadUsers();
  }

  private async loadProfilePhotoForUser(userId: number): Promise<void> {
    try {
      const response = await lastValueFrom(
        this.http.get(`${this.apiUrl}/users/${userId}/profile-photo`, { responseType: 'blob' })
      );
      this.profilePhotoUrls[userId] = this.sanitizer.bypassSecurityTrustUrl(URL.createObjectURL(response));
    } catch (err) {
      this.profilePhotoUrls[userId] = null;
      this.showError(`Failed to load profile photo for user ${userId}`, err);
    }
  }

  onRoleChange(event: any): void {
    console.log('Role changed to:', event.value);
    this.formUser.role = event.value;
    console.log('Form user role after change:', this.formUser.role);
  }

  onFileSelect(event: any): void {
    const file: File = event.files[0];
    if (file && ['image/png', 'image/jpeg'].includes(file.type)) {
      this.selectedFile = file;
      this.profilePhotoUrl = this.sanitizer.bypassSecurityTrustUrl(URL.createObjectURL(file));
      this.showSuccess('Profile photo selected');
    } else {
      this.selectedFile = null;
      this.profilePhotoUrl = null;
      this.showError('Invalid file type. Only PNG and JPEG are allowed');
    }
    this.cdr.detectChanges();
  }

  async uploadProfilePhoto(userId: number): Promise<void> {
    if (!this.selectedFile) {
      this.showError('No file selected for upload');
      return;
    }
    const formData = new FormData();
    formData.append('file', this.selectedFile);
    try {
      const response = await lastValueFrom(
        this.http.post<User>(`${this.apiUrl}/users/${userId}/profile-photo`, formData)
      );
      const index = this.users.findIndex((u) => u.id === userId);
      if (index !== -1) {
        this.users[index] = response;
      }
      if (this.selectedUser?.id === userId) {
        this.selectedUser = response;
      }
      this.showSuccess('Profile photo uploaded successfully');
      this.selectedFile = null;
      await this.loadProfilePhotoForUser(userId);
    } catch (err) {
      this.showError('Failed to upload profile photo', err);
    }
  }

  async loadProfilePhoto(userId: number): Promise<void> {
    try {
      const response = await lastValueFrom(
        this.http.get(`${this.apiUrl}/users/${userId}/profile-photo`, { responseType: 'blob' })
      );
      this.profilePhotoUrl = this.sanitizer.bypassSecurityTrustUrl(URL.createObjectURL(response));
      this.profilePhotoUrls[userId] = this.profilePhotoUrl;
      this.cdr.detectChanges();
    } catch (err) {
      this.profilePhotoUrl = null;
      this.profilePhotoUrls[userId] = null;
      this.showError('Failed to load profile photo', err);
    }
  }

  async deleteProfilePhoto(userId: number): Promise<void> {
    this.confirmationService.confirm({
      message: 'Are you sure you want to delete this profile photo?',
      header: 'Confirm',
      icon: 'pi pi-exclamation-triangle',
      accept: async () => {
        try {
          await lastValueFrom(this.http.delete(`${this.apiUrl}/users/${userId}/profile-photo`));
          const index = this.users.findIndex((u) => u.id === userId);
          if (index !== -1) {
            this.users[index].profilePhotoPath = '';
          }
          if (this.selectedUser?.id === userId) {
            this.selectedUser.profilePhotoPath = '';
          }
          this.profilePhotoUrl = null;
          this.profilePhotoUrls[userId] = null;
          this.showSuccess('Profile photo deleted successfully');
          this.cdr.detectChanges();
        } catch (err) {
          this.showError('Failed to delete profile photo', err);
        }
      },
    });
  }

  async saveUser(): Promise<void> {
    this.submitted = true;
    console.log('Saving user with role:', this.formUser.role);
    console.log('Full form user object:', this.formUser);
    if (!this.validateForm()) return;
    this.isSaving = true;
    const payload = this.preparePayload();
    try {
      let user: User;
      if (this.mode === 'new') {
        user = await lastValueFrom(this.http.post<User>(`${this.apiUrl}/register`, payload));
        this.users.push(user);
        this.showSuccess('User registered successfully');
        console.log('User created with role:', user.role);
        if (this.selectedFile) {
          await this.uploadProfilePhoto(user.id);
        } else {
          this.profilePhotoUrls[user.id] = null;
        }
      } else if (this.mode === 'edit' && this.selectedUser) {
        user = await lastValueFrom(
          this.http.put<User>(`${this.apiUrl}/users/${this.selectedUser.id}`, payload)
        );
        const index = this.users.findIndex((u) => u.id === user.id);
        if (index !== -1) {
          this.users[index] = user;
        }
        this.showSuccess('User updated successfully');
        if (this.selectedFile) {
          await this.uploadProfilePhoto(user.id);
        } else if (user.profilePhotoPath) {
          await this.loadProfilePhotoForUser(user.id);
        } else {
          this.profilePhotoUrls[user.id] = null;
        }
      }
      this.mode = 'list';
      this.selectedUser = null;
      this.formUser = this.resetFormUser();
      this.selectedFile = null;
      this.profilePhotoUrl = null;
      this.cdr.detectChanges();
    } catch (err) {
      this.showError(this.mode === 'new' ? 'Registration failed' : 'Update failed', err);
      console.error('Error details:', err);
    } finally {
      this.isSaving = false;
      this.cdr.detectChanges();
    }
  }

  private preparePayload(): any {
    const payload = {
      email: this.formUser.email?.trim(),
      password: this.mode === 'new' ? this.formUser.password?.trim() : undefined,
      firstName: this.formUser.firstName?.trim(),
      lastName: this.formUser.lastName?.trim(),
      phoneNumber: this.formUser.phoneNumber?.trim(),
      role: this.formUser.role,
    };
    if (this.mode === 'edit') {
      delete payload.password;
    }
    console.log('Prepared payload:', payload);
    return payload;
  }

  async loginUser(email: string, password: string): Promise<void> {
    this.isLoading = true;
    try {
      const user = await lastValueFrom(this.http.post<User>(`${this.apiUrl}/login`, { email, password }));
      this.selectedUser = user;
      this.mode = 'details';
      if (user.profilePhotoPath) {
        await this.loadProfilePhoto(user.id);
      }
      this.showSuccess('Login successful');
    } catch (err) {
      this.showError('Login failed', err);
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  viewDetails(id: number): void {
    this.isLoading = true;
    this.http.get<User>(`${this.apiUrl}/users/${id}`).subscribe({
      next: async (user) => {
        this.selectedUser = user;
        this.mode = 'details';
        if (user.profilePhotoPath) {
          await this.loadProfilePhoto(user.id);
        } else {
          this.profilePhotoUrl = null;
          this.profilePhotoUrls[id] = null;
        }
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.showError('Failed to load user details', err);
        this.isLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  editUser(user: User): void {
    this.selectedUser = user;
    this.formUser = { ...user, password: '' };
    this.mode = 'edit';
    this.submitted = false;
    this.selectedFile = null;
    if (user.profilePhotoPath) {
      this.loadProfilePhoto(user.id);
    } else {
      this.profilePhotoUrl = null;
      this.profilePhotoUrls[user.id] = null;
    }
    console.log('Editing user with role:', this.formUser.role);
    this.cdr.detectChanges();
  }

  deleteUser(id: number): void {
    this.confirmationService.confirm({
      message: 'Are you sure you want to delete this user?',
      header: 'Confirm',
      icon: 'pi pi-exclamation-triangle',
      accept: async () => {
        this.isLoading = true;
        try {
          await lastValueFrom(this.http.delete(`${this.apiUrl}/users/${id}`));
          this.users = this.users.filter((user) => user.id !== id);
          delete this.profilePhotoUrls[id];
          this.selectedUser = null;
          this.profilePhotoUrl = null;
          this.showSuccess('User deleted successfully');
        } catch (err) {
          this.showError('Deletion failed', err);
        } finally {
          this.isLoading = false;
          this.cdr.detectChanges();
        }
      },
    });
  }

  goBack(): void {
    this.mode = 'list';
    this.selectedUser = null;
    this.formUser = this.resetFormUser();
    this.selectedFile = null;
    this.profilePhotoUrl = null;
    this.loadUsers();
  }

  private validateForm(): boolean {
    const requiredFields = [
      { field: this.formUser.email?.trim() ?? '', message: 'Email is required' },
      {
        field: this.formUser.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.formUser.email),
        message: 'Invalid email format',
      },
      { field: this.formUser.firstName?.trim() ?? '', message: 'First name is required' },
      { field: this.formUser.lastName?.trim() ?? '', message: 'Last name is required' },
      { field: this.formUser.phoneNumber?.trim() ?? '', message: 'Phone number is required' },
      {
        field: this.formUser.phoneNumber && /^\+?\d{10,15}$/.test(this.formUser.phoneNumber),
        message: 'Invalid phone number format',
      },
      { field: this.formUser.role ?? '', message: 'Role is required' },
    ];

    if (this.mode === 'new') {
      requiredFields.push(
        { field: this.formUser.password?.trim() ?? '', message: 'Password is required' },
        {
          field: !!(this.formUser.password && this.formUser.password.length >= 6),
          message: 'Password must be at least 6 characters',
        }
      );
    }

    for (const { field, message } of requiredFields) {
      if (!field) {
        this.showError(message);
        return false;
      }
    }
    return true;
  }

  private showSuccess(message: string): void {
    this.messageService.add({
      severity: 'success',
      summary: 'Success',
      detail: message,
      life: 3000,
    });
  }

  private showError(message: string, error?: any): void {
    const errorMessage = error?.error?.message || error?.message || 'Unknown error';
    console.error(message, error);
    this.messageService.add({
      severity: 'error',
      summary: 'Error',
      detail: `${message}: ${errorMessage}`,
      life: 3000,
    });
  }

  getUserById(id: number): Observable<{ firstName: string, lastName: string }> {
  return this.http.get<{ firstName: string, lastName: string }>(`${this.apiUrl}/users/${id}`);
}
}