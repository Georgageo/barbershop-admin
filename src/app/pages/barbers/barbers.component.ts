import { Component, OnInit, OnDestroy, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subscription, forkJoin } from 'rxjs';
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
import { TableColumn } from '../../components/table/table.models';
import { TableComponent } from '../../components/table/table.component';
import { DataTableCellDirective } from '../../components/table/table-cell.directive';
import { CardListComponent } from '../../components/card-list/card-list.component';
import { CardItemDirective } from '../../components/card-list/card-item.directive';
import { ModalComponent } from '../../components/modal/modal.component';
import { ModalActionsDirective } from '../../components/modal/modal-actions.directive';
import { ModalBodyDirective } from '../../components/modal/modal-body.directive';
import { ModalFieldConfig } from '../../components/modal/modal.models';
import {
  ScheduleCalendarDay,
  ScheduleCalendarTableComponent,
} from '../../components/schedule-calendar-table/schedule-calendar-table.component';

const WEEKDAY_NAMES = ['Κυρ', 'Δευ', 'Τρι', 'Τετ', 'Πεμ', 'Παρ', 'Σαβ'];

/** Format date as YYYY-MM-DD in local timezone (for matching API workDate calendar dates). */
function toLocalDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

@Component({
  selector: 'app-barbers',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    TranslateModule,
    TableComponent,
    DataTableCellDirective,
    CardListComponent,
    CardItemDirective,
    ModalComponent,
    ModalActionsDirective,
    ModalBodyDirective,
    ScheduleCalendarTableComponent,
  ],
  templateUrl: './barbers.component.html',
  styleUrl: './barbers.component.scss',
})
export class BarbersComponent implements OnInit, OnDestroy {
  private barbersService = inject(BarbersService);
  private usersService = inject(UsersService);
  private servicesService = inject(ServicesService);
  private scheduleService = inject(EmployeeScheduleService);
  private translate = inject(TranslateService);
  private langSub?: Subscription;

  list = signal<Barber[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);
  viewMode = signal<'list' | 'calendar'>('list');
  calendarMonth = signal(new Date());
  scheduleEntries = signal<ScheduleEntry[]>([]);
  calendarLoading = signal(false);
  calendarUserId = signal('');

  showCreateModal = signal(false);
  showEditModal = signal(false);
  barberForEdit = signal<Barber | null>(null);
  saving = signal(false);
  eligibleUsers = signal<UserEligibleForBarber[]>([]);

  createForm: Record<string, unknown> = {
    userId: '',
    title: '',
    bio: '',
    isAvailable: true,
  };

  editForm: Record<string, unknown> = {
    title: '',
    bio: '',
    isAvailable: true,
  };

  columns: TableColumn[] = [];

  allServices = signal<Service[]>([]);
  assignedServiceIds = signal<Set<string>>(new Set());
  initialServiceIds = signal<Set<string>>(new Set());
  editServicesLoading = signal(false);

  readonly weekDays = WEEKDAY_NAMES;

  private updateTranslations(): void {
    const t = (key: string) => this.translate.instant(key);
    this.columns = [
      { field: 'name', header: t('common.name'), sortable: true },
      { field: 'email', header: t('common.email'), sortable: true },
      { field: 'title', header: t('staff.barberTitle') },
      { field: 'details', header: t('staff.details') },
      { field: 'actions', header: t('common.actions') },
    ];
  }

  get createFormFields(): ModalFieldConfig[] {
    const t = (key: string) => this.translate.instant(key);
    return [
      {
        key: 'userId',
        label: t('staff.userLabel'),
        type: 'select',
        required: true,
        placeholder: t('staff.selectUser'),
        hint: t('staff.userHint'),
        options: this.eligibleUsers().map((u) => ({
          value: u.id,
          label: `${u.lastName} ${u.firstName} (${u.email})`,
        })),
      },
      {
        key: 'title',
        label: t('staff.barberTitle'),
        type: 'text',
        placeholder: t('staff.barberTitlePlaceholder'),
        maxLength: 100,
      },
      {
        key: 'bio',
        label: t('staff.barberBio'),
        type: 'textarea',
        placeholder: t('common.optional'),
        maxLength: 500,
        rows: 3,
      },
      {
        key: 'isAvailable',
        label: '',
        type: 'checkbox',
        placeholder: t('staff.availableForBookings'),
      },
    ];
  }

  get editFormFields(): ModalFieldConfig[] {
    const t = (key: string) => this.translate.instant(key);
    return [
      {
        key: 'title',
        label: t('staff.barberTitle'),
        type: 'text',
        placeholder: t('staff.barberTitlePlaceholder'),
        maxLength: 100,
      },
      {
        key: 'bio',
        label: t('staff.barberBio'),
        type: 'textarea',
        placeholder: t('common.optional'),
        maxLength: 500,
        rows: 3,
      },
      {
        key: 'isAvailable',
        label: '',
        type: 'checkbox',
        placeholder: t('staff.availableForBookings'),
      },
    ];
  }

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

    const weeks: ScheduleCalendarDay[][] = [];
    let week: ScheduleCalendarDay[] = [];
    for (let i = 0; i < startPad; i++) {
      const prevMonth = new Date(year, m, 1 - (startPad - i));
      const key = toLocalDateKey(prevMonth);
      week.push({
        date: prevMonth,
        dayOfMonth: prevMonth.getDate(),
        isCurrentMonth: false,
        isoDate: key,
        entries: entriesByDate.get(key) ?? [],
      });
    }
    for (let d = 1; d <= totalDays; d++) {
      const date = new Date(year, m, d);
      const key = toLocalDateKey(date);
      week.push({
        date,
        dayOfMonth: d,
        isCurrentMonth: true,
        isoDate: key,
        entries: entriesByDate.get(key) ?? [],
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
        const key = toLocalDateKey(date);
        week.push({
          date,
          dayOfMonth: date.getDate(),
          isCurrentMonth: false,
          isoDate: key,
          entries: entriesByDate.get(key) ?? [],
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
    this.updateTranslations();
    this.langSub = this.translate.onLangChange.subscribe(() => this.updateTranslations());
    this.load();
  }

  ngOnDestroy(): void {
    this.langSub?.unsubscribe();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.barbersService.getList().subscribe({
      next: (data) => {
        this.list.set(data);
        console.log('Barbers list:', data);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err.error?.message ?? 'Σφάλμα φόρτωσης κουρέαων');
        this.loading.set(false);
      },
    });
  }

  setViewMode(mode: 'list' | 'calendar'): void {
    this.viewMode.set(mode);
    if (mode === 'calendar') this.loadCalendar();
  }

  displayName(barber: Barber): string {
    const u = barber.user;
    return [u?.firstName, u?.lastName].filter(Boolean).join(' ') || '—';
  }

  openCreateModal(): void {
    this.createForm = { userId: '', title: '', bio: '', isAvailable: true };
    this.error.set(null);
    this.usersService.getEligibleForBarber().subscribe({
      next: (users) => {
        this.eligibleUsers.set(users);
        this.showCreateModal.set(true);
      },
      error: (err) => this.error.set(err.error?.message ?? 'Σφάλμα φόρτωσης χρηστών'),
    });
  }

  closeCreateModal(): void {
    this.showCreateModal.set(false);
  }

  saveCreate(): void {
    const userId = String(this.createForm['userId'] ?? '').trim();
    if (!userId) return;
    this.saving.set(true);
    this.error.set(null);
    const payload: CreateBarberDto = {
      userId,
      title: (this.createForm['title'] as string)?.trim() || undefined,
      bio: (this.createForm['bio'] as string)?.trim() || undefined,
      isAvailable: this.createForm['isAvailable'] as boolean,
    };
    this.barbersService.create(payload).subscribe({
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

  openEditModal(barber: Barber): void {
    this.barberForEdit.set(barber);
    this.error.set(null);
    this.editServicesLoading.set(true);
    forkJoin({
      services: this.servicesService.getList(true),
      barber: this.barbersService.getOne(barber.id),
    }).subscribe({
      next: ({ services, barber: b }) => {
        this.allServices.set(services);
        this.editForm = {
          title: b.title ?? '',
          bio: b.bio ?? '',
          isAvailable: b.isAvailable ?? true,
        };
        const ids = new Set((b.barberServices ?? []).map((bs) => bs.serviceId));
        this.assignedServiceIds.set(ids);
        this.initialServiceIds.set(new Set(ids));
        this.editServicesLoading.set(false);
        this.showEditModal.set(true);
      },
      error: (err) => {
        this.error.set(err.error?.message ?? this.translate.instant('staff.errorLoadBarber'));
        this.editServicesLoading.set(false);
      },
    });
  }

  closeEditModal(): void {
    this.showEditModal.set(false);
    this.barberForEdit.set(null);
    this.assignedServiceIds.set(new Set());
    this.initialServiceIds.set(new Set());
  }

  saveEdit(): void {
    const barber = this.barberForEdit();
    if (!barber) return;
    this.saving.set(true);
    this.error.set(null);
    const payload: UpdateBarberDto = {
      title: (this.editForm['title'] as string)?.trim() || undefined,
      bio: (this.editForm['bio'] as string)?.trim() || undefined,
      isAvailable: this.editForm['isAvailable'] as boolean,
    };
    const initial = this.initialServiceIds();
    const current = this.assignedServiceIds();
    const toAdd = [...current].filter((id) => !initial.has(id));
    const toRemove = [...initial].filter((id) => !current.has(id));
    const barberUpdate$ = this.barbersService.update(barber.id, payload);
    const addRequests = toAdd.map((serviceId) =>
      this.barbersService.addService(barber.id, serviceId)
    );
    const removeRequests = toRemove.map((serviceId) =>
      this.barbersService.removeService(barber.id, serviceId)
    );
    forkJoin([barberUpdate$, ...addRequests, ...removeRequests]).subscribe({
      next: () => {
        this.closeEditModal();
        this.load();
        this.saving.set(false);
      },
      error: (err) => {
        this.error.set(err.error?.message ?? this.translate.instant('staff.errorUpdateBarber'));
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

  isServiceAssigned(serviceId: string): boolean {
    return this.assignedServiceIds().has(serviceId);
  }

  toggleBarberService(serviceId: string): void {
    const assigned = new Set(this.assignedServiceIds());
    if (assigned.has(serviceId)) {
      assigned.delete(serviceId);
    } else {
      assigned.add(serviceId);
    }
    this.assignedServiceIds.set(assigned);
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
        error: () => this.calendarLoading.set(false),
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

  getEntrySubtitle(entry: ScheduleEntry): string {
    return 'at ' + entry.shop.name;
  }
}
