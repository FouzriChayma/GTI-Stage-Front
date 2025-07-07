import { Component, OnInit } from '@angular/core';
import { TransferRequestService } from '../../../services/transfer-request.service';
import { MessageService } from 'primeng/api';
import { TransferRequest } from '../../../models/transfer-request';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { RippleModule } from 'primeng/ripple';
import { DropdownModule } from 'primeng/dropdown';
import { ToolbarModule } from 'primeng/toolbar';
import { ToastModule } from 'primeng/toast';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { DialogModule } from 'primeng/dialog';
import { InputIconModule } from 'primeng/inputicon';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TagModule } from 'primeng/tag';
import { CheckboxModule } from 'primeng/checkbox';
import { TableModule } from 'primeng/table';
import { IconFieldModule } from 'primeng/iconfield';
import { FileUploadModule } from 'primeng/fileupload';
import { lastValueFrom } from 'rxjs'; // Import for modern Observable handling

@Component({
  selector: 'app-new-transfer-request',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    RippleModule,
    ToastModule,
    DropdownModule,
    ToolbarModule,
    InputTextModule,
    InputNumberModule,
    DialogModule,
    TagModule,
    InputIconModule,
    IconFieldModule,
    ConfirmDialogModule,
    FileUploadModule,
    TableModule,
    CheckboxModule
  ],
  templateUrl: './new-transfer-request.component.html',
  styleUrls: ['./new-transfer-request.component.scss'],
  providers: [MessageService, TransferRequestService]
})
export class NewTransferRequestComponent implements OnInit {
  transferRequest: TransferRequest = {
    userId: 0,
    commissionAccountNumber: '',
    commissionAccountType: 'COMMISSION',
    settlementAccountNumber: '',
    settlementAccountType: 'SETTLEMENT',
    transferType: 'CURRENT',
    issueDate: new Date().toISOString().split('T')[0],
    feeType: 'SHARED',
    currency: 'TND',
    amount: 0,
    isNegotiation: false,
    isTermNegotiation: false,
    isFinancing: false,
    beneficiary: {
      name: '',
      country: '',
      destinationBank: '',
      bankAccount: ''
    },
    status: 'PENDING',
    documents: []
  };
  submitted: boolean = false;
  selectedFiles: File[] = [];
  isSaving: boolean = false;

  accountTypes = [
    { label: 'Commission', value: 'COMMISSION' },
    { label: 'Settlement', value: 'SETTLEMENT' },
    { label: 'Current', value: 'CURRENT' },
    { label: 'Savings', value: 'SAVINGS' }
  ];
  feeTypes = [
    { label: 'Beneficiary Charge', value: 'BENEFICIARY_CHARGE' },
    { label: 'Our Charge', value: 'OUR_CHARGE' },
    { label: 'Shared', value: 'SHARED' }
  ];
  transferTypes = [
    { label: 'Commercial', value: 'COMMERCIAL' },
    { label: 'Current', value: 'CURRENT' }
  ];

  constructor(
    private transferRequestService: TransferRequestService,
    private messageService: MessageService,
    public router: Router
  ) {}

  ngOnInit() {}

  onFileSelected(event: any) {
  this.selectedFiles = event.files || [];
  const validFiles: File[] = [];
  for (const file of this.selectedFiles) {
    console.log(`File: ${file.name}, Type: ${file.type}, Size: ${file.size}`);
    if (['application/pdf', 'image/png', 'image/jpeg'].includes(file.type)) {
      validFiles.push(file);
    } else {
      this.showError(`Invalid file type for "${file.name}". Only PDF, PNG, and JPEG are allowed`);
    }
  }
  this.selectedFiles = validFiles; // Keep only valid files

}

  async saveTransferRequest() {
    this.submitted = true;
    if (!this.validateForm()) return;

    this.isSaving = true;
    try {
      let result: TransferRequest;
      if (this.selectedFiles.length > 0) {
        if (!this.selectedFiles[0]) throw new Error('No valid file selected');
        result = await lastValueFrom(this.transferRequestService.createTransferRequestWithDocument(this.transferRequest, this.selectedFiles[0]));
      } else {
        result = await lastValueFrom(this.transferRequestService.createTransferRequest(this.transferRequest));
      }
      if (result.idTransferRequest && this.selectedFiles.length > 1) {
        await this.uploadDocumentsSequentially(result.idTransferRequest);
      }
      this.showSuccess('Transfer request saved successfully');
      this.router.navigate(['/transfer-requests']);
    } catch (error: any) {
      this.showError('Failed to save transfer request', error);
    } finally {
      this.isSaving = false;
    }
  }

  private validateForm(): boolean {
    const requiredFields = [
      { field: this.transferRequest.userId > 0, message: 'User ID is required and must be positive' },
      { field: this.transferRequest.commissionAccountNumber?.trim(), message: 'Commission Account is required' },
      { field: this.transferRequest.commissionAccountNumber && this.transferRequest.commissionAccountNumber.length >= 10 && this.transferRequest.commissionAccountNumber.length <= 34, message: 'Commission Account must be 10-34 characters' },
      { field: this.transferRequest.commissionAccountType, message: 'Commission Account Type is required' },
      { field: this.transferRequest.settlementAccountNumber?.trim(), message: 'Settlement Account is required' },
      { field: this.transferRequest.settlementAccountNumber && this.transferRequest.settlementAccountNumber.length >= 10 && this.transferRequest.settlementAccountNumber.length <= 34, message: 'Settlement Account must be 10-34 characters' },
      { field: this.transferRequest.settlementAccountType, message: 'Settlement Account Type is required' },
      { field: this.transferRequest.transferType, message: 'Transfer Type is required' },
      { field: this.transferRequest.issueDate, message: 'Issue Date is required' },
      { field: !this.isFutureDate(this.transferRequest.issueDate), message: 'Issue Date cannot be in the future' },
      { field: this.transferRequest.feeType, message: 'Fee Type is required' },
      { field: this.isCurrencyValid(this.transferRequest.currency), message: 'Currency must be a 3-letter ISO 4217 code (e.g., TND, USD)' },
      { field: this.transferRequest.amount > 0.001, message: 'Amount must be greater than 0.001' },
      { field: this.transferRequest.beneficiary.name?.trim(), message: 'Beneficiary name is required' },
      { field: this.transferRequest.beneficiary.name && this.transferRequest.beneficiary.name.length <= 100, message: 'Beneficiary name must not exceed 100 characters' },
      { field: this.transferRequest.beneficiary.country?.trim(), message: 'Country is required' },
      { field: this.transferRequest.beneficiary.country && this.transferRequest.beneficiary.country.length <= 100, message: 'Country must not exceed 100 characters' },
      { field: this.transferRequest.beneficiary.destinationBank?.trim(), message: 'Destination bank is required' },
      { field: this.transferRequest.beneficiary.destinationBank && this.transferRequest.beneficiary.destinationBank.length <= 100, message: 'Destination bank must not exceed 100 characters' },
      { field: !this.transferRequest.beneficiary.bankAccount || this.transferRequest.beneficiary.bankAccount.length <= 34, message: 'Bank Account must not exceed 34 characters' }
    ];

    if (this.transferRequest.transferType === 'COMMERCIAL') {
      const commercialFields = [
        { field: this.transferRequest.invoiceNumber?.trim(), message: 'Invoice Number is required for Commercial transfers' },
        { field: this.transferRequest.invoiceNumber && this.transferRequest.invoiceNumber.length <= 50, message: 'Invoice Number must not exceed 50 characters' },
        { field: this.transferRequest.invoiceDate, message: 'Invoice Date is required for Commercial transfers' },
        { field: !this.transferRequest.invoiceDate || !this.isFutureDate(this.transferRequest.invoiceDate), message: 'Invoice Date cannot be in the future' },
        { field: this.transferRequest.transferReason?.trim(), message: 'Transfer Reason is required for Commercial transfers' },
        { field: this.transferRequest.transferReason && this.transferRequest.transferReason.length <= 255, message: 'Transfer Reason must not exceed 255 characters' }
      ];
      for (const { field, message } of commercialFields) {
        if (!field) {
          this.showError(message);
          return false;
        }
      }
    }

    for (const { field, message } of requiredFields) {
      if (!field) {
        this.showError(message);
        return false;
      }
    }

    return true;
  }

  private async uploadDocumentsSequentially(transferRequestId: number): Promise<void> {
    for (const file of this.selectedFiles.slice(1)) {
      try {
        const response = await lastValueFrom(this.transferRequestService.uploadDocument(transferRequestId, file));
        this.showSuccess(`Document "${file.name}" uploaded successfully`);
      } catch (error) {
        this.showError(`Failed to upload "${file.name}"`, error);
      }
    }
    this.selectedFiles = [];
  }

  private showSuccess(message: string) {
    this.messageService.add({
      severity: 'success',
      summary: 'Success',
      detail: message,
      life: 3000
    });
  }

  private showError(message: string, error?: any) {
    const errorMessage = error?.error?.message || error?.message || 'Unknown error';
    console.error(message, error);
    this.messageService.add({
      severity: 'error',
      summary: 'Error',
      detail: `${message}: ${errorMessage}`,
      life: 3000
    });
  }

  isCurrencyValid(currency: string): boolean {
    return /^[A-Z]{3}$/.test(currency || '');
  }

  isFutureDate(date: string): boolean {
    const today = new Date().toISOString().split('T')[0];
    return date > today;
  }
}