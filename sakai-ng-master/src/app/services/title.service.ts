import { Injectable } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { Router, NavigationEnd, ActivatedRoute } from '@angular/router';
import { filter } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class TitleService {
  private readonly defaultTitle = 'E-Transfert';

  // Map routes to page titles
  private readonly routeTitles: { [key: string]: string } = {
    'home': 'E-Transfert - Home',
    'dashboard': 'E-Transfert - Dashboard',
    'InitialTransfer': 'E-Transfert - Initiate Transfer',
    'meeting': 'E-Transfert - Schedule Meeting',
    'discussion': 'E-Transfert - Customer Support',
    'profile': 'E-Transfert - Profile',
    'admin-profile': 'E-Transfert - Admin Profile',
    'transfer-requests': 'E-Transfert - Transfer Requests',
    'users': 'E-Transfert - Users',
    'appointments': 'E-Transfert - Appointments',
    'stats': 'E-Transfert - Statistics',
    'authentication': 'E-Transfert - Login',
    'landing': 'E-Transfert - Landing',
    'notfound': 'E-Transfert - Page Not Found'
  };

  constructor(
    private title: Title,
    private router: Router,
    private activatedRoute: ActivatedRoute
  ) {}

  initialize(): void {
    // Set initial title
    const initialUrl = this.router.url || '/home';
    const initialRoutePath = this.extractRoutePath(initialUrl);
    const initialTitle = this.routeTitles[initialRoutePath] || this.defaultTitle;
    this.setTitle(initialTitle);

    // Listen to route changes
    this.router.events
      .pipe(
        filter(event => event instanceof NavigationEnd)
      )
      .subscribe(() => {
        const url = this.router.url;
        const routePath = this.extractRoutePath(url);
        const pageTitle = this.routeTitles[routePath] || this.defaultTitle;
        this.setTitle(pageTitle);
      });
  }

  private extractRoutePath(url: string): string {
    // Remove leading slash and query parameters
    const path = url.split('?')[0].split('#')[0].replace(/^\//, '');
    
    // Handle nested routes - get the first segment
    const segments = path.split('/');
    return segments[0] || 'home';
  }

  setTitle(title: string): void {
    this.title.setTitle(title);
  }

  getTitle(): string {
    return this.title.getTitle();
  }
}

