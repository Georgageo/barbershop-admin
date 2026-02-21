import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/auth/auth.service';
import { ThemeService } from '../../core/theme/theme.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  email = '';
  password = '';
  error = '';
  loading = false;

  constructor(
    private auth: AuthService,
    private router: Router,
    public theme: ThemeService,
  ) {}

  onSubmit(): void {
    this.error = '';
    if (!this.email.trim() || !this.password) {
      this.error = 'Συμπληρώστε email και κωδικό.';
      return;
    }
    this.loading = true;
    this.auth.login(this.email, this.password).subscribe((result) => {
      this.loading = false;
      if (result.success) {
        this.router.navigate(['/admin']);
      } else {
        this.error = result.message ?? 'Λάθος στοιχεία. Δοκιμάστε ξανά.';
      }
    });
  }
}
