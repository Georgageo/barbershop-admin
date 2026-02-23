import { Component, EventEmitter, HostListener, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { AlertType } from './alert.models';

@Component({
  selector: 'app-alert',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './alert.component.html',
  styleUrl: './alert.component.scss',
})
export class AlertComponent {
  @Input() visible = false;
  @Input() title = '';
  @Input() message = '';
  @Input() type: AlertType = 'confirm';
  @Input() confirmText = '';
  @Input() cancelText = '';
  @Input() showCancel = true;

  @Output() confirm = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.visible) {
      this.onCancel();
    }
  }

  onOverlayClick(): void {
    this.onCancel();
  }

  onConfirm(): void {
    this.confirm.emit();
  }

  onCancel(): void {
    this.cancel.emit();
  }

  get iconClass(): string {
    switch (this.type) {
      case 'confirm':
        return 'pi pi-question-circle text-amber-500 dark:text-amber-400';
      case 'info':
        return 'pi pi-info-circle text-cyan-500 dark:text-cyan-400';
      case 'warning':
        return 'pi pi-exclamation-triangle text-amber-500 dark:text-amber-400';
      case 'success':
        return 'pi pi-check-circle text-green-500 dark:text-green-400';
      default:
        return 'pi pi-question-circle text-slate-500 dark:text-slate-400';
    }
  }

  get iconBgClass(): string {
    switch (this.type) {
      case 'confirm':
        return 'bg-amber-100 dark:bg-amber-900/30';
      case 'info':
        return 'bg-cyan-100 dark:bg-cyan-900/30';
      case 'warning':
        return 'bg-amber-100 dark:bg-amber-900/30';
      case 'success':
        return 'bg-green-100 dark:bg-green-900/30';
      default:
        return 'bg-slate-100 dark:bg-slate-700';
    }
  }

  get confirmButtonClass(): string {
    switch (this.type) {
      case 'confirm':
        return 'bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-500 text-white';
      case 'info':
      case 'success':
        return 'bg-cyan-500 hover:bg-cyan-600 dark:bg-cyan-600 dark:hover:bg-cyan-500 text-white';
      case 'warning':
        return 'bg-amber-500 hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-500 text-white';
      default:
        return 'bg-cyan-500 hover:bg-cyan-600 text-white';
    }
  }
}
