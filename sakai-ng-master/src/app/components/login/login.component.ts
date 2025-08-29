import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { ToastModule } from 'primeng/toast';
import { CheckboxModule } from 'primeng/checkbox';
import { MessageService } from 'primeng/api';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { User } from '../../models/User';
import { DropdownModule } from 'primeng/dropdown';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    FormsModule,
    RouterModule,
    ButtonModule,
    CheckboxModule,
    InputTextModule,
    PasswordModule,
    ToastModule,
    CommonModule,
    DropdownModule,
  ],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
  providers: [MessageService],
})
export class LoginComponent implements OnInit {
  mode: 'login' | 'register' = 'login';
  email: string = '';
  password: string = '';
  firstName: string = '';
  lastName: string = '';
  phoneNumber: string = '';
  role: string = 'CLIENT';
  checked: boolean = false;
  isLoading: boolean = false;
  submitted: boolean = false;

  roleOptions = [
    { label: 'Client', value: 'CLIENT' },
    { label: 'Charge Clientèle', value: 'CHARGE_CLIENTELE' },
    { label: 'Administrator', value: 'ADMINISTRATOR' },
  ];

  constructor(
    private authService: AuthService,
    private messageService: MessageService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      this.mode = params['mode'] === 'register' ? 'register' : 'login';
    });
  }

  isEmailInvalid(): boolean {
    return !this.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email.trim());
  }

  isPasswordInvalid(): boolean {
    return !this.password || this.password.trim().length < 6;
  }

  isFirstNameInvalid(): boolean {
    return !this.firstName || this.firstName.trim().length === 0 || this.firstName.trim().length > 50;
  }

  isLastNameInvalid(): boolean {
    return !this.lastName || this.lastName.trim().length === 0 || this.lastName.trim().length > 50;
  }

  isPhoneNumberInvalid(): boolean {
    return !this.phoneNumber || !/^\+?[1-9]\d{1,14}$/.test(this.phoneNumber.trim());
  }

  submitForm(): void {
    this.submitted = true;

    if (this.mode === 'login') {
      this.loginUser();
    } else {
      this.registerUser();
    }
  }

  loginUser(): void {
    if (!this.email.trim() || !this.password.trim()) {
      this.showError('Please enter both email and password');
      return;
    }

    if (this.isEmailInvalid()) {
      this.showError('Invalid email format');
      return;
    }

    this.isLoading = true;
    this.authService.login({
      email: this.email.trim(),
      password: this.password.trim(),
    }).subscribe({
      next: (user: User) => {
        console.log('Login response:', user);
        this.showSuccess('Login successful');
        this.redirectUser(user);
        this.isLoading = false;
      },
      error: (err) => {
        this.showError('Login failed', err);
        this.isLoading = false;
      },
    });
  }

  registerUser(): void {
    if (!this.email.trim() || !this.password.trim() || !this.firstName.trim() || !this.lastName.trim() || !this.phoneNumber.trim()) {
      this.showError('Please fill in all required fields');
      return;
    }

    if (this.isEmailInvalid()) {
      this.showError('Invalid email format');
      return;
    }

    if (this.isPasswordInvalid()) {
      this.showError('Password must be at least 6 characters');
      return;
    }

    if (this.isFirstNameInvalid()) {
      this.showError('First name is required and must not exceed 50 characters');
      return;
    }

    if (this.isLastNameInvalid()) {
      this.showError('Last name is required and must not exceed 50 characters');
      return;
    }

    if (this.isPhoneNumberInvalid()) {
      this.showError('Invalid phone number format');
      return;
    }

    this.isLoading = true;
    this.authService.register({
      email: this.email.trim(),
      password: this.password.trim(),
      firstName: this.firstName.trim(),
      lastName: this.lastName.trim(),
      phoneNumber: this.phoneNumber.trim(),
      role: this.role,
    }).subscribe({
      next: (user: User) => {
        console.log('Register response:', user);
        this.showSuccess('Registration successful');
        this.redirectUser(user);
        this.isLoading = false;
      },
      error: (err) => {
        this.showError('Registration failed', err);
        this.isLoading = false;
      },
    });
  }

  private redirectUser(user: User): void {
    switch (user.role) {
      case 'ADMINISTRATOR':
        this.router.navigate(['/users']);
        break;
      case 'CLIENT':
      case 'CHARGE_CLIENTELE':
        this.router.navigate(['/dashboard']);
        break;
      default:
        this.router.navigate(['/']);
    }
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
    const errorMessage = error?.message || (this.mode === 'login' ? 'Invalid email or password' : 'Registration failed');
    console.error('Error details:', error);
    this.messageService.add({
      severity: 'error',
      summary: 'Error',
      detail: `${message}: ${errorMessage}`,
      life: 3000,
    });
  }

  toggleMode(mode: 'login' | 'register'): void {
    this.mode = mode;
    this.submitted = false;
    this.email = '';
    this.password = '';
    this.firstName = '';
    this.lastName = '';
    this.phoneNumber = '';
    this.role = 'CLIENT';
    this.checked = false;
    this.router.navigate(['/auth'], { queryParams: { mode } });
  }
}