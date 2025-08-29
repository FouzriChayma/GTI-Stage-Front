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
import { ScheduleMeetingComponent } from './app/components/schedule-meeting/schedule-meeting.component';
export const appRoutes: Routes = [
    {
        path: '',
        component: AppLayout,
        children: [
            { path: '', component: Dashboard },
            { path: 'uikit', loadChildren: () => import('./app/pages/uikit/uikit.routes') },
            { path: 'transfer-requests', component: TransferRequestComponent , canActivate: [AdminGuard] },
            { path: 'documentation', component: Documentation },
            { path: 'users', component: UserComponent , canActivate: [AdminGuard] }, // Added route for UserComponent
            { path: 'users/:id', component: UserComponent }, // Added route for user details with ID
            { path: 'appointments', component: AppointmentComponent },
            { path: 'pages', loadChildren: () => import('./app/pages/pages.routes') }
        ]
    },
    { path: 'landing', component: Landing },
    { path: 'authentication', component: LoginComponent },
    { path: 'home', component: HomeComponent },
    { path: 'InitialTransfer', component: TransferRequestFormComponent },
    { path: 'meeting', component: ScheduleMeetingComponent },
    { path: 'notfound', component: Notfound },
    { path: 'auth', loadChildren: () => import('./app/pages/auth/auth.routes') },
    { path: '**', redirectTo: '/notfound' }
];