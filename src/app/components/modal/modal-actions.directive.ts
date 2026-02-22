import { Directive } from '@angular/core';

/**
 * Mark a block as the modal footer actions.
 * Use inside <app-modal> so that content is projected into the modal's actions area.
 * Callbacks on buttons (e.g. (click)="closeModal()") run in the parent.
 */
@Directive({
  selector: '[appModalActions]',
  standalone: true,
})
export class ModalActionsDirective {}
