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
  styleUrls: ['./transfert-details.component.scss'] ,
  providers: [MessageService]
})
export class TransfertDetailsComponent implements OnInit {
  transferRequest: TransferRequest | null = null;

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
    this.transferRequestService.getTransferRequest(id).subscribe({
      next: (data) => this.transferRequest = data,
      error: (err) => this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: `Failed to load transfer details: ${err.message}`,
        life: 3000
      })
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
}