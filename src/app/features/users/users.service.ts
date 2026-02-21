import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { UserEligibleForBarber } from '../../core/models/barber.model';

export interface Profile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  image: string | null;
  role: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateProfileDto {
  firstName?: string;
  lastName?: string;
  phone?: string;
}

@Injectable({ providedIn: 'root' })
export class UsersService {
  constructor(private http: HttpClient) {}

  getMe(): Observable<Profile> {
    return this.http.get<Profile>(`${environment.apiUrl}/users/me`);
  }

  updateProfile(dto: UpdateProfileDto): Observable<Profile> {
    return this.http.patch<Profile>(`${environment.apiUrl}/users/me`, dto);
  }

  changePassword(currentPassword: string, newPassword: string): Observable<{ success: boolean }> {
    return this.http.patch<{ success: boolean }>(`${environment.apiUrl}/users/me/password`, {
      currentPassword,
      newPassword,
    });
  }

  /** Upload profile photo. Returns updated profile. */
  uploadProfileImage(file: File): Observable<{ profile: Profile }> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<{ profile: Profile }>(`${environment.apiUrl}/users/me/avatar`, formData);
  }

  /** Full URL for profile image (image is e.g. "profiles/userId-timestamp.jpg"). */
  profileImageUrl(image: string | null | undefined): string | null {
    if (!image) return null;
    return `${environment.apiUrl}/uploads/${image}`;
  }

  getEligibleForBarber(): Observable<UserEligibleForBarber[]> {
    return this.http.get<UserEligibleForBarber[]>(`${environment.apiUrl}/users`);
  }

  /** Staff (barbers + managers) for admin team page. */
  getStaff(): Observable<StaffMember[]> {
    return this.http.get<StaffMember[]>(`${environment.apiUrl}/users/staff`);
  }
}

export interface StaffMember {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  image: string | null;
  role: 'BARBER' | 'MANAGER';
  barberId?: string;
  barber?: { id: string; isAvailable: boolean; services: { id: string; name: string }[] };
  managedShops?: { shopId: string; shop: { id: string; name: string } }[];
}
