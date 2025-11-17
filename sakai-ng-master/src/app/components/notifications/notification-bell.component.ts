import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { BadgeModule } from 'primeng/badge';
import { OverlayPanelModule } from 'primeng/overlaypanel';
import { ScrollPanelModule } from 'primeng/scrollpanel';
import { TooltipModule } from 'primeng/tooltip';
import { NotificationService, Notification } from '../../services/notification.service';
import { AuthService } from '../../services/auth.service';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-notification-bell',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ButtonModule,
    BadgeModule,
    OverlayPanelModule,
    ScrollPanelModule,
    TooltipModule
  ],
  template: `
    <div class="relative">
      <p-button
        icon="pi pi-bell"
        [rounded]="true"
        [text]="true"
        [badge]="unreadCount > 0 ? unreadCount.toString() : ''"
        badgeSeverity="danger"
        (onClick)="op.toggle($event)"
        pTooltip="Notifications"
        tooltipPosition="bottom"
        styleClass="p-button-text p-button-lg">
      </p-button>

      <p-overlayPanel #op [dismissable]="true" [showCloseIcon]="true" styleClass="notification-panel">
        <div class="notification-container">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Notifications
            </h3>
            <div class="flex gap-2">
              <p-button
                *ngIf="unreadCount > 0"
                label="Mark all as read"
                icon="pi pi-check"
                [text]="true"
                size="small"
                (onClick)="markAllAsRead()">
              </p-button>
              <p-button
                *ngIf="notifications.length > 0"
                label="Clear all"
                icon="pi pi-trash"
                [text]="true"
                size="small"
                severity="danger"
                (onClick)="clearAll()">
              </p-button>
            </div>
          </div>

          <p-scrollPanel [style]="{ width: '400px', height: '500px' }">
            <div *ngIf="notifications.length === 0" class="text-center p-8 text-gray-500">
              <i class="pi pi-bell text-4xl mb-2"></i>
              <p>No notifications</p>
            </div>

            <div *ngFor="let notification of notifications" 
                 class="notification-item"
                 [class.unread]="!notification.read"
                 (click)="handleNotificationClick(notification)">
              <div class="flex items-start gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg cursor-pointer">
                <div [class]="'w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ' + getSeverityClass(notification.severity)">
                  <i [class]="notification.icon || 'pi pi-bell'"></i>
                </div>
                <div class="flex-1 min-w-0">
                  <div class="flex items-start justify-between gap-2">
                    <div class="flex-1">
                      <p class="font-semibold text-gray-900 dark:text-gray-100 text-sm">
                        {{ notification.title }}
                      </p>
                      <p class="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        {{ notification.message }}
                      </p>
                      <p class="text-xs text-gray-400 dark:text-gray-500 mt-1">
                        {{ formatTime(notification.timestamp) }}
                      </p>
                    </div>
                    <div *ngIf="!notification.read" class="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1"></div>
                  </div>
                </div>
              </div>
            </div>
          </p-scrollPanel>
        </div>
      </p-overlayPanel>
    </div>
  `,
  styles: [`
    .notification-panel {
      width: 450px;
    }

    .notification-container {
      padding: 0.5rem;
    }

    .notification-item.unread {
      background-color: rgba(59, 130, 246, 0.05);
    }

    .notification-item:hover {
      background-color: rgba(0, 0, 0, 0.02);
    }

    :host ::ng-deep .p-scrollpanel-content {
      padding: 0.5rem;
    }
  `]
})
export class NotificationBellComponent implements OnInit, OnDestroy {
  notifications: Notification[] = [];
  unreadCount = 0;
  private destroy$ = new Subject<void>();

  constructor(
    private notificationService: NotificationService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    // Subscribe to notifications
    this.notificationService.notifications$
      .pipe(takeUntil(this.destroy$))
      .subscribe(notifications => {
        this.notifications = notifications;
      });

    // Subscribe to unread count
    this.notificationService.unreadCount$
      .pipe(takeUntil(this.destroy$))
      .subscribe(count => {
        this.unreadCount = count;
      });

    // Connect to notification service if user is authenticated
    if (this.authService.isAuthenticated()) {
      this.notificationService.connect();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  markAllAsRead(): void {
    this.notificationService.markAllAsRead();
  }

  clearAll(): void {
    if (confirm('Are you sure you want to clear all notifications?')) {
      this.notificationService.clearAllNotifications();
    }
  }

  handleNotificationClick(notification: Notification): void {
    if (!notification.read) {
      this.notificationService.markAsRead(notification.id);
    }

    if (notification.actionUrl) {
      // Navigate to action URL if provided
      window.location.href = notification.actionUrl;
    }
  }

  formatTime(timestamp: Date): string {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return timestamp.toLocaleDateString();
  }

  getSeverityClass(severity?: string): string {
    const classes: Record<string, string> = {
      success: 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400',
      info: 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400',
      warn: 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900 dark:text-yellow-400',
      error: 'bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-400'
    };
    const defaultSeverity = severity || 'info';
    return classes[defaultSeverity] || classes['info'];
  }
}

