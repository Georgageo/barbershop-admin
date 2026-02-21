import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/auth/auth.service';
import { EmployeeScheduleService, ScheduleEntry } from '../../features/employee-schedule/employee-schedule.service';

const WEEKDAY_NAMES = ['Κυρ', 'Δευ', 'Τρι', 'Τετ', 'Πεμ', 'Παρ', 'Σαβ'];

/** YYYY-MM-DD in local time (no timezone shift). */
function toLocalYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export interface CalendarDay {
  date: Date | null;
  dayOfMonth: number | null;
  isCurrentMonth: boolean;
  isoDate: string;
  entries: ScheduleEntry[];
}

@Component({
  selector: 'app-my-schedule',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './my-schedule.component.html',
  styleUrl: './my-schedule.component.scss',
})
export class MyScheduleComponent implements OnInit {
  private auth = inject(AuthService);
  private scheduleService = inject(EmployeeScheduleService);

  calendarMonth = signal(new Date());
  scheduleEntries = signal<ScheduleEntry[]>([]);
  loading = signal(true);

  readonly weekDays = WEEKDAY_NAMES;

  calendarGrid = computed(() => {
    const month = this.calendarMonth();
    const entries = this.scheduleEntries();
    const entriesByDate = new Map<string, ScheduleEntry[]>();
    for (const e of entries) {
      const raw = typeof e.workDate === 'string' ? e.workDate : new Date(e.workDate).toISOString();
      const key = raw.slice(0, 10);
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
      const key = toLocalYmd(prevMonth);
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
      const key = toLocalYmd(date);
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
        const key = toLocalYmd(date);
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
    const userId = this.auth.currentUser()?.id;
    if (userId) {
      this.loadCalendar();
    } else {
      this.loading.set(true);
      this.auth.loadCurrentUser().subscribe((user) => {
        if (user?.id) this.loadCalendar();
        else this.loading.set(false);
      });
    }
  }

  loadCalendar(): void {
    const userId = this.auth.currentUser()?.id;
    if (!userId) return;
    const month = this.calendarMonth();
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const last = new Date(month.getFullYear(), month.getMonth() + 1, 0);
    this.loading.set(true);
    this.scheduleService.getSchedule(first, last, userId, undefined).subscribe({
      next: (entries) => {
        this.scheduleEntries.set(entries);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
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

  formatEntryHours(entry: ScheduleEntry): string {
    if (entry.openAtMinutes != null && entry.closeAtMinutes != null) {
      const open =
        Math.floor(entry.openAtMinutes / 60) + ':' + String(entry.openAtMinutes % 60).padStart(2, '0');
      const close =
        Math.floor(entry.closeAtMinutes / 60) + ':' + String(entry.closeAtMinutes % 60).padStart(2, '0');
      return open + '–' + close;
    }
    return 'Ωράριο μαγαζιού';
  }
}
