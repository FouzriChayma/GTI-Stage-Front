import { Component, OnInit, ChangeDetectorRef } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { TransferRequestService } from "../../services/transfer-request.service";
import { MessageService } from "primeng/api";
import { TransferRequest } from "../../models/transfer-request";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { ButtonModule } from "primeng/button";
import { RippleModule } from "primeng/ripple";
import { DropdownModule } from "primeng/dropdown";
import { ToolbarModule } from "primeng/toolbar";
import { ToastModule } from "primeng/toast";
import { InputTextModule } from "primeng/inputtext";
import { InputNumberModule } from "primeng/inputnumber";
import { DialogModule } from "primeng/dialog";
import { InputIconModule } from "primeng/inputicon";
import { ConfirmDialogModule } from "primeng/confirmdialog";
import { TagModule } from "primeng/tag";
import { CheckboxModule } from "primeng/checkbox";
import { TableModule } from "primeng/table";
import { IconFieldModule } from "primeng/iconfield";
import { FileUploadModule } from "primeng/fileupload";

@Component({
  selector: "app-edit-transfer-request",
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
    CheckboxModule,
  ],
  templateUrl: "./edit-transfer-request.component.html",
  styleUrls: ["./edit-transfer-request.component.scss"],
  providers: [MessageService, TransferRequestService],
})
export class EditTransferRequestComponent implements OnInit {
  transferRequest: TransferRequest = {
    idTransferRequest: 0,
    userId: 0,
    commissionAccountNumber: "",
    commissionAccountType: "COMMISSION",
    settlementAccountNumber: "",
    settlementAccountType: "SETTLEMENT",
    transferType: "CURRENT",
    issueDate: new Date().toISOString().split("T")[0],
    feeType: "SHARED",
    currency: "TND",
    amount: 0,
    invoiceNumber: "",
    invoiceDate: "",
    transferReason: "",
    isNegotiation: false,
    isTermNegotiation: false,
    isFinancing: false,
    beneficiary: {
      idBeneficiary: undefined,
      name: "",
      country: "",
      destinationBank: "",
      bankAccount: "",
    },
    status: "PENDING",
    documents: [],
  };
  submitted = false;
  selectedFiles: File[] = [];
  isSaving = false;
  loading = true;
  transferRequestId = 0;

  accountTypes = [
    { label: "Commission", value: "COMMISSION" },
    { label: "Settlement", value: "SETTLEMENT" },
    { label: "Current", value: "CURRENT" },
    { label: "Savings", value: "SAVINGS" },
  ];

  feeTypes = [
    { label: "Beneficiary Charge", value: "BENEFICIARY_CHARGE" },
    { label: "Our Charge", value: "OUR_CHARGE" },
    { label: "Shared", value: "SHARED" },
  ];

  transferTypes = [
    { label: "Commercial", value: "COMMERCIAL" },
    { label: "Current", value: "CURRENT" },
  ];

  constructor(
    private route: ActivatedRoute,
    private transferRequestService: TransferRequestService,
    private messageService: MessageService,
    public router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    console.log("EditTransferRequestComponent initialized");
    this.route.params.subscribe((params) => {
      console.log("Route params:", params);
      this.transferRequestId = +params["id"] || 0; // Ensure id is a number, default to 0 if invalid
      console.log("Extracted transferRequestId:", this.transferRequestId);

      if (this.transferRequestId > 0) {
        this.loadTransferRequest();
      } else {
        this.showError("Invalid transfer request ID");
        this.loading = false;
        this.router.navigate(["/transfer-requests"]);
      }
    });
  }

  loadTransferRequest() {
    console.log("Loading transfer request with ID:", this.transferRequestId);
    this.loading = true;

    this.transferRequestService.getTransferRequest(this.transferRequestId).subscribe({
      next: (data) => {
        console.log("=== RAW API RESPONSE ===");
        console.log("Full response:", JSON.stringify(data, null, 2));

        if (!data || Object.keys(data).length === 0) {
          console.error("No valid data received from API");
          this.showError("Transfer request not found or empty");
          this.loading = false;
          this.router.navigate(["/transfer-requests"]);
          return;
        }

        // Safely populate transferRequest with API data
        this.transferRequest = {
          idTransferRequest: data.idTransferRequest || this.transferRequestId,
          userId: data.userId || 0,
          commissionAccountNumber: data.commissionAccountNumber || "",
          commissionAccountType: data.commissionAccountType || "COMMISSION",
          settlementAccountNumber: data.settlementAccountNumber || "",
          settlementAccountType: data.settlementAccountType || "SETTLEMENT",
          transferType: data.transferType || "CURRENT",
          issueDate: data.issueDate ? new Date(data.issueDate).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
          feeType: data.feeType || "SHARED",
          currency: data.currency || "TND",
          amount: data.amount || 0,
          invoiceNumber: data.invoiceNumber || "",
          invoiceDate: data.invoiceDate ? new Date(data.invoiceDate).toISOString().split("T")[0] : "",
          transferReason: data.transferReason || "",
          isNegotiation: data.isNegotiation ?? false,
          isTermNegotiation: data.isTermNegotiation ?? false,
          isFinancing: data.isFinancing ?? false,
          status: data.status || "PENDING",
          beneficiary: {
            idBeneficiary: data.beneficiary?.idBeneficiary || undefined,
            name: data.beneficiary?.name || "",
            country: data.beneficiary?.country || "",
            destinationBank: data.beneficiary?.destinationBank || "",
            bankAccount: data.beneficiary?.bankAccount || "",
          },
          documents: data.documents || [],
        };

        console.log("=== PROCESSED TRANSFER REQUEST ===");
        console.log("Final transferRequest:", JSON.stringify(this.transferRequest, null, 2));
        this.loading = false;
        this.cdr.detectChanges(); // Ensure UI updates
      },
      error: (err) => {
        console.error("=== API ERROR ===");
        console.error("Full error:", err);
        this.showError("Failed to load transfer request", err);
        this.loading = false;
        this.cdr.detectChanges();
        this.router.navigate(["/transfer-requests"]);
      },
    });
  }

  debugLoadData() {
    console.log("=== MANUAL DEBUG LOAD ===");
    console.log("Current transferRequestId:", this.transferRequestId);
    console.log("Current transferRequest:", JSON.stringify(this.transferRequest, null, 2));
    this.loadTransferRequest();
  }

  onFileSelected(event: any) {
    this.selectedFiles = event.files || [];
  }

  async updateTransferRequest() {
    this.submitted = true;
    if (!this.validateForm()) return;

    this.isSaving = true;
    try {
      if (!this.transferRequest || !this.transferRequest.idTransferRequest) {
        throw new Error("Transfer request is null or missing ID");
      }

      const result = await this.transferRequestService
        .updateTransferRequest(this.transferRequest.idTransferRequest, this.transferRequest)
        .toPromise();

      if (!result) {
        throw new Error("Failed to update transfer request");
      }

      if (this.selectedFiles.length > 0) {
        await this.uploadDocumentsSequentially(this.transferRequest.idTransferRequest);
      }

      this.showSuccess("Transfer request updated successfully");
      this.router.navigate(["/transfer-requests"]);
    } catch (error: any) {
      this.showError("Failed to update transfer request", error);
    } finally {
      this.isSaving = false;
    }
  }

  private validateForm(): boolean {
    if (!this.transferRequest || !this.transferRequest.idTransferRequest) {
      this.showError("Transfer request data is not loaded");
      return false;
    }

    const requiredFields = [
      { field: this.transferRequest.userId > 0, message: "User ID is required and must be positive" },
      { field: this.transferRequest.commissionAccountNumber?.trim(), message: "Commission Account is required" },
      {
        field:
          this.transferRequest.commissionAccountNumber &&
          this.transferRequest.commissionAccountNumber.length >= 10 &&
          this.transferRequest.commissionAccountNumber.length <= 34,
        message: "Commission Account must be 10-34 characters",
      },
      { field: this.transferRequest.commissionAccountType, message: "Commission Account Type is required" },
      { field: this.transferRequest.settlementAccountNumber?.trim(), message: "Settlement Account is required" },
      {
        field:
          this.transferRequest.settlementAccountNumber &&
          this.transferRequest.settlementAccountNumber.length >= 10 &&
          this.transferRequest.settlementAccountNumber.length <= 34,
        message: "Settlement Account must be 10-34 characters",
      },
      { field: this.transferRequest.settlementAccountType, message: "Settlement Account Type is required" },
      { field: this.transferRequest.transferType, message: "Transfer Type is required" },
      { field: this.transferRequest.issueDate, message: "Issue Date is required" },
      { field: !this.isFutureDate(this.transferRequest.issueDate), message: "Issue Date cannot be in the future" },
      { field: this.transferRequest.feeType, message: "Fee Type is required" },
      {
        field: this.isCurrencyValid(this.transferRequest.currency),
        message: "Currency must be a 3-letter ISO 4217 code (e.g., TND, USD)",
      },
      { field: this.transferRequest.amount > 0.001, message: "Amount must be greater than 0.001" },
      { field: this.transferRequest.beneficiary.name?.trim(), message: "Beneficiary name is required" },
      {
        field: this.transferRequest.beneficiary.name && this.transferRequest.beneficiary.name.length <= 100,
        message: "Beneficiary name must not exceed 100 characters",
      },
      { field: this.transferRequest.beneficiary.country?.trim(), message: "Country is required" },
      {
        field: this.transferRequest.beneficiary.country && this.transferRequest.beneficiary.country.length <= 100,
        message: "Country must not exceed 100 characters",
      },
      { field: this.transferRequest.beneficiary.destinationBank?.trim(), message: "Destination bank is required" },
      {
        field:
          this.transferRequest.beneficiary.destinationBank &&
          this.transferRequest.beneficiary.destinationBank.length <= 100,
        message: "Destination bank must not exceed 100 characters",
      },
      {
        field:
          !this.transferRequest.beneficiary.bankAccount || this.transferRequest.beneficiary.bankAccount.length <= 34,
        message: "Bank Account must not exceed 34 characters",
      },
    ];

    if (this.transferRequest.transferType === "COMMERCIAL") {
      const commercialFields = [
        {
          field: this.transferRequest.invoiceNumber?.trim(),
          message: "Invoice Number is required for Commercial transfers",
        },
        {
          field: this.transferRequest.invoiceNumber && this.transferRequest.invoiceNumber.length <= 50,
          message: "Invoice Number must not exceed 50 characters",
        },
        { field: this.transferRequest.invoiceDate, message: "Invoice Date is required for Commercial transfers" },
        {
          field: !this.transferRequest.invoiceDate || !this.isFutureDate(this.transferRequest.invoiceDate),
          message: "Invoice Date cannot be in the future",
        },
        {
          field: this.transferRequest.transferReason?.trim(),
          message: "Transfer Reason is required for Commercial transfers",
        },
        {
          field: this.transferRequest.transferReason && this.transferRequest.transferReason.length <= 255,
          message: "Transfer Reason must not exceed 255 characters",
        },
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
    for (const file of this.selectedFiles) {
      try {
        await this.transferRequestService.uploadDocument(transferRequestId, file).toPromise();
        this.showSuccess(`Document "${file.name}" uploaded successfully`);
      } catch (error) {
        this.showError(`Failed to upload "${file.name}"`, error);
      }
    }
    this.selectedFiles = [];
  }

  private showSuccess(message: string) {
    this.messageService.add({
      severity: "success",
      summary: "Success",
      detail: message,
      life: 3000,
    });
  }

  private showError(message: string, error?: any) {
    const errorMessage = error?.error?.message || error?.message || "Unknown error";
    console.error(message, error);
    this.messageService.add({
      severity: "error",
      summary: "Error",
      detail: `${message}: ${errorMessage}`,
      life: 3000,
    });
  }

  isCurrencyValid(currency: string): boolean {
    return /^[A-Z]{3}$/.test(currency || "");
  }

  isFutureDate(date: string): boolean {
    if (!date) return false;
    const today = new Date().toISOString().split("T")[0];
    return date > today;
  }
}