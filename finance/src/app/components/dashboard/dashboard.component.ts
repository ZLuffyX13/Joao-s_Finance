import { Component, OnInit, HostListener } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit {
  userInitials: string = 'AA';
  userName: string = 'User';
  isUserMenuOpen = false;

  constructor(private readonly router: Router) {}

  ngOnInit(): void {
    this.loadUserData();
  }

  toggleUserMenu(): void {
    this.isUserMenuOpen = !this.isUserMenuOpen;
  }

  closeUserMenu(): void {
    this.isUserMenuOpen = false;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.user-avatar') && !target.closest('.user-menu')) {
      this.closeUserMenu();
    }
  }

  navigateTo(route: string): void {
    this.router.navigate([route]);
    this.closeUserMenu();
  }

  logout(): void {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    this.router.navigate(['/']);
  }

  private loadUserData(): void {
    const userJson = localStorage.getItem('auth_user');
    if (userJson) {
      try {
        const user = JSON.parse(userJson);
        const firstName = user.firstName?.charAt(0)?.toUpperCase() || 'U';
        const lastName = user.lastName?.charAt(0)?.toUpperCase() || 'S';
        this.userInitials = firstName + lastName;
        this.userName = user.firstName || 'User';
      } catch {
        this.userInitials = 'US';
        this.userName = 'User';
      }
    }
  }
}
