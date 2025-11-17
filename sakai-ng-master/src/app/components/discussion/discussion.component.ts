import { Component, OnInit, OnDestroy, ChangeDetectorRef, ViewChild, ElementRef } from "@angular/core"
import { CommonModule } from "@angular/common"
import { FormsModule } from "@angular/forms"
import { DomSanitizer, SafeUrl } from "@angular/platform-browser"
import { AuthService } from "../../services/auth.service"
import { WebSocketService, ChatMessage, Conversation } from "../../services/websocket.service"
import { MessageService } from "../../services/message.service"
import { Subscription } from "rxjs"
import { InputTextModule } from "primeng/inputtext"
import { ButtonModule } from "primeng/button"
import { AvatarModule } from "primeng/avatar"
import { BadgeModule } from "primeng/badge"
import { ScrollPanelModule } from "primeng/scrollpanel"
import { TopbarWidget } from "../home/topbarwidget.component"

interface DisplayMessage {
  id?: number
  sender: "user" | "support"
  text: string
  timestamp: Date
  senderName: string
  senderPhoto?: string | null
  senderId: number
}

@Component({
  selector: "app-discussion",
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    InputTextModule,
    ButtonModule,
    AvatarModule,
    BadgeModule,
    ScrollPanelModule,
    TopbarWidget,
  ],
  templateUrl: "./discussion.component.html",
  styleUrls: ["./discussion.component.scss"],
})
export class DiscussionComponent implements OnInit, OnDestroy {
  @ViewChild('messagesContainer') messagesContainer!: ElementRef

  currentUser: any = null
  messages: DisplayMessage[] = []
  conversations: Conversation[] = []
  selectedConversation: Conversation | null = null
  userPhotoUrl: SafeUrl | null = null
  userPhotoUrlString: string | null = null // Store the string URL separately for p-avatar
  newMessage: string = ""
  isConnected: boolean = false
  isLoading: boolean = false
  isChargeClientele: boolean = false
  isClient: boolean = false

  // Map to store loaded photos for other users
  // Value can be 'loading' (string) or actual photo URL (string)
  private userPhotosCache: Map<number, string> = new Map()

  private subscriptions: Subscription[] = []

  constructor(
    private authService: AuthService,
    private cdr: ChangeDetectorRef,
    private sanitizer: DomSanitizer,
    private webSocketService: WebSocketService,
    private messageService: MessageService,
  ) {}

  ngOnInit(): void {
    this.loadCurrentUser()
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe())
    this.webSocketService.disconnect()
  }

  loadCurrentUser(): void {
    this.isLoading = true
    this.authService.getCurrentUser().subscribe({
      next: (user) => {
        this.currentUser = user
        this.isChargeClientele = user.role === 'CHARGE_CLIENTELE'
        this.isClient = user.role === 'CLIENT'

        if (user?.id && user.profilePhotoPath && user.profilePhotoPath.trim() !== "") {
          this.authService.getProfilePhoto(user.id).subscribe({
            next: (photoBlob: Blob) => {
              const objectUrl = URL.createObjectURL(photoBlob)
              this.userPhotoUrl = this.sanitizer.bypassSecurityTrustUrl(objectUrl)
              this.userPhotoUrlString = objectUrl
              this.initializeChat()
            },
            error: (err) => {
              console.error("Failed to load profile photo:", err)
              this.userPhotoUrl = null
              this.userPhotoUrlString = null
              this.initializeChat()
            },
          })
        } else {
          this.userPhotoUrl = null
          this.userPhotoUrlString = null
          this.initializeChat()
        }
      },
      error: (error) => {
        console.error("Error loading user:", error)
        this.isLoading = false
      },
    })
  }

  initializeChat(): void {
    // Connect to WebSocket
    this.webSocketService.connect()

    // Subscribe to connection status
    const connSub = this.webSocketService.connection$.subscribe(connected => {
      this.isConnected = connected
      if (connected) {
        this.loadConversations()
      }
    })

    // Subscribe to new messages
    const msgSub = this.webSocketService.message$.subscribe(message => {
      console.log('Received message via WebSocket:', message);
      if (this.selectedConversation && message.conversationId === this.selectedConversation.id) {
        // Check if message already exists (avoid duplicates)
        const exists = this.messages.some(m => m.id === message.id);
        if (!exists) {
          this.addMessageToDisplay(message);
        }
      }
      // Refresh conversations list to update unread counts
      this.loadConversations()
    })

    // Subscribe to conversations updates
    const convSub = this.webSocketService.conversations$.subscribe(conversations => {
      this.conversations = conversations
      // Update selected conversation if it exists
      if (this.selectedConversation) {
        const updated = conversations.find(c => c.id === this.selectedConversation!.id)
        if (updated) {
          this.selectedConversation = updated
        }
      }
      this.cdr.detectChanges()
    })

    this.subscriptions.push(connSub, msgSub, convSub)

    this.loadConversations()
  }

  loadConversations(): void {
    if (!this.currentUser) return

    this.messageService.getConversations().subscribe({
      next: (conversations) => {
        this.conversations = conversations.map(conv => ({
          ...conv,
          messages: conv.messages?.map(msg => ({
            ...msg,
            sentAt: typeof msg.sentAt === 'string' ? new Date(msg.sentAt) : msg.sentAt
          }))
        }))

        // For CLIENT, select their conversation automatically or create one
        if (this.isClient) {
          if (this.conversations.length > 0 && !this.selectedConversation) {
            this.selectConversation(this.conversations[0])
          } else if (this.conversations.length === 0 && !this.selectedConversation) {
            // Auto-create conversation for CLIENT if none exists
            this.createConversation()
          }
        }

        this.isLoading = false
        this.cdr.detectChanges()
      },
      error: (err) => {
        console.error("Failed to load conversations:", err)
        this.isLoading = false
      },
    })
  }

  selectConversation(conversation: Conversation): void {
    this.selectedConversation = conversation
    this.messages = []

    // Load conversation details with messages
    this.messageService.getConversation(conversation.id).subscribe({
      next: (fullConversation) => {
        this.selectedConversation = fullConversation
        // Convert messages to display format
        if (fullConversation.messages) {
          this.messages = fullConversation.messages.map(msg => this.convertToDisplayMessage(msg))
          // Preload all photos for other users
          this.preloadUserPhotos(fullConversation.messages)
        }

        // Mark as read
        this.messageService.markAsRead(conversation.id).subscribe()

        // Subscribe to this conversation's messages via WebSocket
        if (this.webSocketService.isConnected()) {
          this.webSocketService.subscribeToConversation(conversation.id)
        } else {
          // If WebSocket not connected yet, wait for connection
          const connSub = this.webSocketService.connection$.subscribe(connected => {
            if (connected && this.selectedConversation) {
              this.webSocketService.subscribeToConversation(this.selectedConversation.id)
              connSub.unsubscribe()
            }
          })
          this.subscriptions.push(connSub)
        }

        // Scroll to bottom
        setTimeout(() => this.scrollToBottom(), 100)
        this.cdr.detectChanges()
      },
      error: (err) => {
        console.error("Failed to load conversation:", err)
      },
    })
  }

  private preloadUserPhotos(messages: ChatMessage[]): void {
    // Get unique user IDs that are not the current user
    const otherUserIds = new Set<number>()
    messages.forEach(msg => {
      if (msg.senderId !== this.currentUser?.id && msg.senderPhotoPath && msg.senderPhotoPath.trim() !== "") {
        otherUserIds.add(msg.senderId)
      }
    })

    // Load photos for all other users
    otherUserIds.forEach(userId => {
      if (!this.userPhotosCache.has(userId)) {
        const message = messages.find(m => m.senderId === userId)
        if (message && message.senderPhotoPath) {
          this.loadUserPhoto(userId, message.senderPhotoPath)
        }
      }
    })
  }

  createConversation(): void {
    if (!this.currentUser?.id) return

    this.isLoading = true
    this.messageService.createOrGetConversation(this.currentUser.id).subscribe({
      next: (conversation) => {
        // Update conversations list
        this.conversations = [conversation]
        // Select the conversation
        this.selectConversation(conversation)
        this.isLoading = false
      },
      error: (err) => {
        console.error("Failed to create conversation:", err)
        this.isLoading = false
      },
    })
  }

  sendMessage(): void {
    if (!this.newMessage.trim() || !this.selectedConversation) return

    const content = this.newMessage.trim()
    this.newMessage = ""

    this.messageService.sendMessage(this.selectedConversation.id, content).subscribe({
      next: (message) => {
        // Add message immediately to display (optimistic update)
        const displayMsg = this.convertToDisplayMessage(message)
        this.messages.push(displayMsg)
        this.scrollToBottom()
        this.cdr.detectChanges()
        
        // Also reload conversation to get latest state
        setTimeout(() => {
          this.reloadCurrentConversation()
        }, 500)
      },
      error: (err) => {
        console.error("Failed to send message:", err)
        // Restore message on error
        this.newMessage = content
      },
    })
  }

  private reloadCurrentConversation(): void {
    if (!this.selectedConversation) return

    this.messageService.getConversation(this.selectedConversation.id).subscribe({
      next: (fullConversation) => {
        this.selectedConversation = fullConversation
        // Update messages
        if (fullConversation.messages) {
          this.messages = fullConversation.messages.map(msg => this.convertToDisplayMessage(msg))
          // Preload photos for any new users
          this.preloadUserPhotos(fullConversation.messages)
        }
        this.scrollToBottom()
        this.cdr.detectChanges()
      },
      error: (err) => {
        console.error("Failed to reload conversation:", err)
      },
    })
  }

  private addMessageToDisplay(message: ChatMessage): void {
    const displayMsg = this.convertToDisplayMessage(message)
    this.messages.push(displayMsg)
    
    // Load photo if needed for this message
    if (message.senderId !== this.currentUser?.id && message.senderPhotoPath && message.senderPhotoPath.trim() !== "") {
      if (!this.userPhotosCache.has(message.senderId)) {
        this.loadUserPhoto(message.senderId, message.senderPhotoPath)
      }
    }
    
    this.scrollToBottom()
    this.cdr.detectChanges()
  }

  private convertToDisplayMessage(message: ChatMessage): DisplayMessage {
    const sentAt = typeof message.sentAt === 'string' ? new Date(message.sentAt) : message.sentAt
    const isCurrentUser = message.senderId === this.currentUser?.id

    // Format sender name - add "Customer Support : " for CHARGE_CLIENTELE
    let displayName = message.senderName
    if (!isCurrentUser && this.isClient) {
      // If current user is CLIENT and sender is not current user, it's a CHARGE_CLIENTELE
      displayName = `Customer Support : ${message.senderName}`
    }

    // Determine photo URL
    let photoUrl: string | undefined = undefined
    if (isCurrentUser) {
      photoUrl = this.userPhotoUrlString || undefined
    } else if (message.senderPhotoPath && message.senderPhotoPath.trim() !== "") {
      // Check if photo is already cached
      const cachedPhoto = this.userPhotosCache.get(message.senderId)
      if (cachedPhoto && cachedPhoto !== 'loading') {
        photoUrl = cachedPhoto
      } else if (!cachedPhoto) {
        // Start loading if not already loading
        this.loadUserPhoto(message.senderId, message.senderPhotoPath)
      }
      // If loading, photoUrl remains undefined and will be updated when loading completes
    }

    return {
      id: message.id,
      sender: isCurrentUser ? "user" : "support",
      text: message.content,
      timestamp: sentAt,
      senderName: displayName,
      senderId: message.senderId,
      senderPhoto: photoUrl,
    }
  }

  private loadUserPhoto(userId: number, photoPath: string): void {
    // Prevent duplicate loading
    if (this.userPhotosCache.has(userId)) {
      return
    }

    // Mark as loading to prevent duplicate requests
    this.userPhotosCache.set(userId, 'loading')

    // Load photo asynchronously
    this.authService.getProfilePhoto(userId).subscribe({
      next: (photoBlob: Blob) => {
        const objectUrl = URL.createObjectURL(photoBlob)
        this.userPhotosCache.set(userId, objectUrl)
        console.log(`Photo loaded for user ${userId}:`, objectUrl)
        
        // Update all messages from this user
        this.messages = this.messages.map(msg => {
          if (msg.senderId === userId) {
            return { ...msg, senderPhoto: objectUrl }
          }
          return msg
        })
        this.cdr.detectChanges()
      },
      error: (err) => {
        console.error(`Failed to load photo for user ${userId}:`, err)
        // Remove loading marker to allow retry
        this.userPhotosCache.delete(userId)
      },
    })
  }

  getPhotoUrl(photo: string | null | undefined): string | undefined {
    if (!photo) return undefined
    if (typeof photo === 'string') return photo
    return undefined
  }

  private scrollToBottom(): void {
    setTimeout(() => {
      if (this.messagesContainer) {
        const element = this.messagesContainer.nativeElement
        element.scrollTop = element.scrollHeight
      }
    }, 100)
  }

  formatTime(date: Date | string): string {
    const dateObj = date instanceof Date ? date : new Date(date)
    const now = new Date()
    const diffMs = now.getTime() - dateObj.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return "Just now"
    if (diffMins < 60) return `${diffMins} min ago`
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`

    return dateObj.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  getConversationDisplayName(conversation: Conversation): string {
    if (this.isChargeClientele) {
      return conversation.clientName || conversation.clientEmail
    }
    // For CLIENT, add "Customer Support : " prefix
    const agentName = conversation.agentName || "Support Agent"
    return `Customer Support : ${agentName}`
  }
}
