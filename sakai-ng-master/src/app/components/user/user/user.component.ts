import { Component, OnInit, ChangeDetectorRef, ViewChild } from "@angular/core"
import { HttpClient } from "@angular/common/http"
import type { User } from "../../../models/User"
import { lastValueFrom } from "rxjs"
import { FormsModule } from "@angular/forms"
import { CommonModule } from "@angular/common"
import { MessageService, ConfirmationService } from "primeng/api"
import type { Table } from "primeng/table"
import { ButtonModule } from "primeng/button"
import { InputTextModule } from "primeng/inputtext"
import { DropdownModule } from "primeng/dropdown"
import { ToastModule } from "primeng/toast"
import { ConfirmDialogModule } from "primeng/confirmdialog"
import { TableModule } from "primeng/table"
import { ProgressSpinnerModule } from "primeng/progressspinner"

export const environment = {
  production: false,
  apiUrl: "http://localhost:8083/api/auth",
}

interface Role {
  label: string
  value: string
}

@Component({
  selector: "app-user",
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
  ],
  templateUrl: "./user.component.html",
  styleUrls: ["./user.component.scss"],
  providers: [MessageService, ConfirmationService],
})
export class UserComponent implements OnInit {
  mode: "list" | "new" | "edit" | "details" = "list"
  users: User[] = []
  selectedUser: User | null = null
  formUser: User = this.resetFormUser()
  isLoading = false
  isSaving = false
  submitted = false

  roles: Role[] = [
    { label: "Client", value: "CLIENT" },
    { label: "Administrator", value: "ADMINISTRATOR" },
    { label: "Charge Clientele", value: "CHARGE_CLIENTELE" },
  ]

  @ViewChild("dt") dt!: Table

  private apiUrl = environment.apiUrl

  constructor(
    private http: HttpClient,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadUsers()
  }

  private resetFormUser(): User {
    return {
      id: 0,
      email: "",
      password: "",
      firstName: "",
      lastName: "",
      phoneNumber: "",
      role: "", // Default role
      isActive: true,
      createdAt: "",
      updatedAt: "",
    }
  }

  openNew(): void {
    this.mode = "new"
    this.formUser = this.resetFormUser()
    this.submitted = false
    console.log("Opening new user form, initial role:", this.formUser.role)
    this.cdr.detectChanges()
  }

  async loadUsers(): Promise<void> {
    this.isLoading = true
    try {
      const users = await lastValueFrom(this.http.get<User[]>(`${this.apiUrl}/users`))
      this.users = users
      this.showSuccess("Users loaded successfully")
    } catch (err) {
      this.showError("Failed to load users", err)
    } finally {
      this.isLoading = false
      this.cdr.detectChanges()
    }
  }

  // Add this method to handle role change
  onRoleChange(event: any): void {
    console.log("Role changed to:", event.value)
    this.formUser.role = event.value
    console.log("Form user role after change:", this.formUser.role)
  }

  async saveUser(): Promise<void> {
    this.submitted = true

    // Log the current form state before validation
    console.log("Saving user with role:", this.formUser.role)
    console.log("Full form user object:", this.formUser)

    if (!this.validateForm()) return

    this.isSaving = true
    const payload = this.preparePayload()

    // Log the payload being sent
    console.log("Payload being sent:", payload)

    try {
      if (this.mode === "new") {
        const user = await lastValueFrom(this.http.post<User>(`${this.apiUrl}/register`, payload))
        this.users.push(user)
        this.showSuccess("User registered successfully")
        console.log("User created with role:", user.role)
      } else if (this.mode === "edit" && this.selectedUser) {
        const user = await lastValueFrom(this.http.put<User>(`${this.apiUrl}/users/${this.selectedUser.id}`, payload))
        const index = this.users.findIndex((u) => u.id === user.id)
        if (index !== -1) this.users[index] = user
        this.showSuccess("User updated successfully")
      }
      this.mode = "list"
      this.selectedUser = null
      this.formUser = this.resetFormUser()
    } catch (err) {
      this.showError(this.mode === "new" ? "Registration failed" : "Update failed", err)
      console.error("Error details:", err)
    } finally {
      this.isSaving = false
      this.cdr.detectChanges()
    }
  }

  private preparePayload(): any {
    const payload = {
      email: this.formUser.email?.trim(),
      password: this.mode === "new" ? this.formUser.password?.trim() : undefined,
      firstName: this.formUser.firstName?.trim(),
      lastName: this.formUser.lastName?.trim(),
      phoneNumber: this.formUser.phoneNumber?.trim(),
      role: this.formUser.role, // Make sure this is included
    }

    // Remove undefined password for edit mode
    if (this.mode === "edit") {
      delete payload.password
    }

    console.log("Prepared payload:", payload)
    return payload
  }

  async loginUser(email: string, password: string): Promise<void> {
    this.isLoading = true
    try {
      const user = await lastValueFrom(this.http.post<User>(`${this.apiUrl}/login`, { email, password }))
      this.selectedUser = user
      this.mode = "details"
      this.showSuccess("Login successful")
    } catch (err) {
      this.showError("Login failed", err)
    } finally {
      this.isLoading = false
      this.cdr.detectChanges()
    }
  }

  viewDetails(id: number): void {
    this.isLoading = true
    this.http.get<User>(`${this.apiUrl}/users/${id}`).subscribe({
      next: (user) => {
        this.selectedUser = user
        this.mode = "details"
        this.isLoading = false
        this.cdr.detectChanges()
      },
      error: (err) => {
        this.showError("Failed to load user details", err)
        this.isLoading = false
        this.cdr.detectChanges()
      },
    })
  }

  editUser(user: User): void {
    this.selectedUser = user
    this.formUser = { ...user, password: "" }
    this.mode = "edit"
    this.submitted = false
    console.log("Editing user with role:", this.formUser.role)
    this.cdr.detectChanges()
    this.loadUsers() // Refresh the user list after editing
  }

  deleteUser(id: number): void {
    this.confirmationService.confirm({
      message: "Are you sure you want to delete this user?",
      header: "Confirm",
      icon: "pi pi-exclamation-triangle",
      accept: async () => {
        this.isLoading = true
        try {
          await lastValueFrom(this.http.delete(`${this.apiUrl}/users/${id}`))
          this.users = this.users.filter((user) => user.id !== id)
          this.selectedUser = null
          this.showSuccess("User deleted successfully")
        } catch (err) {
          this.showError("Deletion failed", err)
        } finally {
          this.isLoading = false
          this.cdr.detectChanges()
        }
      },
    })
  }

  goBack(): void {
    this.mode = "list"
    this.selectedUser = null
    this.formUser = this.resetFormUser()
    this.loadUsers()
  }

  private validateForm(): boolean {
    const requiredFields = [
      { field: this.formUser.email?.trim() ?? "", message: "Email is required" },
      {
        field: this.formUser.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.formUser.email),
        message: "Invalid email format",
      },
      { field: this.formUser.firstName?.trim() ?? "", message: "First name is required" },
      { field: this.formUser.lastName?.trim() ?? "", message: "Last name is required" },
      { field: this.formUser.phoneNumber?.trim() ?? "", message: "Phone number is required" },
      {
        field: this.formUser.phoneNumber && /^\+?\d{10,15}$/.test(this.formUser.phoneNumber),
        message: "Invalid phone number format",
      },
      { field: this.formUser.role ?? "", message: "Role is required" },
    ]

    if (this.mode === "new") {
      requiredFields.push(
        { field: this.formUser.password?.trim() ?? "", message: "Password is required" },
        {
          field: !!(this.formUser.password && this.formUser.password.length >= 6),
          message: "Password must be at least 6 characters",
        },
      )
    }

    for (const { field, message } of requiredFields) {
      if (!field) {
        this.showError(message)
        return false
      }
    }
    return true
  }

  private showSuccess(message: string): void {
    this.messageService.add({
      severity: "success",
      summary: "Success",
      detail: message,
      life: 3000,
    })
  }

  private showError(message: string, error?: any): void {
    const errorMessage = error?.error?.message || error?.message || "Unknown error"
    console.error(message, error)
    this.messageService.add({
      severity: "error",
      summary: "Error",
      detail: `${message}: ${errorMessage}`,
      life: 3000,
    })
  }
}
