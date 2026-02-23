import { Injectable, signal, computed } from '@angular/core';
import { AlertConfig, AlertType } from './alert.models';

@Injectable({ providedIn: 'root' })
export class AlertService {
  private configSignal = signal<AlertConfig | null>(null);
  private resolveCallback: ((value: boolean) => void) | null = null;

  readonly config = this.configSignal.asReadonly();
  readonly visible = computed(() => this.configSignal() !== null);

  /**
   * Show a confirm dialog. Returns a Promise that resolves to true if user confirms, false if cancels.
   */
  confirm(config: AlertConfig & { confirmText?: string; cancelText?: string }): Promise<boolean> {
    return new Promise((resolve) => {
      this.resolveCallback = resolve;
      this.configSignal.set({
        ...config,
        type: config.type ?? 'confirm',
        showCancel: config.showCancel ?? true,
      });
    });
  }

  /**
   * Show an info dialog (single OK button).
   */
  info(title: string, message: string): Promise<void> {
    return new Promise((resolve) => {
      this.resolveCallback = () => resolve();
      this.configSignal.set({
        title,
        message,
        type: 'info',
        showCancel: false,
      });
    });
  }

  /**
   * Show a warning dialog.
   */
  warning(title: string, message: string): Promise<boolean> {
    return this.confirm({ title, message, type: 'warning' });
  }

  /**
   * Show a success dialog (single OK button).
   */
  success(title: string, message: string): Promise<void> {
    return this.info(title, message);
  }

  onConfirm(): void {
    this.resolveCallback?.(true);
    this.resolveCallback = null;
    this.configSignal.set(null);
  }

  onCancel(): void {
    this.resolveCallback?.(false);
    this.resolveCallback = null;
    this.configSignal.set(null);
  }
}
