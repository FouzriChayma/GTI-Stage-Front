import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { ToastModule } from 'primeng/toast';
import { CheckboxModule } from 'primeng/checkbox';
import { MessageService } from 'primeng/api';
import { lastValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { CommonModule } from '@angular/common';

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
  ],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
  providers: [MessageService],
})
export class LoginComponent {
  email: string = '';
  password: string = '';
  checked: boolean = false;
  isLoading: boolean = false;
  submitted: boolean = false;

  private apiUrl = environment.apiUrl;

  constructor(
    private http: HttpClient,
    private messageService: MessageService,
    private router: Router
  ) {}

  isEmailInvalid(): boolean {
    return !this.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email);
  }

  async loginUser(): Promise<void> {
    this.submitted = true;

    if (!this.email.trim() || !this.password.trim()) {
      this.showError('Please enter both email and password');
      return;
    }

    if (this.isEmailInvalid()) {
      this.showError('Invalid email format');
      return;
    }

    this.isLoading = true;
    try {
      const response: any = await lastValueFrom(
        this.http.post(`${this.apiUrl}/login`, {
          email: this.email.trim(),
          password: this.password.trim(),
        })
      );
      // Store tokens (adjust based on your auth strategy)
      localStorage.setItem('token', response.token);
      localStorage.setItem('refreshToken', response.refreshToken);
      this.showSuccess('Login successful');
      // Navigate to a protected route (e.g., dashboard)
      // Navigate to /users route after successful login
      this.router.navigate(['/users']); // Adjust route as needed
    } catch (err) {
      this.showError('Login failed', err);
    } finally {
      this.isLoading = false;
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
    const errorMessage = error?.error?.message || error?.message || 'Unknown error';
    console.error(message, error);
    this.messageService.add({
      severity: 'error',
      summary: 'Error',
      detail: `${message}: ${errorMessage}`,
      life: 3000,
    });
  }
}