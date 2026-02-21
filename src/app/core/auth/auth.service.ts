import { Injectable, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { catchError, map, of, Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';

const TOKEN_KEY = 'admin_token';

export interface CurrentUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  image?: string | null;
  /** Set when user has a barber profile (role BARBER). */
  barberId?: string | null;
  /** Set when role is MANAGER: shop IDs this user can manage. */
  managedShopIds?: string[];
}

export interface LoginResponse {
  accessToken: string;
  user: CurrentUser;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private tokenSignal = signal<string | null>(this.getStoredToken());
  currentUser = signal<CurrentUser | null>(null);

  isLoggedIn = computed(() => !!this.tokenSignal());

  constructor(
    private router: Router,
    private http: HttpClient,
  ) {}

  getToken(): string | null {
    return this.getStoredToken();
  }

  private getStoredToken(): string | null {
    if (typeof localStorage === 'undefined') return null;
    return localStorage.getItem(TOKEN_KEY);
  }

  loadCurrentUser(): Observable<CurrentUser | null> {
    if (!this.getToken()) return of(null);
    return this.http.get<CurrentUser>(`${environment.apiUrl}/users/me`).pipe(
      tap((user) => this.currentUser.set(user)),
      catchError(() => {
        this.currentUser.set(null);
        return of(null);
      }),
    );
  }

  getInitials(): string {
    const user = this.currentUser();
    if (!user) return '?';
    const first = (user.firstName?.trim() ?? '').charAt(0).toUpperCase();
    const last = (user.lastName?.trim() ?? '').charAt(0).toUpperCase();
    if (first && last) return first + last;
    if (user.email) return user.email.charAt(0).toUpperCase();
    return '?';
  }

  login(email: string, password: string) {
    return this.http
      .post<LoginResponse>(`${environment.apiUrl}/auth/login`, { email, password })
      .pipe(
        map((res) => {
          localStorage.setItem(TOKEN_KEY, res.accessToken);
          this.tokenSignal.set(res.accessToken);
          this.currentUser.set(res.user);
          return { success: true as const };
        }),
        catchError((err) => of({ success: false as const, message: err.error?.message ?? 'Σφάλμα σύνδεσης' })),
      );
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    this.tokenSignal.set(null);
    this.currentUser.set(null);
    this.router.navigate(['/login']);
  }

  /** Set password from invitation token; on success stores JWT and user (same as login). */
  setPassword(token: string, password: string) {
    return this.http
      .post<LoginResponse>(`${environment.apiUrl}/auth/set-password`, { token, password })
      .pipe(
        map((res) => {
          localStorage.setItem(TOKEN_KEY, res.accessToken);
          this.tokenSignal.set(res.accessToken);
          this.currentUser.set(res.user);
          return { success: true as const };
        }),
        catchError((err) =>
          of({ success: false as const, message: err.error?.message ?? 'Σφάλμα ορισμού κωδικού' }),
        ),
      );
  }
}
