import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ServicesService } from '../../features/services/services.service';
import { Service, CreateServiceDto, UpdateServiceDto } from '../../core/models/service.model';

@Component({
  selector: 'app-services',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './services.component.html',
  styleUrl: './services.component.scss',
})
export class ServicesComponent implements OnInit {
  private servicesService = inject(ServicesService);

  list = signal<Service[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);
  showModal = signal(false);
  editingService = signal<Service | null>(null);
  deletingId = signal<string | null>(null);
  saving = signal(false);

  form: CreateServiceDto = {
    name: '',
    description: '',
    durationMinutes: 30,
    priceCents: 0,
  };

  // Helper for price input (in euros)
  get priceEuros(): number {
    return this.form.priceCents / 100;
  }

  set priceEuros(value: number) {
    this.form.priceCents = Math.round(value * 100);
  }

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.servicesService.getList().subscribe({
      next: (data) => {
        this.list.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err.error?.message ?? 'Σφάλμα φόρτωσης υπηρεσιών');
        this.loading.set(false);
      },
    });
  }

  openCreateModal(): void {
    this.editingService.set(null);
    this.form = {
      name: '',
      description: '',
      durationMinutes: 30,
      priceCents: 0,
    };
    this.error.set(null);
    this.showModal.set(true);
  }

  openEditModal(service: Service): void {
    this.editingService.set(service);
    this.form = {
      name: service.name,
      description: service.description ?? '',
      durationMinutes: service.durationMinutes,
      priceCents: service.priceCents,
    };
    this.error.set(null);
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.editingService.set(null);
    this.error.set(null);
  }

  save(): void {
    if (!this.form.name.trim() || this.form.durationMinutes < 1 || this.form.priceCents < 0) {
      this.error.set('Συμπληρώστε όλα τα υποχρεωτικά πεδία.');
      return;
    }

    this.saving.set(true);
    this.error.set(null);

    const editing = this.editingService();
    const payload = {
      name: this.form.name.trim(),
      description: this.form.description?.trim() || undefined,
      durationMinutes: this.form.durationMinutes,
      priceCents: Math.round(this.form.priceCents),
    };

    const request = editing
      ? this.servicesService.update(editing.id, payload)
      : this.servicesService.create(payload as CreateServiceDto);

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

  toggleActive(service: Service): void {
    this.servicesService.update(service.id, { isActive: !service.isActive }).subscribe({
      next: () => {
        this.load();
      },
      error: () => {
        this.error.set('Σφάλμα ενημέρωσης');
      },
    });
  }

  confirmDelete(service: Service): void {
    if (confirm(`Είστε σίγουροι ότι θέλετε να διαγράψετε την υπηρεσία "${service.name}";`)) {
      this.deletingId.set(service.id);
      this.servicesService.delete(service.id).subscribe({
        next: () => {
          this.load();
          this.deletingId.set(null);
        },
        error: () => {
          this.error.set('Σφάλμα διαγραφής');
          this.deletingId.set(null);
        },
      });
    }
  }

  formatPrice(cents: number): string {
    return (cents / 100).toFixed(2) + ' €';
  }

  formatDuration(minutes: number): string {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h > 0) {
      return m > 0 ? `${h}ω ${m}λ` : `${h}ω`;
    }
    return `${m}λ`;
  }
}
