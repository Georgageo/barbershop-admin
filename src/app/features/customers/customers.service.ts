import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Customer {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  createdAt?: string;
}

export interface CreateCustomerDto {
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
}

@Injectable({ providedIn: 'root' })
export class CustomersService {
  constructor(private http: HttpClient) {}

  getList(search?: string): Observable<Customer[]> {
    let params = new HttpParams();
    if (search?.trim()) params = params.set('search', search.trim());
    return this.http.get<Customer[]>(`${environment.apiUrl}/users/customers`, { params });
  }

  create(dto: CreateCustomerDto): Observable<Customer> {
    return this.http.post<Customer>(`${environment.apiUrl}/users/customers`, dto);
  }
}
