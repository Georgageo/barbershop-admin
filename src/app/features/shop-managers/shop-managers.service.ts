import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ShopManagersService {
  constructor(private http: HttpClient) {}

  addManagerToShop(shopId: string, userId: string): Observable<unknown> {
    return this.http.post(`${environment.apiUrl}/shop-managers/shops/${shopId}/managers`, {
      userId,
    });
  }

  removeManagerFromShop(shopId: string, userId: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(
      `${environment.apiUrl}/shop-managers/shops/${shopId}/managers/${userId}`
    );
  }
}
