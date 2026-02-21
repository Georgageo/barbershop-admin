export type AppointmentStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'NO_SHOW';

export interface AppointmentCustomer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
}

export interface AppointmentBarberUser {
  firstName: string;
  lastName: string;
}

export interface AppointmentBarber {
  id: string;
  user: AppointmentBarberUser;
}

export interface AppointmentService {
  id: string;
  name: string;
  durationMinutes: number;
  priceCents: number;
}

export interface AppointmentShop {
  id: string;
  name: string;
}

export interface Appointment {
  id: string;
  customerId: string;
  barberId: string;
  shopId: string;
  serviceId: string;
  status: AppointmentStatus;
  startAt: string;
  endAt: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  customer: AppointmentCustomer;
  barber: AppointmentBarber;
  shop?: AppointmentShop;
  service: AppointmentService;
}
