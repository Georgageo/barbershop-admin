import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Invitation {
  id: string;
  email: string;
  role: string;
  expiresAt: string;
  createdAt: string;
  firstName?: string | null;
  lastName?: string | null;
}

export interface CreateInvitationDto {
  email: string;
  role: 'ADMIN' | 'BARBER' | 'MANAGER';
  firstName?: string;
  lastName?: string;
}

@Injectable({ providedIn: 'root' })
export class InvitationsService {
  constructor(private http: HttpClient) {}

  getList(): Observable<Invitation[]> {
    return this.http.get<Invitation[]>(`${environment.apiUrl}/invitations`);
  }

  create(dto: CreateInvitationDto): Observable<Invitation> {
    return this.http.post<Invitation>(`${environment.apiUrl}/invitations`, dto);
  }
}
