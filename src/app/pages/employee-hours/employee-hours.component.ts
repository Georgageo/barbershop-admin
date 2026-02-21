import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  EmployeeScheduleService,
  ScheduleEntry,
  SetEmployeeWorkDayDto,
} from '../../features/employee-schedule/employee-schedule.service';
import { UsersService, StaffMember } from '../../features/users/users.service';
import { ShopsService } from '../../features/shops/shops.service';
import { ShopHoursService, OpeningHoursByDay } from '../../features/shop-hours/shop-hours.service';
import { AuthService } from '../../core/auth/auth.service';
import { Shop } from '../../features/shops/shops.service';

function minutesToTime(m: number): string {
  const h = Math.floor(m / 60);
  const min = m % 60;
  return `${h.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

/** One cell in the calendar: either empty (prev/next month) or a day with date + isOpen. */
export interface CalendarDay {
  date: string | null; // YYYY-MM-DD or null for empty cell
  dayOfMonth: number;
  isCurrentMonth: boolean;
  isOpen: boolean; // shop has opening hours this day of week
  isToday: boolean;
}

export interface DayDetailGap {
  from: string; // HH:mm
  to: string;
}

export interface DayTimelineSegment {
  entry: ScheduleEntry;
  startMin: number;
  endMin: number;
}

export interface DayTimeline {
  dayStartMin: number;
  dayEndMin: number;
  hourLabels: string[];
  employeeSegments: DayTimelineSegment[];
  gapSegments: { from: string; to: string; startMin: number; endMin: number }[];
}

@Component({
  selector: 'app-employee-hours',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './employee-hours.component.html',
  styleUrl: './employee-hours.component.scss',
})
export class EmployeeHoursComponent implements OnInit {
  private scheduleService = inject(EmployeeScheduleService);
  private usersService = inject(UsersService);
  private shopsService = inject(ShopsService);
  private shopHoursService = inject(ShopHoursService);
  private auth = inject(AuthService);

  staff = signal<StaffMember[]>([]);
  shops = signal<Shop[]>([]);
  entries = signal<ScheduleEntry[]>([]);
  shopOpeningHours = signal<OpeningHoursByDay | null>(null);
  loading = signal(false);
  error = signal<string | null>(null);
  showAddModal = signal(false);
  saving = signal(false);
  deletingId = signal<string | null>(null);

  selectedShopId = signal('');
  /** Displayed month: 0-indexed (0 = January). */
  calendarYear = signal(new Date().getFullYear());
  calendarMonth = signal(new Date().getMonth());
  /** Selected day for detail panel: YYYY-MM-DD or null. */
  selectedDate = signal<string | null>(null);

  formUserId = '';
  formShopId = '';
  formWorkDate = '';
  formOpenTime = '';
  formCloseTime = '';

  /** Calendar grid: 6 rows x 7 cols (Mon–Sun). First day of week = Monday (1). */
  calendarDays = computed(() => {
    const year = this.calendarYear();
    const month = this.calendarMonth();
    const hours = this.shopOpeningHours();
    const first = new Date(year, month, 1);
    const last = new Date(year, month + 1, 0);
    const today = new Date();
    const todayStr =
      today.getFullYear() +
      '-' +
      String(today.getMonth() + 1).padStart(2, '0') +
      '-' +
      String(today.getDate()).padStart(2, '0');

    // JS: getDay() 0=Sun, 1=Mon,... We want Monday=0 for display: (getDay() + 6) % 7
    const firstWeekday = (first.getDay() + 6) % 7; // 0=Mon, 6=Sun
    const daysInMonth = last.getDate();
    const totalCells = Math.ceil((firstWeekday + daysInMonth) / 7) * 7;
    const result: CalendarDay[] = [];

    // Leading empty cells
    for (let i = 0; i < firstWeekday; i++) {
      const prevMonthDay = new Date(year, month, -firstWeekday + i + 1);
      const dateStr =
        prevMonthDay.getFullYear() +
        '-' +
        String(prevMonthDay.getMonth() + 1).padStart(2, '0') +
        '-' +
        String(prevMonthDay.getDate()).padStart(2, '0');
      const dayOfWeek = prevMonthDay.getDay();
      const isOpen = hours ? (hours[String(dayOfWeek)]?.length ?? 0) > 0 : false;
      result.push({
        date: dateStr,
        dayOfMonth: prevMonthDay.getDate(),
        isCurrentMonth: false,
        isOpen,
        isToday: dateStr === todayStr,
      });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr =
        year +
        '-' +
        String(month + 1).padStart(2, '0') +
        '-' +
        String(d).padStart(2, '0');
      const dayOfWeek = new Date(year, month, d).getDay();
      const isOpen = hours ? (hours[String(dayOfWeek)]?.length ?? 0) > 0 : false;
      result.push({
        date: dateStr,
        dayOfMonth: d,
        isCurrentMonth: true,
        isOpen,
        isToday: dateStr === todayStr,
      });
    }
    const filled = firstWeekday + daysInMonth;
    const trailing = totalCells - filled;
    for (let i = 0; i < trailing; i++) {
      const nextDay = new Date(year, month + 1, i + 1);
      const dateStr =
        nextDay.getFullYear() +
        '-' +
        String(nextDay.getMonth() + 1).padStart(2, '0') +
        '-' +
        String(nextDay.getDate()).padStart(2, '0');
      const dayOfWeek = nextDay.getDay();
      const isOpen = hours ? (hours[String(dayOfWeek)]?.length ?? 0) > 0 : false;
      result.push({
        date: dateStr,
        dayOfMonth: nextDay.getDate(),
        isCurrentMonth: false,
        isOpen,
        isToday: dateStr === todayStr,
      });
    }
    return result;
  });

  calendarTitle = computed(() => {
    const d = new Date(this.calendarYear(), this.calendarMonth(), 1);
    return d.toLocaleDateString('el-GR', { month: 'long', year: 'numeric' });
  });

  /** Employees working on selected date at selected shop, plus gaps. */
  selectedDayEntries = computed(() => {
    const date = this.selectedDate();
    const shopId = this.selectedShopId();
    const list = this.entries();
    if (!date || !shopId) return [];
    const toDateStr = (v: string | Date) =>
      typeof v === 'string' ? v.slice(0, 10) : new Date(v).toISOString().slice(0, 10);
    return list.filter(
      (e) => toDateStr(e.workDate) === date && e.shopId === shopId
    );
  });

  selectedDayGaps = computed((): DayDetailGap[] => {
    const date = this.selectedDate();
    const shopId = this.selectedShopId();
    const hours = this.shopOpeningHours();
    const entries = this.selectedDayEntries();
    if (!date || !shopId || !hours) return [];
    const d = new Date(date + 'T12:00:00');
    const dayOfWeek = d.getDay();
    const shopSlots = hours[String(dayOfWeek)] ?? [];
    if (shopSlots.length === 0) return [];

    const shopRanges: { start: number; end: number }[] = shopSlots.map(
      (s) => ({ start: s.openAtMinutes, end: s.closeAtMinutes })
    );

    const employeeRanges: { start: number; end: number }[] = [];
    for (const e of entries) {
      if (e.openAtMinutes != null && e.closeAtMinutes != null) {
        employeeRanges.push({ start: e.openAtMinutes, end: e.closeAtMinutes });
      } else {
        for (const slot of shopSlots) {
          employeeRanges.push({
            start: slot.openAtMinutes,
            end: slot.closeAtMinutes,
          });
        }
      }
    }
    const merged = this.mergeRanges(employeeRanges);
    return this.computeGaps(shopRanges, merged);
  });

  selectedDayLabel = computed(() => {
    const date = this.selectedDate();
    if (!date) return '';
    const d = new Date(date + 'T12:00:00');
    return d.toLocaleDateString('el-GR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  });

  /** Timeline data for the selected day: one bar with employee + gap segments. */
  selectedDayTimeline = computed((): DayTimeline | null => {
    const hours = this.shopOpeningHours();
    const entries = this.selectedDayEntries();
    const gaps = this.selectedDayGaps();
    const date = this.selectedDate();
    if (!date || !hours) return null;
    const d = new Date(date + 'T12:00:00');
    const dayOfWeek = d.getDay();
    const shopSlots = hours[String(dayOfWeek)] ?? [];
    if (shopSlots.length === 0) return null;
    const dayStartMin = Math.min(...shopSlots.map((s) => s.openAtMinutes));
    const dayEndMin = Math.max(...shopSlots.map((s) => s.closeAtMinutes));
    const totalMin = dayEndMin - dayStartMin;
    if (totalMin <= 0) return null;
    const hourLabels: string[] = [];
    for (let m = dayStartMin; m <= dayEndMin; m += 60) {
      hourLabels.push(minutesToTime(m).slice(0, 2));
    }
    const employeeSegments: DayTimelineSegment[] = entries.map((e) => {
      let start: number;
      let end: number;
      if (e.openAtMinutes != null && e.closeAtMinutes != null) {
        start = e.openAtMinutes;
        end = e.closeAtMinutes;
      } else {
        start = shopSlots[0].openAtMinutes;
        end = shopSlots[shopSlots.length - 1].closeAtMinutes;
      }
      return { entry: e, startMin: start, endMin: end };
    });
    const gapSegments = gaps.map((g) => ({
      from: g.from,
      to: g.to,
      startMin: timeToMinutes(g.from),
      endMin: timeToMinutes(g.to),
    }));
    return {
      dayStartMin,
      dayEndMin,
      hourLabels,
      employeeSegments,
      gapSegments,
    };
  });

  /** Percent position (0-100) for a segment in the day timeline. */
  segmentStyle(
    startMin: number,
    endMin: number,
    dayStartMin: number,
    dayEndMin: number
  ): { left: string; width: string } {
    const total = dayEndMin - dayStartMin;
    if (total <= 0) return { left: '0%', width: '0%' };
    const left = ((startMin - dayStartMin) / total) * 100;
    const width = ((endMin - startMin) / total) * 100;
    return { left: left + '%', width: width + '%' };
  }

  ngOnInit(): void {
    this.usersService.getStaff().subscribe({
      next: (list) => this.staff.set(list),
      error: () => {},
    });
    const isManager = this.auth.currentUser()?.role === 'MANAGER';
    const shopsRequest = isManager
      ? this.shopsService.getMyShops()
      : this.shopsService.getList();
    shopsRequest.subscribe({
      next: (list) => this.shops.set(list),
      error: () => {},
    });
  }

  onShopChange(shopId: string): void {
    this.selectedShopId.set(shopId);
    this.selectedDate.set(null);
    if (!shopId) {
      this.shopOpeningHours.set(null);
      this.entries.set([]);
      return;
    }
    this.loadForShopAndMonth();
  }

  loadForShopAndMonth(): void {
    const shopId = this.selectedShopId();
    if (!shopId) return;
    const year = this.calendarYear();
    const month = this.calendarMonth();
    const from = new Date(year, month, 1);
    const to = new Date(year, month + 1, 0);
    this.loading.set(true);
    this.error.set(null);
    this.shopHoursService.getHours(shopId).subscribe({
      next: (h) => this.shopOpeningHours.set(h),
      error: () => this.shopOpeningHours.set(null),
    });
    this.scheduleService
      .getSchedule(from, to, undefined, shopId)
      .subscribe({
        next: (data) => {
          this.entries.set(data);
          this.loading.set(false);
        },
        error: (err) => {
          this.error.set(err.error?.message ?? 'Σφάλμα φόρτωσης ωραρίων');
          this.loading.set(false);
        },
      });
  }

  prevMonth(): void {
    const m = this.calendarMonth();
    const y = this.calendarYear();
    if (m === 0) {
      this.calendarYear.set(y - 1);
      this.calendarMonth.set(11);
    } else {
      this.calendarMonth.set(m - 1);
    }
    if (this.selectedShopId()) this.loadForShopAndMonth();
  }

  nextMonth(): void {
    const m = this.calendarMonth();
    const y = this.calendarYear();
    if (m === 11) {
      this.calendarYear.set(y + 1);
      this.calendarMonth.set(0);
    } else {
      this.calendarMonth.set(m + 1);
    }
    if (this.selectedShopId()) this.loadForShopAndMonth();
  }

  selectDay(day: CalendarDay): void {
    if (!day.date) return;
    this.selectedDate.set(day.date);
  }

  closeDayDetail(): void {
    this.selectedDate.set(null);
  }

  getDayCellClasses(day: CalendarDay): Record<string, boolean> {
    const current = day.isCurrentMonth;
    const open = day.isOpen;
    const today = day.isToday;
    return {
      'text-slate-400': !current,
      'text-slate-800': current && !open,
      'dark:text-slate-300': current && !open,
      'dark:text-slate-500': !current,
      'bg-emerald-500': current && open,
      'text-white': current && open,
      'hover:bg-emerald-600': current && open,
      'bg-slate-100': current && !open,
      'dark:bg-slate-700/50': current && !open,
      'hover:bg-slate-200': current && !open,
      'dark:hover:bg-slate-600': current && !open,
      'ring-2': today,
      'ring-cyan-400': today,
      'ring-offset-2': today,
    };
  }

  openAddModal(): void {
    this.formUserId = '';
    this.formShopId = this.selectedShopId() || '';
    this.formWorkDate = this.selectedDate() || new Date().toISOString().slice(0, 10);
    this.formOpenTime = '';
    this.formCloseTime = '';
    this.error.set(null);
    this.showAddModal.set(true);
  }

  openAddModalFromList(): void {
    this.formWorkDate = this.selectedDate() || new Date().toISOString().slice(0, 10);
    this.formShopId = this.selectedShopId() || '';
    this.formUserId = '';
    this.formOpenTime = '';
    this.formCloseTime = '';
    this.error.set(null);
    this.showAddModal.set(true);
  }

  closeModal(): void {
    this.showAddModal.set(false);
    this.error.set(null);
  }

  save(): void {
    if (!this.formUserId || !this.formShopId || !this.formWorkDate) {
      this.error.set('Επιλέξτε εργαζόμενο, μαγαζί και ημερομηνία.');
      return;
    }
    const open = this.formOpenTime ? timeToMinutes(this.formOpenTime) : undefined;
    const close = this.formCloseTime ? timeToMinutes(this.formCloseTime) : undefined;
    if (open != null && close != null && open >= close) {
      this.error.set('Η ώρα έναρξης πρέπει να είναι πριν την ώρα λήξης.');
      return;
    }
    const dto: SetEmployeeWorkDayDto = {
      workDate: this.formWorkDate,
      ...(open != null && { openAtMinutes: open }),
      ...(close != null && { closeAtMinutes: close }),
    };
    this.saving.set(true);
    this.error.set(null);
    this.scheduleService.setWorkDay(this.formUserId, this.formShopId, dto).subscribe({
      next: () => {
        this.closeModal();
        this.loadForShopAndMonth();
        this.saving.set(false);
      },
      error: (err) => {
        this.error.set(err.error?.message ?? 'Σφάλμα αποθήκευσης');
        this.saving.set(false);
      },
    });
  }

  removeEntry(entry: ScheduleEntry): void {
    const name = `${entry.user.firstName} ${entry.user.lastName}`;
    const date = entry.workDate.slice(0, 10);
    if (!confirm(`Αφαίρεση βάρδιας: ${name} την ${date};`)) return;
    this.deletingId.set(entry.userId + entry.workDate);
    this.scheduleService.removeWorkDay(entry.userId, entry.workDate).subscribe({
      next: () => {
        this.loadForShopAndMonth();
        this.deletingId.set(null);
      },
      error: (err) => {
        this.error.set(err.error?.message ?? 'Σφάλμα αφαίρεσης');
        this.deletingId.set(null);
      },
    });
  }

  formatHours(entry: ScheduleEntry): string {
    if (entry.openAtMinutes != null && entry.closeAtMinutes != null) {
      return `${minutesToTime(entry.openAtMinutes)} – ${minutesToTime(entry.closeAtMinutes)}`;
    }
    return 'Ωράριο μαγαζιού';
  }

  employeeName(entry: ScheduleEntry): string {
    const u = entry.user;
    return `${u.firstName} ${u.lastName}`.trim() || '—';
  }

  private mergeRanges(
    ranges: { start: number; end: number }[]
  ): { start: number; end: number }[] {
    if (ranges.length === 0) return [];
    const sorted = [...ranges].sort((a, b) => a.start - b.start);
    const out: { start: number; end: number }[] = [sorted[0]];
    for (let i = 1; i < sorted.length; i++) {
      const last = out[out.length - 1];
      if (sorted[i].start <= last.end) {
        last.end = Math.max(last.end, sorted[i].end);
      } else {
        out.push(sorted[i]);
      }
    }
    return out;
  }

  private computeGaps(
    shopRanges: { start: number; end: number }[],
    employeeMerged: { start: number; end: number }[]
  ): DayDetailGap[] {
    const gaps: DayDetailGap[] = [];
    for (const shop of shopRanges) {
      let start = shop.start;
      for (const emp of employeeMerged) {
        if (emp.end <= start || emp.start >= shop.end) continue;
        if (emp.start > start) {
          gaps.push({
            from: minutesToTime(start),
            to: minutesToTime(Math.min(emp.start, shop.end)),
          });
        }
        start = Math.max(start, emp.end);
        if (start >= shop.end) break;
      }
      if (start < shop.end) {
        gaps.push({ from: minutesToTime(start), to: minutesToTime(shop.end) });
      }
    }
    return gaps.filter((g) => g.from !== g.to);
  }
}
