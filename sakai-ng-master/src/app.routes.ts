import { Routes } from '@angular/router';
import { AppLayout } from './app/layout/component/app.layout';
import { Dashboard } from './app/pages/dashboard/dashboard';
import { Documentation } from './app/pages/documentation/documentation';
import { Landing } from './app/pages/landing/landing';
import { Notfound } from './app/pages/notfound/notfound';
import { TransferRequestComponent } from './app/components/transfer-request/transfer-request.component';
import { UserComponent } from './app/components/user/user/user.component';
import { LoginComponent } from './app/components/login/login.component';
import { AppointmentComponent } from './app/components/appointment/appointment.component';
import { HomeComponent } from './app/components/home/home.component';
import { TransferRequestFormComponent } from './app/components/transfer-request-form/transfer-request-form.component';
import { AdminGuard } from './app/guards/admin.guard';
import { ClientGuard } from './app/guards/client.guard';
import { ChargeClienteleGuard } from './app/guards/charge-clientele.guard';
import { ClientOrAdminGuard } from './app/guards/client-or-admin.guard';
import { ScheduleMeetingComponent } from './app/components/schedule-meeting/schedule-meeting.component';
import { ProfileComponent } from './app/components/profile/profile.component';
import { AdminProfileComponent } from './app/components/admin-profile/admin-profile.component';
import { DiscussionComponent } from './app/components/discussion/discussion.component';
import { StatsComponent } from './app/components/stats/stats.component';
export const appRoutes: Routes = [
    { path: '', redirectTo: '/home', pathMatch: 'full' }, // Default route to home page
    {
        path: '',
        component: AppLayout,
        children: [
            { path: 'dashboard', component: Dashboard, canActivate: [AdminGuard] }, // Only ADMINISTRATOR can access dashboard
            { path: 'uikit', loadChildren: () => import('./app/pages/uikit/uikit.routes') },
            { path: 'transfer-requests', component: TransferRequestComponent , canActivate: [AdminGuard] }, // Admin only - manages all transfer requests
            { path: 'documentation', component: Documentation },
            { path: 'users', component: UserComponent , canActivate: [AdminGuard] }, // Admin only - user management
            { path: 'users/:id', component: UserComponent, canActivate: [AdminGuard] }, // Admin only - user details
            { path: 'appointments', component: AppointmentComponent }, // All authenticated users
            { path: 'pages', loadChildren: () => import('./app/pages/pages.routes') },
            { path: 'stats', component: StatsComponent }, // CHARGE_CLIENTELE and ADMIN (handled in component with role check)
            { path: 'admin-profile', component: AdminProfileComponent }, // Back-office profile for ADMIN and CHARGE_CLIENTELE

        ]
    },
    { path: 'landing', component: Landing },
    { path: 'authentication', component: LoginComponent },
    { path: 'home', component: HomeComponent },
    { path: 'InitialTransfer', component: TransferRequestFormComponent, canActivate: [ClientOrAdminGuard] }, // CLIENT and ADMIN only - can create transfer requests
    { path: 'meeting', component: ScheduleMeetingComponent },
    { path: "profile", component: ProfileComponent },
    { path: "discussion", component: DiscussionComponent }, // CLIENT and CHARGE_CLIENTELE can access (handled in component)
    { path: 'notfound', component: Notfound },
    { path: 'auth', loadChildren: () => import('./app/pages/auth/auth.routes') },
    { path: '**', redirectTo: '/notfound' }
];