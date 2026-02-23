import { Directive } from '@angular/core';

/**
 * Mark a block as custom modal body content.
 * Use inside <app-modal> to project content between the form fields and the actions.
 */
@Directive({
  selector: '[appModalBody]',
  standalone: true,
})
export class ModalBodyDirective {}
