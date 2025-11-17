import { Injectable } from '@angular/core';
import { Observable, Subject, BehaviorSubject } from 'rxjs';
import { Client, IMessage } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { AuthService } from './auth.service';

export interface ChatMessage {
  id?: number;
  conversationId: number;
  senderId: number;
  senderName: string;
  senderEmail: string;
  senderPhotoPath?: string | null;
  content: string;
  sentAt: Date | string;
  isRead: boolean;
}

export interface Conversation {
  id: number;
  clientId: number;
  clientName: string;
  clientEmail: string;
  agentId?: number;
  agentName?: string;
  agentEmail?: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  isActive: boolean;
  unreadCount: number;
  lastMessage?: ChatMessage;
  messages?: ChatMessage[];
}

@Injectable({
  providedIn: 'root'
})
export class WebSocketService {
  private stompClient: Client | null = null;
  private connected = false;
  private connectionSubject = new BehaviorSubject<boolean>(false);
  public connection$ = this.connectionSubject.asObservable();

  private messageSubject = new Subject<ChatMessage>();
  public message$ = this.messageSubject.asObservable();

  private conversationSubject = new Subject<Conversation[]>();
  public conversations$ = this.conversationSubject.asObservable();

  constructor(private authService: AuthService) {}

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
        console.log('WebSocket connected:', frame);
        this.connected = true;
        this.connectionSubject.next(true);
        this.subscribeToTopics();
      },
      onDisconnect: () => {
        console.log('WebSocket disconnected');
        this.connected = false;
        this.connectionSubject.next(false);
      },
      onStompError: (frame) => {
        console.error('WebSocket STOMP error:', frame);
        this.connected = false;
        this.connectionSubject.next(false);
      },
      onWebSocketError: (event) => {
        console.error('WebSocket error:', event);
        this.connected = false;
        this.connectionSubject.next(false);
      }
    });

    this.stompClient.activate();
  }

  private subscribeToTopics(): void {
    if (!this.stompClient || !this.stompClient.active) {
      return;
    }

    // Subscribe to all conversations updates
    this.stompClient.subscribe('/topic/conversations', (message: IMessage) => {
      try {
        const conversations: Conversation[] = JSON.parse(message.body);
        this.conversationSubject.next(conversations);
      } catch (error) {
        console.error('Error parsing conversations:', error);
      }
    });

    // Subscribe to specific conversation messages
    // This will be done dynamically when a conversation is selected
  }

  private conversationSubscriptions: Map<number, any> = new Map();

  subscribeToConversation(conversationId: number): void {
    if (!this.stompClient || !this.stompClient.active) {
      console.warn('WebSocket not connected, cannot subscribe to conversation:', conversationId);
      return;
    }

    // Unsubscribe from previous subscription for this conversation if exists
    if (this.conversationSubscriptions.has(conversationId)) {
      const sub = this.conversationSubscriptions.get(conversationId);
      if (sub && sub.unsubscribe) {
        sub.unsubscribe();
      }
      this.conversationSubscriptions.delete(conversationId);
    }

    const subscription = this.stompClient.subscribe(`/topic/conversation/${conversationId}`, (message: IMessage) => {
      try {
        console.log('Received WebSocket message for conversation', conversationId, ':', message.body);
        const chatMessage: ChatMessage = JSON.parse(message.body);
        // Convert sentAt string to Date
        if (typeof chatMessage.sentAt === 'string') {
          chatMessage.sentAt = new Date(chatMessage.sentAt);
        }
        this.messageSubject.next(chatMessage);
      } catch (error) {
        console.error('Error parsing message:', error);
      }
    });

    this.conversationSubscriptions.set(conversationId, subscription);
    console.log('Subscribed to conversation:', conversationId);
  }

  sendMessage(conversationId: number, content: string): void {
    if (!this.stompClient || !this.stompClient.active) {
      console.error('WebSocket not connected');
      return;
    }

    const message = {
      conversationId,
      content
    };

    this.stompClient.publish({
      destination: '/app/send',
      body: JSON.stringify(message)
    });
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
}

