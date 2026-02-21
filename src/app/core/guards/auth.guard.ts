import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { of, switchMap } from 'rxjs';
import { AuthService } from '../auth/auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isLoggedIn()) return true;
  return router.createUrlTree(['/login']);
};

export const publicGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.isLoggedIn()) return true;
  return router.createUrlTree(['/admin']);
};

/** Only ADMIN can access. BARBER and MANAGER are redirected to bookings. Waits for user if not loaded yet. */
export const adminOnlyGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.isLoggedIn()) return router.createUrlTree(['/login']);
  const user = auth.currentUser();
  if (user) {
    if (user.role === 'BARBER' || user.role === 'MANAGER') return router.createUrlTree(['/admin/bookings']);
    return true;
  }
  return auth.loadCurrentUser().pipe(
    switchMap((u) => {
      if (u?.role === 'BARBER' || u?.role === 'MANAGER') return of(router.createUrlTree(['/admin/bookings']));
      return of(true);
    }),
  );
};

/** ADMIN or MANAGER can access. BARBER is redirected to bookings. Used for shops, employee-hours, opening-hours. */
export const adminOrManagerGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.isLoggedIn()) return router.createUrlTree(['/login']);
  const user = auth.currentUser();
  if (user) {
    if (user.role === 'BARBER') return router.createUrlTree(['/admin/bookings']);
    if (user.role === 'ADMIN' || user.role === 'MANAGER') return true;
    return router.createUrlTree(['/admin/bookings']);
  }
  return auth.loadCurrentUser().pipe(
    switchMap((u) => {
      if (!u) return of(router.createUrlTree(['/login']));
      if (u.role === 'BARBER') return of(router.createUrlTree(['/admin/bookings']));
      if (u.role === 'ADMIN' || u.role === 'MANAGER') return of(true);
      return of(router.createUrlTree(['/admin/bookings']));
    }),
  );
};
