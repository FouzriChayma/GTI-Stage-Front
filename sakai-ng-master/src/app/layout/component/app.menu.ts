import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { AppMenuitem } from './app.menuitem';
import { AuthService } from '../../services/auth.service';

@Component({
    selector: 'app-menu',
    standalone: true,
    imports: [CommonModule, AppMenuitem, RouterModule],
    template: `
    <ul class="layout-menu">
        <ng-container *ngFor="let item of model; let i = index">
            <li app-menuitem *ngIf="!item.separator" [item]="item" [index]="i" [root]="true"></li>
            <li *ngIf="item.separator" class="menu-separator"></li>
        </ng-container>
    </ul>
    `
})
export class AppMenu implements OnInit {
    model: MenuItem[] = [];

    constructor(
        private authService: AuthService,
        private router: Router
    ) {}

    ngOnInit() {
        const isAdmin = this.authService.isAdmin();
        const isChargeClientele = this.authService.isChargeClientele();
        const canViewStats = isAdmin || isChargeClientele;

        this.model = [
            {
                label: 'Navigation',
                items: [
                    { label: 'Accueil', icon: 'pi pi-home', routerLink: ['/home'] },
                    { label: 'Statistiques', icon: 'pi pi-chart-bar', routerLink: ['/stats'], visible: canViewStats },
                    { label: 'Utilisateurs', icon: 'pi pi-users', routerLink: ['/users'], visible: isAdmin },
                    { label: 'Transferts', icon: 'pi pi-arrows-h', routerLink: ['/transfer-requests'], visible: isAdmin },
                    { label: 'Rendez-vous', icon: 'pi pi-calendar', routerLink: ['/appointments'] },
                ]
            },
            
            {
                label: 'Paramètres',
                items: [
                    { 
                        label: 'Profil', 
                        icon: 'pi pi-user', 
                        routerLink: isAdmin ? ['/admin-profile'] : ['/profile'] 
                    },
                    { 
                        label: 'Déconnexion', 
                        icon: 'pi pi-sign-out',
                        command: () => this.handleLogout()
                    }
                ]
            }
        ];
    }

    private handleLogout(): void {
        this.authService.logout().subscribe({
            next: () => {
                this.router.navigate(['/home']);
            },
            error: (err) => {
                console.error('Logout error:', err);
                // Even if logout fails, clear local data and redirect
                this.router.navigate(['/home']);
            }
        });
    }
}
