# E-Transfert - Frontend Application

A modern, responsive banking application frontend built with Angular 19, featuring real-time communication, appointment scheduling, transfer management, customer support chat, and push notifications.

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Technology Stack](#technology-stack)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Development](#development)
- [Project Structure](#project-structure)
- [Key Components](#key-components)
- [Services](#services)
- [Routing](#routing)
- [Authentication & Authorization](#authentication--authorization)
- [Real-time Features](#real-time-features)
- [Push Notifications](#push-notifications)
- [Styling](#styling)
- [Building for Production](#building-for-production)
- [Environment Configuration](#environment-configuration)
- [Troubleshooting](#troubleshooting)

## 🎯 Overview

E-Transfert is a comprehensive banking platform frontend that provides users with a seamless experience for managing transfers, scheduling appointments, communicating with customer support, and receiving real-time notifications. The application supports multiple user roles (CLIENT, CHARGE_CLIENTELE, ADMINISTRATOR) with role-based access control.

## ✨ Features

### 🔐 Authentication & User Management
- User registration with profile photo upload
- JWT-based authentication with refresh tokens
- Role-based access control (RBAC)
- Profile management with photo upload/delete
- **Password change with current password verification**
- **Active session management**
- Dynamic page titles based on current route

### 💸 Transfer Management
- **For CLIENT & ADMIN:**
  - Initiate transfer requests
  - Upload supporting documents
  - Track transfer status
  - View transfer history

- **For ADMIN:**
  - Manage all transfer requests
  - Approve/reject transfers
  - View comprehensive transfer statistics

- **For CHARGE_CLIENTELE:**
  - Validate/reject transfer requests
  - Request additional information
  - View all client transfers

### 📅 Appointment Scheduling
- Interactive calendar interface
- Time slot selection (9 AM - 5 PM)
- Appointment booking with duration options
- Meeting type selection (Video Call, Phone Call, In Person)
- Appointment history and management
- **Hidden for CHARGE_CLIENTELE on home page** (management only)

### 💬 Real-time Customer Support
- WebSocket-based chat system
- Real-time messaging between clients and support agents
- Conversation management
- Message read status
- Agent assignment for support tickets
- Profile picture display in chat
- "Customer Support : " prefix for agent names

### 🔔 Push Notifications System
- **Real-time push notifications via WebSocket**
- **Notification bell with unread count badge**
- **Role-based notifications:**
  - **For Clients:** Transfer validation/rejection, appointment reminders, customer support messages, missing document alerts, profile update success
  - **For Charge Clientèle:** New pending transfer requests, new scheduled appointments, new chat messages, urgent transfer alerts
  - **For Administrators:** Daily activity reports
- **Notification management:** Mark as read, dismiss, clear all
- **Persistent storage:** Notifications saved in localStorage
- **Toast notifications:** Automatic display of new notifications

### 📊 Statistics & Dashboard
- **For ADMIN:**
  - Comprehensive statistics dashboard (`/stats`)
  - User management dashboard
  - Transfer request statistics with charts
  - Appointment statistics
  - User statistics by role
  - Recent transfers and appointments
  - Monthly trends and analytics

- **For CHARGE_CLIENTELE:**
  - Client statistics
  - Appointment overview
  - Transfer validation dashboard
  - Statistics access via `/stats`

### 🎨 Modern UI/UX
- Responsive design (mobile, tablet, desktop)
- Modern gradient designs with floating animations
- PrimeNG component library
- Tailwind CSS for styling
- Smooth animations and transitions
- Purple gradient theme with decorative bubbles
- Consistent design across pages (discussion, meeting, transfer)

### 🔒 Security Features
- **Change Password:** Secure password change with current password verification
- **Active Sessions:** View and manage active login sessions
- **Session Management:** Revoke individual or all other sessions
- **Device Detection:** Automatic detection of device type (mobile, tablet, desktop)
- **Browser Detection:** Identifies browser type for session display

### 👤 Profile Management
- **Personal Information:** Edit first name, last name, email, phone number
- **Profile Photo:** Upload, preview, and delete profile picture
- **Password Management:** Change password with security verification
- **Session Management:** View and manage active sessions
- **Transfer History:** View personal transfer requests (CLIENT)
- **Appointment History:** View personal appointments (CLIENT)
- **Account Balance:** Removed for CLIENT and CHARGE_CLIENTELE (not applicable)

## 🛠 Technology Stack

- **Framework:** Angular 19.0
- **Language:** TypeScript 5.6
- **UI Library:** PrimeNG 19.1
- **Icons:** PrimeIcons 7.0
- **Styling:** 
  - Tailwind CSS 3.4
  - SCSS
- **Real-time Communication:**
  - STOMP.js (@stomp/stompjs 7.2)
  - SockJS (sockjs-client 1.6)
- **HTTP Client:** Angular HttpClient
- **Charts:** Chart.js 4.4
- **PDF Generation:** jsPDF 3.0
- **Build Tool:** Angular CLI 19.0

## 📦 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher)
- **npm** (v9 or higher) or **yarn**
- **Angular CLI** (v19.0.6 or higher)
  ```bash
  npm install -g @angular/cli
  ```

## 🚀 Installation

1. **Clone the repository** (if not already done):
   ```bash
   git clone <repository-url>
   cd sakai-ng-master/sakai-ng-master
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment:**
   - Update `src/app/environments/environment.ts` with your backend API URL
   ```typescript
   export const environment = {
     production: false,
     apiUrl: 'http://localhost:8083/api',
     wsUrl: 'http://localhost:8083/ws'
   };
   ```

4. **Start the development server:**
   ```bash
   npm start
   # or
   ng serve
   ```

5. **Open your browser:**
   Navigate to `http://localhost:4200/`

## 💻 Development

### Available Scripts

```bash
# Start development server
npm start
# or
ng serve

# Build for production
npm run build
# or
ng build

# Build with watch mode
npm run watch

# Run unit tests
npm test
# or
ng test

# Format code
npm run format
```

### Development Server

The development server runs on `http://localhost:4200/` by default. The application will automatically reload when you modify source files.

### Code Scaffolding

Generate new components, services, guards, etc.:

```bash
# Generate a component
ng generate component component-name

# Generate a service
ng generate service service-name

# Generate a guard
ng generate guard guard-name

# See all available schematics
ng generate --help
```

## 📁 Project Structure

```
src/
├── app/
│   ├── components/          # Feature components
│   │   ├── admin-profile/   # Admin profile management
│   │   ├── appointment/     # Appointment list view
│   │   ├── discussion/      # Real-time chat interface
│   │   ├── home/            # Home page & navigation
│   │   ├── login/           # Authentication
│   │   ├── notifications/   # Notification bell component
│   │   ├── profile/         # User profile management
│   │   ├── schedule-meeting/ # Appointment scheduling
│   │   ├── stats/           # Statistics dashboard
│   │   ├── transfer-request/ # Transfer request list
│   │   └── transfer-request-form/ # Transfer creation form
│   ├── guards/              # Route guards
│   │   ├── admin.guard.ts
│   │   ├── charge-clientele.guard.ts
│   │   ├── client-or-admin.guard.ts
│   │   └── client.guard.ts
│   ├── interceptors/        # HTTP interceptors
│   │   └── auth.interceptor.ts
│   ├── layout/              # Layout components
│   │   ├── component/       # Topbar, sidebar, footer
│   │   └── service/         # Layout service
│   ├── models/              # TypeScript models/interfaces
│   │   ├── appointment.ts
│   │   ├── beneficiary.ts
│   │   ├── document.ts
│   │   ├── transfer-request.ts
│   │   ├── User.ts
│   │   └── enums/           # Enum definitions
│   ├── pages/               # Page components
│   │   ├── dashboard/       # Admin dashboard
│   │   ├── landing/         # Landing page
│   │   └── ...
│   ├── services/            # Angular services
│   │   ├── appointment.service.ts
│   │   ├── auth.service.ts
│   │   ├── message.service.ts
│   │   ├── notification.service.ts  # Push notifications
│   │   ├── stats.service.ts
│   │   ├── title.service.ts  # Dynamic page titles
│   │   ├── transfer-request.service.ts
│   │   └── websocket.service.ts
│   ├── app.component.ts     # Root component
│   ├── app.config.ts        # App configuration
│   └── app.routes.ts         # Route definitions
├── assets/                  # Static assets
├── environments/             # Environment configurations
├── index.html               # Main HTML file
├── main.ts                  # Application entry point
├── polyfills.ts             # Browser polyfills
└── styles.scss              # Global styles
```

## 🧩 Key Components

### DiscussionComponent (`/discussion`)
Real-time chat interface for customer support:
- WebSocket connection management
- Message sending/receiving
- Conversation list (for agents)
- Auto-assignment of agents
- Message read status
- Profile picture display
- "Customer Support : " prefix for agent names

### ScheduleMeetingComponent (`/meeting`)
Appointment scheduling interface:
- Interactive calendar view
- Time slot selection
- Meeting details form
- Availability checking
- Modern purple gradient design with floating animations

### TransferRequestFormComponent (`/InitialTransfer`)
Transfer request creation:
- Multi-step form
- Document upload
- Beneficiary management
- Account type selection
- Modern UI with gradient design

### ProfileComponent (`/profile`)
User profile management:
- Profile photo upload/delete
- Personal information editing
- Transfer/appointment history
- **Security tab:**
  - Change password with current password verification
  - Active sessions management
- Role-based content display

### AdminProfileComponent (`/admin-profile`)
Admin profile management:
- Personal information editing
- Profile photo management
- Password change
- Navigation to management pages (users, transfers, appointments, stats)

### NotificationBellComponent
Push notification system:
- Notification bell icon with unread count badge
- Overlay panel with notification list
- Mark as read/unread
- Dismiss notifications
- Clear all notifications
- Time ago display
- Severity-based styling

### StatsComponent (`/stats`)
Comprehensive statistics dashboard:
- Transfer statistics with charts
- Appointment statistics
- User statistics by role
- Recent transfers and appointments
- Monthly trends
- Status/type distribution charts

## 🔌 Services

### AuthService
Handles authentication and authorization:
- Login/logout
- Token management
- User information
- Role checking
- Profile photo management
- **Password change with verification**
- Session management

### NotificationService
Push notification management:
- WebSocket connection for notifications
- User-specific and role-based subscriptions
- Notification storage in localStorage
- Toast notification display
- Unread count tracking
- Notification management (mark as read, dismiss, clear)

### TitleService
Dynamic page title management:
- Updates browser tab title based on current route
- Format: "E-Transfert - {Page Name}"
- Examples: "E-Transfert - Home Page", "E-Transfert - Discussion"

### WebSocketService
Manages WebSocket connections:
- STOMP connection handling
- Message subscriptions
- Connection status monitoring
- Real-time message broadcasting

### MessageService
REST API communication for messages:
- Create/get conversations
- Send messages
- Mark messages as read
- Get conversation history

### TransferRequestService
Transfer request operations:
- Create transfer requests
- Get transfer history
- Upload documents
- Update transfer status

### AppointmentService
Appointment management:
- Create appointments
- Search appointments
- Get availability
- Update appointment status

### StatsService
Statistics and analytics:
- Get transfer statistics
- Get user statistics
- Get appointment statistics
- Get recent transfers/appointments
- Chart data generation

## 🛣 Routing

### Public Routes
- `/home` - Home page
- `/landing` - Landing page
- `/authentication` - Login page
- `/auth/*` - Authentication routes

### Protected Routes

#### CLIENT Routes
- `/InitialTransfer` - Create transfer request
- `/meeting` - Schedule appointment
- `/discussion` - Customer support chat
- `/profile` - User profile

#### CHARGE_CLIENTELE Routes
- `/discussion` - Customer support dashboard
- `/profile` - Profile management
- `/stats` - Statistics dashboard
- **Note:** Appointment Scheduling and Transfer Initiation are hidden on home page

#### ADMINISTRATOR Routes
- `/stats` - Comprehensive statistics dashboard (redirected from `/dashboard`)
- `/users` - User management
- `/transfer-requests` - Transfer management
- `/admin-profile` - Admin profile
- `/appointments` - Appointment management

## 🔒 Authentication & Authorization

### JWT Authentication
- Access tokens stored in localStorage
- Refresh token mechanism
- Automatic token refresh
- Token expiration handling

### Route Guards
- `AdminGuard` - Admin-only routes
- `ClientGuard` - Client-only routes
- `ChargeClienteleGuard` - Support agent routes
- `ClientOrAdminGuard` - Client or Admin routes

### HTTP Interceptor
- Automatically adds JWT token to requests
- Handles 401 errors (unauthorized)
- Redirects to login on authentication failure

## ⚡ Real-time Features

### WebSocket Integration
The application uses STOMP over WebSocket for real-time communication:

```typescript
// Connection
webSocketService.connect()

// Subscribe to messages
webSocketService.message$.subscribe(message => {
  // Handle new message
})

// Send message
webSocketService.sendMessage(conversationId, content)
```

### Supported Real-time Features
- Live chat messages
- Conversation updates
- Agent assignment notifications
- Connection status indicators
- **Push notifications for various events**

## 🔔 Push Notifications

### Notification Types

#### For Clients (CLIENT)
- **Transfer Validated:** Notification when transfer is approved
- **Transfer Rejected:** Notification when transfer is rejected
- **Appointment Reminder:** 24-hour reminder before appointment
- **Support Message:** New message from customer support
- **Document Missing:** Alert when document is required
- **Profile Updated:** Confirmation when profile is updated

#### For Charge Clientèle (CHARGE_CLIENTELE)
- **New Transfer Request:** Notification of new pending transfer
- **New Appointment:** Notification of new scheduled appointment
- **New Chat Message:** Notification of new client message
- **Urgent Transfer:** Alert for urgent transfer requests

#### For Administrators (ADMINISTRATOR)
- **Daily Report:** Daily activity report notification

### Notification Features
- **Real-time delivery** via WebSocket
- **Unread count badge** on notification bell
- **Persistent storage** in localStorage
- **Toast notifications** for immediate visibility
- **Mark as read/unread** functionality
- **Dismiss individual** notifications
- **Clear all** notifications
- **Time ago** display (e.g., "2 minutes ago")
- **Severity-based styling** (success, info, warn, error)

### Notification Service Usage

```typescript
// Connect to notification service
notificationService.connect()

// Subscribe to notifications
notificationService.notifications$.subscribe(notifications => {
  // Handle notifications
})

// Get unread count
notificationService.unreadCount$.subscribe(count => {
  // Update badge
})

// Mark as read
notificationService.markAsRead(notificationId)

// Dismiss notification
notificationService.clearNotification(notificationId)
```

## 🎨 Styling

### Tailwind CSS
Utility-first CSS framework for rapid UI development.

### PrimeNG Themes
Pre-built component themes with customization options.

### SCSS
Component-specific styles in `.scss` files.

### Design System
- **Colors:** Purple gradient theme (#667eea to #764ba2)
- **Typography:** Modern sans-serif fonts
- **Spacing:** Consistent spacing scale
- **Animations:** Smooth transitions and floating effects
- **Gradients:** Purple gradients with decorative bubbles
- **Consistency:** Unified design across discussion, meeting, and transfer pages

## 🏗 Building for Production

1. **Build the application:**
   ```bash
   ng build --configuration production
   ```

2. **Output:**
   The build artifacts will be stored in the `dist/` directory.

3. **Deploy:**
   Deploy the contents of the `dist/` folder to your web server.

### Production Optimizations
- Code minification
- Tree shaking
- AOT (Ahead-of-Time) compilation
- Bundle optimization

## ⚙️ Environment Configuration

### Development Environment
`src/app/environments/environment.ts`:
```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:8083/api',
  wsUrl: 'http://localhost:8083/ws'
};
```

### Production Environment
`src/app/environments/environment.prod.ts`:
```typescript
export const environment = {
  production: true,
  apiUrl: 'https://your-api-domain.com/api',
  wsUrl: 'wss://your-api-domain.com/ws'
};
```

## 🐛 Troubleshooting

### Common Issues

#### 1. `global is not defined` Error
**Solution:** The polyfill is already included in `src/polyfills.ts` and `src/index.html`. If the error persists, ensure the polyfill loads before other scripts.

#### 2. WebSocket Connection Failed
**Solution:** 
- Check backend is running on port 8083
- Verify CORS configuration
- Check WebSocket endpoint URL in environment config

#### 3. Authentication Token Issues
**Solution:**
- Clear localStorage and login again
- Check token expiration
- Verify JWT secret matches backend

#### 4. Build Errors
**Solution:**
- Delete `node_modules` and `package-lock.json`
- Run `npm install` again
- Clear Angular cache: `ng cache clean`

#### 5. Styling Issues
**Solution:**
- Ensure Tailwind CSS is properly configured
- Check `tailwind.config.js`
- Verify PrimeNG theme is imported

#### 6. Notifications Not Showing
**Solution:**
- Verify WebSocket connection is established
- Check notification service is connected
- Ensure user is authenticated
- Check browser console for errors

#### 7. Password Change Fails
**Solution:**
- Verify current password is correct
- Ensure new password meets requirements (min 6 characters)
- Check backend endpoint is accessible
- Verify JWT token is valid

## 📝 Additional Resources

- [Angular Documentation](https://angular.dev)
- [PrimeNG Documentation](https://primeng.org)
- [Tailwind CSS Documentation](https://tailwindcss.com)
- [STOMP.js Documentation](https://stomp-js.github.io/stompjs/)

## 👥 User Roles

### CLIENT
- Initiate transfer requests
- Schedule appointments
- Chat with support
- View personal profile
- Receive notifications for transfers, appointments, and messages
- **Cannot see:** Account Balance card (not applicable)

### CHARGE_CLIENTELE
- Manage customer support chats
- View client statistics
- Validate transfer requests
- Manage appointments
- Receive notifications for new transfers, appointments, and messages
- **Cannot see:** Appointment Scheduling and Transfer Initiation on home page
- **Cannot see:** Account Balance card (not applicable)

### ADMINISTRATOR
- Full system access
- User management
- Transfer request management
- System statistics
- Dashboard access (`/stats`)
- Receive daily activity reports
- **Redirected to:** `/stats` instead of `/dashboard` after login

## 🔄 API Integration

The frontend communicates with the backend REST API:

- **Base URL:** Configured in `environment.ts`
- **Authentication:** JWT tokens in Authorization header
- **WebSocket:** STOMP over WebSocket for real-time features

### API Endpoints Used
- `/api/auth/*` - Authentication
- `/api/auth/users/{id}/change-password` - Password change
- `/api/transfer-requests/*` - Transfer operations
- `/api/appointments/*` - Appointment operations
- `/api/messages/*` - Chat operations
- `/api/stats/*` - Statistics
- `/api/users/*` - User management

## 📄 License

This project is part of the E-Transfert banking system.

---

**Version:** 19.0.1  
**Last Updated:** January 2025
