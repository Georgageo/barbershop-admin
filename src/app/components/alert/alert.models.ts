export type AlertType = 'confirm' | 'info' | 'warning' | 'success';

export interface AlertConfig {
  title: string;
  message: string;
  type?: AlertType;
  confirmText?: string;
  cancelText?: string;
  showCancel?: boolean;
}
