import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export type OpeningHoursByDay = Record<
  string,
  { openAtMinutes: number; closeAtMinutes: number; sortOrder: number }[]
>;

export interface SlotItemDto {
  dayOfWeek: number;
  openAtMinutes: number;
  closeAtMinutes: number;
  sortOrder?: number;
}

@Injectable({ providedIn: 'root' })
export class ShopHoursService {
  constructor(private http: HttpClient) {}

  getHours(shopId: string): Observable<OpeningHoursByDay> {
    return this.http.get<OpeningHoursByDay>(`${environment.apiUrl}/shops/${shopId}/hours`);
  }

  setHours(shopId: string, slots: SlotItemDto[]): Observable<OpeningHoursByDay> {
    return this.http.put<OpeningHoursByDay>(`${environment.apiUrl}/shops/${shopId}/hours`, { slots });
  }
}
