import { Component, type OnInit, type ChangeDetectorRef } from "@angular/core"
import { CommonModule } from "@angular/common"
import { FormsModule } from "@angular/forms"
import { ButtonModule } from "primeng/button"
import { RippleModule } from "primeng/ripple"
import { ToastModule } from "primeng/toast"
import { ToolbarModule } from "primeng/toolbar"
import { TooltipModule } from "primeng/tooltip"
import { CardModule } from "primeng/card"
import { DropdownModule } from "primeng/dropdown"
import { CalendarModule } from "primeng/calendar"
import { TableModule } from "primeng/table"
import { TagModule } from "primeng/tag"
import { TabViewModule } from "primeng/tabview"
import { MessageService } from "primeng/api"
import { Router } from "@angular/router"
import { AuthService } from "../../services/auth.service"
import { StatsService } from "../../services/stats.service"

interface StatCard {
  title: string
  value: string | number
  change: number
  icon: string
  color: string
  bgColor: string
}

interface ChartData {
  label: string
  value: number
  color: string
}

@Component({
  selector: "app-stats",
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    RippleModule,
    ToastModule,
    ToolbarModule,
    TooltipModule,
    CardModule,
    DropdownModule,
    CalendarModule,
    TableModule,
    TagModule,
    TabViewModule,
  ],
  templateUrl: "./stats.component.html",
  styleUrls: ["./stats.component.scss"],
  providers: [MessageService],
})
export class StatsComponent implements OnInit {
  // Date range filter
  dateRange: Date[] = []
  timeRangeOptions = [
    { label: "Last 7 Days", value: "7d" },
    { label: "Last 30 Days", value: "30d" },
    { label: "Last 3 Months", value: "3m" },
    { label: "Last Year", value: "1y" },
    { label: "Custom Range", value: "custom" },
  ]
  selectedTimeRange = "30d"

  // Loading state
  loading = false

  // Real statistics data - populated from API
  statCards: StatCard[] = []
  appointmentStatusData: ChartData[] = []
  monthlyTrends: { month: string; appointments: number; users: number }[] = []
  topUsers: { name: string; appointments: number; completionRate: number }[] = []
  recentActivity: { type: string; message: string; time: string; icon: string; color: string }[] = []
  
  // New detailed statistics
  transferStats: any = null
  userStats: any = null
  transferStatusData: ChartData[] = []
  transferTypeData: ChartData[] = []
  recentTransfers: any[] = []
  recentAppointments: any[] = []
  userRoles: string[] = []

  constructor(
    private messageService: MessageService,
    private authService: AuthService,
    private router: Router,
    private statsService: StatsService
  ) {}

  ngOnInit() {
    // Only ADMINISTRATOR and CHARGE_CLIENTELE can access statistics
    if (!this.authService.hasAnyRole('ADMINISTRATOR', 'CHARGE_CLIENTELE')) {
      this.router.navigate(['/notfound']);
      return;
    }
    this.initializeDateRange()
    this.loadStats()
  }

  initializeDateRange() {
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - 30)
    this.dateRange = [startDate, endDate]
  }

  onTimeRangeChange(event: any) {
    const value = event.value
    if (value !== "custom") {
      const endDate = new Date()
      const startDate = new Date()

      switch (value) {
        case "7d":
          startDate.setDate(startDate.getDate() - 7)
          break
        case "30d":
          startDate.setDate(startDate.getDate() - 30)
          break
        case "3m":
          startDate.setMonth(startDate.getMonth() - 3)
          break
        case "1y":
          startDate.setFullYear(startDate.getFullYear() - 1)
          break
      }

      this.dateRange = [startDate, endDate]
      this.loadStats()
    }
  }

  loadStats() {
    this.loading = true
    this.statsService.getStats(this.dateRange).subscribe({
      next: (stats) => {
        console.log('Stats received in component:', stats)
        this.statCards = stats.statCards || []
        this.appointmentStatusData = stats.appointmentStatusData || []
        this.monthlyTrends = stats.monthlyTrends || []
        this.topUsers = stats.topUsers || []
        this.recentActivity = stats.recentActivity || []
        this.transferStats = stats.transferStats || null
        this.userStats = stats.userStats || null
        this.transferStatusData = stats.transferStatusData || []
        this.transferTypeData = stats.transferTypeData || []
        this.recentTransfers = stats.recentTransfers || []
        this.recentAppointments = stats.recentAppointments || []
        // Update user roles array
        if (this.userStats && this.userStats.byRole) {
          this.userRoles = Object.keys(this.userStats.byRole)
        } else {
          this.userRoles = []
        }
        console.log('Component data assigned - topUsers:', this.topUsers.length, 'recentActivity:', this.recentActivity.length)
        this.loading = false
      },
      error: (error) => {
        console.error('Failed to load statistics:', error)
        this.messageService.add({
          severity: "error",
          summary: "Error",
          detail: "Failed to load statistics. Please try again.",
          life: 3000,
        })
        this.loading = false
      },
    })
  }

  refreshData() {
    this.loadStats()
    this.messageService.add({
      severity: "success",
      summary: "Data Refreshed",
      detail: "Statistics have been updated",
      life: 2000,
    })
  }

  exportReport() {
    this.messageService.add({
      severity: "info",
      summary: "Export Started",
      detail: "Your report is being generated",
      life: 3000,
    })
  }

  getAppointmentStatusTotal(): number {
    return this.appointmentStatusData.reduce((sum, item) => sum + item.value, 0)
  }

  getMaxValue(data: ChartData[]): number {
    if (!data || data.length === 0) return 1
    return Math.max(...data.map((d) => d.value), 1)
  }

  getBarWidth(value: number, maxValue: number): string {
    if (maxValue === 0) return "0%"
    return `${Math.min((value / maxValue) * 100, 100)}%`
  }

  getMaxTrendValue(): number {
    if (!this.monthlyTrends || this.monthlyTrends.length === 0) return 1
    const appointmentMax = Math.max(...this.monthlyTrends.map((t) => t.appointments))
    const userMax = Math.max(...this.monthlyTrends.map((t) => t.users))
    return Math.max(appointmentMax, userMax, 1)
  }

  getTrendBarHeight(value: number): string {
    const maxValue = this.getMaxTrendValue()
    if (maxValue === 0) return "0%"
    return `${Math.min((value / maxValue) * 100, 100)}%`
  }

  getStatusSeverity(status: string): string {
    const statusUpper = status?.toUpperCase() || ''
    switch (statusUpper) {
      case 'VALIDATED':
      case 'COMPLETED':
      case 'CONFIRMED':
        return 'success'
      case 'PENDING':
      case 'SCHEDULED':
        return 'warning'
      case 'REJECTED':
      case 'CANCELLED':
        return 'danger'
      case 'INFO_REQUESTED':
        return 'info'
      default:
        return 'secondary'
    }
  }

  formatDate(date: string | Date): string {
    if (!date) return ''
    const d = new Date(date)
    return d.toLocaleDateString('fr-FR', { year: 'numeric', month: 'short', day: 'numeric' })
  }

  formatCurrency(amount: number, currency: string = 'TND'): string {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: currency }).format(amount)
  }

  getObjectKeys(obj: any): string[] {
    if (!obj) return []
    return Object.keys(obj)
  }

}
/*
import { Component, OnInit } from "@angular/core"
import { CommonModule } from "@angular/common"
import { FormsModule } from "@angular/forms"
import { ButtonModule } from "primeng/button"
import { RippleModule } from "primeng/ripple"
import { ToastModule } from "primeng/toast"
import { ToolbarModule } from "primeng/toolbar"
import { TooltipModule } from "primeng/tooltip"
import { CardModule } from "primeng/card"
import { DropdownModule } from "primeng/dropdown"
import { CalendarModule } from "primeng/calendar"
import { MessageService } from "primeng/api"
import { StatsService } from '../../services/stats.service'; // NEW IMPORT

interface StatCard {
  title: string
  value: string | number
  change: number
  icon: string
  color: string
  bgColor: string
}

interface ChartData {
  label: string
  value: number
  color: string
}

interface MonthlyTrend {
  month: string
  appointments: number
  users: number
}

interface TopUser {
  name: string
  appointments: number
  completionRate: number
}

interface RecentActivity {
  type: string
  message: string
  time: string
  icon: string
  color: string
}

@Component({
  selector: "app-stats",
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    RippleModule,
    ToastModule,
    ToolbarModule,
    TooltipModule,
    CardModule,
    DropdownModule,
    CalendarModule,
    TableModule,
    TagModule,
    TabViewModule,
  ],
  templateUrl: "./stats.component.html",
  styleUrls: ["./stats.component.scss"],
  providers: [MessageService],
})
export class StatsComponent implements OnInit {
  // Loading state
  loading = false;

  // Date range filter
  dateRange: Date[] = []
  timeRangeOptions = [
    { label: "Last 7 Days", value: "7d" },
    { label: "Last 30 Days", value: "30d" },
    { label: "Last 3 Months", value: "3m" },
    { label: "Last Year", value: "1y" },
    { label: "Custom Range", value: "custom" },
  ]
  selectedTimeRange = "30d"

  // REAL DATA - Will be populated from API
  statCards: StatCard[] = []
  appointmentStatusData: ChartData[] = []
  monthlyTrends: MonthlyTrend[] = []
  topUsers: TopUser[] = []
  recentActivity: RecentActivity[] = []

  constructor(
    private messageService: MessageService,
    private statsService: StatsService // NEW SERVICE
  ) {}

  ngOnInit() {
    this.initializeDateRange()
    this.loadStats() // LOAD REAL DATA ON INIT
  }

  initializeDateRange() {
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - 30)
    this.dateRange = [startDate, endDate]
  }

  onTimeRangeChange(event: any) {
    const value = event.value
    if (value !== "custom") {
      const endDate = new Date()
      const startDate = new Date()

      switch (value) {
        case "7d":
          startDate.setDate(startDate.getDate() - 7)
          break
        case "30d":
          startDate.setDate(startDate.getDate() - 30)
          break
        case "3m":
          startDate.setMonth(startDate.getMonth() - 3)
          break
        case "1y":
          startDate.setFullYear(startDate.getFullYear() - 1)
          break
      }

      this.dateRange = [startDate, endDate]
      this.loadStats() // RELOAD WITH NEW RANGE
    }
  }

  async loadStats() {
    this.loading = true
    try {
      const stats = await this.statsService.getStats(this.dateRange).toPromise()
      if (stats) {
        this.statCards = stats.statCards
        this.appointmentStatusData = stats.appointmentStatusData
        this.monthlyTrends = stats.monthlyTrends
        this.topUsers = stats.topUsers
        this.recentActivity = stats.recentActivity
      }
    } catch (error) {
      this.messageService.add({
        severity: "error",
        summary: "Error",
        detail: "Failed to load statistics",
        life: 3000,
      })
    } finally {
      this.loading = false
    }
  }

  refreshData() {
    this.loadStats()
    this.messageService.add({
      severity: "success",
      summary: "Data Refreshed",
      detail: "Statistics updated from server",
      life: 2000,
    })
  }

  getTotalAppointments(): number {
    return this.appointmentStatusData.reduce((sum, item) => sum + item.value, 0)
  }

  exportReport() {
    this.messageService.add({
      severity: "info",
      summary: "Export Started",
      detail: "Report generation in progress...",
      life: 3000,
    })
    // TODO: Implement real export
  }

  getMaxValue(data: ChartData[]): number {
    return Math.max(...data.map((d) => d.value), 1) // Prevent division by zero
  }

  getBarWidth(value: number, maxValue: number): string {
    return `${Math.min((value / maxValue) * 100, 100)}%`
  }

  getMaxTrendValue(): number {
    const appointmentMax = Math.max(...this.monthlyTrends.map((t) => t.appointments))
    const userMax = Math.max(...this.monthlyTrends.map((t) => t.users))
    return Math.max(appointmentMax, userMax, 1)
  }

  getTrendBarHeight(value: number): string {
    const maxValue = this.getMaxTrendValue()
    return `${Math.min((value / maxValue) * 100, 100)}%`
  }
}
  */
