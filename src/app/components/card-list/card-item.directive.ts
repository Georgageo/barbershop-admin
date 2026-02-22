import { Directive, TemplateRef } from '@angular/core';

@Directive({
  selector: '[appCardItem]',
  standalone: true,
})
export class CardItemDirective {
  constructor(public template: TemplateRef<any>) {}
}