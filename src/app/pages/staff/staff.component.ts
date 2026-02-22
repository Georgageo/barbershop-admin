import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { UsersService, StaffMember } from '../../features/users/users.service';
import { UserEligibleForBarber } from '../../core/models/barber.model';
import { BarbersService } from '../../features/barbers/barbers.service';
import { ServicesService } from '../../features/services/services.service';
import { ShopsService, Shop } from '../../features/shops/shops.service';
import { ShopManagersService } from '../../features/shop-managers/shop-managers.service';
import { CreateBarberDto, UpdateBarberDto } from '../../core/models/barber.model';
import { Service } from '../../core/models/service.model';

export type StaffFilter = 'all' | 'barbers' | 'managers';

@Component({
  selector: 'app-staff',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, TranslateModule],
  templateUrl: './staff.component.html',
  styleUrl: './staff.component.scss',
})
export class StaffComponent implements OnInit {
  private usersService = inject(UsersService);
  private barbersService = inject(BarbersService);
  private servicesService = inject(ServicesService);
  private shopsService = inject(ShopsService);
  private shopManagersService = inject(ShopManagersService);

  list = signal<StaffMember[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);
  filter = signal<StaffFilter>('all');

  filteredList = computed(() => {
    const all = this.list();
    const f = this.filter();
    if (f === 'barbers') return all.filter((s) => s.role === 'BARBER');
    if (f === 'managers') return all.filter((s) => s.role === 'MANAGER');
    return all;
  });

  showCreateBarberModal = signal(false);
  showServicesModal = signal(false);
  showShopsModal = signal(false);
  saving = signal(false);
  eligibleUsers = signal<UserEligibleForBarber[]>([]);
  createBarberForm: CreateBarberDto = {
    userId: '',
    bio: '',
    title: '',
    isAvailable: true,
  };

  barberForServices = signal<StaffMember | null>(null);
  allServices = signal<Service[]>([]);
  assignedServiceIds = signal<Set<string>>(new Set());
  servicesModalLoading = signal(false);
  servicesModalError = signal<string | null>(null);

  managerForShops = signal<StaffMember | null>(null);
  allShops = signal<Shop[]>([]);
  shopsModalLoading = signal(false);
  shopsModalError = signal<string | null>(null);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.usersService.getStaff().subscribe({
      next: (data) => {
        this.list.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err.error?.message ?? 'Σφάλμα φόρτωσης ομάδας');
        this.loading.set(false);
      },
    });
  }

  setFilter(f: StaffFilter): void {
    this.filter.set(f);
  }

  displayName(m: StaffMember): string {
    return [m.firstName, m.lastName].filter(Boolean).join(' ') || '—';
  }

  roleLabel(role: string): string {
    return role === 'BARBER' ? 'Κουρέας' : 'Υπεύθυνος μαγαζιού';
  }

  managerShopsSummary(m: StaffMember): string {
    if (!m.managedShops?.length) return '';
    return m.managedShops.map((ms) => ms.shop.name).join(', ');
  }

  openCreateBarberModal(): void {
    this.createBarberForm = { userId: '', bio: '', title: '', isAvailable: true };
    this.error.set(null);
    this.usersService.getEligibleForBarber().subscribe({
      next: (users) => {
        this.eligibleUsers.set(users);
        this.showCreateBarberModal.set(true);
      },
      error: (err) => this.error.set(err.error?.message ?? 'Σφάλμα φόρτωσης χρηστών'),
    });
  }

  closeCreateBarberModal(): void {
    this.showCreateBarberModal.set(false);
  }

  saveCreateBarber(): void {
    if (!this.createBarberForm.userId) return;
    this.saving.set(true);
    this.error.set(null);
    this.barbersService.create(this.createBarberForm).subscribe({
      next: () => {
        this.closeCreateBarberModal();
        this.load();
        this.saving.set(false);
      },
      error: (err) => {
        this.error.set(err.error?.message ?? 'Σφάλμα δημιουργίας κουρέα');
        this.saving.set(false);
      },
    });
  }

  toggleAvailable(m: StaffMember): void {
    if (m.role !== 'BARBER' || !m.barberId) return;
    const dto: UpdateBarberDto = { isAvailable: !m.barber?.isAvailable };
    this.barbersService.update(m.barberId, dto).subscribe({
      next: () => this.load(),
      error: () => this.error.set('Σφάλμα ενημέρωσης'),
    });
  }

  openServicesModal(m: StaffMember): void {
    if (m.role !== 'BARBER' || !m.barberId) return;
    this.barberForServices.set(m);
    this.servicesModalError.set(null);
    this.servicesModalLoading.set(true);
    this.showServicesModal.set(true);
    this.servicesService.getList(true).subscribe({
      next: (services) => this.allServices.set(services),
      error: () => this.servicesModalError.set('Σφάλμα φόρτωσης υπηρεσιών'),
    });
    this.barbersService.getOne(m.barberId).subscribe({
      next: (b) => {
        const ids = new Set((b.barberServices ?? []).map((bs) => bs.serviceId));
        this.assignedServiceIds.set(ids);
        this.servicesModalLoading.set(false);
      },
      error: (err) => {
        this.servicesModalError.set(err.error?.message ?? 'Σφάλμα φόρτωσης');
        this.servicesModalLoading.set(false);
      },
    });
  }

  closeServicesModal(): void {
    this.showServicesModal.set(false);
    this.barberForServices.set(null);
  }

  isServiceAssigned(serviceId: string): boolean {
    return this.assignedServiceIds().has(serviceId);
  }

  toggleBarberService(serviceId: string): void {
    const m = this.barberForServices();
    if (!m?.barberId) return;
    const assigned = new Set(this.assignedServiceIds());
    if (assigned.has(serviceId)) {
      this.barbersService.removeService(m.barberId, serviceId).subscribe({
        next: () => {
          assigned.delete(serviceId);
          this.assignedServiceIds.set(new Set(assigned));
        },
        error: () => this.servicesModalError.set('Σφάλμα αφαίρεσης υπηρεσίας'),
      });
    } else {
      this.barbersService.addService(m.barberId, serviceId).subscribe({
        next: () => {
          assigned.add(serviceId);
          this.assignedServiceIds.set(new Set(assigned));
        },
        error: () => this.servicesModalError.set('Σφάλμα προσθήκης υπηρεσίας'),
      });
    }
  }

  openShopsModal(m: StaffMember): void {
    if (m.role !== 'MANAGER') return;
    this.managerForShops.set(m);
    this.shopsModalError.set(null);
    this.shopsModalLoading.set(true);
    this.showShopsModal.set(true);
    this.shopsService.getList().subscribe({
      next: (shops) => {
        this.allShops.set(shops);
        this.shopsModalLoading.set(false);
      },
      error: () => {
        this.shopsModalError.set('Σφάλμα φόρτωσης μαγαζιών');
        this.shopsModalLoading.set(false);
      },
    });
  }

  closeShopsModal(): void {
    this.showShopsModal.set(false);
    this.managerForShops.set(null);
  }

  isManagerAssignedToShop(shopId: string): boolean {
    const m = this.managerForShops();
    return m?.managedShops?.some((s) => s.shopId === shopId) ?? false;
  }

  toggleManagerShop(shopId: string): void {
    const m = this.managerForShops();
    if (!m) return;
    const assigned = this.isManagerAssignedToShop(shopId);
    const request = assigned
      ? this.shopManagersService.removeManagerFromShop(shopId, m.id)
      : this.shopManagersService.addManagerToShop(shopId, m.id);
    request.subscribe({
      next: () => {
        this.load();
        const updated = this.list().find((s) => s.id === m.id);
        if (updated) this.managerForShops.set(updated);
      },
      error: () => this.shopsModalError.set(assigned ? 'Σφάλμα αφαίρεσης' : 'Σφάλμα ανάθεσης'),
    });
  }
}
