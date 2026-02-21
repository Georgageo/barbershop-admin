import { Service } from './service.model';

export interface BarberUser {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string | null;
}

export interface BarberServiceRelation {
  id: string;
  barberId: string;
  serviceId: string;
  service: Service;
}

export interface Barber {
  id: string;
  userId: string;
  user: BarberUser;
  bio: string | null;
  title: string | null;
  isAvailable: boolean;
  createdAt: string;
  updatedAt: string;
  barberServices?: BarberServiceRelation[];
}

export interface CreateBarberDto {
  userId: string;
  bio?: string;
  title?: string;
  isAvailable?: boolean;
}

export interface UpdateBarberDto {
  bio?: string;
  title?: string;
  isAvailable?: boolean;
}

export interface UserEligibleForBarber {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}
