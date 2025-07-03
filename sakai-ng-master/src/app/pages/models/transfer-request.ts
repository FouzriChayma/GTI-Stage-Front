import { AccountType, FeeType, TransferStatus, TransferType } from './enums';

export interface TransferRequest {
  idTransferRequest?: number;
  userId: number;
  commissionAccountNumber: string;
  commissionAccountType: AccountType;
  settlementAccountNumber: string;
  settlementAccountType: AccountType;
  transferType: TransferType;
  issueDate: string; // ISO date string (e.g., '2025-07-02')
  feeType: FeeType;
  currency: string;
  amount: number;
  invoiceNumber?: string;
  invoiceDate?: string;
  transferReason?: string;
  isNegotiation?: boolean;
  isTermNegotiation?: boolean;
  isFinancing?: boolean;
  status: TransferStatus;
  createdAt?: string;
  validatedAt?: string;
  validatorId?: number;
}