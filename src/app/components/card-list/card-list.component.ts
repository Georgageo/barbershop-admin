import { Component, ContentChild, Input, TemplateRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { TranslateModule } from '@ngx-translate/core';
import { CardItemDirective } from './card-item.directive';

@Component({
  selector: 'app-card-list',
  standalone: true,
  imports: [CommonModule, CardModule, TranslateModule],
  templateUrl: './card-list.component.html',
})
export class CardListComponent<T = unknown> {
  @Input() data: T[] = [];
  @Input() loading = false;
  @Input() emptyMessage: string | null = null;
  @Input() trackBy: keyof T | ((item: T) => unknown) = ((_: T, i: number) => i) as unknown as keyof T;

  @ContentChild(CardItemDirective) cardItemTemplate?: CardItemDirective;
}