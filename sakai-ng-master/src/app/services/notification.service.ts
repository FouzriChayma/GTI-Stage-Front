import { Injectable } from '@angular/core';
import { Observable, Subject, BehaviorSubject } from 'rxjs';
import { Client, IMessage } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { AuthService } from './auth.service';
import { MessageService } from 'primeng/api';

export enum NotificationType {
  TRANSFER_VALIDATED = 'TRANSFER_VALIDATED',
  TRANSFER_REJECTED = 'TRANSFER_REJECTED',
  TRANSFER_PENDING = 'TRANSFER_PENDING',
  TRANSFER_INFO_REQUESTED = 'TRANSFER_INFO_REQUESTED',
  APPOINTMENT_REMINDER = 'APPOINTMENT_REMINDER',
  APPOINTMENT_SCHEDULED = 'APPOINTMENT_SCHEDULED',
  SUPPORT_MESSAGE = 'SUPPORT_MESSAGE',
  DOCUMENT_MISSING = 'DOCUMENT_MISSING',
  PROFILE_UPDATED = 'PROFILE_UPDATED',
  DAILY_REPORT = 'DAILY_REPORT',
  URGENT_TRANSFER = 'URGENT_TRANSFER'
}

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  userId?: number;
  role?: string;
  timestamp: Date;
  read: boolean;
  severity?: 'success' | 'info' | 'warn' | 'error';
  icon?: string;
  actionUrl?: string;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private stompClient: Client | null = null;
  private connected = false;
  private connectionSubject = new BehaviorSubject<boolean>(false);
  public connection$ = this.connectionSubject.asObservable();

  private notificationSubject = new Subject<Notification>();
  public notification$ = this.notificationSubject.asObservable();

  private notifications: Notification[] = [];
  private notificationsSubject = new BehaviorSubject<Notification[]>([]);
  public notifications$ = this.notificationsSubject.asObservable();

  private unreadCountSubject = new BehaviorSubject<number>(0);
  public unreadCount$ = this.unreadCountSubject.asObservable();

  constructor(
    private authService: AuthService,
    private messageService: MessageService
  ) {
    // Load notifications from localStorage on init
    this.loadNotificationsFromStorage();
  }

  connect(): void {
    if (this.connected && this.stompClient?.active) {
      return;
    }

    const token = this.authService.getToken();
    if (!token) {
      console.error('No token available for WebSocket connection');
      return;
    }

    const socket = new SockJS('http://localhost:8083/ws');
    this.stompClient = new Client({
      webSocketFactory: () => socket,
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      connectHeaders: {
        Authorization: `Bearer ${token}`
      },
      onConnect: (frame) => {
        console.log('Notification WebSocket connected:', frame);
        this.connected = true;
        this.connectionSubject.next(true);
        this.subscribeToNotifications();
      },
      onDisconnect: () => {
        console.log('Notification WebSocket disconnected');
        this.connected = false;
        this.connectionSubject.next(false);
      },
      onStompError: (frame) => {
        console.error('Notification WebSocket STOMP error:', frame);
        this.connected = false;
        this.connectionSubject.next(false);
      },
      onWebSocketError: (event) => {
        console.error('Notification WebSocket error:', event);
        this.connected = false;
        this.connectionSubject.next(false);
      }
    });

    this.stompClient.activate();
  }

  private subscribeToNotifications(): void {
    if (!this.stompClient || !this.stompClient.active) {
      return;
    }

    // Get current user to subscribe to their notifications
    this.authService.getCurrentUser().subscribe({
      next: (user) => {
        if (!user || !user.id) return;

        // Subscribe to user-specific notifications
        const userTopic = `/queue/notifications/${user.id}`;
        this.stompClient?.subscribe(userTopic, (message: IMessage) => {
          try {
            const notificationData = JSON.parse(message.body);
            this.handleNotification(notificationData);
          } catch (error) {
            console.error('Error parsing notification:', error);
          }
        });

        // Subscribe to role-based notifications
        const roleTopic = `/topic/notifications/${user.role}`;
        this.stompClient?.subscribe(roleTopic, (message: IMessage) => {
          try {
            const notificationData = JSON.parse(message.body);
            this.handleNotification(notificationData);
          } catch (error) {
            console.error('Error parsing role notification:', error);
          }
        });

        console.log('Subscribed to notifications for user:', user.id, 'role:', user.role);
      },
      error: (err) => {
        console.error('Failed to get current user for notifications:', err);
      }
    });
  }

  private handleNotification(notificationData: any): void {
    const notification: Notification = {
      id: notificationData.id || this.generateId(),
      type: notificationData.type as NotificationType,
      title: notificationData.title || this.getDefaultTitle(notificationData.type),
      message: notificationData.message || '',
      userId: notificationData.userId,
      role: notificationData.role,
      timestamp: new Date(notificationData.timestamp || Date.now()),
      read: false,
      severity: notificationData.severity || this.getSeverity(notificationData.type),
      icon: notificationData.icon || this.getIcon(notificationData.type),
      actionUrl: notificationData.actionUrl
    };

    // Add to notifications list
    this.notifications.unshift(notification);
    this.saveNotificationsToStorage();
    this.notificationsSubject.next([...this.notifications]);
    this.updateUnreadCount();

    // Emit notification
    this.notificationSubject.next(notification);

    // Show toast notification
    this.showToast(notification);
  }

  private showToast(notification: Notification): void {
    this.messageService.add({
      severity: notification.severity || 'info',
      summary: notification.title,
      detail: notification.message,
      life: 5000,
      icon: notification.icon
    });
  }

  private getDefaultTitle(type: NotificationType): string {
    const titles: Record<NotificationType, string> = {
      [NotificationType.TRANSFER_VALIDATED]: 'Transfert Validé',
      [NotificationType.TRANSFER_REJECTED]: 'Transfert Rejeté',
      [NotificationType.TRANSFER_PENDING]: 'Nouveau Transfert',
      [NotificationType.TRANSFER_INFO_REQUESTED]: 'Informations Requises',
      [NotificationType.APPOINTMENT_REMINDER]: 'Rappel de Rendez-vous',
      [NotificationType.APPOINTMENT_SCHEDULED]: 'Rendez-vous Planifié',
      [NotificationType.SUPPORT_MESSAGE]: 'Nouveau Message',
      [NotificationType.DOCUMENT_MISSING]: 'Document Manquant',
      [NotificationType.PROFILE_UPDATED]: 'Profil Mis à Jour',
      [NotificationType.DAILY_REPORT]: 'Rapport Quotidien',
      [NotificationType.URGENT_TRANSFER]: 'Transfert Urgent'
    };
    return titles[type] || 'Notification';
  }

  private getSeverity(type: NotificationType): 'success' | 'info' | 'warn' | 'error' {
    const severities: Record<NotificationType, 'success' | 'info' | 'warn' | 'error'> = {
      [NotificationType.TRANSFER_VALIDATED]: 'success',
      [NotificationType.TRANSFER_REJECTED]: 'error',
      [NotificationType.TRANSFER_PENDING]: 'info',
      [NotificationType.TRANSFER_INFO_REQUESTED]: 'warn',
      [NotificationType.APPOINTMENT_REMINDER]: 'info',
      [NotificationType.APPOINTMENT_SCHEDULED]: 'info',
      [NotificationType.SUPPORT_MESSAGE]: 'info',
      [NotificationType.DOCUMENT_MISSING]: 'warn',
      [NotificationType.PROFILE_UPDATED]: 'success',
      [NotificationType.DAILY_REPORT]: 'info',
      [NotificationType.URGENT_TRANSFER]: 'warn'
    };
    return severities[type] || 'info';
  }

  private getIcon(type: NotificationType): string {
    const icons: Record<NotificationType, string> = {
      [NotificationType.TRANSFER_VALIDATED]: 'pi pi-check-circle',
      [NotificationType.TRANSFER_REJECTED]: 'pi pi-times-circle',
      [NotificationType.TRANSFER_PENDING]: 'pi pi-clock',
      [NotificationType.TRANSFER_INFO_REQUESTED]: 'pi pi-info-circle',
      [NotificationType.APPOINTMENT_REMINDER]: 'pi pi-calendar',
      [NotificationType.APPOINTMENT_SCHEDULED]: 'pi pi-calendar-plus',
      [NotificationType.SUPPORT_MESSAGE]: 'pi pi-comments',
      [NotificationType.DOCUMENT_MISSING]: 'pi pi-file-excel',
      [NotificationType.PROFILE_UPDATED]: 'pi pi-user-edit',
      [NotificationType.DAILY_REPORT]: 'pi pi-chart-bar',
      [NotificationType.URGENT_TRANSFER]: 'pi pi-exclamation-triangle'
    };
    return icons[type] || 'pi pi-bell';
  }

  markAsRead(notificationId: string): void {
    const notification = this.notifications.find(n => n.id === notificationId);
    if (notification && !notification.read) {
      notification.read = true;
      this.saveNotificationsToStorage();
      this.notificationsSubject.next([...this.notifications]);
      this.updateUnreadCount();
    }
  }

  markAllAsRead(): void {
    this.notifications.forEach(n => n.read = true);
    this.saveNotificationsToStorage();
    this.notificationsSubject.next([...this.notifications]);
    this.updateUnreadCount();
  }

  deleteNotification(notificationId: string): void {
    this.notifications = this.notifications.filter(n => n.id !== notificationId);
    this.saveNotificationsToStorage();
    this.notificationsSubject.next([...this.notifications]);
    this.updateUnreadCount();
  }

  clearAllNotifications(): void {
    this.notifications = [];
    this.saveNotificationsToStorage();
    this.notificationsSubject.next([]);
    this.updateUnreadCount();
  }

  private updateUnreadCount(): void {
    const unreadCount = this.notifications.filter(n => !n.read).length;
    this.unreadCountSubject.next(unreadCount);
  }

  private generateId(): string {
    return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private saveNotificationsToStorage(): void {
    try {
      const user = this.authService.getStoredUser();
      if (user && user.id) {
        const key = `notifications_${user.id}`;
        localStorage.setItem(key, JSON.stringify(this.notifications));
      }
    } catch (error) {
      console.error('Error saving notifications to storage:', error);
    }
  }

  private loadNotificationsFromStorage(): void {
    try {
      const user = this.authService.getStoredUser();
      if (user && user.id) {
        const key = `notifications_${user.id}`;
        const stored = localStorage.getItem(key);
        if (stored) {
          this.notifications = JSON.parse(stored).map((n: any) => ({
            ...n,
            timestamp: new Date(n.timestamp)
          }));
          this.notificationsSubject.next([...this.notifications]);
          this.updateUnreadCount();
        }
      }
    } catch (error) {
      console.error('Error loading notifications from storage:', error);
    }
  }

  disconnect(): void {
    if (this.stompClient) {
      this.stompClient.deactivate();
      this.connected = false;
      this.connectionSubject.next(false);
    }
  }

  isConnected(): boolean {
    return this.connected && (this.stompClient?.active ?? false);
  }

  getNotifications(): Notification[] {
    return [...this.notifications];
  }

  getUnreadCount(): number {
    return this.notifications.filter(n => !n.read).length;
  }
}

