import { Component, ContentChildren, Input, QueryList, TemplateRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { TranslateModule } from '@ngx-translate/core';
import { TableColumn, TableAction } from './table.models';
import { DataTableCellDirective } from './table-cell.directive';

@Component({
  selector: 'app-data-table',
  standalone: true,
  imports: [CommonModule, TableModule, ButtonModule, TooltipModule, TranslateModule],
  templateUrl: './table.component.html',
})
export class TableComponent<T = any> {
  @Input() data: T[] = [];
  @Input() columns: TableColumn[] = [];
  @Input() actions: TableAction<T>[] = [];
  @Input() loading = false;
  @Input() paginator = true;
  @Input() rows = 10;
  @Input() rowsPerPageOptions = [5, 10, 25];
  @Input() emptyMessage: string | null = null;
  @Input() sortField = '';
  @Input() sortOrder: 1 | -1 = 1;
  @Input() striped = true;

  @ContentChildren(DataTableCellDirective) cellTemplates!: QueryList<DataTableCellDirective>;

  getCellTemplate(field: string): TemplateRef<any> | null {
    return this.cellTemplates?.find(t => t.field === field)?.template ?? null;
  }
}