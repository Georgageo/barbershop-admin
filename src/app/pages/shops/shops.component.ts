import { Component, OnInit, OnDestroy, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { ShopsService, Shop, UpdateShopDto } from '../../features/shops/shops.service';
import { AuthService } from '../../core/auth/auth.service';
import { TableColumn } from '../../components/table/table.models';
import { TableComponent } from '../../components/table/table.component';
import { DataTableCellDirective } from '../../components/table/table-cell.directive';
import { CardListComponent } from '../../components/card-list/card-list.component';
import { CardItemDirective } from '../../components/card-list/card-item.directive';
import { ModalComponent } from '../../components/modal/modal.component';
import { ModalActionsDirective } from '../../components/modal/modal-actions.directive';
import { ModalFieldConfig } from '../../components/modal/modal.models';

@Component({
  selector: 'app-shops',
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
  templateUrl: './shops.component.html',
  styleUrl: './shops.component.scss',
})
export class ShopsComponent implements OnInit, OnDestroy {
  private shopsService = inject(ShopsService);
  private auth = inject(AuthService);
  private translate = inject(TranslateService);
  private langSub?: Subscription;

  columns: TableColumn[] = [];

  private updateTranslations(): void {
    const t = (key: string) => this.translate.instant(key);
    this.columns = [
      { field: 'name', header: t('common.name'), sortable: true },
      { field: 'phone', header: t('common.phone') },
      { field: 'address', header: t('common.address') },
      { field: 'actions', header: t('common.actions') },
    ];
  }

  list = signal<Shop[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);
  showModal = signal(false);
  editingShop = signal<Shop | null>(null);
  deletingId = signal<string | null>(null);
  saving = signal(false);

  /** Only ADMIN can create/edit/delete shops. MANAGER can only view and edit hours. */
  get canManageShops(): boolean {
    return this.auth.currentUser()?.role === 'ADMIN';
  }

  /** Form model for the modal (keys match shopFormFields). */
  form: Record<string, unknown> = {
    name: '',
    phone: '',
    address: '',
  };

  get shopFormFields(): ModalFieldConfig[] {
    const t = (key: string) => this.translate.instant(key);
    return [
      {
        key: 'name',
        label: t('common.name'),
        type: 'text',
        required: true,
        placeholder: t('shops.namePlaceholder'),
        maxLength: 200,
      },
      {
        key: 'phone',
        label: t('common.phone'),
        type: 'tel',
        placeholder: t('shops.phonePlaceholder'),
        maxLength: 50,
      },
      {
        key: 'address',
        label: t('common.address'),
        type: 'textarea',
        placeholder: t('shops.addressPlaceholder'),
        maxLength: 500,
        rows: 2,
      },
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
    const isManager = this.auth.currentUser()?.role === 'MANAGER';
    const request = isManager ? this.shopsService.getMyShops() : this.shopsService.getList();
    request.subscribe({
      next: (data) => {
        this.list.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err.error?.message ?? 'Σφάλμα φόρτωσης μαγαζιών');
        this.loading.set(false);
      },
    });
  }

  openCreateModal(): void {
    this.editingShop.set(null);
    this.form = { name: '', phone: '', address: '' };
    this.error.set(null);
    this.showModal.set(true);
  }

  openEditModal(shop: Shop): void {
    this.editingShop.set(shop);
    this.form = {
      name: shop.name,
      phone: shop.phone ?? '',
      address: shop.address ?? '',
    };
    this.error.set(null);
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.editingShop.set(null);
    this.error.set(null);
  }

  save(): void {
    const name = String(this.form['name'] ?? '').trim();
    if (!name) {
      this.error.set(this.translate.instant('shops.fillName'));
      return;
    }

    this.saving.set(true);
    this.error.set(null);

    const editing = this.editingShop();
    const payload: UpdateShopDto = {
      name,
      phone: (this.form['phone'] as string)?.trim() || undefined,
      address: (this.form['address'] as string)?.trim() || undefined,
    };

    const request = editing
      ? this.shopsService.update(editing.id, payload)
      : this.shopsService.create({ ...payload, name: payload.name! });

    request.subscribe({
      next: () => {
        this.closeModal();
        this.load();
        this.saving.set(false);
      },
      error: (err) => {
        this.error.set(err.error?.message ?? 'Σφάλμα αποθήκευσης');
        this.saving.set(false);
      },
    });
  }

  confirmDelete(shop: Shop): void {
    if (confirm(this.translate.instant('shops.confirmDelete', { name: shop.name }))) {
      this.deletingId.set(shop.id);
      this.shopsService.delete(shop.id).subscribe({
        next: () => {
          this.load();
          this.deletingId.set(null);
        },
        error: (err) => {
          this.error.set(err.error?.message ?? 'Σφάλμα διαγραφής');
          this.deletingId.set(null);
        },
      });
    }
  }
}
