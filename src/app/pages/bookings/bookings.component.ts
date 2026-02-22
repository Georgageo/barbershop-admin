import { Component, OnInit, OnDestroy, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { AppointmentsService, AvailabilityResponse, CreateAppointmentByAdminDto } from '../../features/appointments/appointments.service';
import { AuthService } from '../../core/auth/auth.service';
import { Appointment, AppointmentStatus } from '../../core/models/appointment.model';
import { CustomersService, Customer, CreateCustomerDto } from '../../features/customers/customers.service';
import { ShopsService } from '../../features/shops/shops.service';
import { BarbersService } from '../../features/barbers/barbers.service';
import { ServicesService } from '../../features/services/services.service';
import { Shop } from '../../features/shops/shops.service';
import { Barber } from '../../core/models/barber.model';
import { Service } from '../../core/models/service.model';
import { TableColumn } from '../../components/table/table.models';
import { TableComponent } from '../../components/table/table.component';
import { DataTableCellDirective } from '../../components/table/table-cell.directive';
import { CardListComponent } from '../../components/card-list/card-list.component';
import { CardItemDirective } from '../../components/card-list/card-item.directive';

const DAY_NAMES_EL = ['Κυριακή', 'Δευτέρα', 'Τρίτη', 'Τετάρτη', 'Πέμπτη', 'Παρασκευή', 'Σάββατο'];
const DAY_NAMES_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

@Component({
  selector: 'app-bookings',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    TableComponent,
    DataTableCellDirective,
    CardListComponent,
    CardItemDirective,
  ],
  templateUrl: './bookings.component.html',
  styleUrl: './bookings.component.scss',
})
export class BookingsComponent implements OnInit, OnDestroy {
  private appointmentsService = inject(AppointmentsService);
  private auth = inject(AuthService);
  private customersService = inject(CustomersService);
  private shopsService = inject(ShopsService);
  private barbersService = inject(BarbersService);
  private servicesService = inject(ServicesService);
  private translate = inject(TranslateService);
  private langSub?: Subscription;

  list = signal<Appointment[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);
  updatingId = signal<string | null>(null);

  filterShopId = signal<string>('');
  filterStatus = signal<AppointmentStatus | ''>('');

  filteredList = computed(() => {
    const all = this.list();
    const shopId = this.filterShopId();
    const status = this.filterStatus();
    return all.filter((a) => {
      if (shopId && a.shopId !== shopId) return false;
      if (status && a.status !== status) return false;
      return true;
    });
  });

  statusOptions: { value: AppointmentStatus; label: string }[] = [];
  barberColumns: TableColumn[] = [];
  adminColumns: TableColumn[] = [];

  private readonly statusKeys: Record<AppointmentStatus, string> = {
    PENDING: 'bookings.statusPending',
    CONFIRMED: 'bookings.statusConfirmed',
    IN_PROGRESS: 'bookings.statusInProgress',
    COMPLETED: 'bookings.statusCompleted',
    CANCELLED: 'bookings.statusCancelled',
    NO_SHOW: 'bookings.statusNoShow',
  };
  statusLabel = (status: AppointmentStatus) => this.translate.instant(this.statusKeys[status]) || status;

  private updateStatusOptions(): void {
    const t = (key: string) => this.translate.instant(key);
    this.statusOptions = [
      { value: 'PENDING', label: t('bookings.statusPending') },
      { value: 'CONFIRMED', label: t('bookings.statusConfirmed') },
      { value: 'IN_PROGRESS', label: t('bookings.statusInProgress') },
      { value: 'COMPLETED', label: t('bookings.statusCompleted') },
      { value: 'CANCELLED', label: t('bookings.statusCancelled') },
      { value: 'NO_SHOW', label: t('bookings.statusNoShow') },
    ];
    this.barberColumns = [
      { field: 'dateTime', header: t('bookings.dateTime') },
      { field: 'customer', header: t('bookings.customer') },
      { field: 'service', header: t('bookings.service') },
      { field: 'status', header: t('common.status') },
      { field: 'statusChange', header: t('common.actions') },
    ];
    this.adminColumns = [
      { field: 'dateTime', header: t('bookings.dateTime') },
      { field: 'customer', header: t('bookings.customer') },
      { field: 'shop', header: t('bookings.shop') },
      { field: 'barber', header: t('bookings.barber') },
      { field: 'service', header: t('bookings.service') },
      { field: 'status', header: t('common.status') },
      { field: 'statusChange', header: t('common.actions') },
    ];
  }

  get isBarber(): boolean {
    return this.auth.currentUser()?.role === 'BARBER';
  }

  get isAdmin(): boolean {
    return this.auth.currentUser()?.role === 'ADMIN';
  }

  get isAdminOrManager(): boolean {
    const role = this.auth.currentUser()?.role;
    return role === 'ADMIN' || role === 'MANAGER';
  }

  getBookingsEmptyMessage(): string {
    if (this.isBarber) return this.translate.instant('bookings.noAppointmentsBarber');
    if (this.filterShopId() || this.filterStatus()) return this.translate.instant('bookings.noBookingsFilter');
    return this.translate.instant('bookings.noBookings');
  }

  // New booking modal (admin only)
  showNewBookingModal = signal(false);
  customers = signal<Customer[]>([]);
  customersLoading = signal(false);
  selectedCustomerId = signal<string>('');
  customerSearch = signal('');
  showAddCustomerForm = signal(false);
  newCustomerForm: CreateCustomerDto = { firstName: '', lastName: '', phone: '', email: '' };
  creatingCustomer = signal(false);

  shops = signal<Shop[]>([]);
  barbers = signal<Barber[]>([]);
  services = signal<Service[]>([]);
  selectedShopId = signal('');
  selectedBarberId = signal('');
  selectedServiceId = signal('');
  availableDays: { label: string; value: string }[] = [];
  selectedDay = signal('');
  selectedTime = signal('');
  availability = signal<AvailabilityResponse | null>(null);
  availabilityLoading = signal(false);
  newBookingNotes = signal('');
  newBookingSaving = signal(false);
  newBookingError = signal<string | null>(null);
  newBookingSuccess = signal<string | null>(null);

  barberServicesForSelection = computed(() => {
    const av = this.availability();
    return av?.barber?.services ?? [];
  });

  ngOnInit(): void {
    this.updateStatusOptions();
    this.langSub = this.translate.onLangChange.subscribe(() => {
      this.updateStatusOptions();
      this.initAvailableDays();
    });
    this.load();
    this.initAvailableDays();
    if (this.isAdminOrManager) {
      const isManager = this.auth.currentUser()?.role === 'MANAGER';
      const shopsRequest = isManager ? this.shopsService.getMyShops() : this.shopsService.getList();
      shopsRequest.subscribe({ next: (list) => this.shops.set(list), error: () => {} });
    }
  }

  ngOnDestroy(): void {
    this.langSub?.unsubscribe();
  }

  private toLocalDateString(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  private initAvailableDays(): void {
    const dayNames = this.translate.currentLang === 'el' ? DAY_NAMES_EL : DAY_NAMES_EN;
    const today = new Date();
    this.availableDays = [];
    for (let i = 0; i < 14; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      this.availableDays.push({
        label: `${dayNames[d.getDay()]}, ${d.getDate()}/${d.getMonth() + 1}`,
        value: this.toLocalDateString(d),
      });
    }
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.appointmentsService.getList().subscribe({
      next: (data) => {
        this.list.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err.error?.message ?? this.translate.instant('bookings.errorLoad'));
        this.loading.set(false);
      },
    });
  }

  openNewBookingModal(): void {
    this.showNewBookingModal.set(true);
    this.newBookingError.set(null);
    this.newBookingSuccess.set(null);
    this.selectedCustomerId.set('');
    this.customerSearch.set('');
    this.showAddCustomerForm.set(false);
    this.selectedShopId.set('');
    this.selectedBarberId.set('');
    this.selectedServiceId.set('');
    this.selectedDay.set(this.availableDays[0]?.value ?? '');
    this.selectedTime.set('');
    this.availability.set(null);
    this.newBookingNotes.set('');
    this.loadCustomers();
    const isManager = this.auth.currentUser()?.role === 'MANAGER';
    const shopsRequest = isManager ? this.shopsService.getMyShops() : this.shopsService.getList();
    shopsRequest.subscribe({
      next: (list) => this.shops.set(list),
      error: () => {},
    });
    this.barbersService.getList(false).subscribe({
      next: (list) => this.barbers.set(list),
      error: () => {},
    });
    this.servicesService.getList(true).subscribe({
      next: (list) => this.services.set(list),
      error: () => {},
    });
  }

  closeNewBookingModal(): void {
    this.showNewBookingModal.set(false);
  }

  loadCustomers(): void {
    this.customersLoading.set(true);
    this.customersService.getList(this.customerSearch() || undefined).subscribe({
      next: (list) => {
        this.customers.set(list);
        this.customersLoading.set(false);
      },
      error: () => this.customersLoading.set(false),
    });
  }

  onCustomerSearchInput(): void {
    this.loadCustomers();
  }

  toggleAddCustomerForm(): void {
    this.showAddCustomerForm.update((v) => !v);
    if (this.showAddCustomerForm()) {
      this.newCustomerForm = { firstName: '', lastName: '', phone: '', email: '' };
    }
  }

  createCustomerAndSelect(): void {
    if (!this.newCustomerForm.firstName?.trim() || !this.newCustomerForm.lastName?.trim() || !this.newCustomerForm.phone?.trim()) {
      this.newBookingError.set(this.translate.instant('customers.fillRequired'));
      return;
    }
    this.creatingCustomer.set(true);
    this.newBookingError.set(null);
    this.customersService.create(this.newCustomerForm).subscribe({
      next: (c) => {
        this.customers.update((list) => [c, ...list]);
        this.selectedCustomerId.set(c.id);
        this.showAddCustomerForm.set(false);
        this.newCustomerForm = { firstName: '', lastName: '', phone: '', email: '' };
        this.creatingCustomer.set(false);
      },
      error: (err) => {
        this.newBookingError.set(err.error?.message ?? 'Σφάλμα δημιουργίας πελάτη');
        this.creatingCustomer.set(false);
      },
    });
  }

  onNewBookingBarberOrShopChange(): void {
    this.selectedServiceId.set('');
    this.selectedTime.set('');
    this.availability.set(null);
    this.loadAvailability();
  }

  onNewBookingServiceChange(): void {
    this.selectedTime.set('');
    this.loadAvailability();
  }

  onNewBookingDayChange(): void {
    this.updateAvailableTimes();
  }

  private loadAvailability(): void {
    const barberId = this.selectedBarberId();
    const shopId = this.selectedShopId();
    if (!barberId || !shopId) return;
    const from = new Date();
    from.setHours(0, 0, 0, 0);
    const to = new Date(from);
    to.setDate(to.getDate() + 14);
    const fromStr = this.toLocalDateString(from);
    const toStr = this.toLocalDateString(to);
    const serviceId = this.selectedServiceId();
    this.availabilityLoading.set(true);
    this.appointmentsService
      .getAvailability(barberId, shopId, fromStr, toStr, serviceId || undefined)
      .subscribe({
        next: (data) => {
          this.availability.set(data);
          this.availabilityLoading.set(false);
          this.updateAvailableTimes();
        },
        error: () => this.availabilityLoading.set(false),
      });
  }

  private updateAvailableTimes(): void {
    const slots = this.getAvailableTimeSlots();
    if (slots.length > 0 && !slots.includes(this.selectedTime())) {
      this.selectedTime.set(slots[0]);
    } else if (slots.length === 0) {
      this.selectedTime.set('');
    }
  }

  /** Μόνο τα slots από το backend (availableStartTimes). Δεν εμφανίζονται ώρες που δεν επέστρεψε το API. */
  getAvailableTimeSlots(): string[] {
    const av = this.availability();
    const day = this.selectedDay();
    if (!day || !av?.availableStartTimes) return [];
    return av.availableStartTimes[day] ?? [];
  }

  submitNewBooking(): void {
    this.newBookingError.set(null);
    this.newBookingSuccess.set(null);
    const customerId = this.selectedCustomerId();
    const shopId = this.selectedShopId();
    const barberId = this.selectedBarberId();
    const serviceId = this.selectedServiceId();
    const day = this.selectedDay();
    const time = this.selectedTime();
    if (!customerId || !shopId || !barberId || !serviceId || !day || !time) {
      this.newBookingError.set('Συμπληρώστε πελάτη, κατάστημα, κουρέα, υπηρεσία, ημερομηνία και ώρα.');
      return;
    }
    const [h, min] = time.split(':').map(Number);
    const startAt = new Date(day);
    startAt.setHours(h, min, 0, 0);
    const dto: CreateAppointmentByAdminDto = {
      customerId,
      barberId,
      shopId,
      serviceId,
      startAt: startAt.toISOString(),
      notes: this.newBookingNotes()?.trim() || undefined,
    };
    this.newBookingSaving.set(true);
    this.appointmentsService.createForCustomer(dto).subscribe({
      next: (app) => {
        this.newBookingSaving.set(false);
        this.newBookingSuccess.set(
          `Η κράτηση ολοκληρώθηκε: ${app.service.name} για ${app.customer.firstName} ${app.customer.lastName} στις ${new Date(app.startAt).toLocaleString('el-GR')}.`,
        );
        this.load();
        setTimeout(() => {
          this.closeNewBookingModal();
        }, 2000);
      },
      error: (err) => {
        this.newBookingError.set(err.error?.message ?? 'Σφάλμα κατά την κράτηση');
        this.newBookingSaving.set(false);
      },
    });
  }

  changeStatus(appointment: Appointment, newStatus: AppointmentStatus): void {
    if (appointment.status === newStatus) return;
    this.updatingId.set(appointment.id);
    this.appointmentsService.updateStatus(appointment.id, newStatus).subscribe({
      next: (updated) => {
        this.list.update((items) =>
          items.map((a) => (a.id === updated.id ? updated : a)),
        );
        this.updatingId.set(null);
      },
      error: () => {
        this.updatingId.set(null);
      },
    });
  }

  formatDate(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleDateString('el-GR', {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }

  formatTime(iso: string): string {
    return new Date(iso).toLocaleTimeString('el-GR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  customerName(a: Appointment): string {
    const c = a.customer;
    return `${c.firstName} ${c.lastName}`.trim() || c.email;
  }

  barberName(a: Appointment): string {
    const u = a.barber?.user;
    return u ? `${u.firstName} ${u.lastName}`.trim() : '—';
  }

  customerDisplayName(c: Customer): string {
    return `${c.firstName} ${c.lastName}`.trim() || c.email;
  }
}