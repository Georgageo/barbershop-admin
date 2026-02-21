import { Injectable, signal, inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'barbershop-theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private doc = inject(DOCUMENT);

  readonly theme = signal<Theme>(this.getInitialTheme());

  constructor() {
    this.applyTheme(this.theme());
  }

  setTheme(value: Theme): void {
    this.theme.set(value);
    if (this.doc?.defaultView?.localStorage) {
      localStorage.setItem(STORAGE_KEY, value);
    }
    this.applyTheme(value);
  }

  toggleTheme(): void {
    this.setTheme(this.theme() === 'light' ? 'dark' : 'light');
  }

  private getInitialTheme(): Theme {
    if (this.doc?.defaultView) {
      const stored = this.doc.defaultView.localStorage?.getItem(STORAGE_KEY);
      if (stored === 'light' || stored === 'dark') return stored;
      const prefersDark = this.doc.defaultView.matchMedia?.('(prefers-color-scheme: dark)').matches;
      return prefersDark ? 'dark' : 'light';
    }
    return 'light';
  }

  private applyTheme(value: Theme): void {
    const html = this.doc?.documentElement;
    if (!html) return;
    if (value === 'dark') {
      html.classList.add('dark');
    } else {
      html.classList.remove('dark');
    }
  }
}
