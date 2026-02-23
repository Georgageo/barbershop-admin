import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ScheduleEntry } from '../../features/employee-schedule/employee-schedule.service';

export interface ScheduleCalendarDay {
  date: Date | null;
  dayOfMonth: number | null;
  isCurrentMonth: boolean;
  isoDate: string;
  entries: ScheduleEntry[];
}

@Component({
  selector: 'app-schedule-calendar-table',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './schedule-calendar-table.component.html',
  styleUrl: './schedule-calendar-table.component.scss',
})
export class ScheduleCalendarTableComponent {
  @Input() weekDays: string[] = [];
  @Input() weeks: ScheduleCalendarDay[][] = [];

  /** Text for empty state when there are no entries at all. */
  @Input() emptyMessage = '';

  /**
   * Functions to format entry fields. They default to reasonable fallbacks,
   * and can be overridden by the parent component.
   */
  @Input() entryTitle: (entry: ScheduleEntry) => string = () => '';
  @Input() entrySubtitle: (entry: ScheduleEntry) => string = () => '';
  @Input() entryTime: (entry: ScheduleEntry) => string = () => '';

  /** Emit when a day cell is clicked (optional for parents). */
  @Output() daySelected = new EventEmitter<ScheduleCalendarDay>();

  /** Flattened list of all days (for mobile list view). */
  get allDays(): ScheduleCalendarDay[] {
    return this.weeks.flatMap((w) => w);
  }

  /** Current month days only – shorter list for mobile. */
  get mobileDays(): ScheduleCalendarDay[] {
    return this.allDays.filter((d) => d.isCurrentMonth);
  }

  /** Short label for a day, e.g. "Κυρ 15". */
  getDayLabel(day: ScheduleCalendarDay): string {
    if (day.date && this.weekDays.length) {
      const wd = this.weekDays[day.date.getDay()];
      return `${wd} ${day.dayOfMonth ?? ''}`.trim();
    }
    return String(day.dayOfMonth ?? '');
  }
}

