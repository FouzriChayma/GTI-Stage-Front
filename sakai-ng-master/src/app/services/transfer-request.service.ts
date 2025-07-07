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

  searchTransferRequests(userId?: number, commissionAccountNumber?: string, transferType?: string, status?: string, amount?: number): Observable<TransferRequest[]> {
    let params: Record<string, any> = {};
    if (userId) params['userId'] = userId;
    if (commissionAccountNumber) params['commissionAccountNumber'] = commissionAccountNumber;
    if (transferType) params['transferType'] = transferType;
    if (status) params['status'] = status;
    if (amount) params['amount'] = amount;

    return this.http.get<TransferRequest[]>(`${this.apiUrl}/search`, { params });
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
    const transferRequestBlob = new Blob([JSON.stringify({
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
    })], { type: 'application/json' });
    formData.append('transferRequest', transferRequestBlob);
    formData.append('document', file);

    for (const pair of formData.entries()) {
      console.log(`${pair[0]}: ${pair[1] instanceof Blob ? 'Blob' : pair[1]}`);
    }
    console.log('File appended:', file.name, file.type, file.size);

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
      beneficiaryId: transferRequest.beneficiary.idBeneficiary,
      beneficiary: {
        idBeneficiary: transferRequest.beneficiary.idBeneficiary,
        name: transferRequest.beneficiary.name,
        country: transferRequest.beneficiary.country,
        destinationBank: transferRequest.beneficiary.destinationBank,
        bankAccount: transferRequest.beneficiary.bankAccount
      }
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
    const url = `${this.apiUrl}/${transferRequestId}/documents`;
    return this.http.post(url, formData, { responseType: 'text' as 'text' }) as Observable<string>;
  }

  getDocuments(transferRequestId: number): Observable<Document[]> {
    return this.http.get<Document[]>(`${this.apiUrl}/${transferRequestId}/documents`);
  }

  deleteDocument(transferRequestId: number, documentId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${transferRequestId}/documents/${documentId}`);
  }
}