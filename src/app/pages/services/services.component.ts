import { Component, OnInit, OnDestroy, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ServicesService } from '../../features/services/services.service';
import { Service, CreateServiceDto, UpdateServiceDto } from '../../core/models/service.model';
import { TableAction, TableColumn } from '../../components/table/table.models';
import { TableComponent } from '../../components/table/table.component';
import { DataTableCellDirective } from '../../components/table/table-cell.directive';
import { Subscription } from 'rxjs';
import { CardListComponent } from '../../components/card-list/card-list.component';
import { CardItemDirective } from '../../components/card-list/card-item.directive';
import { ModalComponent } from '../../components/modal/modal.component';
import { ModalActionsDirective } from '../../components/modal/modal-actions.directive';
import { ModalFieldConfig } from '../../components/modal/modal.models';

@Component({
  selector: 'app-services',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    TableComponent,
    DataTableCellDirective,
    CardListComponent,
    CardItemDirective,
    ModalComponent,
    ModalActionsDirective,
  ],
  templateUrl: './services.component.html',
  styleUrl: './services.component.scss',
})
export class ServicesComponent implements OnInit, OnDestroy {
  private servicesService = inject(ServicesService);
  private translate = inject(TranslateService);
  private langSub?: Subscription;

  columns: TableColumn[] = [];
  actions: TableAction<Service>[] = [];

  private updateTranslations(): void {
    const t = (key: string) => this.translate.instant(key);
    this.columns = [
      { field: 'name', header: t('services.serviceLabel'), sortable: true },
      { field: 'duration', header: t('common.duration') },
      { field: 'price', header: t('common.price'), sortable: true },
      { field: 'status', header: t('common.status') },
    ];
    this.actions = [
      { icon: 'pi pi-pencil', tooltip: t('common.edit'), onClick: (s) => this.openEditModal(s) },
      { icon: 'pi pi-power-off', tooltip: t('common.toggleActive'), severity: 'warn', onClick: (s) => this.toggleActive(s) },
      { icon: 'pi pi-trash', tooltip: t('common.delete'), severity: 'danger', onClick: (s) => this.confirmDelete(s) },
    ];
  }

  list = signal<Service[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);
  showModal = signal(false);
  editingService = signal<Service | null>(null);
  deletingId = signal<string | null>(null);
  saving = signal(false);

  /** Form model for the modal (keys match serviceFormFields). Price in euros for display. */
  form: Record<string, unknown> = {
    name: '',
    description: '',
    durationMinutes: 30,
    priceEuros: 25,
  };

  get serviceFormFields(): ModalFieldConfig[] {
    const t = (key: string) => this.translate.instant(key);
    return [
      {
        key: 'name',
        label: t('common.name'),
        type: 'text',
        required: true,
        placeholder: t('services.namePlaceholder'),
        maxLength: 100,
      },
      {
        key: 'description',
        label: t('common.description'),
        type: 'textarea',
        placeholder: t('services.descriptionPlaceholder'),
        maxLength: 500,
        rows: 3,
      },
      {
        key: 'durationMinutes',
        label: t('services.durationMinutes'),
        type: 'number',
        required: true,
        min: 1,
        placeholder: '30',
        width: 'half',
      },
      {
        key: 'priceEuros',
        label: t('services.priceEur'),
        type: 'number',
        required: true,
        min: 0,
        step: 0.01,
        placeholder: '25.00',
        hint: t('services.priceHint'),
        width: 'half',
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
    this.servicesService.getList().subscribe({
      next: (data) => {
        console.log('Services: ', data)
        this.list.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err.error?.message ?? this.translate.instant('services.errorLoad'));
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
      priceEuros: 25,
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
      priceEuros: service.priceCents / 100,
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
    const name = String(this.form['name'] ?? '').trim();
    const durationMinutes = Number(this.form['durationMinutes'] ?? 0);
    const priceEuros = Number(this.form['priceEuros'] ?? 0);
    if (!name || durationMinutes < 1 || priceEuros < 0) {
      this.error.set(this.translate.instant('services.fillRequired'));
      return;
    }

    this.saving.set(true);
    this.error.set(null);

    const editing = this.editingService();
    const payload = {
      name,
      description: (this.form['description'] as string)?.trim() || undefined,
      durationMinutes,
      priceCents: Math.round(priceEuros * 100),
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
        this.error.set(err.error?.message ?? this.translate.instant('services.errorSave'));
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
        this.error.set(this.translate.instant('services.errorUpdate'));
      },
    });
  }

  confirmDelete(service: Service): void {
    if (confirm(this.translate.instant('services.confirmDelete', { name: service.name }))) {
      this.deletingId.set(service.id);
      this.servicesService.delete(service.id).subscribe({
        next: () => {
          this.load();
          this.deletingId.set(null);
        },
        error: () => {
          this.error.set(this.translate.instant('services.errorDelete'));
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
