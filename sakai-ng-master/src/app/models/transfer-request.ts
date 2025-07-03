import { AccountType } from "./enums/account-type.enum";
import { TransferType } from "./enums/transfer-type.enum";
import { FeeType } from "./enums/fee-type.enum";
import { TransferStatus } from "./enums/transfer-status.enum";
import { Beneficiary } from "./beneficiary";
import { Document } from "./document";

export interface TransferRequest {
  idTransferRequest?: number;
    userId: number;
    commissionAccountNumber: string;
    commissionAccountType: string;
    settlementAccountNumber: string;
    settlementAccountType: string;
    transferType: string;
    issueDate: string;
    feeType: string;
    currency: string;
    amount: number;
    invoiceNumber?: string;
    invoiceDate?: string;
    transferReason?: string;
    isNegotiation?: boolean;
    isTermNegotiation?: boolean;
    isFinancing?: boolean;
    status?: string;
    createdAt?: string;
    validatedAt?: string;
    validatorId?: number;
    beneficiary: Beneficiary;
    documents?: Document[];
}