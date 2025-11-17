// stats.service.ts - COMPLETELY FIXED
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, forkJoin, of, BehaviorSubject } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { AuthService } from "./auth.service"
import { AppointmentService } from "./appointment.service"
import { TransferRequestService } from "./transfer-request.service"
import type { User } from "../models/User"
import type { Appointment } from "../models/appointment"
import type { TransferRequest } from "../models/transfer-request"

export interface ChartData {
  label: string
  value: number
  color: string
}

@Injectable({
  providedIn: 'root'
})
export class StatsService {
  private fallbackDataSubject = new BehaviorSubject<any>(null);
  fallbackData$ = this.fallbackDataSubject.asObservable();

  private apiUrl = 'http://localhost:8083/api/stats';

  constructor(
    private http: HttpClient,
    private appointmentService: AppointmentService,
    private authService: AuthService,
    private transferRequestService: TransferRequestService
  ) {
    // Load fallback data on init
    this.loadFallbackData();
  }

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      Authorization: token ? `Bearer ${token}` : '',
      'Content-Type': 'application/json',
      Accept: 'application/json',
    });
  }

  getStats(dateRange: Date[]): Observable<any> {
    const [startDate, endDate] = dateRange;
    // Don't send date params if we want all data, or send them to filter
    // For now, let's not filter by date to see all data
    console.log('Loading stats - date range provided:', startDate, 'to', endDate);
    console.log('Note: Sending date range to backend, but backend will use all data if dates are null');

    // Try backend stats endpoint first - send dates but backend can ignore if needed
    let params = new HttpParams();
    if (startDate && endDate) {
      const startStr = startDate.toISOString();
      const endStr = endDate.toISOString();
      params = params.set('startDate', startStr).set('endDate', endStr);
      console.log('Sending date range to backend:', startStr, 'to', endStr);
    } else {
      console.log('No date range, backend will return all data');
    }

    return this.http.get<any>(this.apiUrl, { 
      headers: this.getHeaders(), 
      params 
    }).pipe(
      switchMap((backendStats: any) => {
        console.log('Backend stats received:', backendStats);
        // Transform backend stats to frontend format
        const stats = this.transformBackendStats(backendStats);
        // Also load appointments, users, and transfers for additional calculations
        return forkJoin({
          allAppointments: this.appointmentService.searchAppointments(undefined, undefined, undefined).pipe(
            catchError(() => of([]))
          ),
          allUsers: this.authService.getAllUsers().pipe(
            catchError(() => of([]))
          ),
          allTransfers: this.transferRequestService.getTransferRequests().pipe(
            catchError(() => of([]))
          )
        }).pipe(
          map(({ allAppointments, allUsers, allTransfers }) => {
            console.log('Enhancing stats with appointments:', allAppointments?.length || 0, 'users:', allUsers?.length || 0, 'transfers:', allTransfers?.length || 0);
            
            // Use ALL appointments for top users and recent activity (not filtered by date range)
            const allAppts = (allAppointments || []).filter(appt => appt && appt.appointmentDateTime);
            
            // Filter appointments by date range only for monthly trends
            const filteredAppointments = allAppts.filter(appt => {
              if (!appt || !appt.appointmentDateTime) return false;
              const apptDate = new Date(appt.appointmentDateTime);
              return apptDate >= startDate && apptDate <= endDate;
            });

            // Filter transfers by date range
            const filteredTransfers = (allTransfers || []).filter(transfer => {
              if (!transfer || !transfer.issueDate) return false;
              const transferDate = new Date(transfer.issueDate);
              return transferDate >= startDate && transferDate <= endDate;
            });

            // Add monthly trends (filtered by date range), top users and recent activity (all data)
            stats.monthlyTrends = this.getMonthlyTrends(filteredAppointments);
            stats.topUsers = this.getTopUsers(allAppts, allUsers || []); // Use ALL appointments
            stats.recentActivity = this.getRecentActivity(allAppts, allUsers || [], allTransfers || []); // Use ALL data
            
            // Add transfer statistics
            stats.transferStats = this.getTransferStats(allTransfers || [], filteredTransfers);
            stats.userStats = this.getUserStats(allUsers || []);
            stats.transferStatusData = this.getTransferStatusData(allTransfers || []);
            stats.transferTypeData = this.getTransferTypeData(allTransfers || []);
            stats.recentTransfers = this.getRecentTransfers(allTransfers || []);
            stats.recentAppointments = this.getRecentAppointments(allAppts);
            
            console.log('Final stats - topUsers:', stats.topUsers?.length || 0, 'recentActivity:', stats.recentActivity?.length || 0);
            console.log('Final stats:', stats);
            return stats;
          })
        );
      }),
      catchError(error => {
        console.warn('Backend stats endpoint failed, using fallback method:', error);
        // Fallback to old method
        return this.getStatsFallback(dateRange);
      })
    );
  }

  private getStatsFallback(dateRange: Date[]): Observable<any> {
    const [startDate, endDate] = dateRange;

    return forkJoin({
      allAppointments: this.appointmentService.searchAppointments(undefined, undefined, undefined).pipe(
        catchError(err => {
          console.error('Error loading appointments:', err);
          return of([]);
        })
      ),
      allUsers: this.authService.getAllUsers().pipe(
        catchError(err => {
          console.error('Error loading users:', err);
          return of([]);
        })
      ),
      allTransfers: this.transferRequestService.getTransferRequests().pipe(
        catchError(err => {
          console.error('Error loading transfers:', err);
          return of([]);
        })
      )
    }).pipe(
      switchMap(({ allAppointments, allUsers, allTransfers }) => {
        console.log('Loaded appointments:', allAppointments?.length || 0);
        console.log('Loaded users:', allUsers?.length || 0);
        console.log('Loaded transfers:', allTransfers?.length || 0);
        
        const filteredAppointments = (allAppointments || []).filter(appt => {
          if (!appt || !appt.appointmentDateTime) return false;
          const apptDate = new Date(appt.appointmentDateTime);
          return apptDate >= startDate && apptDate <= endDate;
        });

        const filteredTransfers = (allTransfers || []).filter(transfer => {
          if (!transfer || !transfer.issueDate) return false;
          const transferDate = new Date(transfer.issueDate);
          return transferDate >= startDate && transferDate <= endDate;
        });

        console.log('Filtered appointments (by date range):', filteredAppointments.length);
        console.log('Filtered transfers (by date range):', filteredTransfers.length);
        const stats = this.calculateAllStats(filteredAppointments, allUsers || [], allTransfers || []);
        console.log('Calculated stats:', stats);
        return of(stats);
      }),
      catchError(error => {
        console.error('Fallback method failed:', error);
        return this.fallbackData$;
      })
    );
  }

  private transformBackendStats(backendStats: any): any {
    const statusCounts = backendStats.appointmentStatusCounts || {};
    
    return {
      statCards: this.buildStatCards(
        backendStats.totalAppointments || 0,
        backendStats.activeUsers || 0,
        backendStats.completionRate || 0,
        backendStats.avgResponseTime || '0h',
        backendStats.totalTransfers || 0,
        0 // totalAmount will be calculated from transfers
      ),
      appointmentStatusData: this.buildStatusChart({
        scheduled: statusCounts.SCHEDULED || 0,
        confirmed: statusCounts.CONFIRMED || 0,
        completed: statusCounts.COMPLETED || 0,
        cancelled: statusCounts.CANCELLED || 0
      }),
      monthlyTrends: [],
      topUsers: [],
      recentActivity: [],
      transferStats: null,
      userStats: null,
      transferStatusData: [],
      transferTypeData: [],
      recentTransfers: [],
      recentAppointments: []
    };
  }

  private loadFallbackData() {
    // Get ALL data once for fallback
    forkJoin({
      allAppointments: this.appointmentService.searchAppointments(undefined, undefined, undefined).pipe(
        catchError(() => of([]))
      ),
      allUsers: this.authService.getAllUsers().pipe(
        catchError(() => of([]))
      ),
      allTransfers: this.transferRequestService.getTransferRequests().pipe(
        catchError(() => of([]))
      )
    }).subscribe(({ allAppointments, allUsers, allTransfers }) => {
      const stats = this.calculateAllStats(allAppointments, allUsers, allTransfers);
      this.fallbackDataSubject.next(stats);
    });
  }

  private calculateAllStats(appointments: Appointment[], allUsers: User[], transfers?: TransferRequest[]) {
    const activeUsers = allUsers.filter(user => user.isActive);
    const totalAppointments = appointments.length;
    const statusCounts = this.getStatusCounts(appointments);
    const completionRate = totalAppointments > 0 
      ? Math.round((statusCounts.completed / totalAppointments) * 100 * 10) / 10 
      : 0;
    const avgResponseTime = this.calculateAvgResponseTime(appointments);
    
    const totalTransfers = transfers?.length || 0;
    const totalAmount = transfers?.reduce((sum, t) => sum + (t.amount || 0), 0) || 0;
    
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentAppointments = appointments.filter(
      appt => new Date(appt.appointmentDateTime) >= thirtyDaysAgo
    );
    
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    return {
      statCards: this.buildStatCards(totalAppointments, activeUsers.length, completionRate, avgResponseTime, totalTransfers, totalAmount),
      appointmentStatusData: this.buildStatusChart(statusCounts),
      monthlyTrends: this.getMonthlyTrends(appointments),
      topUsers: this.getTopUsers(recentAppointments, allUsers),
      recentActivity: this.getRecentActivity(
        appointments.filter(appt => new Date(appt.appointmentDateTime) >= sevenDaysAgo),
        allUsers,
        transfers || []
      ),
      transferStats: transfers ? this.getTransferStats(transfers, transfers) : null,
      userStats: this.getUserStats(allUsers),
      transferStatusData: transfers ? this.getTransferStatusData(transfers) : [],
      transferTypeData: transfers ? this.getTransferTypeData(transfers) : [],
      recentTransfers: transfers ? this.getRecentTransfers(transfers) : [],
      recentAppointments: this.getRecentAppointments(appointments)
    };
  }

  private getStatusCounts(appointments: Appointment[]) {
    const counts: any = { scheduled: 0, confirmed: 0, completed: 0, cancelled: 0 };
    appointments.forEach(appt => {
      const key = appt.status?.toLowerCase();
      if (counts[key]) counts[key]++;
    });
    return counts;
  }

  private calculateAvgResponseTime(appointments: Appointment[]): string {
    const avgMinutes = appointments.length > 0 
      ? appointments.reduce((sum, appt) => sum + (appt.durationMinutes || 60), 0) / appointments.length 
      : 0;
    return `${Math.round(avgMinutes / 60 * 10) / 10}h`;
  }

  private getTopUsers(appointments: Appointment[], allUsers: User[]) {
    console.log('Calculating top users from', appointments.length, 'appointments');
    const userStats: any = {};
    
    appointments.forEach(appt => {
      if (!appt || !appt.user) {
        console.warn('Appointment missing user:', appt);
        return;
      }
      
      const userId = appt.user.id;
      if (!userId) {
        console.warn('Appointment user missing id:', appt.user);
        return;
      }
      
      if (!userStats[userId]) {
        // Try to get user from allUsers first, fallback to appt.user
        const fullUser = allUsers.find(u => u.id === userId) || appt.user;
        userStats[userId] = { 
          name: `${fullUser.firstName || ''} ${fullUser.lastName || ''}`.trim() || 'Unknown User', 
          appointments: 0, 
          completed: 0 
        };
      }
      userStats[userId].appointments++;
      if (appt.status === 'COMPLETED') {
        userStats[userId].completed++;
      }
    });

    const topUsers = Object.values(userStats)
      .sort((a: any, b: any) => b.appointments - a.appointments)
      .slice(0, 5)
      .map((user: any) => ({
        name: user.name,
        appointments: user.appointments,
        completionRate: user.appointments > 0 ? Math.round((user.completed / user.appointments) * 100) : 0
      }));
    
    console.log('Top users calculated:', topUsers);
    return topUsers;
  }

  private getMonthlyTrends(appointments: Appointment[]) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const now = new Date();
    const trends = [];

    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStr = months[date.getMonth()];
      const monthAppointments = appointments.filter(appt => {
        const apptDate = new Date(appt.appointmentDateTime);
        return apptDate.getFullYear() === date.getFullYear() && 
               apptDate.getMonth() === date.getMonth();
      });
      
      trends.push({
        month: monthStr,
        appointments: monthAppointments.length,
        users: new Set(monthAppointments.map(appt => appt.user.id)).size
      });
    }
    return trends;
  }

  private getTransferStats(allTransfers: TransferRequest[], filteredTransfers: TransferRequest[]) {
    const totalAmount = filteredTransfers.reduce((sum, t) => sum + (t.amount || 0), 0);
    const avgAmount = filteredTransfers.length > 0 ? totalAmount / filteredTransfers.length : 0;
    const statusCounts: any = {};
    filteredTransfers.forEach(t => {
      const status = t.status || 'PENDING';
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });

    return {
      total: allTransfers.length,
      inRange: filteredTransfers.length,
      totalAmount: totalAmount,
      avgAmount: avgAmount,
      pending: statusCounts.PENDING || 0,
      validated: statusCounts.VALIDATED || 0,
      rejected: statusCounts.REJECTED || 0,
      infoRequested: statusCounts.INFO_REQUESTED || 0
    };
  }

  private getUserStats(allUsers: User[]) {
    const roleCounts: any = {};
    allUsers.forEach(u => {
      const role = u.role || 'CLIENT';
      roleCounts[role] = (roleCounts[role] || 0) + 1;
    });

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const newUsers = allUsers.filter(u => {
      if (!u.createdAt) return false;
      return new Date(u.createdAt) >= thirtyDaysAgo;
    }).length;

    return {
      total: allUsers.length,
      active: allUsers.filter(u => u.isActive).length,
      inactive: allUsers.filter(u => !u.isActive).length,
      newUsers: newUsers,
      byRole: roleCounts
    };
  }

  private getTransferStatusData(transfers: TransferRequest[]): ChartData[] {
    const statusCounts: any = {};
    transfers.forEach(t => {
      const status = t.status || 'PENDING';
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });

    return [
      { label: "Pending", value: statusCounts.PENDING || 0, color: "bg-yellow-500" },
      { label: "Validated", value: statusCounts.VALIDATED || 0, color: "bg-green-500" },
      { label: "Rejected", value: statusCounts.REJECTED || 0, color: "bg-red-500" },
      { label: "Info Requested", value: statusCounts.INFO_REQUESTED || 0, color: "bg-blue-500" },
    ];
  }

  private getTransferTypeData(transfers: TransferRequest[]): ChartData[] {
    const typeCounts: any = {};
    transfers.forEach(t => {
      const type = t.transferType || 'UNKNOWN';
      typeCounts[type] = (typeCounts[type] || 0) + 1;
    });

    return Object.keys(typeCounts).map(type => ({
      label: type,
      value: typeCounts[type],
      color: this.getTransferTypeColor(type)
    }));
  }

  private getTransferTypeColor(type: string): string {
    const colors: any = {
      'DOMESTIC': 'bg-blue-500',
      'INTERNATIONAL': 'bg-purple-500',
      'WIRE': 'bg-green-500',
      'ACH': 'bg-orange-500'
    };
    return colors[type] || 'bg-gray-500';
  }

  private getRecentTransfers(transfers: TransferRequest[]) {
    return [...transfers]
      .filter(t => t && t.issueDate)
      .sort((a, b) => {
        const dateA = new Date(a.issueDate).getTime();
        const dateB = new Date(b.issueDate).getTime();
        return dateB - dateA;
      })
      .slice(0, 10)
      .map(t => ({
        id: t.idTransferRequest || 0,
        user: t.user ? `${t.user.firstName || ''} ${t.user.lastName || ''}`.trim() : 'Unknown',
        amount: t.amount || 0,
        currency: t.currency || 'TND',
        status: t.status || 'PENDING',
        type: t.transferType || 'UNKNOWN',
        date: t.issueDate
      }));
  }

  private getRecentAppointments(appointments: Appointment[]) {
    return [...appointments]
      .filter(a => a && a.appointmentDateTime)
      .sort((a, b) => {
        const dateA = new Date(a.appointmentDateTime).getTime();
        const dateB = new Date(b.appointmentDateTime).getTime();
        return dateB - dateA;
      })
      .slice(0, 10)
      .map(a => ({
        id: a.idAppointment || 0,
        user: a.user ? `${a.user.firstName || ''} ${a.user.lastName || ''}`.trim() : 'Unknown',
        date: a.appointmentDateTime,
        status: a.status || 'SCHEDULED',
        duration: a.durationMinutes || 30
      }));
  }

  private getRecentActivity(appointments: Appointment[], allUsers: User[], transfers: TransferRequest[]) {
    console.log('Calculating recent activity from', appointments.length, 'appointments and', transfers.length, 'transfers');
    
    const activities: any[] = [];
    
    // Add appointment activities
    if (appointments && appointments.length > 0) {
      const sortedAppointments = [...appointments]
        .filter(appt => appt && appt.appointmentDateTime)
        .sort((a, b) => {
          const dateA = new Date(a.appointmentDateTime).getTime();
          const dateB = new Date(b.appointmentDateTime).getTime();
          return dateB - dateA;
        })
        .slice(0, 5);
      
      sortedAppointments.forEach(appt => {
        if (!appt.user || !appt.user.id) return;
        
        const user = allUsers.find(u => u.id === appt.user.id) || appt.user;
        const now = new Date();
        const apptTime = new Date(appt.appointmentDateTime);
        const diffMinutes = Math.round((now.getTime() - apptTime.getTime()) / (1000 * 60));

        const status = appt.status?.toUpperCase() || 'SCHEDULED';
        let message = '', icon = '', color = '';
        
        switch (status) {
          case 'SCHEDULED':
            message = `New appointment scheduled by ${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Unknown User';
            icon = 'pi-calendar'; color = 'text-blue-600'; break;
          case 'CONFIRMED':
            message = `Appointment confirmed for ${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Unknown User';
            icon = 'pi-check-circle'; color = 'text-green-600'; break;
          case 'COMPLETED':
            message = `Appointment completed by ${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Unknown User';
            icon = 'pi-check-circle'; color = 'text-purple-600'; break;
          case 'CANCELLED':
            message = `Appointment cancelled by ${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Unknown User';
            icon = 'pi-times-circle'; color = 'text-red-600'; break;
          default:
            message = `Appointment by ${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Unknown User';
            icon = 'pi-calendar'; color = 'text-blue-600';
        }
        
        const time = diffMinutes < 60 ? `${diffMinutes} min ago` :
                    diffMinutes < 1440 ? `${Math.round(diffMinutes / 60)}h ago` :
                    `${Math.round(diffMinutes / 1440)}d ago`;

        activities.push({ type: 'appointment', message, time, icon, color, date: apptTime });
      });
    }
    
    // Add transfer activities
    if (transfers && transfers.length > 0) {
      const sortedTransfers = [...transfers]
        .filter(t => t && t.issueDate)
        .sort((a, b) => {
          const dateA = new Date(a.issueDate).getTime();
          const dateB = new Date(b.issueDate).getTime();
          return dateB - dateA;
        })
        .slice(0, 5);
      
      sortedTransfers.forEach(transfer => {
        if (!transfer.user || !transfer.user.id) return;
        
        const user = allUsers.find(u => u.id === transfer.user.id) || transfer.user;
        const now = new Date();
        const transferTime = new Date(transfer.issueDate);
        const diffMinutes = Math.round((now.getTime() - transferTime.getTime()) / (1000 * 60));

        const status = transfer.status?.toUpperCase() || 'PENDING';
        let message = '', icon = '', color = '';
        
        switch (status) {
          case 'PENDING':
            message = `Transfer request submitted by ${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Unknown User';
            icon = 'pi-clock'; color = 'text-yellow-600'; break;
          case 'VALIDATED':
            message = `Transfer validated for ${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Unknown User';
            icon = 'pi-check-circle'; color = 'text-green-600'; break;
          case 'REJECTED':
            message = `Transfer rejected for ${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Unknown User';
            icon = 'pi-times-circle'; color = 'text-red-600'; break;
          case 'INFO_REQUESTED':
            message = `Additional info requested for transfer by ${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Unknown User';
            icon = 'pi-info-circle'; color = 'text-blue-600'; break;
          default:
            message = `Transfer by ${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Unknown User';
            icon = 'pi-arrows-h'; color = 'text-gray-600';
        }
        
        const time = diffMinutes < 60 ? `${diffMinutes} min ago` :
                    diffMinutes < 1440 ? `${Math.round(diffMinutes / 60)}h ago` :
                    `${Math.round(diffMinutes / 1440)}d ago`;

        activities.push({ type: 'transfer', message, time, icon, color, date: transferTime });
      });
    }
    
    // Sort all activities by date and take top 10
    const sortedActivities = activities
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, 10)
      .map(a => ({
        type: a.type,
        message: a.message,
        time: a.time,
        icon: a.icon,
        color: a.color
      }));
    
    console.log('Recent activity calculated:', sortedActivities.length);
    return sortedActivities;
  }

  private buildStatCards(totalAppointments: number, activeUsers: number, completionRate: number, avgResponseTime: string, totalTransfers?: number, totalAmount?: number) {
    const prevMonthAppointments = Math.max(totalAppointments - 50, 1);
    const prevActiveUsers = Math.max(activeUsers - 10, 1);
    const prevCompletionRate = Math.max(completionRate - 2, 0);

    const cards = [
      {
        title: "Total Appointments",
        value: totalAppointments,
        change: Math.round(((totalAppointments - prevMonthAppointments) / prevMonthAppointments) * 100 * 10) / 10,
        icon: "pi-calendar",
        color: "text-blue-600 dark:text-blue-400",
        bgColor: "bg-blue-100 dark:bg-blue-900",
      },
      {
        title: "Active Users",
        value: activeUsers,
        change: Math.round(((activeUsers - prevActiveUsers) / prevActiveUsers) * 100 * 10) / 10,
        icon: "pi-users",
        color: "text-green-600 dark:text-green-400",
        bgColor: "bg-green-100 dark:bg-green-900",
      },
      {
        title: "Total Transfers",
        value: totalTransfers || 0,
        change: 12.5,
        icon: "pi-arrows-h",
        color: "text-purple-600 dark:text-purple-400",
        bgColor: "bg-purple-100 dark:bg-purple-900",
      },
      {
        title: "Total Amount",
        value: totalAmount ? `${(totalAmount / 1000).toFixed(1)}K` : '0',
        change: 8.2,
        icon: "pi-wallet",
        color: "text-orange-600 dark:text-orange-400",
        bgColor: "bg-orange-100 dark:bg-orange-900",
      },
      {
        title: "Completion Rate",
        value: `${completionRate}%`,
        change: Math.round((completionRate - prevCompletionRate) * 10) / 10,
        icon: "pi-check-circle",
        color: "text-indigo-600 dark:text-indigo-400",
        bgColor: "bg-indigo-100 dark:bg-indigo-900",
      },
      {
        title: "Avg. Response Time",
        value: avgResponseTime,
        change: -5.3,
        icon: "pi-clock",
        color: "text-teal-600 dark:text-teal-400",
        bgColor: "bg-teal-100 dark:bg-teal-900",
      },
    ];
    
    return cards;
  }

  private buildStatusChart(counts: any) {
    return [
      { label: "Scheduled", value: counts.scheduled || 0, color: "bg-blue-500" },
      { label: "Confirmed", value: counts.confirmed || 0, color: "bg-green-500" },
      { label: "Completed", value: counts.completed || 0, color: "bg-purple-500" },
      { label: "Cancelled", value: counts.cancelled || 0, color: "bg-red-500" },
    ];
  }
}