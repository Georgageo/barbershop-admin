import { Component, OnInit, OnDestroy, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { forkJoin } from 'rxjs';
import { UsersService, StaffMember } from '../../features/users/users.service';
import { ShopsService, Shop } from '../../features/shops/shops.service';
import { ShopManagersService } from '../../features/shop-managers/shop-managers.service';
import { TableColumn } from '../../components/table/table.models';
import { TableComponent } from '../../components/table/table.component';
import { DataTableCellDirective } from '../../components/table/table-cell.directive';
import { CardListComponent } from '../../components/card-list/card-list.component';
import { CardItemDirective } from '../../components/card-list/card-item.directive';
import { ModalComponent } from '../../components/modal/modal.component';
import { ModalActionsDirective } from '../../components/modal/modal-actions.directive';
import { ModalBodyDirective } from '../../components/modal/modal-body.directive';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-managers',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    TranslateModule,
    TableComponent,
    DataTableCellDirective,
    CardListComponent,
    CardItemDirective,
    ModalComponent,
    ModalActionsDirective,
    ModalBodyDirective,
  ],
  templateUrl: './managers.component.html',
  styleUrl: './managers.component.scss',
})
export class ManagersComponent implements OnInit, OnDestroy {
  private usersService = inject(UsersService);
  private shopsService = inject(ShopsService);
  private shopManagersService = inject(ShopManagersService);
  private translate = inject(TranslateService);
  private langSub?: Subscription;

  list = signal<StaffMember[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);

  showEditModal = signal(false);
  managerForEdit = signal<StaffMember | null>(null);
  allShops = signal<Shop[]>([]);
  selectedShopIds = signal<Set<string>>(new Set());
  initialShopIds = signal<Set<string>>(new Set());
  editShopsLoading = signal(false);
  saving = signal(false);

  columns: TableColumn[] = [];

  private updateTranslations(): void {
    const t = (key: string) => this.translate.instant(key);
    this.columns = [
      { field: 'name', header: t('common.name'), sortable: true },
      { field: 'email', header: t('common.email'), sortable: true },
      { field: 'details', header: t('staff.details') },
      { field: 'actions', header: t('common.actions') },
    ];
  }

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
        const managers = data.filter((s) => s.role === 'MANAGER');
        this.list.set(managers);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err.error?.message ?? 'Σφάλμα φόρτωσης υπευθύνων');
        this.loading.set(false);
      },
    });
  }

  displayName(m: StaffMember): string {
    return [m.firstName, m.lastName].filter(Boolean).join(' ') || '—';
  }

  managerShopsSummary(m: StaffMember): string {
    if (!m.managedShops?.length) return '';
    return m.managedShops.map((ms) => ms.shop.name).join(', ');
  }

  openEditModal(m: StaffMember): void {
    this.managerForEdit.set(m);
    this.error.set(null);
    this.editShopsLoading.set(true);
    const initialIds = new Set(m.managedShops?.map((ms) => ms.shopId) ?? []);
    this.selectedShopIds.set(initialIds);
    this.initialShopIds.set(new Set(initialIds));
    this.shopsService.getList().subscribe({
      next: (shops) => {
        this.allShops.set(shops);
        this.editShopsLoading.set(false);
        this.showEditModal.set(true);
      },
      error: () => {
        this.error.set('Σφάλμα φόρτωσης μαγαζιών');
        this.editShopsLoading.set(false);
      },
    });
  }

  closeEditModal(): void {
    this.showEditModal.set(false);
    this.managerForEdit.set(null);
    this.selectedShopIds.set(new Set());
    this.initialShopIds.set(new Set());
  }

  isManagerShopSelected(shopId: string): boolean {
    return this.selectedShopIds().has(shopId);
  }

  toggleManagerShopSelection(shopId: string): void {
    const selected = new Set(this.selectedShopIds());
    if (selected.has(shopId)) {
      selected.delete(shopId);
    } else {
      selected.add(shopId);
    }
    this.selectedShopIds.set(selected);
  }

  saveEdit(): void {
    const m = this.managerForEdit();
    if (!m) return;
    const initial = this.initialShopIds();
    const current = this.selectedShopIds();
    const toAdd = [...current].filter((id) => !initial.has(id));
    const toRemove = [...initial].filter((id) => !current.has(id));
    if (toAdd.length === 0 && toRemove.length === 0) {
      this.closeEditModal();
      return;
    }
    this.saving.set(true);
    this.error.set(null);
    const addRequests = toAdd.map((shopId) =>
      this.shopManagersService.addManagerToShop(shopId, m.id)
    );
    const removeRequests = toRemove.map((shopId) =>
      this.shopManagersService.removeManagerFromShop(shopId, m.id)
    );
    forkJoin([...addRequests, ...removeRequests]).subscribe({
      next: () => {
        this.closeEditModal();
        this.load();
        this.saving.set(false);
      },
      error: (err) => {
        this.error.set(
          err.error?.message ?? this.translate.instant('staff.errorSaveShops')
        );
        this.saving.set(false);
      },
    });
  }
}
