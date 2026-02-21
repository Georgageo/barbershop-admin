import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  UsersService,
  Profile,
  UpdateProfileDto,
} from '../../features/users/users.service';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss',
})
export class ProfileComponent implements OnInit {
  private usersService = inject(UsersService);
  auth = inject(AuthService);

  profile = signal<Profile | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);
  savingProfile = signal(false);
  savingPassword = signal(false);
  savingPhoto = signal(false);
  passwordSuccess = signal(false);
  selectedFile: File | null = null;

  form: UpdateProfileDto = {
    firstName: '',
    lastName: '',
    phone: '',
  };

  passwordForm = {
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  };

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.usersService.getMe().subscribe({
      next: (data) => {
        this.profile.set(data);
        this.form = {
          firstName: data.firstName ?? '',
          lastName: data.lastName ?? '',
          phone: data.phone ?? '',
        };
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err.error?.message ?? 'Σφάλμα φόρτωσης προφίλ');
        this.loading.set(false);
      },
    });
  }

  saveProfile(): void {
    this.error.set(null);
    this.savingProfile.set(true);
    this.usersService.updateProfile(this.form).subscribe({
      next: (updated) => {
        this.profile.set(updated);
        this.auth.currentUser.set({
          id: updated.id,
          email: updated.email,
          firstName: updated.firstName,
          lastName: updated.lastName,
          role: updated.role,
          image: updated.image ?? null,
        });
        this.savingProfile.set(false);
      },
      error: (err) => {
        this.error.set(err.error?.message ?? 'Σφάλμα αποθήκευσης');
        this.savingProfile.set(false);
      },
    });
  }

  profileImageUrl(): string | null {
    return this.usersService.profileImageUrl(this.profile()?.image);
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file && file.type.startsWith('image/')) {
      this.selectedFile = file;
      this.error.set(null);
    } else {
      this.selectedFile = null;
      this.error.set('Επιλέξτε αρχείο εικόνας (π.χ. JPG, PNG).');
    }
  }

  uploadPhoto(): void {
    if (!this.selectedFile) return;
    this.error.set(null);
    this.savingPhoto.set(true);
    this.usersService.uploadProfileImage(this.selectedFile).subscribe({
      next: (res) => {
        this.profile.set(res.profile);
        this.auth.currentUser.update((u) => (u ? { ...u, image: res.profile.image ?? null } : u));
        this.selectedFile = null;
        this.savingPhoto.set(false);
      },
      error: (err) => {
        this.error.set(err.error?.message ?? 'Σφάλμα ανεβάσματος φωτογραφίας');
        this.savingPhoto.set(false);
      },
    });
  }

  savePassword(): void {
    this.error.set(null);
    this.passwordSuccess.set(false);
    if (this.passwordForm.newPassword.length < 6) {
      this.error.set('Ο νέος κωδικός πρέπει να έχει τουλάχιστον 6 χαρακτήρες.');
      return;
    }
    if (this.passwordForm.newPassword !== this.passwordForm.confirmPassword) {
      this.error.set('Οι νέοι κωδικοί δεν ταιριάζουν.');
      return;
    }
    this.savingPassword.set(true);
    this.usersService
      .changePassword(this.passwordForm.currentPassword, this.passwordForm.newPassword)
      .subscribe({
        next: () => {
          this.passwordForm = {
            currentPassword: '',
            newPassword: '',
            confirmPassword: '',
          };
          this.passwordSuccess.set(true);
          this.savingPassword.set(false);
        },
        error: (err) => {
          this.error.set(
            err.error?.message ?? 'Σφάλμα αλλαγής κωδικού. Ελέγξτε τον τρέχοντα κωδικό.',
          );
          this.savingPassword.set(false);
        },
      });
  }
}
