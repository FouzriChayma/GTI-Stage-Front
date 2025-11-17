import { Component, OnInit, ChangeDetectorRef, ViewChild, signal } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { TransferRequestService } from "../../services/transfer-request.service";
import { HttpClient, HttpHeaders } from "@angular/common/http";
import { MessageService, ConfirmationService } from "primeng/api";
import { Table } from "primeng/table";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { ButtonModule } from "primeng/button";
import { RippleModule } from "primeng/ripple";
import { ToastModule } from "primeng/toast";
import { ToolbarModule } from "primeng/toolbar";
import { TooltipModule } from "primeng/tooltip";
import { InputTextModule } from "primeng/inputtext";
import { InputNumberModule } from "primeng/inputnumber";
import { DialogModule } from "primeng/dialog";
import { TagModule } from "primeng/tag";
import { InputIconModule } from "primeng/inputicon";
import { IconFieldModule } from "primeng/iconfield";
import { ConfirmDialogModule } from "primeng/confirmdialog";
import { FileUploadModule } from "primeng/fileupload";
import { DropdownModule } from "primeng/dropdown";
import { CheckboxModule } from "primeng/checkbox";
import { TableModule } from "primeng/table";
import { lastValueFrom } from "rxjs";
import { TransferRequest } from "../../models/transfer-request";
import { User } from "../../models/User";
import { ProgressSpinnerModule } from "primeng/progressspinner";
import { AuthService } from "../../services/auth.service";

interface Column {
  field: string;
  header: string;
  customExportHeader?: string;
}

interface ExportColumn {
  title: string;
  dataKey: string;
}

interface UserOption {
  label: string;
  value: User;
}

@Component({
  selector: "app-transfer-request",
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    RippleModule,
    ToastModule,
    DropdownModule,
    TooltipModule,
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
    ProgressSpinnerModule,
  ],
  templateUrl: "./transfer-request.component.html",
  styleUrls: ["./transfer-request.component.css"],
  providers: [MessageService, TransferRequestService, ConfirmationService],
})
export class TransferRequestComponent implements OnInit {
  mode: "list" | "new" | "edit" | "details" = "list";
  transferRequestId = 0;
  transferRequests = signal<TransferRequest[]>([]);
  selectedTransferRequests: TransferRequest[] | null = null;
  submitted = false;
  selectedFiles: File[] = [];
  isSaving = false;
  isLoading = false;
  users: UserOption[] = [];

  // Updated search criteria with separate firstName and lastName
  searchCriteria = {
    firstName: "",
    lastName: "",
    commissionAccountNumber: "",
    transferType: null as string | null,
    status: null as string | null,
    amount: null as number | null,
  };

  filtersExpanded = false;
  quickFilter = '';
  isSearching = false;

  transferRequest: TransferRequest = this.createEmptyTransferRequest();

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

  statuses = [
    { label: "Pending", value: "PENDING" },
    { label: "Validated", value: "VALIDATED" },
    { label: "Rejected", value: "REJECTED" },
    { label: "Info Requested", value: "INFO_REQUESTED" },
    { label: "Completed", value: "COMPLETED" },
  ];

  @ViewChild("dt") dt!: Table;
  exportColumns!: ExportColumn[];
  cols!: Column[];
  currentValidatorId = 1;
  private apiUrl = 'http://localhost:8083/api/transfer-requests';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private transferRequestService: TransferRequestService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    private cdr: ChangeDetectorRef,
    private http: HttpClient,
    private authService: AuthService
  ) {}

  async ngOnInit() {
    await this.loadUsers();
    this.route.params.subscribe((params) => {
      this.transferRequestId = +params["id"] || 0;
      if (this.transferRequestId > 0) {
        this.mode = "details";
        this.loadTransferDetails(this.transferRequestId);
      } else {
        this.mode = "list";
        this.loadTransferRequests();
      }
    });
    this.initColumns();
  }

  loadUsers() {
    const token = localStorage.getItem('token');
        const headers = new HttpHeaders({
          Authorization: token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json',
          Accept: 'application/json',
        });
    this.http.get<any[]>(`http://localhost:8083/api/auth/users`, { headers, responseType: 'json' }).subscribe(
      (users) => {
        this.users = users.map(user => ({
          label: `${user.firstName} ${user.lastName} (${user.email})`,
          value: user
        }));
      },
      (error) => {
        console.error('Failed to load users', error);
      }
    );
  }

  private createEmptyTransferRequest(): TransferRequest {
    return {
      idTransferRequest: 0,
      user: { id: 0, email: "", password: "", firstName: "", lastName: "", phoneNumber: "", role: "", isActive: true, createdAt: "", updatedAt: "", profilePhotoPath: "" },
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
  }

  initColumns() {
  this.cols = [
    { field: "idTransferRequest", header: "ID" },
    { field: "user", header: "User" }, // Combined User column
    { field: "commissionAccountNumber", header: "Commission Account" },
    { field: "transferType", header: "Transfer Type" },
    { field: "amount", header: "Amount" },
    { field: "currency", header: "Currency" },
    { field: "status", header: "Status" },
    { field: "beneficiary_name", header: "Beneficiary" },
    { field: "documents_count", header: "Documents" },
  ];
  this.exportColumns = this.cols.map((col) => ({
    title: col.header,
    dataKey: col.field === "user" ? "userFullName" : col.field, // Map to userFullName for export
  }));
}

  loadTransferRequests() {
    this.transferRequestService
      .searchTransferRequests(
        undefined, // userId is optional
        this.searchCriteria.firstName || undefined, // Updated to use firstName
        this.searchCriteria.lastName || undefined, // Updated to use lastName
        this.searchCriteria.commissionAccountNumber || undefined,
        this.searchCriteria.transferType || undefined,
        this.searchCriteria.status || undefined,
        this.searchCriteria.amount === null ? undefined : this.searchCriteria.amount
      )
      .subscribe({
        next: (data) => this.transferRequests.set(data),
        error: (err) => this.showError("Failed to load transfer requests", err),
      });
  }

  loadTransferDetails(id: number) {
    this.isLoading = true;
    this.transferRequestService.getTransferRequest(id).subscribe({
      next: (data) => {
        this.transferRequest = this.normalizeTransferRequest(data);
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isLoading = false;
        this.showError(`Failed to load transfer details: ${err.message}`, err);
      },
    });
  }

  openNew() {
    this.mode = "new";
    this.transferRequest = this.createEmptyTransferRequest();
    this.submitted = false;
    this.selectedFiles = [];
    setTimeout(() => {
      this.cdr.detectChanges();
    }, 0);
  }

  editTransferRequest(transferRequest: TransferRequest) {
    this.mode = "edit";
    this.transferRequestId = transferRequest.idTransferRequest ?? 0;
    this.loadTransferRequest();
  }

  loadTransferRequest() {
    this.isLoading = true;
    this.transferRequestService.getTransferRequest(this.transferRequestId).subscribe({
      next: (data) => {
        this.transferRequest = this.normalizeTransferRequest(data);
        this.transferRequestService.getDocuments(this.transferRequestId).subscribe({
          next: (documents) => {
            this.transferRequest.documents = documents || [];
            this.isLoading = false;
            this.cdr.detectChanges();
          },
          error: (err) => {
            this.showError("Failed to load documents", err);
            this.isLoading = false;
            this.cdr.detectChanges();
          },
        });
      },
      error: (err) => {
        this.showError("Failed to load transfer request", err);
        this.isLoading = false;
        this.cdr.detectChanges();
        this.router.navigate(["/transfer-requests"]);
      },
    });
  }

  private normalizeTransferRequest(data: any): TransferRequest {
    return {
      idTransferRequest: data.idTransferRequest || this.transferRequestId,
      user: data.user || { id: 0, email: "", password: "", firstName: "", lastName: "", phoneNumber: "", role: "", isActive: true, createdAt: "", updatedAt: "", profilePhotoPath: "" },
      commissionAccountNumber: data.commissionAccountNumber || "",
      commissionAccountType: data.commissionAccountType || "COMMISSION",
      settlementAccountNumber: data.settlementAccountNumber || "",
      settlementAccountType: data.settlementAccountType || "SETTLEMENT",
      transferType: data.transferType || "CURRENT",
      issueDate: data.issueDate
        ? new Date(data.issueDate).toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0],
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
  }

  onTransferTypeChange() {
    if (this.transferRequest.transferType !== "COMMERCIAL") {
      this.transferRequest.invoiceNumber = "";
      this.transferRequest.invoiceDate = "";
      this.transferRequest.transferReason = "";
    }
  }

  onFileSelected(event: any) {
    this.selectedFiles = event.files || [];
    const validFiles: File[] = [];
    for (const file of this.selectedFiles) {
      if (["application/pdf", "image/png", "image/jpeg"].includes(file.type)) {
        validFiles.push(file);
      } else {
        this.showError(`Invalid file type for "${file.name}". Only PDF, PNG, and JPEG are allowed`);
      }
    }
    this.selectedFiles = validFiles;
    this.cdr.detectChanges();
  }

  async deleteDocument(documentId: number) {
    if (!confirm("Are you sure you want to delete this document?")) return;
    try {
      await lastValueFrom(this.transferRequestService.deleteDocument(this.transferRequestId, documentId));
      this.transferRequest.documents = (this.transferRequest.documents || []).filter(
        (doc) => doc.idDocument !== documentId
      );
      this.showSuccess("Document deleted successfully");
      this.cdr.detectChanges();
    } catch (error) {
      this.showError("Failed to delete document", error);
    }
  }

  async saveTransferRequest() {
    this.submitted = true;
    if (!this.validateForm()) return;
    this.isSaving = true;
    try {
      if (this.mode === "edit") {
        await this.updateTransferRequest();
      } else {
        await this.createTransferRequest();
      }
      this.showSuccess("Transfer request saved successfully");
      this.mode = "list";
      this.loadTransferRequests();
      this.router.navigate(["/transfer-requests"]);
    } catch (error: any) {
      this.showError("Failed to save transfer request", error);
    } finally {
      this.isSaving = false;
    }
  }

  private async createTransferRequest() {
    let result: TransferRequest;
    if (this.selectedFiles.length > 0) {
      result = await lastValueFrom(
        this.transferRequestService.createTransferRequestWithDocument(this.transferRequest, this.selectedFiles[0])
      );
      if (result.idTransferRequest && this.selectedFiles.length > 1) {
        await this.uploadDocumentsSequentially(result.idTransferRequest);
      }
    } else {
      result = await lastValueFrom(this.transferRequestService.createTransferRequest(this.transferRequest));
    }
    this.showSuccess("Transfer request created successfully");
    this.mode = "list";
    this.loadTransferRequests();
  }

  async updateTransferRequest() {
    if (!this.transferRequest || !this.transferRequest.idTransferRequest) {
      throw new Error("Transfer request is null or missing ID");
    }
    const result = await lastValueFrom(
      this.transferRequestService.updateTransferRequest(this.transferRequest.idTransferRequest, this.transferRequest)
    );
    if (!result) {
      throw new Error("Failed to update transfer request");
    }
    if (this.selectedFiles.length > 0) {
      await this.uploadDocumentsSequentially(this.transferRequest.idTransferRequest);
    }
    this.showSuccess("Transfer request updated successfully");
    this.mode = "list";
    this.router.navigate(["/transfer-requests"]);
  }

  private async uploadDocumentsSequentially(transferRequestId: number): Promise<void> {
    const filesToUpload = this.mode === "new" ? this.selectedFiles.slice(1) : this.selectedFiles;
    for (const file of filesToUpload) {
      try {
        const response = await lastValueFrom(this.transferRequestService.uploadDocument(transferRequestId, file));
        const tempDocument = {
          idDocument: -1,
          fileName: file.name,
          fileType: file.type,
          filePath: "",
          fileExtension: file.name.split(".").pop() || "",
          uploadDate: new Date().toISOString(),
        };
        if (!this.transferRequest.documents) this.transferRequest.documents = [];
        this.transferRequest.documents.push(tempDocument as any);
        this.showSuccess(`Document "${file.name}" uploaded successfully`);
      } catch (error) {
        this.showError(`Failed to upload "${file.name}"`, error);
      }
    }
    this.selectedFiles = [];
    this.cdr.detectChanges();
  }

  private validateForm(): boolean {
    if (this.mode === "edit" && (!this.transferRequest || !this.transferRequest.idTransferRequest)) {
      this.showError("Transfer request data is not loaded");
      return false;
    }
    if (!this.transferRequest.beneficiary) {
      this.transferRequest.beneficiary = {
        idBeneficiary: undefined,
        name: "",
        country: "",
        destinationBank: "",
        bankAccount: "",
      };
    }
    if (!this.transferRequest.invoiceNumber) this.transferRequest.invoiceNumber = "";
    if (!this.transferRequest.invoiceDate) this.transferRequest.invoiceDate = "";
    if (!this.transferRequest.transferReason) this.transferRequest.transferReason = "";
    if (!this.transferRequest.beneficiary.bankAccount) this.transferRequest.beneficiary.bankAccount = "";
    const requiredFields = [
      { field: this.transferRequest.user.id > 0, message: "User is required" },
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

  exportCSV() {
  const originalData = this.transferRequests();
  const exportData = originalData.map((transfer) => ({
    ...transfer,
    userFullName: `${transfer.user.firstName} ${transfer.user.lastName}`, // Add full name for export
    beneficiary_name: transfer.beneficiary?.name || "",
    documents_count: transfer.documents?.length || 0,
  }));
  this.dt.value = exportData;
  this.dt.exportCSV({ selectionOnly: false });
  this.dt.value = originalData;
}

  onGlobalFilter(table: Table, event: Event) {
    table.filterGlobal((event.target as HTMLInputElement).value, "contains");
  }

  onSearch() {
    this.loadTransferRequests();
  }

  clearSearch() {
    this.searchCriteria = {
      firstName: "",
      lastName: "",
      commissionAccountNumber: "",
      transferType: null,
      status: null,
      amount: null,
    };
    this.loadTransferRequests();
  }

  clearAllFilters() {
    this.searchCriteria = {
      firstName: "",
      lastName: "",
      commissionAccountNumber: "",
      transferType: null,
      status: null,
      amount: null,
    };
    this.quickFilter = '';
    this.loadTransferRequests();
  }

  isCurrencyValid(currency: string): boolean {
    return /^[A-Z]{3}$/.test(currency || "");
  }

  isFutureDate(date: string): boolean {
    const today = new Date().toISOString().split("T")[0];
    return date > today;
  }

  goBack() {
    this.mode = "list";
    this.router.navigate(["/transfer-requests"]);
    this.showSuccess("Transfer request saved successfully");
    this.loadTransferRequests();
  }

  hideDialog() {
    this.mode = "list";
    this.loadTransferRequests();
    this.submitted = false;
  }

  deleteSelectedTransferRequests() {
    this.confirmationService.confirm({
      message: "Are you sure you want to delete the selected transfer requests?",
      header: "Confirm",
      icon: "pi pi-exclamation-triangle",
      accept: () => {
        this.selectedTransferRequests?.forEach((tr) => {
          this.transferRequestService.deleteTransferRequest(tr.idTransferRequest!).subscribe({
            next: () => {
              this.transferRequests.set(
                this.transferRequests().filter((val) => !this.selectedTransferRequests?.includes(val))
              );
              this.showSuccess("Transfer Requests Deleted");
            },
            error: (err) => this.showError("Failed to delete transfer requests", err),
          });
        });
        this.selectedTransferRequests = null;
      },
    });
  }

  deleteTransferRequest(transferRequest: TransferRequest) {
    this.confirmationService.confirm({
      message: `Are you sure you want to delete transfer request ${transferRequest.idTransferRequest}?`,
      header: "Confirm",
      icon: "pi pi-exclamation-triangle",
      accept: () => {
        this.transferRequestService.deleteTransferRequest(transferRequest.idTransferRequest!).subscribe({
          next: () => {
            this.transferRequests.set(
              this.transferRequests().filter((val) => val.idTransferRequest !== transferRequest.idTransferRequest)
            );
            this.showSuccess("Transfer Request Deleted");
          },
          error: (err) => this.showError("Failed to delete transfer request", err),
        });
      },
    });
  }

  validateTransferRequest() {
    if (!this.transferRequest?.idTransferRequest) return;
    this.isLoading = true;
    this.transferRequestService
      .validateTransferRequest(this.transferRequest.idTransferRequest, this.currentValidatorId)
      .subscribe({
        next: (updatedTransfer) => {
          this.transferRequest = updatedTransfer;
          this.isLoading = false;
          this.showSuccess("Transfer request validated successfully");
        },
        error: (err) => {
          this.isLoading = false;
          this.showError(`Failed to validate transfer request: ${err.message}`, err);
        },
      });
  }

  rejectTransferRequest() {
    if (!this.transferRequest?.idTransferRequest) return;
    this.isLoading = true;
    this.transferRequestService
      .rejectTransferRequest(this.transferRequest.idTransferRequest, this.currentValidatorId)
      .subscribe({
        next: (updatedTransfer) => {
          this.transferRequest = updatedTransfer;
          this.isLoading = false;
          this.showSuccess("Transfer request rejected successfully");
        },
        error: (err) => {
          this.isLoading = false;
          this.showError(`Failed to reject transfer request: ${err.message}`, err);
        },
      });
  }

  requestAdditionalInfo() {
    if (!this.transferRequest?.idTransferRequest) return;
    this.isLoading = true;
    this.transferRequestService
      .requestAdditionalInfo(this.transferRequest.idTransferRequest, this.currentValidatorId)
      .subscribe({
        next: (updatedTransfer) => {
          this.transferRequest = updatedTransfer;
          this.isLoading = false;
          this.showSuccess("Additional information requested successfully");
        },
        error: (err) => {
          this.isLoading = false;
          this.showError(`Failed to request additional information: ${err.message}`, err);
        },
      });
  }

  canPerformActions(): boolean {
    // Only CHARGE_CLIENTELE and ADMINISTRATOR can validate/reject transfer requests
    const canValidate = this.authService.hasAnyRole('CHARGE_CLIENTELE', 'ADMINISTRATOR');
    const isPendingOrInfoRequested = this.transferRequest?.status === "PENDING" || this.transferRequest?.status === "INFO_REQUESTED";
    return canValidate && isPendingOrInfoRequested;
  }

  getSeverity(status: string) {
    switch (status) {
      case "VALIDATED":
        return "success";
      case "PENDING":
        return "info";
      case "REJECTED":
        return "danger";
      case "INFO_REQUESTED":
        return "warning";
      case "COMPLETED":
        return "success";
      default:
        return "info";
    }
  }

  viewDetails(id: number) {
    this.transferRequestId = id;
    this.mode = "details";
    this.loadTransferDetails(id);
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

  toggleFilters() {
    this.filtersExpanded = !this.filtersExpanded;
  }

  getActiveFiltersCount(): number {
    let count = 0;
    if (this.searchCriteria.firstName) count++;
    if (this.searchCriteria.lastName) count++;
    if (this.searchCriteria.commissionAccountNumber) count++;
    if (this.searchCriteria.transferType) count++;
    if (this.searchCriteria.status) count++;
    if (this.searchCriteria.amount) count++;
    return count;
  }

  setQuickFilter(filter: string) {
    this.quickFilter = this.quickFilter === filter ? '' : filter;
    switch (filter) {
      case 'pending':
        this.searchCriteria.status = 'PENDING';
        break;
      case 'validated':
        this.searchCriteria.status = 'VALIDATED';
        break;
      case 'commercial':
        this.searchCriteria.transferType = 'COMMERCIAL';
        break;
    }
    if (this.quickFilter === '') {
      this.clearAllFilters();
    }
  }

 

  applyFilters() {
    this.isSearching = true;
    setTimeout(() => {
      this.onSearch();
      this.isSearching = false;
    }, 1000);
  }

  getTotalResults(): number {
    return this.transferRequests()?.length || 0;
  }

  isEditDisabled(status: string | undefined): boolean {
    return status === "VALIDATED" || status === "REJECTED" || status === "COMPLETED";
  }

  async openDocument(documentId: number, fileName: string) {
    try {
      this.isLoading = true;
      const blob = await lastValueFrom(
        this.transferRequestService.downloadDocument(this.transferRequestId, documentId)
      );
      const url = window.URL.createObjectURL(blob);
      if (fileName.toLowerCase().endsWith('.pdf')) {
        window.open(url, '_blank');
      } else {
        const img = new Image();
        img.src = url;
        const win = window.open('', '_blank');
        win?.document.write(img.outerHTML);
        win?.document.close();
      }
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
      }, 1000);
      this.showSuccess(`Document "${fileName}" opened successfully`);
    } catch (error) {
      this.showError(`Failed to open document "${fileName}"`, error);
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  async downloadDocument(documentId: number, fileName: string) {
    try {
      this.isLoading = true;
      const blob = await lastValueFrom(
        this.transferRequestService.downloadDocument(this.transferRequestId, documentId)
      );
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.click();
      window.URL.revokeObjectURL(url);
      this.showSuccess(`Document "${fileName}" downloaded successfully`);
    } catch (error) {
      this.showError(`Failed to download document "${fileName}"`, error);
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  viewUserDetails(userId: number) {
  this.router.navigate(['/users', userId]);
}
}