import { Component, type OnInit } from "@angular/core"
import { Router } from "@angular/router"
import { CommonModule } from "@angular/common"
import { FormsModule } from "@angular/forms"
import { ButtonModule } from "primeng/button"
import { CardModule } from "primeng/card"
import { InputTextModule } from "primeng/inputtext"
import { PasswordModule } from "primeng/password"
import { AvatarModule } from "primeng/avatar"
import { DividerModule } from "primeng/divider"
import { ChipModule } from "primeng/chip"
import { ToastModule } from "primeng/toast"
import { DialogModule } from "primeng/dialog"
import { FileUploadModule } from "primeng/fileupload"
import { TooltipModule } from "primeng/tooltip"
import { TabViewModule } from "primeng/tabview"
import { ConfirmDialogModule } from "primeng/confirmdialog"
import { MessageService, ConfirmationService } from "primeng/api"
import { RouterModule } from "@angular/router"
import { DatePipe } from "@angular/common"
import { AuthService } from "../../services/auth.service"
import { DomSanitizer, type SafeUrl } from "@angular/platform-browser"
import type { User } from "../../models/User"

@Component({
  selector: "app-admin-profile",
  templateUrl: "./admin-profile.component.html",
  styleUrls: ["./admin-profile.component.scss"],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    CardModule,
    InputTextModule,
    PasswordModule,
    AvatarModule,
    DividerModule,
    ChipModule,
    ToastModule,
    DialogModule,
    FileUploadModule,
    TooltipModule,
    TabViewModule,
    ConfirmDialogModule,
    RouterModule,
  ],
  providers: [MessageService, ConfirmationService, DatePipe],
})
export class AdminProfileComponent implements OnInit {
  user: User | null = null
  profilePhotoUrl: SafeUrl | null = null
  isLoading = false
  editMode = false
  selectedFile: File | null = null
  displayPhotoUploadDialog = false
  displayPasswordDialog = false
  
  // Password change form
  passwordForm = {
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  }

  constructor(
    private router: Router,
    private authService: AuthService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    private sanitizer: DomSanitizer,
  ) {}

  ngOnInit(): void {
    // Only allow ADMINISTRATOR - back-office is exclusively for administrators
    const user = this.authService.getStoredUser();
    if (!user || user.role !== 'ADMINISTRATOR') {
      this.router.navigate(['/profile']);
      return;
    }
    this.loadUserProfile()
  }

  loadUserProfile(): void {
    this.isLoading = true
    this.authService.getCurrentUser().subscribe({
      next: (user) => {
        this.user = user
        this.loadProfilePhoto()
        // Admin profile only shows personal info, not transfers/appointments
        // Admin can manage transfers from /transfer-requests page
        // Admin can manage appointments from /appointments page
        this.isLoading = false
      },
      error: (err) => {
        console.error("Failed to load user profile:", err)
        this.showError("Failed to load profile")
        this.isLoading = false
      },
    })
  }

  loadProfilePhoto(): void {
    if (this.user?.id && this.user.profilePhotoPath) {
      this.authService.getProfilePhoto(this.user.id).subscribe({
        next: (blob: Blob) => {
          this.profilePhotoUrl = this.sanitizer.bypassSecurityTrustUrl(URL.createObjectURL(blob))
        },
        error: (err) => {
          console.error("Failed to load profile photo:", err)
          this.profilePhotoUrl = null
        },
      })
    }
  }


  getUserInitials(): string {
    if (!this.user) return ""
    return `${this.user.firstName?.[0] || ""}${this.user.lastName?.[0] || ""}`.toUpperCase()
  }

  getMemberSince(): string {
    if (!this.user?.createdAt) return "N/A"
    return new Date(this.user.createdAt).toLocaleDateString()
  }

  navigateToStats(): void {
    this.router.navigate(["/stats"])
  }

  navigateToTransferRequests(): void {
    this.router.navigate(["/transfer-requests"])
  }

  navigateToAppointments(): void {
    this.router.navigate(["/appointments"])
  }

  navigateToUsers(): void {
    this.router.navigate(["/users"])
  }

  toggleEditMode(): void {
    this.editMode = !this.editMode
    if (!this.editMode) {
      // Cancel edit - reload original data
      this.loadUserProfile()
    }
  }

  saveProfile(): void {
    if (!this.user?.id) {
      this.showError("User ID is missing")
      return
    }

    this.isLoading = true
    this.authService.updateUser(this.user.id, this.user).subscribe({
      next: (updatedUser) => {
        this.user = updatedUser
        this.editMode = false
        this.isLoading = false
        this.showSuccess("Profile updated successfully")
        this.authService.updateStoredUser(updatedUser)
        this.loadUserProfile()
      },
      error: (err) => {
        console.error("Failed to update profile:", err)
        this.isLoading = false
        const errorMessage = err?.error?.message || err?.message || "Failed to update profile. Please try again."
        this.showError(errorMessage)
      },
    })
  }

  cancelEdit(): void {
    this.editMode = false
    this.loadUserProfile()
  }

  openPhotoUploadDialog(): void {
    this.displayPhotoUploadDialog = true
    this.selectedFile = null
  }

  closePhotoUploadDialog(): void {
    this.displayPhotoUploadDialog = false
    this.selectedFile = null
  }

  onFileSelect(event: any): void {
    const file: File = event.files && event.files.length > 0 ? event.files[0] : null
    if (file) {
      // Validate file type
      if (!file.type.match(/image\/(png|jpeg|jpg)/)) {
        this.showError("Invalid file type. Only PNG and JPEG images are allowed.")
        return
      }
      // Validate file size (5MB)
      if (file.size > 5 * 1024 * 1024) {
        this.showError("File size exceeds 5MB. Please choose a smaller image.")
        return
      }
      this.selectedFile = file
      // Create preview
      const reader = new FileReader()
      reader.onload = (e: any) => {
        this.profilePhotoUrl = this.sanitizer.bypassSecurityTrustUrl(e.target.result)
      }
      reader.readAsDataURL(file)
    }
  }

  uploadProfilePhoto(): void {
    if (!this.user?.id) {
      this.showError("User ID is missing")
      return
    }

    if (!this.selectedFile) {
      this.showError("Please select a photo to upload")
      return
    }

    this.isLoading = true
    this.authService.uploadProfilePhoto(this.user.id, this.selectedFile).subscribe({
      next: (updatedUser) => {
        this.user = updatedUser
        this.showSuccess("Profile photo uploaded successfully")
        this.isLoading = false
        this.closePhotoUploadDialog()
        this.loadProfilePhoto()
        this.authService.updateStoredUser(updatedUser)
      },
      error: (err) => {
        console.error("Failed to upload profile photo:", err)
        const errorMessage = err?.error?.message || err?.message || "Failed to upload profile photo"
        this.showError(errorMessage)
        this.isLoading = false
      },
    })
  }

  deleteProfilePhoto(): void {
    if (!this.user?.id) {
      this.showError("User ID is missing")
      return
    }

    this.confirmationService.confirm({
      message: "Are you sure you want to delete your profile photo?",
      header: "Confirm Deletion",
      icon: "pi pi-exclamation-triangle",
      accept: () => {
        this.isLoading = true
        this.authService.deleteProfilePhoto(this.user!.id).subscribe({
          next: () => {
            this.profilePhotoUrl = null
            if (this.user) {
              this.user.profilePhotoPath = ""
            }
            this.showSuccess("Profile photo deleted successfully")
            this.isLoading = false
            if (this.user) {
              this.authService.updateStoredUser(this.user)
            }
          },
          error: (err) => {
            console.error("Failed to delete profile photo:", err)
            const errorMessage = err?.error?.message || err?.message || "Failed to delete profile photo"
            this.showError(errorMessage)
            this.isLoading = false
          },
        })
      },
    })
  }

  openPasswordDialog(): void {
    this.displayPasswordDialog = true
    this.passwordForm = {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    }
  }

  closePasswordDialog(): void {
    this.displayPasswordDialog = false
    this.passwordForm = {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    }
  }

  changePassword(): void {
    if (!this.user?.id) {
      this.showError("User ID is missing")
      return
    }

    // Validate form
    if (!this.passwordForm.currentPassword || !this.passwordForm.newPassword || !this.passwordForm.confirmPassword) {
      this.showError("Please fill in all password fields")
      return
    }

    if (this.passwordForm.newPassword !== this.passwordForm.confirmPassword) {
      this.showError("New password and confirmation do not match")
      return
    }

    if (this.passwordForm.newPassword.length < 6) {
      this.showError("New password must be at least 6 characters long")
      return
    }

    this.isLoading = true
    // Update user with new password
    this.authService.updateUser(this.user.id, {
      ...this.user,
      password: this.passwordForm.newPassword,
    }).subscribe({
      next: (updatedUser) => {
        this.showSuccess("Password changed successfully")
        this.isLoading = false
        this.closePasswordDialog()
        // Note: User might need to login again after password change
      },
      error: (err) => {
        console.error("Failed to change password:", err)
        this.isLoading = false
        const errorMessage = err?.error?.message || err?.message || "Failed to change password. Please try again."
        this.showError(errorMessage)
      },
    })
  }

  showError(message: string): void {
    this.messageService.add({
      severity: "error",
      summary: "Error",
      detail: message,
      life: 3000,
    })
  }

  showSuccess(message: string): void {
    this.messageService.add({
      severity: "success",
      summary: "Success",
      detail: message,
      life: 3000,
    })
  }

}

