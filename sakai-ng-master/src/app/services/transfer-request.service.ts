import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { TransferRequest } from '../models/transfer-request';
import { Beneficiary } from '../models/beneficiary';
import { Document } from '../models/document';



@Injectable({
  providedIn: 'root'
})
export class TransferRequestService {
  private apiUrl = 'http://localhost:8083/api/transfer-requests';

  constructor(private http: HttpClient) {}

  getTransferRequests(): Observable<TransferRequest[]> {
    return this.http.get<TransferRequest[]>(this.apiUrl);
  }

  getTransferRequest(id: number): Observable<TransferRequest> {
    return this.http.get<TransferRequest>(`${this.apiUrl}/${id}`);
  }

  createTransferRequest(transferRequest: TransferRequest): Observable<TransferRequest> {
    const requestBody = {
      userId: transferRequest.userId,
      commissionAccountNumber: transferRequest.commissionAccountNumber,
      commissionAccountType: transferRequest.commissionAccountType,
      settlementAccountNumber: transferRequest.settlementAccountNumber,
      settlementAccountType: transferRequest.settlementAccountType,
      transferType: transferRequest.transferType,
      issueDate: transferRequest.issueDate,
      feeType: transferRequest.feeType,
      currency: transferRequest.currency,
      amount: transferRequest.amount,
      invoiceNumber: transferRequest.invoiceNumber,
      invoiceDate: transferRequest.invoiceDate,
      transferReason: transferRequest.transferReason,
      isNegotiation: transferRequest.isNegotiation,
      isTermNegotiation: transferRequest.isTermNegotiation,
      isFinancing: transferRequest.isFinancing,
      beneficiary: {
        name: transferRequest.beneficiary.name,
        country: transferRequest.beneficiary.country,
        destinationBank: transferRequest.beneficiary.destinationBank,
        bankAccount: transferRequest.beneficiary.bankAccount
      }
    };
    return this.http.post<TransferRequest>(`${this.apiUrl}/json`, requestBody);
  }

  createTransferRequestWithDocument(transferRequest: TransferRequest, file: File): Observable<TransferRequest> {
    const formData = new FormData();
    formData.append('transferRequest', new Blob([JSON.stringify({
      userId: transferRequest.userId,
      commissionAccountNumber: transferRequest.commissionAccountNumber,
      commissionAccountType: transferRequest.commissionAccountType,
      settlementAccountNumber: transferRequest.settlementAccountNumber,
      settlementAccountType: transferRequest.settlementAccountType,
      transferType: transferRequest.transferType,
      issueDate: transferRequest.issueDate,
      feeType: transferRequest.feeType,
      currency: transferRequest.currency,
      amount: transferRequest.amount,
      invoiceNumber: transferRequest.invoiceNumber,
      invoiceDate: transferRequest.invoiceDate,
      transferReason: transferRequest.transferReason,
      isNegotiation: transferRequest.isNegotiation,
      isTermNegotiation: transferRequest.isTermNegotiation,
      isFinancing: transferRequest.isFinancing,
      beneficiary: {
        name: transferRequest.beneficiary.name,
        country: transferRequest.beneficiary.country,
        destinationBank: transferRequest.beneficiary.destinationBank,
        bankAccount: transferRequest.beneficiary.bankAccount
      }
    })], { type: 'application/json' }));
    formData.append('document', file);
    return this.http.post<TransferRequest>(this.apiUrl, formData);
  }

  updateTransferRequest(id: number, transferRequest: TransferRequest): Observable<TransferRequest> {
    const requestBody = {
      userId: transferRequest.userId,
      commissionAccountNumber: transferRequest.commissionAccountNumber,
      commissionAccountType: transferRequest.commissionAccountType,
      settlementAccountNumber: transferRequest.settlementAccountNumber,
      settlementAccountType: transferRequest.settlementAccountType,
      transferType: transferRequest.transferType,
      issueDate: transferRequest.issueDate,
      feeType: transferRequest.feeType,
      currency: transferRequest.currency,
      amount: transferRequest.amount,
      invoiceNumber: transferRequest.invoiceNumber,
      invoiceDate: transferRequest.invoiceDate,
      transferReason: transferRequest.transferReason,
      isNegotiation: transferRequest.isNegotiation,
      isTermNegotiation: transferRequest.isTermNegotiation,
      isFinancing: transferRequest.isFinancing,
      beneficiaryId: transferRequest.beneficiary.idBeneficiary
    };
    return this.http.put<TransferRequest>(`${this.apiUrl}/${id}`, requestBody);
  }

  deleteTransferRequest(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  validateTransferRequest(id: number, validatorId: number): Observable<TransferRequest> {
    return this.http.post<TransferRequest>(
      `${this.apiUrl}/${id}/validate?validatorId=${validatorId}`,
      null
    );
  }

  rejectTransferRequest(id: number, validatorId: number): Observable<TransferRequest> {
    return this.http.post<TransferRequest>(
      `${this.apiUrl}/${id}/reject?validatorId=${validatorId}`,
      null
    );
  }

  requestAdditionalInfo(id: number, validatorId: number): Observable<TransferRequest> {
    return this.http.post<TransferRequest>(
      `${this.apiUrl}/${id}/request-info?validatorId=${validatorId}`,
      null
    );
  }

  uploadDocument(transferRequestId: number, file: File): Observable<string> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<string>(
      `${this.apiUrl}/${transferRequestId}/documents`,
      formData,
      { responseType: 'text' as 'json' }
    );
  }

  getDocuments(transferRequestId: number): Observable<Document[]> {
    return this.http.get<Document[]>(`${this.apiUrl}/${transferRequestId}/documents`);
  }
}

