import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Service, CreateServiceDto, UpdateServiceDto } from '../../core/models/service.model';

@Injectable({ providedIn: 'root' })
export class ServicesService {
  constructor(private http: HttpClient) {}

  getList(activeOnly = false): Observable<Service[]> {
    const url = `${environment.apiUrl}/services`;
    return activeOnly
      ? this.http.get<Service[]>(url, { params: { activeOnly: 'true' } })
      : this.http.get<Service[]>(url);
  }

  getOne(id: string): Observable<Service> {
    return this.http.get<Service>(`${environment.apiUrl}/services/${id}`);
  }

  create(dto: CreateServiceDto): Observable<Service> {
    return this.http.post<Service>(`${environment.apiUrl}/services`, dto);
  }

  update(id: string, dto: UpdateServiceDto): Observable<Service> {
    return this.http.put<Service>(`${environment.apiUrl}/services/${id}`, dto);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/services/${id}`);
  }
}
