import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CustomersService, Customer, CreateCustomerDto } from '../../features/customers/customers.service';

@Component({
  selector: 'app-customers',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './customers.component.html',
  styleUrl: './customers.component.scss',
})
export class CustomersComponent implements OnInit {
  private customersService = inject(CustomersService);

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
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.customersService.getList(this.searchQuery() || undefined).subscribe({
      next: (data) => {
        this.list.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err.error?.message ?? 'Σφάλμα φόρτωσης πελατών');
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
      this.error.set('Συμπληρώστε όνομα, επώνυμο και τηλέφωνο.');
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
          this.error.set(err.error?.message ?? 'Σφάλμα κατά την αποθήκευση');
          this.saving.set(false);
        },
      });
  }

  displayEmail(c: Customer): string {
    if (c.email?.includes('@placeholder.local')) return '—';
    return c.email ?? '—';
  }
}
