import { Component, OnInit, signal, inject, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, RouterOutlet, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { BreakpointObserver } from '@angular/cdk/layout';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../../core/auth/auth.service';
import { ThemeService } from '../../core/theme/theme.service';
import { LANG_STORAGE_KEY } from '../../app.component';

/** Tailwind lg breakpoint (1024px) – sidebar is persistent above this. */
const SIDEBAR_BREAKPOINT = '(min-width: 1024px)';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, TranslateModule],
  templateUrl: './admin-layout.component.html',
  styleUrl: './admin-layout.component.scss',
})
export class AdminLayoutComponent implements OnInit {
  private router = inject(Router);
  private breakpoint = inject(BreakpointObserver);
  private destroyRef = inject(DestroyRef);
  sidebarOpen = true;
  userMenuOpen = signal(false);
  langDropdownOpen = signal(false);
  /** True when viewport is lg or larger (sidebar visible by default, no overlay). */
  isDesktop = signal(true);

  constructor(
    public auth: AuthService,
    public theme: ThemeService,
    public translate: TranslateService,
  ) {}

  setLanguage(lang: 'el' | 'en'): void {
    this.translate.use(lang);
    localStorage.setItem(LANG_STORAGE_KEY, lang);
  }

  get isAdmin(): boolean {
    return this.auth.currentUser()?.role === 'ADMIN';
  }

  get isManager(): boolean {
    return this.auth.currentUser()?.role === 'MANAGER';
  }

  get isBarber(): boolean {
    return this.auth.currentUser()?.role === 'BARBER';
  }

  /** ADMIN or MANAGER: can see bookings, shops, employee-hours. */
  get isAdminOrManager(): boolean {
    const role = this.auth.currentUser()?.role;
    return role === 'ADMIN' || role === 'MANAGER';
  }

  /** Manager has at least one shop assigned; admins always "have" shops for nav purposes. */
  get managerCanSeeShopsAndBookings(): boolean {
    if (this.auth.currentUser()?.role === 'ADMIN') return true;
    if (this.auth.currentUser()?.role !== 'MANAGER') return false;
    const ids = this.auth.currentUser()?.managedShopIds;
    return Array.isArray(ids) && ids.length > 0;
  }

  /** Manager with no shops assigned: show dedicated message instead of app content. */
  get managerHasNoShops(): boolean {
    return this.isManager && !this.managerCanSeeShopsAndBookings;
  }

  ngOnInit(): void {
    // Mobile-friendly: sidebar closed on small screens, open on lg+
    this.breakpoint
      .observe(SIDEBAR_BREAKPOINT)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((state) => {
        const desktop = state.matches;
        this.isDesktop.set(desktop);
        if (desktop) {
          this.sidebarOpen = true;  // show sidebar when resizing to desktop
        } else {
          this.sidebarOpen = false;
        }
      });
    // Set initial state (observe is async, so run once with current value)
    const initialDesktop = this.breakpoint.isMatched(SIDEBAR_BREAKPOINT);
    this.isDesktop.set(initialDesktop);
    if (!initialDesktop) {
      this.sidebarOpen = false;
    }

    // On mobile, close sidebar after navigation (e.g. after tapping a nav link)
    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => {
        if (!this.isDesktop()) {
          this.sidebarOpen = false;
        }
      });

    if (this.auth.isLoggedIn() && !this.auth.currentUser()) {
      this.auth.loadCurrentUser().subscribe((user) => {
        if (user?.role === 'BARBER' || user?.role === 'MANAGER') {
          const url = this.router.url;
          if (url === '/admin' || url === '/admin/' || url.endsWith('/admin/dashboard')) {
            const managerNoShops = user.role === 'MANAGER' && (!user.managedShopIds || user.managedShopIds.length === 0);
            if (managerNoShops) {
              this.router.navigate(['/admin']);
            } else {
              this.router.navigate(['/admin/bookings']);
            }
          }
        }
      });
    }
  }

  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
  }

  toggleUserMenu(): void {
    this.userMenuOpen.update((v) => !v);
  }

  closeUserMenu(): void {
    this.userMenuOpen.set(false);
  }

  openLangDropdown(): void {
    this.langDropdownOpen.update((v) => !v);
  }

  closeLangDropdown(): void {
    this.langDropdownOpen.set(false);
  }

  selectLanguage(lang: 'el' | 'en'): void {
    this.setLanguage(lang);
    this.closeLangDropdown();
  }
}
