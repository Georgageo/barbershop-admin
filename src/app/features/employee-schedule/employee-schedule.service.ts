import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ScheduleEntryUser {
  id: string;
  firstName: string;
  lastName: string;
}

export interface ScheduleEntryShop {
  id: string;
  name: string;
}

export interface ScheduleEntry {
  userId: string;
  shopId: string;
  workDate: string; // ISO date
  openAtMinutes: number | null;
  closeAtMinutes: number | null;
  user: ScheduleEntryUser;
  shop: ScheduleEntryShop;
}

export interface SetEmployeeWorkDayDto {
  workDate: string; // YYYY-MM-DD
  openAtMinutes?: number;
  closeAtMinutes?: number;
}

@Injectable({ providedIn: 'root' })
export class EmployeeScheduleService {
  constructor(private http: HttpClient) {}

  getSchedule(
    from: Date,
    to: Date,
    userId?: string,
    shopId?: string
  ): Observable<ScheduleEntry[]> {
    const toYmd = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };
    let params = new HttpParams()
      .set('from', toYmd(from))
      .set('to', toYmd(to));
    if (userId) params = params.set('userId', userId);
    if (shopId) params = params.set('shopId', shopId);
    return this.http.get<ScheduleEntry[]>(`${environment.apiUrl}/employee-schedule`, { params });
  }

  setWorkDay(
    userId: string,
    shopId: string,
    dto: SetEmployeeWorkDayDto
  ): Observable<ScheduleEntry> {
    return this.http.post<ScheduleEntry>(
      `${environment.apiUrl}/employee-schedule/users/${userId}/shops/${shopId}`,
      dto
    );
  }

  removeWorkDay(userId: string, workDate: string): Observable<{ success: boolean }> {
    const dateStr = workDate.slice(0, 10); // YYYY-MM-DD
    return this.http.delete<{ success: boolean }>(
      `${environment.apiUrl}/employee-schedule/users/${userId}/dates/${dateStr}`
    );
  }
}
