import { Component, OnInit, ChangeDetectorRef, ViewChild, signal } from "@angular/core"
import { ActivatedRoute, Router } from "@angular/router" // Fixed: removed 'type'
import { TransferRequestService } from "../../../services/transfer-request.service"
import { MessageService, ConfirmationService } from "primeng/api"
import { Table } from "primeng/table"
import { CommonModule } from "@angular/common"
import { FormsModule } from "@angular/forms"
import { ButtonModule } from "primeng/button"
import { RippleModule } from "primeng/ripple"
import { ToastModule } from "primeng/toast"
import { ToolbarModule } from "primeng/toolbar"
import { InputTextModule } from "primeng/inputtext"
import { InputNumberModule } from "primeng/inputnumber"
import { DialogModule } from "primeng/dialog"
import { TagModule } from "primeng/tag"
import { InputIconModule } from "primeng/inputicon"
import { IconFieldModule } from "primeng/iconfield"
import { ConfirmDialogModule } from "primeng/confirmdialog"
import { FileUploadModule } from "primeng/fileupload"
import { DropdownModule } from "primeng/dropdown" // Back to DropdownModule
import { CheckboxModule } from "primeng/checkbox"
import { TableModule } from "primeng/table"
import { lastValueFrom } from "rxjs"
import { TransferRequest } from "../../../models/transfer-request"
import { ProgressSpinnerModule } from "primeng/progressspinner"


interface Column {
  field: string
  header: string
  customExportHeader?: string
}

interface ExportColumn {
  title: string
  dataKey: string
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
    DropdownModule, // Back to DropdownModule
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
  mode: "list" | "new" | "edit" | "details" = "list"
  transferRequestId = 0
  transferRequests = signal<TransferRequest[]>([])
  selectedTransferRequests: TransferRequest[] | null = null
  submitted = false
  selectedFiles: File[] = []
  isSaving = false
  isLoading = false

  searchCriteria = {
    userId: null as number | null,
    commissionAccountNumber: "",
    transferType: null as string | null,
    status: null as string | null,
    amount: null as number | null,
  }

  transferRequest: TransferRequest = this.createEmptyTransferRequest()

  accountTypes = [
    { label: "Commission", value: "COMMISSION" },
    { label: "Settlement", value: "SETTLEMENT" },
    { label: "Current", value: "CURRENT" },
    { label: "Savings", value: "SAVINGS" },
  ]

  feeTypes = [
    { label: "Beneficiary Charge", value: "BENEFICIARY_CHARGE" },
    { label: "Our Charge", value: "OUR_CHARGE" },
    { label: "Shared", value: "SHARED" },
  ]

  transferTypes = [
    { label: "Commercial", value: "COMMERCIAL" },
    { label: "Current", value: "CURRENT" },
  ]

  statuses = [
    { label: "Pending", value: "PENDING" },
    { label: "Validated", value: "VALIDATED" },
    { label: "Rejected", value: "REJECTED" },
    { label: "Info Requested", value: "INFO_REQUESTED" },
    { label: "Completed", value: "COMPLETED" },
  ]

  @ViewChild("dt") dt!: Table
  exportColumns!: ExportColumn[]
  cols!: Column[]
  currentValidatorId = 1

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private transferRequestService: TransferRequestService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    this.route.params.subscribe((params) => {
      this.transferRequestId = +params["id"] || 0
      if (this.transferRequestId > 0) {
        this.mode = "details"
        this.loadTransferDetails(this.transferRequestId)
      } else {
        this.mode = "list"
        this.loadTransferRequests()
      }
    })
    this.initColumns()
  }

  private createEmptyTransferRequest(): TransferRequest {
    return {
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
    }
  }

  initColumns() {
    this.cols = [
      { field: "idTransferRequest", header: "ID" },
      { field: "userId", header: "User ID" },
      { field: "commissionAccountNumber", header: "Commission Account" },
      { field: "transferType", header: "Transfer Type" },
      { field: "amount", header: "Amount" },
      { field: "currency", header: "Currency" },
      { field: "status", header: "Status" },
      { field: "beneficiary_name", header: "Beneficiary" },
      { field: "documents_count", header: "Documents" },
    ]
    this.exportColumns = this.cols.map((col) => ({ title: col.header, dataKey: col.field }))
  }

  loadTransferRequests() {
    this.transferRequestService
      .searchTransferRequests(
        this.searchCriteria.userId === null ? undefined : this.searchCriteria.userId,
        this.searchCriteria.commissionAccountNumber || undefined,
        this.searchCriteria.transferType || undefined,
        this.searchCriteria.status || undefined,
        this.searchCriteria.amount === null ? undefined : this.searchCriteria.amount,
      )
      .subscribe({
        next: (data) => this.transferRequests.set(data),
        error: (err) => this.showError("Failed to load transfer requests", err),
      })
  }

  loadTransferDetails(id: number) {
    this.isLoading = true
    this.transferRequestService.getTransferRequest(id).subscribe({
      next: (data) => {
        this.transferRequest = this.normalizeTransferRequest(data)
        this.isLoading = false
        this.cdr.detectChanges()
      },
      error: (err) => {
        this.isLoading = false
        this.showError(`Failed to load transfer details: ${err.message}`, err)
      },
    })
  }

  openNew() {
    this.mode = "new"
    console.log("Mode set to:", this.mode)

    // Create a completely new object reference
    this.transferRequest = this.createEmptyTransferRequest()
    this.submitted = false
    this.selectedFiles = []

    // Force change detection after a short delay to ensure proper rendering
    setTimeout(() => {
      this.cdr.detectChanges()
    }, 0)
  }

  editTransferRequest(transferRequest: TransferRequest) {
    this.mode = "edit"
    this.transferRequestId = transferRequest.idTransferRequest ?? 0
    this.loadTransferRequest()
  }

  loadTransferRequest() {
    this.isLoading = true
    this.transferRequestService.getTransferRequest(this.transferRequestId).subscribe({
      next: (data) => {
        console.log("=== RAW API RESPONSE ===")
        console.log("Full response:", JSON.stringify(data, null, 2))

        if (!data || Object.keys(data).length === 0) {
          console.error("No valid data received from API")
          this.showError("Transfer request not found or empty")
          this.isLoading = false
          this.router.navigate(["/transfer-requests"])
          return
        }

        this.transferRequest = {
          idTransferRequest: data.idTransferRequest || this.transferRequestId,
          userId: data.userId || 0,
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
        }

        // Load documents separately
        this.transferRequestService.getDocuments(this.transferRequestId).subscribe({
          next: (documents) => {
            this.transferRequest.documents = documents || []
            console.log("Loaded documents:", JSON.stringify(documents, null, 2))
            this.isLoading = false
            this.cdr.detectChanges()
          },
          error: (err) => {
            console.error("Failed to load documents:", err)
            this.showError("Failed to load documents", err)
            this.isLoading = false
            this.cdr.detectChanges()
          },
        })

        console.log("=== PROCESSED TRANSFER REQUEST ===")
        console.log("Final transferRequest:", JSON.stringify(this.transferRequest, null, 2))
        this.cdr.detectChanges()
      },
      error: (err) => {
        console.error("=== API ERROR ===")
        console.error("Full error:", err)
        this.showError("Failed to load transfer request", err)
        this.isLoading = false
        this.cdr.detectChanges()
        this.router.navigate(["/transfer-requests"])
      },
    })
  }

  private normalizeTransferRequest(data: any): TransferRequest {
    return {
      idTransferRequest: data.idTransferRequest || this.transferRequestId,
      userId: data.userId || 0,
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
    }
  }

  onTransferTypeChange() {
    if (this.transferRequest.transferType !== "COMMERCIAL") {
      this.transferRequest.invoiceNumber = ""
      this.transferRequest.invoiceDate = ""
      this.transferRequest.transferReason = ""
    }
  }

  onFileSelected(event: any) {
    this.selectedFiles = event.files || []
    const validFiles: File[] = []
    for (const file of this.selectedFiles) {
      if (["application/pdf", "image/png", "image/jpeg"].includes(file.type)) {
        validFiles.push(file)
      } else {
        this.showError(`Invalid file type for "${file.name}". Only PDF, PNG, and JPEG are allowed`)
      }
    }
    this.selectedFiles = validFiles
    this.cdr.detectChanges()
  }

  async deleteDocument(documentId: number) {
    if (!confirm("Are you sure you want to delete this document?")) return
    try {
      await lastValueFrom(this.transferRequestService.deleteDocument(this.transferRequestId, documentId))
      this.transferRequest.documents = (this.transferRequest.documents || []).filter(
        (doc) => doc.idDocument !== documentId,
      )
      this.showSuccess("Document deleted successfully")
      this.cdr.detectChanges()
    } catch (error) {
      this.showError("Failed to delete document", error)
    }
  }

  async saveTransferRequest() {
    this.submitted = true
    if (!this.validateForm()) return
    this.isSaving = true

    try {
      if (this.mode === "edit") {
        await this.updateTransferRequest()
      } else {
        await this.createTransferRequest()
      }
    } catch (error: any) {
      this.showError("Failed to save transfer request", error)
    } finally {
      this.isSaving = false
    }
  }

  private async createTransferRequest() {
    let result: TransferRequest

    if (this.selectedFiles.length > 0 && this.selectedFiles[0]) {
      result = await lastValueFrom(
        this.transferRequestService.createTransferRequestWithDocument(this.transferRequest, this.selectedFiles[0]),
      )
    } else {
      result = await lastValueFrom(this.transferRequestService.createTransferRequest(this.transferRequest))
    }

    if (result.idTransferRequest && this.selectedFiles.length > 1) {
      await this.uploadDocumentsSequentially(result.idTransferRequest)
    }

    this.showSuccess("Transfer request created successfully")
    this.mode = "list"
    this.loadTransferRequests()
  }

  async updateTransferRequest() {
    if (!this.transferRequest || !this.transferRequest.idTransferRequest) {
      throw new Error("Transfer request is null or missing ID")
    }

    // Log the data being sent for debugging
    console.log("=== UPDATE REQUEST DATA ===")
    console.log("Transfer Request ID:", this.transferRequest.idTransferRequest)
    console.log("Transfer Request Data:", JSON.stringify(this.transferRequest, null, 2))

    // Ensure beneficiary object is properly structured
    const updateData = {
      userId: this.transferRequest.userId,
      commissionAccountNumber: this.transferRequest.commissionAccountNumber,
      commissionAccountType: this.transferRequest.commissionAccountType,
      settlementAccountNumber: this.transferRequest.settlementAccountNumber,
      settlementAccountType: this.transferRequest.settlementAccountType,
      transferType: this.transferRequest.transferType,
      issueDate: this.transferRequest.issueDate,
      feeType: this.transferRequest.feeType,
      currency: this.transferRequest.currency,
      amount: this.transferRequest.amount,
      invoiceNumber: this.transferRequest.invoiceNumber || "",
      invoiceDate: this.transferRequest.invoiceDate || "",
      transferReason: this.transferRequest.transferReason || "",
      isNegotiation: this.transferRequest.isNegotiation ?? false,
      isTermNegotiation: this.transferRequest.isTermNegotiation ?? false,
      isFinancing: this.transferRequest.isFinancing ?? false,
      beneficiaryId: this.transferRequest.beneficiary.idBeneficiary,
      beneficiary: {
        idBeneficiary: this.transferRequest.beneficiary.idBeneficiary,
        name: this.transferRequest.beneficiary.name,
        country: this.transferRequest.beneficiary.country,
        destinationBank: this.transferRequest.beneficiary.destinationBank,
        bankAccount: this.transferRequest.beneficiary.bankAccount || "",
      },
    }

    console.log("=== FORMATTED UPDATE DATA ===")
    console.log("Update payload:", JSON.stringify(updateData, null, 2))

    try {
      const result = await lastValueFrom(
        this.transferRequestService.updateTransferRequest(this.transferRequest.idTransferRequest, {
          ...this.transferRequest,
          // Ensure proper data structure
          invoiceNumber: this.transferRequest.invoiceNumber || "",
          invoiceDate: this.transferRequest.invoiceDate || "",
          transferReason: this.transferRequest.transferReason || "",
          beneficiary: {
            ...this.transferRequest.beneficiary,
            bankAccount: this.transferRequest.beneficiary.bankAccount || "",
          },
        }),
      )

      if (!result) {
        throw new Error("Failed to update transfer request")
      }

      if (this.selectedFiles.length > 0) {
        await this.uploadDocumentsSequentially(this.transferRequest.idTransferRequest)
      }

      this.showSuccess("Transfer request updated successfully")
      this.mode = "list"
      this.router.navigate(["/transfer-requests"])
    } catch (error: any) {
      console.error("=== UPDATE ERROR ===")
      console.error("Error details:", error)
      console.error("Error response:", error.error)
      throw error
    }
  }

  private async uploadDocumentsSequentially(transferRequestId: number): Promise<void> {
    const filesToUpload = this.mode === "new" ? this.selectedFiles.slice(1) : this.selectedFiles

    for (const file of filesToUpload) {
      try {
        console.log(
          `Attempting to upload file: ${file.name} at ${new Date().toLocaleString("en-US", { timeZone: "CET" })}`,
        )
        const response = await lastValueFrom(this.transferRequestService.uploadDocument(transferRequestId, file))
        console.log(`Upload response for ${file.name}:`, response)

        // Add temporary document for immediate feedback
        const tempDocument = {
          idDocument: -1,
          fileName: file.name,
          fileType: file.type,
          filePath: "",
          uploadDate: new Date().toISOString(),
          fileExtension: file.name.split(".").pop() || "",
          createElement: () => null,
        }

        if (!this.transferRequest.documents) this.transferRequest.documents = []
        this.transferRequest.documents.push(tempDocument as any)

        this.showSuccess(`Document "${file.name}" uploaded successfully`)
      } catch (error) {
        this.showError(`Failed to upload "${file.name}"`, error)
        console.error(
          `Upload error for ${file.name} at ${new Date().toLocaleString("en-US", { timeZone: "CET" })}:`,
          error,
        )
      }
    }

    this.selectedFiles = []
    this.cdr.detectChanges()
  }

  private validateForm(): boolean {
    if (this.mode === "edit" && (!this.transferRequest || !this.transferRequest.idTransferRequest)) {
      this.showError("Transfer request data is not loaded")
      return false
    }

    // Ensure beneficiary object exists
    if (!this.transferRequest.beneficiary) {
      this.transferRequest.beneficiary = {
        idBeneficiary: undefined,
        name: "",
        country: "",
        destinationBank: "",
        bankAccount: "",
      }
    }

    // Clean up empty strings for optional fields
    if (!this.transferRequest.invoiceNumber) this.transferRequest.invoiceNumber = ""
    if (!this.transferRequest.invoiceDate) this.transferRequest.invoiceDate = ""
    if (!this.transferRequest.transferReason) this.transferRequest.transferReason = ""
    if (!this.transferRequest.beneficiary.bankAccount) this.transferRequest.beneficiary.bankAccount = ""

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
    ]

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
      ]
      for (const { field, message } of commercialFields) {
        if (!field) {
          this.showError(message)
          return false
        }
      }
    }

    for (const { field, message } of requiredFields) {
      if (!field) {
        this.showError(message)
        return false
      }
    }

    return true
  }

  exportCSV() {
    const originalData = this.transferRequests()
    const exportData = originalData.map((transfer) => ({
      ...transfer,
      beneficiary_name: transfer.beneficiary?.name || "",
      documents_count: transfer.documents?.length || 0,
    }))
    this.dt.value = exportData
    this.dt.exportCSV({ selectionOnly: false })
    this.dt.value = originalData
  }

  onGlobalFilter(table: Table, event: Event) {
    table.filterGlobal((event.target as HTMLInputElement).value, "contains")
  }

  onSearch() {
    this.loadTransferRequests()
  }

  clearSearch() {
    this.searchCriteria = {
      userId: null,
      commissionAccountNumber: "",
      transferType: null,
      status: null,
      amount: null,
    }
    this.loadTransferRequests()
  }

  isCurrencyValid(currency: string): boolean {
    return /^[A-Z]{3}$/.test(currency || "")
  }

  isFutureDate(date: string): boolean {
    const today = new Date().toISOString().split("T")[0]
    return date > today
  }

  goBack() {
    this.mode = "list"
    this.router.navigate(["/transfer-requests"])
  }

  hideDialog() {
    this.mode = "list"
    this.submitted = false
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
                this.transferRequests().filter((val) => !this.selectedTransferRequests?.includes(val)),
              )
              this.showSuccess("Transfer Requests Deleted")
            },
            error: (err) => this.showError("Failed to delete transfer requests", err),
          })
        })
        this.selectedTransferRequests = null
      },
    })
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
              this.transferRequests().filter((val) => val.idTransferRequest !== transferRequest.idTransferRequest),
            )
            this.showSuccess("Transfer Request Deleted")
          },
          error: (err) => this.showError("Failed to delete transfer request", err),
        })
      },
    })
  }

  validateTransferRequest() {
    if (!this.transferRequest?.idTransferRequest) return
    this.isLoading = true
    this.transferRequestService
      .validateTransferRequest(this.transferRequest.idTransferRequest, this.currentValidatorId)
      .subscribe({
        next: (updatedTransfer) => {
          this.transferRequest = updatedTransfer
          this.isLoading = false
          this.showSuccess("Transfer request validated successfully")
        },
        error: (err) => {
          this.isLoading = false
          this.showError(`Failed to validate transfer request: ${err.message}`, err)
        },
      })
  }

  rejectTransferRequest() {
    if (!this.transferRequest?.idTransferRequest) return
    this.isLoading = true
    this.transferRequestService
      .rejectTransferRequest(this.transferRequest.idTransferRequest, this.currentValidatorId)
      .subscribe({
        next: (updatedTransfer) => {
          this.transferRequest = updatedTransfer
          this.isLoading = false
          this.showSuccess("Transfer request rejected successfully")
        },
        error: (err) => {
          this.isLoading = false
          this.showError(`Failed to reject transfer request: ${err.message}`, err)
        },
      })
  }

  requestAdditionalInfo() {
    if (!this.transferRequest?.idTransferRequest) return
    this.isLoading = true
    this.transferRequestService
      .requestAdditionalInfo(this.transferRequest.idTransferRequest, this.currentValidatorId)
      .subscribe({
        next: (updatedTransfer) => {
          this.transferRequest = updatedTransfer
          this.isLoading = false
          this.showSuccess("Additional information requested successfully")
        },
        error: (err) => {
          this.isLoading = false
          this.showError(`Failed to request additional information: ${err.message}`, err)
        },
      })
  }

  canPerformActions(): boolean {
    return this.transferRequest?.status === "PENDING" || this.transferRequest?.status === "INFO_REQUESTED"
  }

  getSeverity(status: string) {
    switch (status) {
      case "VALIDATED":
        return "success"
      case "PENDING":
        return "info"
      case "REJECTED":
        return "danger"
      case "INFO_REQUESTED":
        return "warning"
      case "COMPLETED":
        return "success"
      default:
        return "info"
    }
  }

  viewDetails(id: number) {
    this.transferRequestId = id
    this.mode = "details"
    this.loadTransferDetails(id)
  }

  private showSuccess(message: string) {
    this.messageService.add({
      severity: "success",
      summary: "Success",
      detail: message,
      life: 3000,
    })
  }

  private showError(message: string, error?: any) {
    const errorMessage = error?.error?.message || error?.message || "Unknown error"
    console.error(message, error)
    this.messageService.add({
      severity: "error",
      summary: "Error",
      detail: `${message}: ${errorMessage}`,
      life: 3000,
    })
  }
}
