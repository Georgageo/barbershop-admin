import { TemplateRef } from '@angular/core';

export interface TableColumn {
  field: string;
  header: string;
  sortable?: boolean;
}

export interface TableAction<T = any> {
  icon: string;            // PrimeIcon, e.g. 'pi pi-pencil'
  tooltip?: string;
  severity?: 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast';
  onClick: (row: T) => void;
  visible?: (row: T) => boolean;
  disabled?: (row: T) => boolean;
}