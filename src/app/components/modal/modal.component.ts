import { Component, EventEmitter, HostListener, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ModalFieldConfig } from './modal.models';

@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './modal.component.html',
})
export class ModalComponent {
  @Input() visible = false;
  @Input() title: string | null = null;
  @Input() subtitle: string | null = null;
  @Input() fields: ModalFieldConfig[] = [];
  @Input() model: Record<string, unknown> = {};
  @Input() formId: string | null = null;
  @Input() errorMessage: string | null = null;

  @Output() close = new EventEmitter<void>();
  @Output() submit = new EventEmitter<void>();

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.visible) {
      this.close.emit();
    }
  }

  onOverlayClick(): void {
    this.close.emit();
  }

  onSubmit(): void {
    this.submit.emit();
  }
}
