import { Component, OnInit, OnDestroy, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { CustomersService, Customer, CreateCustomerDto } from '../../features/customers/customers.service';
import { TableColumn } from '../../components/table/table.models';
import { TableComponent } from '../../components/table/table.component';
import { DataTableCellDirective } from '../../components/table/table-cell.directive';

@Component({
  selector: 'app-customers',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, TableComponent, DataTableCellDirective],
  templateUrl: './customers.component.html',
  styleUrl: './customers.component.scss',
})
export class CustomersComponent implements OnInit, OnDestroy {
  private customersService = inject(CustomersService);
  private translate = inject(TranslateService);
  private langSub?: Subscription;

  columns: TableColumn[] = [];

  private updateTranslations(): void {
    const t = (key: string) => this.translate.instant(key);
    this.columns = [
      { field: 'name',  header: t('common.name'),    sortable: true },
      { field: 'phone', header: t('common.phone'), sortable: true },
      { field: 'email', header: t('common.email'),    sortable: true },
    ];
  }

  list = signal<Customer[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);
  showModal = signal(false);
  saving = signal(false);
  searchQuery = signal('');

  form: CreateCustomerDto = {
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
  };

  filteredList = computed(() => {
    const items = this.list();
    const q = this.searchQuery().trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (c) =>
        c.firstName.toLowerCase().includes(q) ||
        c.lastName.toLowerCase().includes(q) ||
        (c.phone ?? '').includes(q) ||
        (c.email ?? '').toLowerCase().includes(q),
    );
  });

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
    this.customersService.getList(this.searchQuery() || undefined).subscribe({
      next: (data) => {
        console.log('Customers loaded:', data);
        this.list.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err.error?.message ?? this.translate.instant('customers.errorLoad'));
        this.loading.set(false);
      },
    });
  }

  onSearchInput(): void {
    this.load();
  }

  openCreateModal(): void {
    this.form = { firstName: '', lastName: '', phone: '', email: '' };
    this.error.set(null);
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
  }

  save(): void {
    if (!this.form.firstName?.trim() || !this.form.lastName?.trim() || !this.form.phone?.trim()) {
      this.error.set(this.translate.instant('customers.fillRequired'));
      return;
    }
    this.saving.set(true);
    this.error.set(null);
    this.customersService
      .create({
        firstName: this.form.firstName.trim(),
        lastName: this.form.lastName.trim(),
        phone: this.form.phone.trim(),
        email: this.form.email?.trim() || undefined,
      })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.closeModal();
          this.load();
        },
        error: (err) => {
          this.error.set(err.error?.message ?? this.translate.instant('customers.errorSave'));
          this.saving.set(false);
        },
      });
  }

  displayEmail(c: Customer): string {
    if (c.email?.includes('@placeholder.local')) return '—';
    return c.email ?? '—';
  }
}
