import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';
import { ChatMessage, Conversation } from './websocket.service';

@Injectable({
  providedIn: 'root'
})
export class MessageService {
  private apiUrl = 'http://localhost:8083/api/messages';

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  private getHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders({
      Authorization: token ? `Bearer ${token}` : '',
      'Content-Type': 'application/json',
      Accept: 'application/json',
    });
  }

  createOrGetConversation(clientId: number): Observable<Conversation> {
    return this.http.post<Conversation>(
      `${this.apiUrl}/conversations?clientId=${clientId}`,
      {},
      { headers: this.getHeaders() }
    );
  }

  getConversations(): Observable<Conversation[]> {
    return this.http.get<Conversation[]>(
      `${this.apiUrl}/conversations`,
      { headers: this.getHeaders() }
    );
  }

  getConversation(id: number): Observable<Conversation> {
    return this.http.get<Conversation>(
      `${this.apiUrl}/conversations/${id}`,
      { headers: this.getHeaders() }
    );
  }

  sendMessage(conversationId: number, content: string): Observable<ChatMessage> {
    return this.http.post<ChatMessage>(
      `${this.apiUrl}/send`,
      { conversationId, content },
      { headers: this.getHeaders() }
    );
  }

  markAsRead(conversationId: number): Observable<void> {
    return this.http.put<void>(
      `${this.apiUrl}/conversations/${conversationId}/read`,
      {},
      { headers: this.getHeaders() }
    );
  }
}

