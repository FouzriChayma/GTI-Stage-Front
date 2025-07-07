import { Component, OnInit } from '@angular/core';
import { TransferRequestService } from '../../../services/transfer-request.service';
import { TransferRequest } from '../../../models/transfer-request';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { CommonModule } from '@angular/common';
import { ToastModule } from 'primeng/toast';
import { TableModule } from 'primeng/table';

@Component({
  selector: 'app-transfert-details',
  standalone: true,
  imports: [CommonModule, TagModule, ButtonModule, ToastModule, TableModule],
  templateUrl: './transfert-details.component.html',
  styleUrls: ['./transfert-details.component.scss'],
  providers: [MessageService]
})
export class TransfertDetailsComponent implements OnInit {
  transferRequest: TransferRequest | null = null;
  currentValidatorId: number = 1; // You should get this from your auth service or user context
  isLoading: boolean = false;

  constructor(
    private transferRequestService: TransferRequestService,
    private route: ActivatedRoute,
    private router: Router,
    private messageService: MessageService
  ) {}

  ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (id) {
      this.loadTransferDetails(id);
    }
  }

  loadTransferDetails(id: number) {
    this.isLoading = true;
    this.transferRequestService.getTransferRequest(id).subscribe({
      next: (data) => {
        this.transferRequest = data;
        this.isLoading = false;
      },
      error: (err) => {
        this.isLoading = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: `Failed to load transfer details: ${err.message}`,
          life: 3000
        });
      }
    });
  }

  validateTransferRequest() {
    if (!this.transferRequest?.idTransferRequest) return;
    
    this.isLoading = true;
    this.transferRequestService.validateTransferRequest(
      this.transferRequest.idTransferRequest, 
      this.currentValidatorId
    ).subscribe({
      next: (updatedTransfer) => {
        this.transferRequest = updatedTransfer;
        this.isLoading = false;
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Transfer request validated successfully',
          life: 3000
        });
      },
      error: (err) => {
        this.isLoading = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: `Failed to validate transfer request: ${err.message}`,
          life: 3000
        });
      }
    });
  }

  rejectTransferRequest() {
    if (!this.transferRequest?.idTransferRequest) return;
    
    this.isLoading = true;
    this.transferRequestService.rejectTransferRequest(
      this.transferRequest.idTransferRequest, 
      this.currentValidatorId
    ).subscribe({
      next: (updatedTransfer) => {
        this.transferRequest = updatedTransfer;
        this.isLoading = false;
        this.messageService.add({
          severity: 'warn',
          summary: 'Rejected',
          detail: 'Transfer request rejected successfully',
          life: 3000
        });
      },
      error: (err) => {
        this.isLoading = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: `Failed to reject transfer request: ${err.message}`,
          life: 3000
        });
      }
    });
  }

  requestAdditionalInfo() {
    if (!this.transferRequest?.idTransferRequest) return;
    
    this.isLoading = true;
    this.transferRequestService.requestAdditionalInfo(
      this.transferRequest.idTransferRequest, 
      this.currentValidatorId
    ).subscribe({
      next: (updatedTransfer) => {
        this.transferRequest = updatedTransfer;
        this.isLoading = false;
        this.messageService.add({
          severity: 'info',
          summary: 'Info Requested',
          detail: 'Additional information requested successfully',
          life: 3000
        });
      },
      error: (err) => {
        this.isLoading = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: `Failed to request additional information: ${err.message}`,
          life: 3000
        });
      }
    });
  }

  goBack() {
    this.router.navigate(['/transfer-requests']);
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

  // Helper method to check if actions are available based on status
  canPerformActions(): boolean {
    return this.transferRequest?.status === 'PENDING' || this.transferRequest?.status === 'INFO_REQUESTED';
  }
}
