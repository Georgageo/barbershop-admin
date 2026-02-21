import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  Barber,
  CreateBarberDto,
  UpdateBarberDto,
} from '../../core/models/barber.model';

@Injectable({ providedIn: 'root' })
export class BarbersService {
  constructor(private http: HttpClient) {}

  getList(availableOnly = false): Observable<Barber[]> {
    const url = `${environment.apiUrl}/barbers`;
    return availableOnly
      ? this.http.get<Barber[]>(url, { params: { availableOnly: 'true' } })
      : this.http.get<Barber[]>(url);
  }

  getOne(id: string): Observable<Barber> {
    return this.http.get<Barber>(`${environment.apiUrl}/barbers/${id}`);
  }

  create(dto: CreateBarberDto): Observable<Barber> {
    return this.http.post<Barber>(`${environment.apiUrl}/barbers`, dto);
  }

  update(id: string, dto: UpdateBarberDto): Observable<Barber> {
    return this.http.patch<Barber>(`${environment.apiUrl}/barbers/${id}`, dto);
  }

  addService(barberId: string, serviceId: string): Observable<{ barberId: string; serviceId: string }> {
    return this.http.post<{ barberId: string; serviceId: string }>(
      `${environment.apiUrl}/barbers/${barberId}/services/${serviceId}`,
      {}
    );
  }

  removeService(barberId: string, serviceId: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(
      `${environment.apiUrl}/barbers/${barberId}/services/${serviceId}`
    );
  }
}
