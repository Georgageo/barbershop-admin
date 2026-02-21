import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Shop {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateShopDto {
  name: string;
  phone?: string;
  address?: string;
}

export interface UpdateShopDto {
  name?: string;
  phone?: string;
  address?: string;
}

@Injectable({ providedIn: 'root' })
export class ShopsService {
  constructor(private http: HttpClient) {}

  getList(): Observable<Shop[]> {
    return this.http.get<Shop[]>(`${environment.apiUrl}/shops`);
  }

  /** For MANAGER: only shops they manage. */
  getMyShops(): Observable<Shop[]> {
    return this.http.get<Shop[]>(`${environment.apiUrl}/shop-managers/my-shops`);
  }

  getOne(id: string): Observable<Shop> {
    return this.http.get<Shop>(`${environment.apiUrl}/shops/${id}`);
  }

  create(dto: CreateShopDto): Observable<Shop> {
    return this.http.post<Shop>(`${environment.apiUrl}/shops`, dto);
  }

  update(id: string, dto: UpdateShopDto): Observable<Shop> {
    return this.http.patch<Shop>(`${environment.apiUrl}/shops/${id}`, dto);
  }

  delete(id: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${environment.apiUrl}/shops/${id}`);
  }
}
