import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AuthService } from '../../core/auth/auth.service';
import { ThemeService } from '../../core/theme/theme.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  private auth = inject(AuthService);
  private router = inject(Router);
  private translate = inject(TranslateService);

  email = '';
  password = '';
  error = '';
  loading = false;

  constructor(public theme: ThemeService) {}

  onSubmit(): void {
    this.error = '';
    if (!this.email.trim() || !this.password) {
      this.error = this.translate.instant('login.fillEmailPassword');
      return;
    }
    this.loading = true;
    this.auth.login(this.email, this.password).subscribe((result) => {
      this.loading = false;
      if (result.success) {
        this.router.navigate(['/admin']);
      } else {
        this.error = result.message ?? this.translate.instant('login.wrongCredentials');
      }
    });
  }
}
