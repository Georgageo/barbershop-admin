import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Appointment, AppointmentStatus } from '../../core/models/appointment.model';
import { environment } from '../../../environments/environment';

export interface AvailabilityResponse {
  barber: {
    id: string;
    isAvailable: boolean;
    services: { id: string; name: string; durationMinutes: number; priceCents: number }[];
  };
  bookedSlots: { startAt: string; endAt: string }[];
  openingHours?: Record<string, { openAtMinutes: number; closeAtMinutes: number; sortOrder: number }[]>;
  /** When serviceId is passed: date (YYYY-MM-DD) -> array of "HH:mm" start times (15-min granularity). */
  availableStartTimes?: Record<string, string[]>;
}

export interface CreateAppointmentByAdminDto {
  customerId: string;
  barberId: string;
  shopId: string;
  serviceId: string;
  startAt: string;
  notes?: string;
}

@Injectable({ providedIn: 'root' })
export class AppointmentsService {
  constructor(private http: HttpClient) {}

  getList(): Observable<Appointment[]> {
    return this.http.get<Appointment[]>(`${environment.apiUrl}/appointments`);
  }

  getOne(id: string): Observable<Appointment> {
    return this.http.get<Appointment>(`${environment.apiUrl}/appointments/${id}`);
  }

  updateStatus(id: string, status: AppointmentStatus): Observable<Appointment> {
    return this.http.post<Appointment>(`${environment.apiUrl}/appointments/${id}/status`, { status });
  }

  getAvailability(
    barberId: string,
    shopId: string,
    from: string,
    to: string,
    serviceId?: string,
  ): Observable<AvailabilityResponse> {
    let params = new HttpParams().set('shopId', shopId).set('from', from).set('to', to);
    if (serviceId) params = params.set('serviceId', serviceId);
    return this.http.get<AvailabilityResponse>(
      `${environment.apiUrl}/appointments/availability/${barberId}`,
      { params },
    );
  }

  createForCustomer(dto: CreateAppointmentByAdminDto): Observable<Appointment> {
    return this.http.post<Appointment>(`${environment.apiUrl}/appointments/admin`, dto);
  }
}
