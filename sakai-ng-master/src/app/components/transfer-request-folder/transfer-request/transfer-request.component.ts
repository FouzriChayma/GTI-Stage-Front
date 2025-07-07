import { Component, OnInit, signal, ViewChild } from '@angular/core';
import { ConfirmationService, MessageService } from 'primeng/api';
import { Table, TableModule } from 'primeng/table';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { RippleModule } from 'primeng/ripple';
import { ToastModule } from 'primeng/toast';
import { ToolbarModule } from 'primeng/toolbar';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { DialogModule } from 'primeng/dialog';
import { TagModule } from 'primeng/tag';
import { InputIconModule } from 'primeng/inputicon';
import { IconFieldModule } from 'primeng/iconfield';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { FileUploadModule } from 'primeng/fileupload';
import { DropdownModule } from 'primeng/dropdown';
import { CheckboxModule } from 'primeng/checkbox';
import { TransferRequestService } from '../../../services/transfer-request.service';
import { TransferRequest } from '../../../models/transfer-request';
import { Beneficiary } from '../../../models/beneficiary';
import { Document } from '../../../models/document';
import { Router } from '@angular/router';

interface Column {
  field: string;
  header: string;
  customExportHeader?: string;
}

interface ExportColumn {
  title: string;
  dataKey: string;
}

@Component({
  selector: 'app-transfer-request',
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
  templateUrl: './transfer-request.component.html',
  providers: [MessageService, TransferRequestService, ConfirmationService]
})
export class TransferRequestComponent implements OnInit {
  transferRequestDialog: boolean = false;
  transferRequests = signal<TransferRequest[]>([]);
  selectedTransferRequests: TransferRequest[] | null = null;
  submitted: boolean = false;
  selectedFiles: File[] = [];
  isSaving: boolean = false;

  // Search criteria
  searchCriteria = {
    userId: null as number | null,
    commissionAccountNumber: '',
    transferType: null as string | null,
    status: null as string | null,
    amount: null as number | null
  };

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
  statuses = [
    { label: 'Pending', value: 'PENDING' },
    { label: 'Validated', value: 'VALIDATED' },
    { label: 'Rejected', value: 'REJECTED' },
    { label: 'Info Requested', value: 'INFO_REQUESTED' },
    { label: 'Completed', value: 'COMPLETED' }
  ];

  @ViewChild('dt') dt!: Table;
  exportColumns!: ExportColumn[];
  cols!: Column[];

  constructor(
    private transferRequestService: TransferRequestService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadTransferRequests();
    this.initColumns();
  }

  loadTransferRequests() {
    this.transferRequestService.searchTransferRequests(
      this.searchCriteria.userId === null ? undefined : this.searchCriteria.userId,
      this.searchCriteria.commissionAccountNumber || undefined,
      this.searchCriteria.transferType || undefined,
      this.searchCriteria.status || undefined,
      this.searchCriteria.amount === null ? undefined : this.searchCriteria.amount
    ).subscribe({
      next: (data) => this.transferRequests.set(data),
      error: (err) => this.showError('Failed to load transfer requests', err)
    });
  }

  initColumns() {
    this.cols = [
      { field: 'idTransferRequest', header: 'ID' },
      { field: 'userId', header: 'User ID' },
      { field: 'commissionAccountNumber', header: 'Commission Account' },
      { field: 'transferType', header: 'Transfer Type' },
      { field: 'amount', header: 'Amount' },
      { field: 'currency', header: 'Currency' },
      { field: 'status', header: 'Status' },
      { field: 'beneficiary_name', header: 'Beneficiary' }, // Use flat key
      { field: 'documents_count', header: 'Documents' } // Use flat key
    ];
    this.exportColumns = this.cols.map(col => ({ title: col.header, dataKey: col.field }));
  }

  exportCSV() {
    // Transform data to flatten nested and computed fields
    const originalData = this.transferRequests();
    const exportData = originalData.map(transfer => ({
      ...transfer,
      beneficiary_name: transfer.beneficiary?.name || '',
      documents_count: transfer.documents?.length || 0
    }));

    // Temporarily set table value to transformed data
    this.dt.value = exportData;
    this.dt.exportCSV({ selectionOnly: false });
    // Restore table value
    this.dt.value = originalData;
  }

  onFileSelected(event: any) {
    this.selectedFiles = event.files || [];
  }

  onGlobalFilter(table: Table, event: Event) {
    table.filterGlobal((event.target as HTMLInputElement).value, 'contains');
  }

  onSearch() {
    this.loadTransferRequests();
  }

  clearSearch() {
    this.searchCriteria = {
      userId: null,
      commissionAccountNumber: '',
      transferType: null,
      status: null,
      amount: null
    };
    this.loadTransferRequests();
  }

  isCurrencyValid(currency: string): boolean {
    return /^[A-Z]{3}$/.test(currency || '');
  }

  isFutureDate(date: string): boolean {
    const today = new Date().toISOString().split('T')[0];
    return date > today;
  }

  openNew() {
    this.router.navigate(['/new-transfer-request']);
  }

  editTransferRequest(transferRequest: TransferRequest) {
    console.log("Navigating to edit with ID:", transferRequest.idTransferRequest);
    this.router.navigate([`edit-transfer-request/${transferRequest.idTransferRequest}`]);
  }

  hideDialog() {
    this.transferRequestDialog = false;
    this.submitted = false;
  }

  async saveTransferRequest() {
    this.submitted = true;
    if (!this.validateForm()) return;

    this.isSaving = true;
    try {
      let savedTransfer: TransferRequest;
      if (this.transferRequest.idTransferRequest) {
        const result = await this.transferRequestService.updateTransferRequest(
          this.transferRequest.idTransferRequest,
          this.transferRequest
        ).toPromise();
        if (!result) {
          throw new Error('Failed to update transfer request');
        }
        savedTransfer = result;
      } else {
        const result = this.selectedFiles.length > 0
          ? await this.transferRequestService.createTransferRequestWithDocument(this.transferRequest, this.selectedFiles[0]).toPromise()
          : await this.transferRequestService.createTransferRequest(this.transferRequest).toPromise();
        if (!result) {
          throw new Error('Failed to create transfer request');
        }
        savedTransfer = result;
      }

      if (!savedTransfer.idTransferRequest) {
        throw new Error('Failed to save transfer request');
      }

      if (this.selectedFiles.length > 1 && !this.transferRequest.idTransferRequest) {
        await this.uploadDocumentsSequentially(savedTransfer.idTransferRequest);
      }

      this.showSuccess('Transfer request saved successfully');
      this.transferRequestDialog = false;
      this.loadTransferRequests();
    } catch (error: any) {
      this.showError('Failed to save transfer request', error);
    } finally {
      this.isSaving = false;
    }
  }

  private async uploadDocumentsSequentially(transferRequestId: number): Promise<void> {
    for (const file of this.selectedFiles.slice(1)) {
      try {
        await this.transferRequestService.uploadDocument(transferRequestId, file).toPromise();
        this.showSuccess(`Document "${file.name}" uploaded successfully`);
      } catch (error) {
        this.showError(`Failed to upload "${file.name}"`, error);
      }
    }
    this.selectedFiles = [];
  }

  deleteSelectedTransferRequests() {
    this.confirmationService.confirm({
      message: 'Are you sure you want to delete the selected transfer requests?',
      header: 'Confirm',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.selectedTransferRequests?.forEach((tr) => {
          this.transferRequestService.deleteTransferRequest(tr.idTransferRequest!).subscribe({
            next: () => {
              this.transferRequests.set(
                this.transferRequests().filter((val) => !this.selectedTransferRequests?.includes(val))
              );
              this.showSuccess('Transfer Requests Deleted');
            },
            error: (err) => this.showError('Failed to delete transfer requests', err)
          });
        });
        this.selectedTransferRequests = null;
      }
    });
  }

  deleteTransferRequest(transferRequest: TransferRequest) {
    this.confirmationService.confirm({
      message: `Are you sure you want to delete transfer request ${transferRequest.idTransferRequest}?`,
      header: 'Confirm',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.transferRequestService.deleteTransferRequest(transferRequest.idTransferRequest!).subscribe({
          next: () => {
            this.transferRequests.set(
              this.transferRequests().filter((val) => val.idTransferRequest !== transferRequest.idTransferRequest)
            );
            this.showSuccess('Transfer Request Deleted');
          },
          error: (err) => this.showError('Failed to delete transfer request', err)
        });
      }
    });
  }

  validateTransferRequest(transferRequest: TransferRequest) {
    this.confirmationService.confirm({
      message: `Are you sure you want to validate transfer request ${transferRequest.idTransferRequest}?`,
      header: 'Confirm Validation',
      icon: 'pi pi-check-circle',
      accept: () => {
        this.transferRequestService.validateTransferRequest(transferRequest.idTransferRequest!, 1).subscribe({
          next: (updated) => {
            this.transferRequests.set(
              this.transferRequests().map((tr) =>
                tr.idTransferRequest === updated.idTransferRequest ? updated : tr
              )
            );
            this.showSuccess('Transfer Request Validated');
          },
          error: (err) => this.showError('Failed to validate transfer request', err)
        });
      }
    });
  }

  rejectTransferRequest(transferRequest: TransferRequest) {
    this.confirmationService.confirm({
      message: `Are you sure you want to reject transfer request ${transferRequest.idTransferRequest}?`,
      header: 'Confirm Rejection',
      icon: 'pi pi-times-circle',
      accept: () => {
        this.transferRequestService.rejectTransferRequest(transferRequest.idTransferRequest!, 1).subscribe({
          next: (updated) => {
            this.transferRequests.set(
              this.transferRequests().map((tr) =>
                tr.idTransferRequest === updated.idTransferRequest ? updated : tr
              )
            );
            this.showSuccess('Transfer Request Rejected');
          },
          error: (err) => this.showError('Failed to reject transfer request', err)
        });
      }
    });
  }

  requestAdditionalInfo(transferRequest: TransferRequest) {
    this.confirmationService.confirm({
      message: `Are you sure you want to request additional info for transfer request ${transferRequest.idTransferRequest}?`,
      header: 'Confirm Info Request',
      icon: 'pi pi-info-circle',
      accept: () => {
        this.transferRequestService.requestAdditionalInfo(transferRequest.idTransferRequest!, 1).subscribe({
          next: (updated) => {
            this.transferRequests.set(
              this.transferRequests().map((tr) =>
                tr.idTransferRequest === updated.idTransferRequest ? updated : tr
              )
            );
            this.showSuccess('Additional Info Requested');
          },
          error: (err) => this.showError('Failed to request additional info', err)
        });
      }
    });
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

  getSeverity(status: string) {
    switch (status) {
      case 'VALIDATED':
        return 'success';
      case 'PENDING':
        return 'info';
      case 'REJECTED':
        return 'danger';
      case 'INFO_REQUESTED':
        return 'warning';
      case 'COMPLETED':
        return 'success';
      default:
        return 'info';
    }
  }

  viewDetails(id: number) {
    this.router.navigate([`/transfert-details/${id}`]);
  }
}