import { Component, OnInit, OnDestroy, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subscription, forkJoin } from 'rxjs';
import { UsersService, StaffMember } from '../../features/users/users.service';
import { UserEligibleForBarber } from '../../core/models/barber.model';
import { BarbersService } from '../../features/barbers/barbers.service';
import { ServicesService } from '../../features/services/services.service';
import { ShopsService, Shop } from '../../features/shops/shops.service';
import { ShopManagersService } from '../../features/shop-managers/shop-managers.service';
import { CreateBarberDto, UpdateBarberDto } from '../../core/models/barber.model';
import { Service } from '../../core/models/service.model';
import { TableColumn } from '../../components/table/table.models';
import { TableComponent } from '../../components/table/table.component';
import { DataTableCellDirective } from '../../components/table/table-cell.directive';
import { CardListComponent } from '../../components/card-list/card-list.component';
import { CardItemDirective } from '../../components/card-list/card-item.directive';
import { ModalComponent } from '../../components/modal/modal.component';
import { ModalActionsDirective } from '../../components/modal/modal-actions.directive';
import { ModalFieldConfig } from '../../components/modal/modal.models';

export type StaffFilter = 'all' | 'barbers' | 'managers';

@Component({
  selector: 'app-staff',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    TranslateModule,
    TableComponent,
    DataTableCellDirective,
    CardListComponent,
    CardItemDirective,
    ModalComponent,
    ModalActionsDirective,
  ],
  templateUrl: './staff.component.html',
  styleUrl: './staff.component.scss',
})
export class StaffComponent implements OnInit, OnDestroy {
  private usersService = inject(UsersService);
  private barbersService = inject(BarbersService);
  private servicesService = inject(ServicesService);
  private shopsService = inject(ShopsService);
  private shopManagersService = inject(ShopManagersService);
  private translate = inject(TranslateService);
  private langSub?: Subscription;

  columns: TableColumn[] = [];

  private updateTranslations(): void {
    const t = (key: string) => this.translate.instant(key);
    this.columns = [
      { field: 'name', header: t('common.name'), sortable: true },
      { field: 'email', header: t('common.email'), sortable: true },
      { field: 'role', header: t('invitations.role') },
      { field: 'details', header: t('staff.details') },
      { field: 'actions', header: t('common.actions') },
    ];
  }

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
  showEditBarberModal = signal(false);
  barberForEdit = signal<StaffMember | null>(null);
  showServicesModal = signal(false);
  showShopsModal = signal(false);
  saving = signal(false);
  eligibleUsers = signal<UserEligibleForBarber[]>([]);

  /** Form model for Create Barber modal (keys match createBarberFormFields). */
  createBarberForm: Record<string, unknown> = {
    userId: '',
    title: '',
    bio: '',
    isAvailable: true,
  };

  /** Form model for Edit Barber modal (keys match editBarberFormFields). */
  editBarberForm: Record<string, unknown> = {
    title: '',
    bio: '',
    isAvailable: true,
  };

  get createBarberFormFields(): ModalFieldConfig[] {
    const t = (key: string) => this.translate.instant(key);
    return [
      {
        key: 'userId',
        label: t('staff.userLabel'),
        type: 'select',
        required: true,
        placeholder: t('staff.selectUser'),
        hint: t('staff.userHint'),
        options: this.eligibleUsers().map((u) => ({
          value: u.id,
          label: `${u.lastName} ${u.firstName} (${u.email})`,
        })),
      },
      {
        key: 'title',
        label: t('staff.barberTitle'),
        type: 'text',
        placeholder: t('staff.barberTitlePlaceholder'),
        maxLength: 100,
      },
      {
        key: 'bio',
        label: t('staff.barberBio'),
        type: 'textarea',
        placeholder: t('common.optional'),
        maxLength: 500,
        rows: 3,
      },
      {
        key: 'isAvailable',
        label: '',
        type: 'checkbox',
        placeholder: t('staff.availableForBookings'),
      },
    ];
  }

  get editBarberFormFields(): ModalFieldConfig[] {
    const t = (key: string) => this.translate.instant(key);
    return [
      {
        key: 'title',
        label: t('staff.barberTitle'),
        type: 'text',
        placeholder: t('staff.barberTitlePlaceholder'),
        maxLength: 100,
      },
      {
        key: 'bio',
        label: t('staff.barberBio'),
        type: 'textarea',
        placeholder: t('common.optional'),
        maxLength: 500,
        rows: 3,
      },
      {
        key: 'isAvailable',
        label: '',
        type: 'checkbox',
        placeholder: t('staff.availableForBookings'),
      },
    ];
  }

  barberForServices = signal<StaffMember | null>(null);
  allServices = signal<Service[]>([]);
  assignedServiceIds = signal<Set<string>>(new Set());
  initialServiceIds = signal<Set<string>>(new Set());
  servicesModalLoading = signal(false);
  servicesModalSaving = signal(false);
  servicesModalError = signal<string | null>(null);

  managerForShops = signal<StaffMember | null>(null);
  allShops = signal<Shop[]>([]);
  selectedShopIds = signal<Set<string>>(new Set());
  initialShopIds = signal<Set<string>>(new Set());
  shopsModalLoading = signal(false);
  shopsModalSaving = signal(false);
  shopsModalError = signal<string | null>(null);

  ngOnInit(): void {
    this.updateTranslations();
    this.langSub = this.translate.onLangChange.subscribe(() => this.updateTranslations());
    this.load();
  }

  ngOnDestroy(): void {
    this.langSub?.unsubscribe();
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
    return role === 'BARBER'
      ? this.translate.instant('invitations.roleBarber')
      : this.translate.instant('invitations.roleManager');
  }

  managerShopsSummary(m: StaffMember): string {
    if (!m.managedShops?.length) return '';
    return m.managedShops.map((ms) => ms.shop.name).join(', ');
  }

  openCreateBarberModal(): void {
    this.createBarberForm = { userId: '', title: '', bio: '', isAvailable: true };
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

  openEditBarberModal(m: StaffMember): void {
    if (m.role !== 'BARBER' || !m.barberId) return;
    this.barberForEdit.set(m);
    this.error.set(null);
    this.barbersService.getOne(m.barberId).subscribe({
      next: (b) => {
        this.editBarberForm = {
          title: b.title ?? '',
          bio: b.bio ?? '',
          isAvailable: b.isAvailable ?? true,
        };
        this.showEditBarberModal.set(true);
      },
      error: (err) => this.error.set(err.error?.message ?? this.translate.instant('staff.errorLoadBarber')),
    });
  }

  closeEditBarberModal(): void {
    this.showEditBarberModal.set(false);
    this.barberForEdit.set(null);
  }

  saveEditBarber(): void {
    const m = this.barberForEdit();
    if (!m?.barberId) return;
    this.saving.set(true);
    this.error.set(null);
    const payload: UpdateBarberDto = {
      title: (this.editBarberForm['title'] as string)?.trim() || undefined,
      bio: (this.editBarberForm['bio'] as string)?.trim() || undefined,
      isAvailable: this.editBarberForm['isAvailable'] as boolean,
    };
    this.barbersService.update(m.barberId, payload).subscribe({
      next: () => {
        this.closeEditBarberModal();
        this.load();
        this.saving.set(false);
      },
      error: (err) => {
        this.error.set(err.error?.message ?? this.translate.instant('staff.errorUpdateBarber'));
        this.saving.set(false);
      },
    });
  }

  saveCreateBarber(): void {
    const userId = String(this.createBarberForm['userId'] ?? '').trim();
    if (!userId) return;
    this.saving.set(true);
    this.error.set(null);
    const payload: CreateBarberDto = {
      userId,
      title: (this.createBarberForm['title'] as string)?.trim() || undefined,
      bio: (this.createBarberForm['bio'] as string)?.trim() || undefined,
      isAvailable: this.createBarberForm['isAvailable'] as boolean,
    };
    this.barbersService.create(payload).subscribe({
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
        this.initialServiceIds.set(new Set(ids));
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

  /** Only toggles local selection; API is called on Save. */
  toggleBarberService(serviceId: string): void {
    const assigned = new Set(this.assignedServiceIds());
    if (assigned.has(serviceId)) {
      assigned.delete(serviceId);
    } else {
      assigned.add(serviceId);
    }
    this.assignedServiceIds.set(assigned);
  }

  saveServicesModal(): void {
    const m = this.barberForServices();
    if (!m?.barberId) return;
    const initial = this.initialServiceIds();
    const current = this.assignedServiceIds();
    const toAdd = [...current].filter((id) => !initial.has(id));
    const toRemove = [...initial].filter((id) => !current.has(id));
    if (toAdd.length === 0 && toRemove.length === 0) {
      this.closeServicesModal();
      return;
    }
    this.servicesModalSaving.set(true);
    this.servicesModalError.set(null);
    const addRequests = toAdd.map((serviceId) =>
      this.barbersService.addService(m.barberId!, serviceId)
    );
    const removeRequests = toRemove.map((serviceId) =>
      this.barbersService.removeService(m.barberId!, serviceId)
    );
    forkJoin([...addRequests, ...removeRequests]).subscribe({
      next: () => {
        this.closeServicesModal();
        this.load();
        this.servicesModalSaving.set(false);
      },
      error: (err) => {
        this.servicesModalError.set(
          err.error?.message ?? this.translate.instant('staff.errorSaveServices')
        );
        this.servicesModalSaving.set(false);
      },
    });
  }

  openShopsModal(m: StaffMember): void {
    if (m.role !== 'MANAGER') return;
    this.managerForShops.set(m);
    this.shopsModalError.set(null);
    this.shopsModalLoading.set(true);
    this.showShopsModal.set(true);
    const initialIds = new Set(m.managedShops?.map((ms) => ms.shopId) ?? []);
    this.selectedShopIds.set(initialIds);
    this.initialShopIds.set(new Set(initialIds));
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

  isManagerShopSelected(shopId: string): boolean {
    return this.selectedShopIds().has(shopId);
  }

  /** Only toggles local selection; API is called on Save. */
  toggleManagerShopSelection(shopId: string): void {
    const selected = new Set(this.selectedShopIds());
    if (selected.has(shopId)) {
      selected.delete(shopId);
    } else {
      selected.add(shopId);
    }
    this.selectedShopIds.set(selected);
  }

  saveShopsModal(): void {
    const m = this.managerForShops();
    if (!m) return;
    const initial = this.initialShopIds();
    const current = this.selectedShopIds();
    const toAdd = [...current].filter((id) => !initial.has(id));
    const toRemove = [...initial].filter((id) => !current.has(id));
    if (toAdd.length === 0 && toRemove.length === 0) {
      this.closeShopsModal();
      return;
    }
    this.shopsModalSaving.set(true);
    this.shopsModalError.set(null);
    const addRequests = toAdd.map((shopId) =>
      this.shopManagersService.addManagerToShop(shopId, m.id)
    );
    const removeRequests = toRemove.map((shopId) =>
      this.shopManagersService.removeManagerFromShop(shopId, m.id)
    );
    forkJoin([...addRequests, ...removeRequests]).subscribe({
      next: () => {
        this.closeShopsModal();
        this.load();
        this.shopsModalSaving.set(false);
      },
      error: (err) => {
        this.shopsModalError.set(
          err.error?.message ?? this.translate.instant('staff.errorSaveShops')
        );
        this.shopsModalSaving.set(false);
      },
    });
  }
}
