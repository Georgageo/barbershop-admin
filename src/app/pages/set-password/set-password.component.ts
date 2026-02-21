import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-set-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './set-password.component.html',
  styleUrl: './set-password.component.scss',
})
export class SetPasswordComponent {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private auth = inject(AuthService);

  password = '';
  confirmPassword = '';
  error = signal<string | null>(null);
  loading = signal(false);

  get token(): string | null {
    return this.route.snapshot.queryParamMap.get('token');
  }

  onSubmit(): void {
    this.error.set(null);
    if (!this.token) {
      this.error.set('Λάθος ή ληγμένος σύνδεσμος πρόσκλησης.');
      return;
    }
    if (this.password.length < 6) {
      this.error.set('Ο κωδικός πρέπει να έχει τουλάχιστον 6 χαρακτήρες.');
      return;
    }
    if (this.password !== this.confirmPassword) {
      this.error.set('Οι κωδικοί δεν ταιριάζουν.');
      return;
    }

    this.loading.set(true);
    this.auth.setPassword(this.token, this.password).subscribe({
      next: (result) => {
        this.loading.set(false);
        if (result.success) {
          this.router.navigate(['/admin']);
        } else {
          this.error.set(result.message ?? 'Σφάλμα ορισμού κωδικού.');
        }
      },
      error: () => {
        this.loading.set(false);
        this.error.set('Σφάλμα ορισμού κωδικού. Ο σύνδεσμος μπορεί να έχει λήξει ή να έχει ήδη χρησιμοποιηθεί.');
      },
    });
  }
}
