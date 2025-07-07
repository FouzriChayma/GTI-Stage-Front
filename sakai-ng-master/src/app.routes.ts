import { Routes } from '@angular/router';
import { AppLayout } from './app/layout/component/app.layout';
import { Dashboard } from './app/pages/dashboard/dashboard';
import { Documentation } from './app/pages/documentation/documentation';
import { Landing } from './app/pages/landing/landing';
import { Notfound } from './app/pages/notfound/notfound';
import { TransferRequestComponent } from './app/components/transfer-request-folder/transfer-request/transfer-request.component';
import { NewTransferRequestComponent } from './app/components/transfer-request-folder/new-transfer-request/new-transfer-request.component';
import { EditTransferRequestComponent } from './app/components/transfer-request-folder/edit-transfer-request/edit-transfer-request.component';
import { TransfertDetailsComponent } from './app/components/transfer-request-folder/transfert-details/transfert-details.component';

export const appRoutes: Routes = [
    {
        path: '',
        component: AppLayout,
        children: [
            { path: '', component: Dashboard },
            { path: 'uikit', loadChildren: () => import('./app/pages/uikit/uikit.routes') },
            { path: 'transfer-requests', component: TransferRequestComponent },
            { path: 'new-transfer-request', component: NewTransferRequestComponent },
            { path: 'edit-transfer-request/:id', component: EditTransferRequestComponent }, 
            { path: 'transfert-details/:id', component: TransfertDetailsComponent },           { path: 'documentation', component: Documentation },
            { path: 'pages', loadChildren: () => import('./app/pages/pages.routes') }
        ]
    },
    { path: 'landing', component: Landing },
    { path: 'notfound', component: Notfound },
    { path: 'auth', loadChildren: () => import('./app/pages/auth/auth.routes') },
    { path: '**', redirectTo: '/notfound' }
];