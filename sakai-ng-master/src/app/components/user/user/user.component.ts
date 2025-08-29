import { Component, OnInit, ChangeDetectorRef, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MessageService, ConfirmationService } from 'primeng/api';
import { Table } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TableModule } from 'primeng/table';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { FileUploadModule } from 'primeng/fileupload';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { AuthService } from '../../../services/auth.service';
import { User } from '../../../models/User';

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
    SelectModule,
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
  filtersExpanded = true;
  quickFilter: string | null = 'all';
  userId: number | null = null;

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

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    private cdr: ChangeDetectorRef,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    if (!this.authService.isAdmin()) {
      this.router.navigate(['/not-found']);
    }
    this.route.paramMap.subscribe((params) => {
      this.userId = params.get('id') ? +params.get('id')! : null;
      this.mode = this.userId ? 'details' : 'list';
      if (this.userId) {
        this.loadUserDetails(this.userId);
      } else {
        this.loadUsers();
      }
    });
  }

  private resetFormUser(): User {
    return {
      id: 0,
      email: '',
      firstName: '',
      lastName: '',
      phoneNumber: '',
      role: '',
      isActive: true,
      createdAt: '',
      updatedAt: '',
      profilePhotoPath: '',
      password: '',
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
    this.searchUsers();
  }

  openNew(): void {
    this.mode = 'new';
    this.formUser = this.resetFormUser();
    this.submitted = false;
    this.selectedFile = null;
    this.profilePhotoUrl = null;
    this.cdr.detectChanges();
  }

  loadUsers(): void {
    this.isLoading = true;
    this.authService.getAllUsers().subscribe({
      next: (users) => {
        this.users = users;
        this.users.forEach((user) => {
          if (user.profilePhotoPath && user.profilePhotoPath.trim() !== '') {
            this.loadProfilePhotoForUser(user.id);
          } else {
            this.profilePhotoUrls[user.id] = null;
          }
        });
        this.showSuccess('Users loaded successfully');
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.showError('Failed to load users', err);
        this.users = [];
        this.isLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  searchUsers(): void {
    this.isSearching = true;
    this.authService.searchUsers(this.searchCriteria).subscribe({
      next: (users) => {
        this.users = users;
        this.users.forEach((user) => {
          if (user.profilePhotoPath && user.profilePhotoPath.trim() !== '') {
            this.loadProfilePhotoForUser(user.id);
          } else {
            this.profilePhotoUrls[user.id] = null;
          }
        });
        this.showSuccess(users.length ? 'Users found' : 'No users found');
        this.isSearching = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.showError('Search failed', err);
        this.users = [];
        this.isSearching = false;
        this.cdr.detectChanges();
      },
    });
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

private loadProfilePhotoForUser(userId: number): void {
  this.authService.getUserById(userId).subscribe({
    next: (user) => {
      if (user.profilePhotoPath && user.profilePhotoPath.trim() !== '') {
        this.authService.getProfilePhoto(userId).subscribe({
          next: (blob: Blob) => {
            const safeUrl = this.sanitizer.bypassSecurityTrustUrl(URL.createObjectURL(blob));
            this.profilePhotoUrls[userId] = safeUrl;
            if (this.selectedUser?.id === userId) {
              this.profilePhotoUrl = safeUrl; // Set for details mode
            }
            this.cdr.detectChanges();
          },
          error: (err) => {
            this.profilePhotoUrls[userId] = null;
            if (this.selectedUser?.id === userId) {
              this.profilePhotoUrl = null; // Ensure consistency
            }
            this.showError(`Failed to load profile photo for user ${userId}`, err);
            this.cdr.detectChanges();
          },
        });
      } else {
        this.profilePhotoUrls[userId] = null;
        if (this.selectedUser?.id === userId) {
          this.profilePhotoUrl = null; // Ensure consistency
        }
        this.cdr.detectChanges();
      }
    },
    error: (err) => {
      this.profilePhotoUrls[userId] = null;
      if (this.selectedUser?.id === userId) {
        this.profilePhotoUrl = null; // Ensure consistency
      }
      this.showError(`Failed to load user data for user ${userId}`, err);
      this.cdr.detectChanges();
    },
  });
}

  onRoleChange(event: any): void {
    this.formUser.role = event.value;
    this.cdr.detectChanges();
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

  uploadProfilePhoto(userId: number): void {
    if (!this.selectedFile) {
      this.showError('No file selected for upload');
      return;
    }
    this.authService.uploadProfilePhoto(userId, this.selectedFile).subscribe({
      next: (user) => {
        const index = this.users.findIndex((u) => u.id === userId);
        if (index !== -1) {
          this.users[index] = user;
        }
        if (this.selectedUser?.id === userId) {
          this.selectedUser = user;
        }
        this.showSuccess('Profile photo uploaded successfully');
        this.selectedFile = null;
        this.loadProfilePhotoForUser(userId);
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.showError('Failed to upload profile photo', err);
      },
    });
  }

  deleteProfilePhoto(userId: number): void {
    this.confirmationService.confirm({
      message: 'Are you sure you want to delete this profile photo?',
      header: 'Confirm',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.authService.deleteProfilePhoto(userId).subscribe({
          next: () => {
            const index = this.users.findIndex((u) => u.id === userId);
            if (index !== -1) {
              this.users[index].profilePhotoPath = '';
            }
            if (this.selectedUser?.id === userId) {
              this.selectedUser!.profilePhotoPath = '';
            }
            this.profilePhotoUrl = null;
            this.profilePhotoUrls[userId] = null;
            this.showSuccess('Profile photo deleted successfully');
            this.cdr.detectChanges();
          },
          error: (err) => {
            this.showError('Failed to delete profile photo', err);
          },
        });
      },
    });
  }

  saveUser(): void {
    this.submitted = true;
    if (!this.validateForm()) return;
    this.isSaving = true;
    const payload = this.preparePayload();
    if (this.mode === 'new') {
      this.authService.register(payload).subscribe({
        next: (user) => {
          this.users.push(user);
          this.showSuccess('User registered successfully');
          if (this.selectedFile) {
            this.uploadProfilePhoto(user.id);
          } else {
            this.profilePhotoUrls[user.id] = null;
          }
          this.mode = 'list';
          this.selectedUser = null;
          this.formUser = this.resetFormUser();
          this.selectedFile = null;
          this.profilePhotoUrl = null;
          this.isSaving = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.showError('Registration failed', err);
          this.isSaving = false;
          this.cdr.detectChanges();
        },
      });
    } else if (this.mode === 'edit' && this.selectedUser) {
      this.authService.updateUser(this.selectedUser.id, payload).subscribe({
        next: (user) => {
          const index = this.users.findIndex((u) => u.id === user.id);
          if (index !== -1) {
            this.users[index] = user;
          }
          this.showSuccess('User updated successfully');
          if (this.selectedFile) {
            this.uploadProfilePhoto(user.id);
          } else if (user.profilePhotoPath && user.profilePhotoPath.trim() !== '') {
            this.loadProfilePhotoForUser(user.id);
          } else {
            this.profilePhotoUrls[user.id] = null;
          }
          this.mode = 'list';
          this.selectedUser = null;
          this.formUser = this.resetFormUser();
          this.selectedFile = null;
          this.profilePhotoUrl = null;
          this.isSaving = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.showError('Update failed', err);
          this.isSaving = false;
          this.cdr.detectChanges();
        },
      });
    }
  }

  private preparePayload(): Partial<User> {
    const payload: Partial<User> = {
      email: this.formUser.email?.trim(),
      firstName: this.formUser.firstName?.trim(),
      lastName: this.formUser.lastName?.trim(),
      phoneNumber: this.formUser.phoneNumber?.trim(),
      role: this.formUser.role,
    };
    if (this.mode === 'new') {
      payload.password = this.formUser.password?.trim();
    } else if (this.formUser.password?.trim()) {
      payload.password = this.formUser.password?.trim();
    }
    return payload;
  }

  loadUserDetails(id: number): void {
    this.isLoading = true;
    this.authService.getUserById(id).subscribe({
      next: (user) => {
        this.selectedUser = user;
        this.mode = 'details';
        if (user.profilePhotoPath && user.profilePhotoPath.trim() !== '') {
          this.loadProfilePhotoForUser(user.id);
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
    if (user.profilePhotoPath && user.profilePhotoPath.trim() !== '') {
      this.loadProfilePhotoForUser(user.id);
    } else {
      this.profilePhotoUrl = null;
      this.profilePhotoUrls[user.id] = null;
    }
    this.cdr.detectChanges();
  }

  deleteUser(id: number): void {
    this.confirmationService.confirm({
      message: 'Are you sure you want to delete this user?',
      header: 'Confirm',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.isLoading = true;
        this.authService.deleteUser(id).subscribe({
          next: () => {
            this.users = this.users.filter((user) => user.id !== id);
            delete this.profilePhotoUrls[id];
            this.selectedUser = null;
            this.profilePhotoUrl = null;
            this.showSuccess('User deleted successfully');
            this.isLoading = false;
            this.cdr.detectChanges();
          },
          error: (err) => {
            this.showError('Deletion failed', err);
            this.isLoading = false;
            this.cdr.detectChanges();
          },
        });
      },
    });
  }

  goBack(): void {
    this.mode = 'list';
    this.selectedUser = null;
    this.formUser = this.resetFormUser();
    this.selectedFile = null;
    this.profilePhotoUrl = null;
    this.userId = null;
    this.router.navigate(['/users']);
    this.loadUsers();
  }

  viewDetails(id: number): void {
    this.userId = id;
    this.loadUserDetails(id);
    this.router.navigate([`/users/${id}`]);
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
    console.error(`${message}:`, {
      message,
      errorDetails: error,
      status: error?.status,
      statusText: error?.statusText,
    });
    this.messageService.add({
      severity: 'error',
      summary: 'Error',
      detail: `${message}: ${errorMessage}`,
      life: 3000,
    });
  }
}