import { Routes } from '@angular/router';
import { authGuard, publicGuard, adminOnlyGuard, adminOrManagerGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'admin', pathMatch: 'full' },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.component').then(m => m.LoginComponent),
    canActivate: [publicGuard],
  },
  {
    path: 'set-password',
    loadComponent: () => import('./pages/set-password/set-password.component').then(m => m.SetPasswordComponent),
    canActivate: [publicGuard],
  },
  {
    path: 'admin',
    loadComponent: () => import('./layout/admin-layout/admin-layout.component').then(m => m.AdminLayoutComponent),
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent),
        canActivate: [adminOnlyGuard],
      },
      {
        path: 'bookings',
        loadComponent: () => import('./pages/bookings/bookings.component').then(m => m.BookingsComponent),
      },
      {
        path: 'customers',
        loadComponent: () => import('./pages/customers/customers.component').then(m => m.CustomersComponent),
        data: { title: 'Πελάτες', subtitle: 'Διαχείριση πελατών.' },
        canActivate: [adminOnlyGuard],
      },
      {
        path: 'services',
        loadComponent: () => import('./pages/services/services.component').then(m => m.ServicesComponent),
        canActivate: [adminOnlyGuard],
      },
      {
        path: 'staff',
        loadComponent: () => import('./pages/staff/staff.component').then(m => m.StaffComponent),
        canActivate: [adminOnlyGuard],
      },
      {
        path: 'barbers',
        redirectTo: 'staff',
        pathMatch: 'full',
      },
      {
        path: 'invitations',
        loadComponent: () => import('./pages/invitations/invitations.component').then(m => m.InvitationsComponent),
        canActivate: [adminOnlyGuard],
      },
      {
        path: 'shops',
        loadComponent: () => import('./pages/shops/shops.component').then(m => m.ShopsComponent),
        canActivate: [adminOrManagerGuard],
      },
      {
        path: 'shops/:shopId/hours',
        loadComponent: () => import('./pages/opening-hours/opening-hours.component').then(m => m.OpeningHoursComponent),
        canActivate: [adminOrManagerGuard],
      },
      {
        path: 'employee-hours',
        loadComponent: () => import('./pages/employee-hours/employee-hours.component').then(m => m.EmployeeHoursComponent),
        canActivate: [adminOrManagerGuard],
      },
      {
        path: 'my-schedule',
        loadComponent: () => import('./pages/my-schedule/my-schedule.component').then(m => m.MyScheduleComponent),
      },
      {
        path: 'profile',
        loadComponent: () => import('./pages/profile/profile.component').then(m => m.ProfileComponent),
      },
    ],
  },
  { path: '**', redirectTo: 'admin' },
];
