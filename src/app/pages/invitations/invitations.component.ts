import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InvitationsService, Invitation, CreateInvitationDto } from '../../features/invitations/invitations.service';

@Component({
  selector: 'app-invitations',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './invitations.component.html',
  styleUrl: './invitations.component.scss',
})
export class InvitationsComponent implements OnInit {
  private invitationsService = inject(InvitationsService);

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

  readonly roleOptions: { value: 'ADMIN' | 'BARBER' | 'MANAGER'; label: string }[] = [
    { value: 'ADMIN', label: 'Admin' },
    { value: 'MANAGER', label: 'Υπεύθυνος μαγαζιού' },
    { value: 'BARBER', label: 'Κουρέας' },
  ];

  ngOnInit(): void {
    this.load();
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
        this.error.set(err.error?.message ?? 'Σφάλμα φόρτωσης προσκλήσεων');
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
      this.error.set('Συμπληρώστε το email.');
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
        this.error.set(err.error?.message ?? 'Σφάλμα αποστολής πρόσκλησης');
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
