import { Component, OnInit, OnDestroy, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { InvitationsService, Invitation, CreateInvitationDto } from '../../features/invitations/invitations.service';
import { AlertService } from '../../components/alert/alert.service';
import { TableComponent } from '../../components/table/table.component';
import { DataTableCellDirective } from '../../components/table/table-cell.directive';
import { TableColumn, TableAction } from '../../components/table/table.models';
import { CardListComponent } from '../../components/card-list/card-list.component';
import { CardItemDirective } from '../../components/card-list/card-item.directive';
import { ModalComponent } from '../../components/modal/modal.component';
import { ModalActionsDirective } from '../../components/modal/modal-actions.directive';
import { ModalFieldConfig } from '../../components/modal/modal.models';

@Component({
  selector: 'app-invitations',
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
  templateUrl: './invitations.component.html',
  styleUrl: './invitations.component.scss',
})
export class InvitationsComponent implements OnInit, OnDestroy {
  private invitationsService = inject(InvitationsService);
  private alertService = inject(AlertService);
  private translate = inject(TranslateService);
  private langSub?: Subscription;

  list = signal<Invitation[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);
  showModal = signal(false);
  saving = signal(false);
  deletingId = signal<string | null>(null);

  columns: TableColumn[] = [];
  actions: TableAction<Invitation>[] = [];

  roleOptions: { value: 'ADMIN' | 'BARBER' | 'MANAGER'; label: string }[] = [];

  form: Record<string, unknown> = {
    email: '',
    role: 'BARBER',
    firstName: '',
    lastName: '',
  };

  get invitationFormFields(): ModalFieldConfig[] {
    const t = (key: string) => this.translate.instant(key);
    return [
      {
        key: 'email',
        label: t('common.email'),
        type: 'email',
        required: true,
        placeholder: 'user@example.com',
      },
      {
        key: 'role',
        label: t('invitations.role'),
        type: 'select',
        required: true,
        options: this.roleOptions.map((o) => ({ value: o.value, label: o.label })),
      },
      {
        key: 'firstName',
        label: t('common.name'),
        type: 'text',
        placeholder: t('invitations.optionalPlaceholder'),
        maxLength: 100,
        width: 'half',
      },
      {
        key: 'lastName',
        label: t('customers.lastName'),
        type: 'text',
        placeholder: t('invitations.optionalPlaceholder'),
        maxLength: 100,
        width: 'half',
      },
    ];
  }

  private updateTranslations(): void {
    const t = (key: string) => this.translate.instant(key);
    this.roleOptions = [
      { value: 'ADMIN', label: t('invitations.roleAdmin') },
      { value: 'MANAGER', label: t('invitations.roleManager') },
      { value: 'BARBER', label: t('invitations.roleBarber') },
    ];
    this.columns = [
      { field: 'email', header: t('common.email'), sortable: true },
      { field: 'role', header: t('invitations.role') },
      { field: 'name', header: t('common.name') },
      { field: 'expiresAt', header: t('invitations.expires') },
      { field: 'createdAt', header: t('invitations.sent'), sortable: true },
    ];
    this.actions = [
      {
        icon: 'pi pi-trash',
        tooltip: t('common.delete'),
        severity: 'danger',
        onClick: (inv) => this.confirmDelete(inv),
        disabled: (inv) => this.deletingId() === inv.id,
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
    this.invitationsService.getList().subscribe({
      next: (data) => {
        this.list.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err.error?.message ?? this.translate.instant('invitations.errorLoad'));
        this.loading.set(false);
      },
    });
  }

  openModal(): void {
    this.form = { email: '', role: 'BARBER', firstName: '', lastName: '' };
    this.error.set(null);
    this.showModal.set(true);
  }

  displayName(inv: Invitation): string {
    return [inv.firstName, inv.lastName].filter(Boolean).join(' ').trim() || '—';
  }

  closeModal(): void {
    this.showModal.set(false);
    this.error.set(null);
  }

  save(): void {
    const email = String(this.form['email'] ?? '').trim();
    if (!email) {
      this.error.set(this.translate.instant('invitations.fillEmail'));
      return;
    }
    this.saving.set(true);
    this.error.set(null);
    const payload: CreateInvitationDto = {
      email,
      role: (this.form['role'] as 'ADMIN' | 'BARBER' | 'MANAGER') ?? 'BARBER',
    };
    const firstName = String(this.form['firstName'] ?? '').trim();
    const lastName = String(this.form['lastName'] ?? '').trim();
    if (firstName) payload.firstName = firstName;
    if (lastName) payload.lastName = lastName;

    this.invitationsService.create(payload).subscribe({
      next: () => {
        this.closeModal();
        this.load();
        this.saving.set(false);
      },
      error: (err) => {
        this.error.set(err.error?.message ?? this.translate.instant('invitations.errorSend'));
        this.saving.set(false);
      },
    });
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('el-GR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  roleLabel(role: string): string {
    return this.roleOptions.find((o) => o.value === role)?.label ?? role;
  }

  confirmDelete(inv: Invitation): void {
    this.alertService
      .confirm({
        title: this.translate.instant('invitations.cancelInvitationTitle'),
        message: this.translate.instant('invitations.confirmDelete', { email: inv.email }),
        type: 'confirm',
        confirmText: this.translate.instant('common.delete'),
      })
      .then((ok) => {
        if (!ok) return;
        this.deletingId.set(inv.id);
        this.error.set(null);
        this.invitationsService.delete(inv.id).subscribe({
          next: () => {
            this.deletingId.set(null);
            this.load();
          },
          error: (err) => {
            this.deletingId.set(null);
            this.error.set(err.error?.message ?? this.translate.instant('invitations.errorDelete'));
          },
        });
      });
  }
}
