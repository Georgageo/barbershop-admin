import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ShopsService, Shop, CreateShopDto, UpdateShopDto } from '../../features/shops/shops.service';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-shops',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './shops.component.html',
  styleUrl: './shops.component.scss',
})
export class ShopsComponent implements OnInit {
  private shopsService = inject(ShopsService);
  private auth = inject(AuthService);

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

  form: CreateShopDto = {
    name: '',
    phone: '',
    address: '',
  };

  ngOnInit(): void {
    this.load();
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
    if (!this.form.name.trim()) {
      this.error.set('Συμπληρώστε το όνομα του μαγαζιού.');
      return;
    }

    this.saving.set(true);
    this.error.set(null);

    const editing = this.editingShop();
    const payload: UpdateShopDto = {
      name: this.form.name.trim(),
      phone: this.form.phone?.trim() || undefined,
      address: this.form.address?.trim() || undefined,
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
    if (confirm(`Είστε σίγουροι ότι θέλετε να διαγράψετε το μαγαζί "${shop.name}"; Θα διαγραφούν και τα ωράρια.`)) {
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
