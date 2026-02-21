import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { BarbersService } from '../../features/barbers/barbers.service';
import { UsersService } from '../../features/users/users.service';
import { ServicesService } from '../../features/services/services.service';
import { EmployeeScheduleService, ScheduleEntry } from '../../features/employee-schedule/employee-schedule.service';
import {
  Barber,
  CreateBarberDto,
  UpdateBarberDto,
  UserEligibleForBarber,
} from '../../core/models/barber.model';
import { Service } from '../../core/models/service.model';

const WEEKDAY_NAMES = ['Κυρ', 'Δευ', 'Τρι', 'Τετ', 'Πεμ', 'Παρ', 'Σαβ'];

export interface CalendarDay {
  date: Date | null;
  dayOfMonth: number | null;
  isCurrentMonth: boolean;
  isoDate: string;
  entries: ScheduleEntry[];
}

@Component({
  selector: 'app-barbers',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './barbers.component.html',
  styleUrl: './barbers.component.scss',
})
export class BarbersComponent implements OnInit {
  private barbersService = inject(BarbersService);
  private usersService = inject(UsersService);
  private servicesService = inject(ServicesService);
  private scheduleService = inject(EmployeeScheduleService);

  list = signal<Barber[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);
  showCreateModal = signal(false);
  showServicesModal = signal(false);
  saving = signal(false);

  /** View: list | calendar */
  viewMode = signal<'list' | 'calendar'>('list');
  calendarMonth = signal(new Date());
  scheduleEntries = signal<ScheduleEntry[]>([]);
  calendarLoading = signal(false);
  calendarUserId = signal('');

  eligibleUsers = signal<UserEligibleForBarber[]>([]);
  allServices = signal<Service[]>([]);
  barberForServices = signal<Barber | null>(null);
  barberServicesLoading = signal(false);
  barberServicesError = signal<string | null>(null);

  form: CreateBarberDto = {
    userId: '',
    bio: '',
    title: '',
    isAvailable: true,
  };

  barberWithServices = signal<Barber | null>(null);
  assignedServiceIds = signal<Set<string>>(new Set());

  readonly weekDays = WEEKDAY_NAMES;

  /** Calendar grid: array of weeks, each week is 7 CalendarDay cells. */
  calendarGrid = computed(() => {
    const month = this.calendarMonth();
    const entries = this.scheduleEntries();
    const entriesByDate = new Map<string, ScheduleEntry[]>();
    for (const e of entries) {
      const key = e.workDate.slice(0, 10);
      if (!entriesByDate.has(key)) entriesByDate.set(key, []);
      entriesByDate.get(key)!.push(e);
    }

    const year = month.getFullYear();
    const m = month.getMonth();
    const first = new Date(year, m, 1);
    const last = new Date(year, m + 1, 0);
    const startPad = first.getDay();
    const totalDays = last.getDate();

    const weeks: CalendarDay[][] = [];
    let week: CalendarDay[] = [];
    for (let i = 0; i < startPad; i++) {
      const prevMonth = new Date(year, m, 1 - (startPad - i));
      week.push({
        date: prevMonth,
        dayOfMonth: prevMonth.getDate(),
        isCurrentMonth: false,
        isoDate: prevMonth.toISOString().slice(0, 10),
        entries: entriesByDate.get(prevMonth.toISOString().slice(0, 10)) ?? [],
      });
    }
    for (let d = 1; d <= totalDays; d++) {
      const date = new Date(year, m, d);
      const iso = date.toISOString().slice(0, 10);
      week.push({
        date,
        dayOfMonth: d,
        isCurrentMonth: true,
        isoDate: iso,
        entries: entriesByDate.get(iso) ?? [],
      });
      if (week.length === 7) {
        weeks.push(week);
        week = [];
      }
    }
    if (week.length > 0) {
      let nextD = 1;
      while (week.length < 7) {
        const date = new Date(year, m + 1, nextD++);
        week.push({
          date,
          dayOfMonth: date.getDate(),
          isCurrentMonth: false,
          isoDate: date.toISOString().slice(0, 10),
          entries: entriesByDate.get(date.toISOString().slice(0, 10)) ?? [],
        });
      }
      weeks.push(week);
    }
    return weeks;
  });

  calendarMonthLabel = computed(() => {
    const d = this.calendarMonth();
    return d.toLocaleDateString('el-GR', { month: 'long', year: 'numeric' });
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.barbersService.getList().subscribe({
      next: (data) => {
        this.list.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err.error?.message ?? 'Σφάλμα φόρτωσης κουρέαων');
        this.loading.set(false);
      },
    });
  }

  openCreateModal(): void {
    this.form = {
      userId: '',
      bio: '',
      title: '',
      isAvailable: true,
    };
    this.error.set(null);
    this.eligibleUsers.set([]);
    this.usersService.getEligibleForBarber().subscribe({
      next: (users) => {
        this.eligibleUsers.set(users);
        this.showCreateModal.set(true);
      },
      error: (err) => {
        this.error.set(err.error?.message ?? 'Σφάλμα φόρτωσης χρηστών');
      },
    });
  }

  closeCreateModal(): void {
    this.showCreateModal.set(false);
    this.error.set(null);
  }

  saveCreate(): void {
    if (!this.form.userId) {
      this.error.set('Επιλέξτε χρήστη.');
      return;
    }
    this.saving.set(true);
    this.error.set(null);
    this.barbersService.create(this.form).subscribe({
      next: () => {
        this.closeCreateModal();
        this.load();
        this.saving.set(false);
      },
      error: (err) => {
        this.error.set(err.error?.message ?? 'Σφάλμα δημιουργίας κουρέα');
        this.saving.set(false);
      },
    });
  }

  toggleAvailable(barber: Barber): void {
    const dto: UpdateBarberDto = { isAvailable: !barber.isAvailable };
    this.barbersService.update(barber.id, dto).subscribe({
      next: () => this.load(),
      error: () => this.error.set('Σφάλμα ενημέρωσης'),
    });
  }

  openServicesModal(barber: Barber): void {
    this.barberForServices.set(barber);
    this.barberServicesError.set(null);
    this.barberServicesLoading.set(true);
    this.showServicesModal.set(true);

    this.servicesService.getList(true).subscribe({
      next: (services) => this.allServices.set(services),
      error: () => this.barberServicesError.set('Σφάλμα φόρτωσης υπηρεσιών'),
    });

    this.barbersService.getOne(barber.id).subscribe({
      next: (b) => {
        this.barberWithServices.set(b);
        const ids = new Set((b.barberServices ?? []).map(bs => bs.serviceId));
        this.assignedServiceIds.set(ids);
        this.barberServicesLoading.set(false);
      },
      error: (err) => {
        this.barberServicesError.set(err.error?.message ?? 'Σφάλμα φόρτωσης κουρέα');
        this.barberServicesLoading.set(false);
      },
    });
  }

  closeServicesModal(): void {
    this.showServicesModal.set(false);
    this.barberForServices.set(null);
    this.barberWithServices.set(null);
    this.barberServicesError.set(null);
  }

  isServiceAssigned(serviceId: string): boolean {
    return this.assignedServiceIds().has(serviceId);
  }

  toggleBarberService(serviceId: string): void {
    const barber = this.barberForServices();
    if (!barber) return;

    const assigned = new Set(this.assignedServiceIds());
    if (assigned.has(serviceId)) {
      this.barbersService.removeService(barber.id, serviceId).subscribe({
        next: () => {
          assigned.delete(serviceId);
          this.assignedServiceIds.set(new Set(assigned));
        },
        error: () => this.barberServicesError.set('Σφάλμα αφαίρεσης υπηρεσίας'),
      });
    } else {
      this.barbersService.addService(barber.id, serviceId).subscribe({
        next: () => {
          assigned.add(serviceId);
          this.assignedServiceIds.set(new Set(assigned));
        },
        error: () => this.barberServicesError.set('Σφάλμα προσθήκης υπηρεσίας'),
      });
    }
  }

  displayName(barber: Barber): string {
    const u = barber.user;
    return [u.firstName, u.lastName].filter(Boolean).join(' ') || '—';
  }

  setViewMode(mode: 'list' | 'calendar'): void {
    this.viewMode.set(mode);
    if (mode === 'calendar') this.loadCalendar();
  }

  prevMonth(): void {
    const d = new Date(this.calendarMonth());
    d.setMonth(d.getMonth() - 1);
    this.calendarMonth.set(d);
    this.loadCalendar();
  }

  nextMonth(): void {
    const d = new Date(this.calendarMonth());
    d.setMonth(d.getMonth() + 1);
    this.calendarMonth.set(d);
    this.loadCalendar();
  }

  loadCalendar(): void {
    const month = this.calendarMonth();
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const last = new Date(month.getFullYear(), month.getMonth() + 1, 0);
    this.calendarLoading.set(true);
    this.scheduleService
      .getSchedule(first, last, this.calendarUserId() || undefined, undefined)
      .subscribe({
        next: (entries) => {
          this.scheduleEntries.set(entries);
          this.calendarLoading.set(false);
        },
        error: () => {
          this.calendarLoading.set(false);
        },
      });
  }

  onCalendarUserFilterChange(userId: string): void {
    this.calendarUserId.set(userId);
    this.loadCalendar();
  }

  formatEntryHours(entry: ScheduleEntry): string {
    if (entry.openAtMinutes != null && entry.closeAtMinutes != null) {
      const open = Math.floor(entry.openAtMinutes / 60) + ':' + String(entry.openAtMinutes % 60).padStart(2, '0');
      const close = Math.floor(entry.closeAtMinutes / 60) + ':' + String(entry.closeAtMinutes % 60).padStart(2, '0');
      return open + '–' + close;
    }
    return 'Ωράριο μαγαζιού';
  }

  employeeNameForEntry(entry: ScheduleEntry): string {
    const u = entry.user;
    return [u.firstName, u.lastName].filter(Boolean).join(' ') || '—';
  }
}
