import { Component, type OnInit } from "@angular/core"
import { Router } from "@angular/router"
import { CommonModule } from "@angular/common"
import { FormsModule } from "@angular/forms"
import { ButtonModule } from "primeng/button"
import { CardModule } from "primeng/card"
import { InputTextModule } from "primeng/inputtext"
import { InputTextarea } from "primeng/inputtextarea";
import { AvatarModule } from "primeng/avatar"
import { TabViewModule } from "primeng/tabview"
import { DividerModule } from "primeng/divider"
import { ChipModule } from "primeng/chip"
import { TableModule } from "primeng/table"
import { TagModule } from "primeng/tag"
import { ToastModule } from "primeng/toast"
import { MessageService, ConfirmationService } from "primeng/api"
import { TooltipModule } from "primeng/tooltip"
import { ConfirmDialogModule } from "primeng/confirmdialog"
import { DialogModule } from "primeng/dialog"
import { FileUploadModule } from "primeng/fileupload"
import { forkJoin, of } from "rxjs"
import { catchError } from "rxjs/operators"
import { TopbarWidget } from "../home/topbarwidget.component"
import { AuthService } from "../../services/auth.service"
import { TransferRequestService } from "../../services/transfer-request.service"
import { AppointmentService } from "../../services/appointment.service"
import { DomSanitizer, type SafeUrl } from "@angular/platform-browser"
import type { User } from "../../models/User"
import type { TransferRequest } from "../../models/transfer-request"
import type { Appointment } from "../../models/appointment"

@Component({
  selector: "app-profile",
  templateUrl: "./profile.component.html",
  styleUrls: ["./profile.component.scss"],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    CardModule,
    InputTextModule,
    InputTextModule,
    AvatarModule,
    TabViewModule,
    DividerModule,
    ChipModule,
    TableModule,
    TagModule,
    ToastModule,
    TopbarWidget,
    TooltipModule,
    ConfirmDialogModule,
    DialogModule,
    FileUploadModule,
  ],
  providers: [MessageService, ConfirmationService],
})
export class ProfileComponent implements OnInit {
  user: User | null = null
  profilePhotoUrl: SafeUrl | null = null
  transfers: TransferRequest[] = []
  appointments: Appointment[] = []
  stats = {
    totalTransfers: 0,
    totalAppointments: 0,
    accountBalance: "$0.00",
    pendingTransfers: 0,
  }
  isLoading = false
  isLoadingTransfers = false
  isLoadingAppointments = false
  editMode = false
  displayTransferDialog = false
  selectedTransfer: TransferRequest | null = null
  isLoadingTransferDetails = false
  displayAppointmentDialog = false
  selectedAppointment: Appointment | null = null
  isLoadingAppointmentDetails = false
  selectedFile: File | null = null
  displayPhotoUploadDialog = false
  displayPasswordDialog = false
  displaySessionsDialog = false
  
  // Password change form
  passwordFormData = {
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  }
  
  // Active sessions
  activeSessions: Array<{
    id: string
    device: string
    location: string
    lastActive: string
    icon: string
    isCurrent: boolean
  }> = []

  constructor(
    private router: Router,
    private authService: AuthService,
    private transferService: TransferRequestService,
    private appointmentService: AppointmentService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    private sanitizer: DomSanitizer,
  ) {}

  ngOnInit(): void {
    // Check user role and redirect ADMINISTRATOR to back-office
    const user = this.authService.getStoredUser();
    if (user) {
      // Only ADMINISTRATOR goes to back-office, CHARGE_CLIENTELE and CLIENT use front-office
      if (user.role === 'ADMINISTRATOR') {
        this.router.navigate(['/admin-profile']);
        return;
      }
    }
    // CHARGE_CLIENTELE and CLIENT users use this front-office profile
    this.loadUserProfile()
  }

  loadUserProfile(): void {
    this.isLoading = true
    this.authService.getCurrentUser().subscribe({
      next: (user) => {
        this.user = user
        this.loadProfilePhoto()
        this.loadUserTransfers()
        this.loadUserAppointments()
        // Note: Stats are updated in loadUserTransfers and loadUserAppointments
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

  loadUserTransfers(): void {
    if (!this.user) return

    this.isLoadingTransfers = true

    // CHARGE_CLIENTELE sees all pending/info_requested transfers, CLIENT sees only their own
    if (this.user.role === 'CHARGE_CLIENTELE') {
      // Load pending and info requested transfers for CHARGE_CLIENTELE
      // Use catchError to handle individual request failures gracefully
      forkJoin({
        pending: this.transferService.searchTransferRequests(undefined, undefined, undefined, undefined, undefined, 'PENDING').pipe(
          catchError((err) => {
            console.warn("Failed to load pending transfers:", err)
            return of([]) // Return empty array if request fails
          })
        ),
        infoRequested: this.transferService.searchTransferRequests(undefined, undefined, undefined, undefined, undefined, 'INFO_REQUESTED').pipe(
          catchError((err) => {
            console.warn("Failed to load info requested transfers:", err)
            return of([]) // Return empty array if request fails
          })
        )
      }).subscribe({
        next: ({ pending, infoRequested }) => {
          this.transfers = [...(pending || []), ...(infoRequested || [])]
          this.stats.totalTransfers = this.transfers.length
          this.stats.pendingTransfers = this.transfers.filter((t) => t.status === "PENDING").length
          this.isLoadingTransfers = false
        },
        error: (err) => {
          console.error("Failed to load transfers:", err)
          this.showError("Failed to load transfers")
          this.transfers = [] // Set empty array on error
          this.isLoadingTransfers = false
        },
      })
    } else if (this.user.id) {
      // CLIENT sees only their own transfers
      this.transferService.searchTransferRequests(this.user.id).subscribe({
        next: (transfers) => {
          this.transfers = transfers
          this.stats.totalTransfers = transfers.length
          this.stats.pendingTransfers = transfers.filter((t) => t.status === "PENDING").length
          this.isLoadingTransfers = false
        },
        error: (err) => {
          console.error("Failed to load transfers:", err)
          this.showError("Failed to load transfers")
          this.isLoadingTransfers = false
        },
      })
    } else {
      this.isLoadingTransfers = false
    }
  }

  loadUserAppointments(): void {
    if (!this.user?.id) return

    this.isLoadingAppointments = true

    // CHARGE_CLIENTELE sees all appointments (all clients), CLIENT sees only their own
    if (this.user.role === 'CHARGE_CLIENTELE') {
      // Load all appointments for CHARGE_CLIENTELE to manage
      this.appointmentService.searchAppointments(undefined, undefined, undefined).subscribe({
        next: (appointments) => {
          this.appointments = appointments
          this.stats.totalAppointments = appointments.length
          this.isLoadingAppointments = false
        },
        error: (err) => {
          console.error("Failed to load appointments:", err)
          this.showError("Failed to load appointments")
          this.appointments = [] // Set empty array on error
          this.isLoadingAppointments = false
        },
      })
    } else {
      // CLIENT sees only their own appointments
      this.appointmentService.getUserAppointments(this.user.id).subscribe({
        next: (appointments) => {
          this.appointments = appointments
          this.stats.totalAppointments = appointments.length
          this.isLoadingAppointments = false
        },
        error: (err) => {
          console.error("Failed to load appointments:", err)
          this.showError("Failed to load appointments")
          this.isLoadingAppointments = false
        },
      })
    }
  }

  updateStats(): void {
    // Update statistics based on loaded data
    if (this.user?.role === 'CHARGE_CLIENTELE') {
      // For CHARGE_CLIENTELE, stats are calculated from all appointments and transfers
      this.stats.totalAppointments = this.appointments.length
      this.stats.totalTransfers = this.transfers.length
      this.stats.pendingTransfers = this.transfers.filter((t) => t.status === "PENDING").length
    } else {
      // For CLIENT, stats are already updated in loadUserTransfers and loadUserAppointments
    }
  }

  toggleEditMode(): void {
    this.editMode = !this.editMode
  }

  saveProfile(): void {
    if (!this.user?.id) {
      this.showError("User ID is missing")
      return
    }

    // Show loading state
    this.isLoading = true

    this.authService.updateUser(this.user.id, this.user).subscribe({
      next: (updatedUser) => {
        this.user = updatedUser
        this.editMode = false
        this.isLoading = false
        this.showSuccess("Profile updated successfully")
        // Update stored user in auth service
        this.authService.updateStoredUser(updatedUser)
        // Reload user profile to get updated data
        this.loadUserProfile()
      },
      error: (err) => {
        console.error("Failed to update profile:", err)
        this.isLoading = false
        // Show more detailed error message
        const errorMessage = err?.error?.message || err?.message || "Failed to update profile. Please try again."
        this.showError(errorMessage)
      },
    })
  }

  cancelEdit(): void {
    this.editMode = false
    this.loadUserProfile()
  }

  navigateBack(): void {
    this.router.navigate(["/home"])
  }

  getTransferStatusSeverity(status: string): string {
    switch (status) {
      case "VALIDATED":
        return "success"
      case "PENDING":
        return "warning"
      case "REJECTED":
        return "danger"
      case "INFO_REQUESTED":
        return "info"
      default:
        return "secondary"
    }
  }

  getAppointmentStatusSeverity(status: string): string {
    switch (status) {
      case "CONFIRMED":
        return "success"
      case "PENDING":
        return "warning"
      case "CANCELLED":
        return "danger"
      default:
        return "secondary"
    }
  }

  formatDate(dateString: string): string {
    if (!dateString) return "N/A"
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  formatAppointmentDateTime(dateTime: Date | string | undefined): string {
    if (!dateTime) return "N/A"
    try {
      const date = dateTime instanceof Date ? dateTime : new Date(dateTime)
      if (isNaN(date.getTime())) return "N/A"
      return date.toLocaleString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      })
    } catch (error) {
      console.error("Error formatting appointment date:", error, dateTime)
      return "N/A"
    }
  }

  formatCurrency(amount: number, currency: string): string {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
    }).format(amount)
  }

  private showSuccess(message: string): void {
    this.messageService.add({
      severity: "success",
      summary: "Success",
      detail: message,
      life: 3000,
    })
  }

  private showError(message: string): void {
    this.messageService.add({
      severity: "error",
      summary: "Error",
      detail: message,
      life: 3000,
    })
  }

  getUserInitials(): string {
    if (!this.user) return "U"
    return `${this.user.firstName?.charAt(0) || ""}${this.user.lastName?.charAt(0) || ""}`
  }

  getMemberSince(): string {
    if (!this.user?.createdAt) return "N/A"
    const date = new Date(this.user.createdAt)
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
    })
  }

  navigateToScheduleMeeting(): void {
    this.router.navigate(["/schedule-meeting"])
  }

  navigateToTransferRequest(): void {
    this.router.navigate(["/transfer-request"])
  }
  getActivityIcon(type: string): string {
    switch (type) {
      case "transfer":
        return "pi-arrow-right-arrow-left"
      case "appointment":
        return "pi-calendar"
      case "login":
        return "pi-sign-in"
      default:
        return "pi-info-circle"
    }
  }

  getActivityColor(type: string): string {
    switch (type) {
      case "transfer":
        return "bg-blue-100 text-blue-700"
      case "appointment":
        return "bg-green-100 text-green-700"
      case "login":
        return "bg-purple-100 text-purple-700"
      default:
        return "bg-gray-100 text-gray-700"
    }
  }

  isChargeClientele(): boolean {
    return this.user?.role === 'CHARGE_CLIENTELE'
  }

  canPerformAction(status: string): boolean {
    // Only PENDING and INFO_REQUESTED transfers can be acted upon by CHARGE_CLIENTELE
    return this.isChargeClientele() && (status === 'PENDING' || status === 'INFO_REQUESTED')
  }

  validateTransfer(transferId: number): void {
    if (!this.user?.id) return

    this.confirmationService.confirm({
      message: 'Are you sure you want to validate this transfer request?',
      header: 'Confirm Validation',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.isLoadingTransfers = true
        this.transferService.validateTransferRequest(transferId, this.user!.id!).subscribe({
          next: () => {
            this.showSuccess('Transfer request validated successfully')
            this.loadUserTransfers() // Reload to refresh the list
          },
          error: (err) => {
            console.error('Failed to validate transfer:', err)
            this.showError('Failed to validate transfer request')
            this.isLoadingTransfers = false
          },
        })
      },
    })
  }

  rejectTransfer(transferId: number): void {
    if (!this.user?.id) return

    this.confirmationService.confirm({
      message: 'Are you sure you want to reject this transfer request?',
      header: 'Confirm Rejection',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.isLoadingTransfers = true
        this.transferService.rejectTransferRequest(transferId, this.user!.id!).subscribe({
          next: () => {
            this.showSuccess('Transfer request rejected successfully')
            this.loadUserTransfers() // Reload to refresh the list
          },
          error: (err) => {
            console.error('Failed to reject transfer:', err)
            this.showError('Failed to reject transfer request')
            this.isLoadingTransfers = false
          },
        })
      },
    })
  }

  requestInfo(transferId: number): void {
    if (!this.user?.id) return

    this.confirmationService.confirm({
      message: 'Are you sure you want to request additional information for this transfer request?',
      header: 'Confirm Request',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.isLoadingTransfers = true
        this.transferService.requestAdditionalInfo(transferId, this.user!.id!).subscribe({
          next: () => {
            this.showSuccess('Additional information requested successfully')
            this.loadUserTransfers() // Reload to refresh the list
          },
          error: (err) => {
            console.error('Failed to request info:', err)
            this.showError('Failed to request additional information')
            this.isLoadingTransfers = false
          },
        })
      },
    })
  }

  viewTransferDetails(transfer: TransferRequest): void {
    if (!transfer.idTransferRequest) {
      this.showError('Transfer ID is missing')
      return
    }

    this.isLoadingTransferDetails = true
    this.displayTransferDialog = true
    this.selectedTransfer = transfer

    // Load full transfer details including documents
    this.transferService.getTransferRequest(transfer.idTransferRequest).subscribe({
      next: (fullTransfer) => {
        this.selectedTransfer = fullTransfer
        this.isLoadingTransferDetails = false
      },
      error: (err) => {
        console.error('Failed to load transfer details:', err)
        this.showError('Failed to load transfer details')
        this.isLoadingTransferDetails = false
        // Still show the dialog with the basic transfer info we have
      },
    })
  }

  closeTransferDialog(): void {
    this.displayTransferDialog = false
    this.selectedTransfer = null
  }

  validateTransferFromDialog(): void {
    if (!this.selectedTransfer?.idTransferRequest || !this.user?.id) return
    this.closeTransferDialog()
    this.validateTransfer(this.selectedTransfer.idTransferRequest)
  }

  rejectTransferFromDialog(): void {
    if (!this.selectedTransfer?.idTransferRequest || !this.user?.id) return
    this.closeTransferDialog()
    this.rejectTransfer(this.selectedTransfer.idTransferRequest)
  }

  requestInfoFromDialog(): void {
    if (!this.selectedTransfer?.idTransferRequest || !this.user?.id) return
    this.closeTransferDialog()
    this.requestInfo(this.selectedTransfer.idTransferRequest)
  }

  // Appointment Management Methods
  viewAppointmentDetails(appointment: Appointment): void {
    if (!appointment.idAppointment) {
      this.showError('Appointment ID is missing')
      return
    }

    const appointmentId = appointment.idAppointment

    this.isLoadingAppointmentDetails = true
    this.displayAppointmentDialog = true
    this.selectedAppointment = appointment

    // Load full appointment details
    this.appointmentService.getAppointment(appointmentId).subscribe({
      next: (fullAppointment) => {
        this.selectedAppointment = fullAppointment
        this.isLoadingAppointmentDetails = false
      },
      error: (err) => {
        console.error('Failed to load appointment details:', err)
        this.showError('Failed to load appointment details')
        this.isLoadingAppointmentDetails = false
        // Still show the dialog with the basic appointment info we have
      },
    })
  }

  closeAppointmentDialog(): void {
    this.displayAppointmentDialog = false
    this.selectedAppointment = null
  }

  canManageAppointment(status: string): boolean {
    // CHARGE_CLIENTELE can manage appointments that are not completed or cancelled
    return this.isChargeClientele() && status !== 'COMPLETED' && status !== 'CANCELLED'
  }

  confirmAppointment(appointmentId: number): void {
    if (!this.user?.id) return

    this.confirmationService.confirm({
      message: 'Are you sure you want to confirm this appointment?',
      header: 'Confirm Appointment',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.isLoadingAppointments = true
        this.appointmentService.confirmAppointment(appointmentId).subscribe({
          next: () => {
            this.showSuccess('Appointment confirmed successfully')
            this.loadUserAppointments() // Reload to refresh the list
            this.closeAppointmentDialog()
          },
          error: (err) => {
            console.error('Failed to confirm appointment:', err)
            this.showError('Failed to confirm appointment')
            this.isLoadingAppointments = false
          },
        })
      },
    })
  }

  cancelAppointment(appointmentId: number): void {
    if (!this.user?.id) return

    this.confirmationService.confirm({
      message: 'Are you sure you want to cancel this appointment?',
      header: 'Cancel Appointment',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.isLoadingAppointments = true
        this.appointmentService.cancelAppointment(appointmentId).subscribe({
          next: () => {
            this.showSuccess('Appointment cancelled successfully')
            this.loadUserAppointments() // Reload to refresh the list
            this.closeAppointmentDialog()
          },
          error: (err) => {
            console.error('Failed to cancel appointment:', err)
            this.showError('Failed to cancel appointment')
            this.isLoadingAppointments = false
          },
        })
      },
    })
  }

  completeAppointment(appointmentId: number): void {
    if (!this.user?.id) return

    this.confirmationService.confirm({
      message: 'Are you sure you want to mark this appointment as completed?',
      header: 'Complete Appointment',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.isLoadingAppointments = true
        this.appointmentService.completeAppointment(appointmentId).subscribe({
          next: () => {
            this.showSuccess('Appointment marked as completed successfully')
            this.loadUserAppointments() // Reload to refresh the list
            this.closeAppointmentDialog()
          },
          error: (err) => {
            console.error('Failed to complete appointment:', err)
            this.showError('Failed to complete appointment')
            this.isLoadingAppointments = false
          },
        })
      },
    })
  }

  confirmAppointmentFromDialog(): void {
    if (!this.selectedAppointment?.idAppointment) return
    this.confirmAppointment(this.selectedAppointment.idAppointment)
  }

  cancelAppointmentFromDialog(): void {
    if (!this.selectedAppointment?.idAppointment) return
    this.cancelAppointment(this.selectedAppointment.idAppointment)
  }

  completeAppointmentFromDialog(): void {
    if (!this.selectedAppointment?.idAppointment) return
    this.completeAppointment(this.selectedAppointment.idAppointment)
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
        this.showError('Invalid file type. Only PNG and JPEG images are allowed.')
        return
      }
      // Validate file size (5MB)
      if (file.size > 5 * 1024 * 1024) {
        this.showError('File size exceeds 5MB. Please choose a smaller image.')
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
      this.showError('User ID is missing')
      return
    }

    if (!this.selectedFile) {
      this.showError('Please select a photo to upload')
      return
    }

    this.isLoading = true
    this.authService.uploadProfilePhoto(this.user.id, this.selectedFile).subscribe({
      next: (updatedUser) => {
        this.user = updatedUser
        this.showSuccess('Profile photo uploaded successfully')
        this.isLoading = false
        this.closePhotoUploadDialog()
        // Reload profile photo
        this.loadProfilePhoto()
        // Update stored user
        this.authService.updateStoredUser(updatedUser)
      },
      error: (err) => {
        console.error('Failed to upload profile photo:', err)
        const errorMessage = err?.error?.message || err?.message || 'Failed to upload profile photo'
        this.showError(errorMessage)
        this.isLoading = false
      },
    })
  }

  deleteProfilePhoto(): void {
    if (!this.user?.id) {
      this.showError('User ID is missing')
      return
    }

    this.confirmationService.confirm({
      message: 'Are you sure you want to delete your profile photo?',
      header: 'Confirm Deletion',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.isLoading = true
        this.authService.deleteProfilePhoto(this.user!.id).subscribe({
          next: () => {
            this.profilePhotoUrl = null
            if (this.user) {
              this.user.profilePhotoPath = ''
            }
            this.showSuccess('Profile photo deleted successfully')
            this.isLoading = false
            // Update stored user
            if (this.user) {
              this.authService.updateStoredUser(this.user)
            }
          },
          error: (err) => {
            console.error('Failed to delete profile photo:', err)
            const errorMessage = err?.error?.message || err?.message || 'Failed to delete profile photo'
            this.showError(errorMessage)
            this.isLoading = false
          },
        })
      },
    })
  }

  openPasswordDialog(): void {
    this.displayPasswordDialog = true
    this.passwordFormData = {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    }
  }

  closePasswordDialog(): void {
    this.displayPasswordDialog = false
    this.passwordFormData = {
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
    if (!this.passwordFormData.currentPassword || !this.passwordFormData.newPassword || !this.passwordFormData.confirmPassword) {
      this.showError("Please fill in all password fields")
      return
    }

    if (this.passwordFormData.newPassword !== this.passwordFormData.confirmPassword) {
      this.showError("New password and confirmation do not match")
      return
    }

    if (this.passwordFormData.newPassword.length < 6) {
      this.showError("New password must be at least 6 characters long")
      return
    }

    this.isLoading = true
    // Change password with current password verification
    this.authService.changePassword(
      this.user.id,
      this.passwordFormData.currentPassword,
      this.passwordFormData.newPassword
    ).subscribe({
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

  openSessionsDialog(): void {
    this.displaySessionsDialog = true
    this.loadActiveSessions()
  }

  closeSessionsDialog(): void {
    this.displaySessionsDialog = false
  }

  loadActiveSessions(): void {
    // Get current session info
    const currentToken = this.authService.getToken()
    const user = this.authService.getStoredUser()
    
    // Get user agent info
    const userAgent = navigator.userAgent
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)
    const isTablet = /iPad|Android/i.test(userAgent) && !isMobile
    
    let device = "Unknown Device"
    let icon = "pi pi-desktop"
    
    if (isMobile) {
      device = "Mobile Device"
      icon = "pi pi-mobile"
    } else if (isTablet) {
      device = "Tablet"
      icon = "pi pi-tablet"
    } else {
      device = "Desktop"
      icon = "pi pi-desktop"
    }
    
    // Get browser info
    const browser = this.getBrowserName(userAgent)
    device = `${browser} on ${device}`
    
    // Get location (simplified - in production, you'd get this from IP geolocation)
    const location = "Unknown Location"
    
    // Current session
    const currentSession = {
      id: "current",
      device: device,
      location: location,
      lastActive: "Now",
      icon: icon,
      isCurrent: true,
    }
    
    // Get other sessions from localStorage (if any)
    const storedSessions = localStorage.getItem(`sessions_${user?.id}`)
    let otherSessions: any[] = []
    
    if (storedSessions) {
      try {
        otherSessions = JSON.parse(storedSessions).filter((s: any) => s.id !== "current")
      } catch (e) {
        console.error("Failed to parse stored sessions:", e)
      }
    }
    
    this.activeSessions = [currentSession, ...otherSessions]
  }

  getBrowserName(userAgent: string): string {
    if (userAgent.indexOf("Chrome") > -1) return "Chrome"
    if (userAgent.indexOf("Firefox") > -1) return "Firefox"
    if (userAgent.indexOf("Safari") > -1) return "Safari"
    if (userAgent.indexOf("Edge") > -1) return "Edge"
    if (userAgent.indexOf("Opera") > -1) return "Opera"
    return "Browser"
  }

  revokeSession(session: any): void {
    this.confirmationService.confirm({
      message: `Are you sure you want to revoke access for ${session.device}?`,
      header: "Revoke Session",
      icon: "pi pi-exclamation-triangle",
      accept: () => {
        // Remove session from list
        this.activeSessions = this.activeSessions.filter(s => s.id !== session.id)
        
        // Update stored sessions
        const user = this.authService.getStoredUser()
        if (user?.id) {
          const otherSessions = this.activeSessions.filter(s => !s.isCurrent)
          localStorage.setItem(`sessions_${user.id}`, JSON.stringify(otherSessions))
        }
        
        this.showSuccess("Session revoked successfully")
      },
    })
  }

  revokeAllOtherSessions(): void {
    this.confirmationService.confirm({
      message: "Are you sure you want to revoke access for all other devices? You will remain logged in on this device.",
      header: "Revoke All Other Sessions",
      icon: "pi pi-exclamation-triangle",
      accept: () => {
        // Keep only current session
        this.activeSessions = this.activeSessions.filter(s => s.isCurrent)
        
        // Clear stored sessions
        const user = this.authService.getStoredUser()
        if (user?.id) {
          localStorage.removeItem(`sessions_${user.id}`)
        }
        
        this.showSuccess("All other sessions revoked successfully")
      },
    })
  }
}
