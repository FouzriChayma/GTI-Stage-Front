import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { TransferRequestService } from '../../services/transfer-request.service';
import { lastValueFrom } from 'rxjs';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { RippleModule } from 'primeng/ripple';
import { ToastModule } from 'primeng/toast';
import { DropdownModule } from 'primeng/dropdown';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { FileUploadModule } from 'primeng/fileupload';
import { TransferRequest } from '../../models/transfer-request';
import { User } from '../../models/User';
import { AuthService } from '../../services/auth.service';
import { TopbarWidget } from '../home/topbarwidget.component';
@Component({
  selector: 'app-transfer-request-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonModule,
    RippleModule,
    ToastModule,
    DropdownModule,
    InputTextModule,
    InputNumberModule,
    FileUploadModule,
    TopbarWidget,
  ],
  templateUrl: './transfer-request-form.component.html',
  styleUrls: ['./transfer-request-form.component.scss'],
  providers: [MessageService],
})
export class TransferRequestFormComponent implements OnInit {
  transferForm: FormGroup;
  isSaving = false;
  selectedFiles: File[] = [];
  accountTypes = [
    { label: 'Commission', value: 'COMMISSION' },
    { label: 'Settlement', value: 'SETTLEMENT' },
    { label: 'Current', value: 'CURRENT' },
    { label: 'Savings', value: 'SAVINGS' },
  ];
  feeTypes = [
    { label: 'Beneficiary Charge', value: 'BENEFICIARY_CHARGE' },
    { label: 'Our Charge', value: 'OUR_CHARGE' },
    { label: 'Shared', value: 'SHARED' },
  ];
  transferTypes = [
    { label: 'Commercial', value: 'COMMERCIAL' },
    { label: 'Current', value: 'CURRENT' },
  ];

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private transferRequestService: TransferRequestService,
    private messageService: MessageService,
    private authService: AuthService
  ) {
    this.transferForm = this.fb.group({
      commissionAccountNumber: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(34)]],
      commissionAccountType: ['COMMISSION', Validators.required],
      settlementAccountNumber: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(34)]],
      settlementAccountType: ['SETTLEMENT', Validators.required],
      transferType: ['CURRENT', Validators.required],
      issueDate: [new Date().toISOString().split('T')[0], [Validators.required, this.dateNotInFuture]],
      feeType: ['SHARED', Validators.required],
      currency: ['TND', [Validators.required, Validators.pattern(/^[A-Z]{3}$/)]],
      amount: [null, [Validators.required, Validators.min(0.001)]],
      invoiceNumber: ['', [Validators.maxLength(50)]],
      invoiceDate: [''],
      transferReason: ['', [Validators.maxLength(255)]],
      beneficiaryName: ['', [Validators.required, Validators.maxLength(100)]],
      beneficiaryCountry: ['', [Validators.required, Validators.maxLength(100)]],
      beneficiaryDestinationBank: ['', [Validators.required, Validators.maxLength(100)]],
      beneficiaryBankAccount: ['', [Validators.maxLength(34)]],
    });
  }

  ngOnInit() {
    // Check if user has permission to create transfers (only CLIENT and ADMINISTRATOR)
    if (this.authService.isAuthenticated()) {
      const user = this.authService.getStoredUser();
      if (user && user.role !== 'CLIENT' && user.role !== 'ADMINISTRATOR') {
        // CHARGE_CLIENTELE cannot create transfers - redirect to home
        this.router.navigate(['/home']);
        return;
      }
    }
    this.onTransferTypeChange();
    // Clear any existing error messages when component initializes
    this.messageService.clear();
    // Don't check authentication on init - errors will only be shown when user tries to submit
    // This prevents showing errors when the page loads
  }

  onTransferTypeChange() {
    const transferType = this.transferForm.get('transferType')?.value;
    if (transferType === 'COMMERCIAL') {
      this.transferForm.get('invoiceNumber')?.setValidators([Validators.required, Validators.maxLength(50)]);
      this.transferForm.get('invoiceDate')?.setValidators([Validators.required, this.dateNotInFuture]);
      this.transferForm.get('transferReason')?.setValidators([Validators.required, Validators.maxLength(255)]);
    } else {
      this.transferForm.get('invoiceNumber')?.clearValidators();
      this.transferForm.get('invoiceDate')?.clearValidators();
      this.transferForm.get('transferReason')?.clearValidators();
      this.transferForm.get('invoiceNumber')?.setValue('');
      this.transferForm.get('invoiceDate')?.setValue('');
      this.transferForm.get('transferReason')?.setValue('');
    }
    this.transferForm.get('invoiceNumber')?.updateValueAndValidity();
    this.transferForm.get('invoiceDate')?.updateValueAndValidity();
    this.transferForm.get('transferReason')?.updateValueAndValidity();
  }

  dateNotInFuture(control: any) {
    const today = new Date().toISOString().split('T')[0];
    return control.value <= today ? null : { futureDate: true };
  }

  async saveTransferRequest() {
    if (this.transferForm.invalid) {
      this.transferForm.markAllAsTouched();
      this.showError('Please fill out all required fields correctly');
      return;
    }

    // Check authentication before proceeding
    if (!this.authService.isAuthenticated()) {
      this.showError('User not authenticated. Please log in to continue.');
      this.router.navigate(['/authentication']);
      return;
    }

    // Check user role before proceeding
    const storedUser = this.authService.getStoredUser();
    if (storedUser && storedUser.role !== 'CLIENT' && storedUser.role !== 'ADMINISTRATOR') {
      this.showError('Access Denied: Only CLIENT and ADMINISTRATOR can create transfer requests. Your role: ' + storedUser.role);
      this.router.navigate(['/home']);
      return;
    }

    this.isSaving = true;
    try {
      const currentUser = await this.getCurrentUser();
      if (!currentUser) {
        // Check if user was authenticated but fetch failed
        if (this.authService.isAuthenticated()) {
          this.showError('Failed to retrieve user information', new Error('Failed to fetch current user'));
        } else {
          this.showError('User not authenticated', new Error('Please log in to continue'));
        }
        this.router.navigate(['/authentication']);
        this.isSaving = false;
        return;
      }

      // Double-check role from fetched user
      if (currentUser.role !== 'CLIENT' && currentUser.role !== 'ADMINISTRATOR') {
        this.showError('Access Denied: Only CLIENT and ADMINISTRATOR can create transfer requests. Your role: ' + currentUser.role);
        this.router.navigate(['/home']);
        this.isSaving = false;
        return;
      }

      const transferRequest: TransferRequest = {
        user: currentUser,
        commissionAccountNumber: this.transferForm.get('commissionAccountNumber')?.value,
        commissionAccountType: this.transferForm.get('commissionAccountType')?.value,
        settlementAccountNumber: this.transferForm.get('settlementAccountNumber')?.value,
        settlementAccountType: this.transferForm.get('settlementAccountType')?.value,
        transferType: this.transferForm.get('transferType')?.value,
        issueDate: this.transferForm.get('issueDate')?.value,
        feeType: this.transferForm.get('feeType')?.value,
        currency: this.transferForm.get('currency')?.value,
        amount: this.transferForm.get('amount')?.value,
        invoiceNumber: this.transferForm.get('invoiceNumber')?.value,
        invoiceDate: this.transferForm.get('invoiceDate')?.value,
        transferReason: this.transferForm.get('transferReason')?.value,
        isNegotiation: false,
        isTermNegotiation: false,
        isFinancing: false,
        beneficiary: {
          name: this.transferForm.get('beneficiaryName')?.value,
          country: this.transferForm.get('beneficiaryCountry')?.value,
          destinationBank: this.transferForm.get('beneficiaryDestinationBank')?.value,
          bankAccount: this.transferForm.get('beneficiaryBankAccount')?.value,
        },
        status: 'PENDING',
        documents: [],
      };

      let result;
      if (this.selectedFiles.length > 0) {
        result = await lastValueFrom(
          this.transferRequestService.createTransferRequestWithDocument(transferRequest, this.selectedFiles[0])
        );
        if (result.idTransferRequest && this.selectedFiles.length > 1) {
          await this.uploadDocumentsSequentially(result.idTransferRequest);
        }
      } else {
        result = await lastValueFrom(this.transferRequestService.createTransferRequest(transferRequest));
      }

      this.showSuccess('Transfer request created successfully');
      this.router.navigate(['/home']);
    } catch (error: any) {
      // Handle specific error cases
      if (error?.status === 403) {
        const user = this.authService.getStoredUser();
        if (user?.role === 'CHARGE_CLIENTELE') {
          this.showError('Access Denied: Only CLIENT and ADMINISTRATOR can create transfer requests. CHARGE_CLIENTELE can only validate/reject existing requests.');
          this.router.navigate(['/home']);
        } else {
          this.showError('Access Denied: You do not have permission to create transfer requests. Only CLIENT and ADMINISTRATOR roles are allowed.');
        }
      } else if (error?.message?.includes('Failed to fetch') || error?.message?.includes('NetworkError') || !error?.status) {
        // Network error or backend not available
        this.showError('Connection Error: Unable to connect to the server. Please check if the backend is running and try again.');
        console.error('Network error:', error);
      } else {
        this.showError('Failed to save transfer request', error);
      }
    } finally {
      this.isSaving = false;
    }
  }

  async uploadDocumentsSequentially(transferRequestId: number): Promise<void> {
    for (const file of this.selectedFiles.slice(1)) {
      try {
        await lastValueFrom(this.transferRequestService.uploadDocument(transferRequestId, file));
        this.showSuccess(`Document "${file.name}" uploaded successfully`);
      } catch (error) {
        this.showError(`Failed to upload "${file.name}"`, error);
      }
    }
    this.selectedFiles = [];
  }

  onFileSelected(event: any) {
    const validFiles: File[] = [];
    for (const file of event.files) {
      if (['application/pdf', 'image/png', 'image/jpeg'].includes(file.type)) {
        validFiles.push(file);
      } else {
        this.showError(`Invalid file type for "${file.name}". Only PDF, PNG, and JPEG are allowed`);
      }
    }
    this.selectedFiles = validFiles;
  }

  removeFile(file: File) {
    this.selectedFiles = this.selectedFiles.filter(f => f !== file);
  }

  cancel() {
    this.router.navigate(['/home']);
  }

  private async getCurrentUser(): Promise<User | null> {
    // Check if user is authenticated first
    if (!this.authService.isAuthenticated()) {
      return null;
    }

    try {
      const user = await lastValueFrom(this.authService.getCurrentUser());
      return user;
    } catch (error: any) {
      // Don't show errors here - they will be handled in saveTransferRequest
      // Only log for debugging purposes
      if (error?.status !== 401 && error?.status !== 403) {
        console.warn('Failed to retrieve user information:', error);
      }
      return null;
    }
  }

  private showSuccess(message: string) {
    this.messageService.add({
      severity: 'success',
      summary: 'Success',
      detail: message,
      life: 3000,
    });
  }

  private showError(message: string, error?: any) {
    const errorMessage = error?.error?.message || error?.message || 'Unknown error';
    this.messageService.add({
      severity: 'error',
      summary: 'Error',
      detail: `${message}: ${errorMessage}`,
      life: 3000,
    });
  }
}