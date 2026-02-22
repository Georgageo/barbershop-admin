export type ModalFieldType = 'text' | 'email' | 'textarea' | 'number' | 'tel' | 'password' | 'checkbox' | 'select';

export interface ModalFieldOption {
  value: string;
  label: string;
}

export interface ModalFieldConfig {
  key: string;
  label: string;
  type: ModalFieldType;
  required?: boolean;
  placeholder?: string;
  maxLength?: number;
  min?: number;
  max?: number;
  rows?: number;
  step?: number;
  hint?: string;
  /** 'half' = one of two columns in a row; 'full' = default, full width */
  width?: 'full' | 'half';
  /** For type 'select': list of options */
  options?: ModalFieldOption[];
}
