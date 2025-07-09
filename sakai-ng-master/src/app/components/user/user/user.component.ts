// src/app/components/user/user.component.ts
import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { User } from '../../../models/User'; // Adjust the import path as necessary
import { Observable } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
@Component({
  selector: 'app-user',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './user.component.html',
  styleUrls: ['./user.component.scss']
})
export class UserComponent implements OnInit {
  users: User[] = [];
  selectedUser: User | null = null;
  newUser: User = {
    id: 0, email: '', firstName: '', lastName: '', phoneNumber: '', role: 'CLIENT', isActive: true, createdAt: '', updatedAt: '',
    password: ''
  };
  errorMessage: string = '';

  private apiUrl = 'http://localhost:8083/api/auth'; // Adjust port if your backend runs on a different port

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.http.get<User[]>(`${this.apiUrl}/users`).subscribe({
      next: (data) => this.users = data,
      error: (err) => this.errorMessage = 'Failed to load users'
    });
  }

  registerUser(): void {
    this.http.post<User>(`${this.apiUrl}/register`, this.newUser).subscribe({
      next: (user) => {
        this.users.push(user);
        this.newUser = { id: 0, email: '', password: '', firstName: '', lastName: '', phoneNumber: '', role: 'CLIENT', isActive: true, createdAt: '', updatedAt: '' };
        this.errorMessage = '';
      },
      error: (err) => this.errorMessage = 'Registration failed'
    });
  }

  loginUser(email: string, password: string): void {
    const loginData = { email, password };
    this.http.post<User>(`${this.apiUrl}/login`, loginData).subscribe({
      next: (user) => this.selectedUser = user,
      error: (err) => this.errorMessage = 'Login failed'
    });
  }

  getUser(id: number): void {
    this.http.get<User>(`${this.apiUrl}/users/${id}`).subscribe({
      next: (user) => this.selectedUser = user,
      error: (err) => this.errorMessage = 'Failed to load user'
    });
  }

  updateUser(): void {
    if (this.selectedUser) {
      this.http.put<User>(`${this.apiUrl}/users/${this.selectedUser.id}`, this.selectedUser).subscribe({
        next: (user) => {
          const index = this.users.findIndex(u => u.id === user.id);
          if (index !== -1) this.users[index] = user;
          this.errorMessage = '';
        },
        error: (err) => this.errorMessage = 'Update failed'
      });
    }
  }

  deleteUser(id: number): void {
    this.http.delete<void>(`${this.apiUrl}/users/${id}`).subscribe({
      next: () => {
        this.users = this.users.filter(user => user.id !== id);
        this.selectedUser = null;
        this.errorMessage = '';
      },
      error: (err) => this.errorMessage = 'Deletion failed'
    });
  }
}