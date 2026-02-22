import { Component, OnInit, OnDestroy, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { InvitationsService, Invitation, CreateInvitationDto } from '../../features/invitations/invitations.service';

@Component({
  selector: 'app-invitations',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  templateUrl: './invitations.component.html',
  styleUrl: './invitations.component.scss',
})
export class InvitationsComponent implements OnInit, OnDestroy {
  private invitationsService = inject(InvitationsService);
  private translate = inject(TranslateService);
  private langSub?: Subscription;

  list = signal<Invitation[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);
  showModal = signal(false);
  saving = signal(false);

  form: CreateInvitationDto = {
    email: '',
    role: 'BARBER',
    firstName: '',
    lastName: '',
  };

  roleOptions: { value: 'ADMIN' | 'BARBER' | 'MANAGER'; label: string }[] = [];

  private updateRoleOptions(): void {
    const t = (key: string) => this.translate.instant(key);
    this.roleOptions = [
      { value: 'ADMIN', label: t('invitations.roleAdmin') },
      { value: 'MANAGER', label: t('invitations.roleManager') },
      { value: 'BARBER', label: t('invitations.roleBarber') },
    ];
  }

  ngOnInit(): void {
    this.updateRoleOptions();
    this.langSub = this.translate.onLangChange.subscribe(() => this.updateRoleOptions());
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

  closeModal(): void {
    this.showModal.set(false);
    this.error.set(null);
  }

  save(): void {
    if (!this.form.email.trim()) {
      this.error.set(this.translate.instant('invitations.fillEmail'));
      return;
    }
    this.saving.set(true);
    this.error.set(null);
    const payload: CreateInvitationDto = {
      email: this.form.email.trim(),
      role: this.form.role,
    };
    if (this.form.firstName?.trim()) payload.firstName = this.form.firstName.trim();
    if (this.form.lastName?.trim()) payload.lastName = this.form.lastName.trim();

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
}
