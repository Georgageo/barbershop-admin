import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-placeholder',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-y-4">
      <h2 class="text-2xl font-bold text-slate-800">{{ title }}</h2>
      <p class="text-slate-600">{{ subtitle }}</p>
    </div>
  `,
})
export class PlaceholderComponent {
  private route = inject(ActivatedRoute);
  title = this.route.snapshot.data['title'] ?? 'Σελίδα';
  subtitle = this.route.snapshot.data['subtitle'] ?? 'Σύντομα διαθέσιμο.';
}
