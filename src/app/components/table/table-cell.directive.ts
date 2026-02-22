import { Directive, Input, TemplateRef } from '@angular/core';

@Directive({
  selector: '[appTableCell]',
  standalone: true,
})
export class DataTableCellDirective {
  @Input('appTableCell') field!: string;
  constructor(public template: TemplateRef<any>) {}
}