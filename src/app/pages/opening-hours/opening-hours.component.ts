import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ShopHoursService, OpeningHoursByDay, SlotItemDto } from '../../features/shop-hours/shop-hours.service';
import { ShopsService } from '../../features/shops/shops.service';

const DAY_NAMES = ['Κυριακή', 'Δευτέρα', 'Τρίτη', 'Τετάρτη', 'Πέμπτη', 'Παρασκευή', 'Σάββατο'];

function minutesToTime(m: number): string {
  const h = Math.floor(m / 60);
  const min = m % 60;
  return `${h.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

@Component({
  selector: 'app-opening-hours',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './opening-hours.component.html',
  styleUrl: './opening-hours.component.scss',
})
export class OpeningHoursComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private shopHours = inject(ShopHoursService);
  private shopsService = inject(ShopsService);

  shopId = signal<string | null>(null);
  shopName = signal<string>('');
  loading = signal(true);
  saving = signal(false);
  error = signal<string | null>(null);
  success = signal(false);

  /** For each day 0-6: array of { openTime, closeTime } (strings "HH:mm"). */
  days: { dayOfWeek: number; label: string; slots: { openTime: string; closeTime: string }[] }[] = [];

  ngOnInit(): void {
    const shopId = this.route.snapshot.paramMap.get('shopId');
    if (!shopId) {
      this.error.set('Λείπει το μαγαζί.');
      this.loading.set(false);
      return;
    }
    this.shopId.set(shopId);
    this.shopsService.getOne(shopId).subscribe({
      next: (shop) => this.shopName.set(shop.name),
      error: () => this.shopName.set('Μαγαζί'),
    });
    this.load();
  }

  load(): void {
    const id = this.shopId();
    if (!id) return;
    this.loading.set(true);
    this.error.set(null);
    this.shopHours.getHours(id).subscribe({
      next: (data: OpeningHoursByDay) => {
        this.days = [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => {
          const arr = data[String(dayOfWeek)] ?? [];
          const slots = arr.map((s) => ({
            openTime: minutesToTime(s.openAtMinutes),
            closeTime: minutesToTime(s.closeAtMinutes),
          }));
          return {
            dayOfWeek,
            label: DAY_NAMES[dayOfWeek],
            slots,
          };
        });
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err.error?.message ?? 'Σφάλμα φόρτωσης ωραρίου');
        this.loading.set(false);
      },
    });
  }

  addSlot(dayIndex: number): void {
    this.days[dayIndex].slots.push({ openTime: '17:00', closeTime: '21:00' });
  }

  removeSlot(dayIndex: number, slotIndex: number): void {
    this.days[dayIndex].slots.splice(slotIndex, 1);
  }

  setDayClosed(dayIndex: number): void {
    this.days[dayIndex].slots = [];
  }

  isDayClosed(dayIndex: number): boolean {
    return this.days[dayIndex].slots.length === 0;
  }

  reopenDay(dayIndex: number): void {
    if (this.days[dayIndex].slots.length === 0) {
      this.days[dayIndex].slots = [{ openTime: '09:00', closeTime: '17:00' }];
    }
  }

  buildPayload(): SlotItemDto[] {
    const result: SlotItemDto[] = [];
    for (const day of this.days) {
      if (day.slots.length === 0) continue;
      day.slots.forEach((s, i) => {
        const open = timeToMinutes(s.openTime);
        const close = timeToMinutes(s.closeTime);
        if (open < close) {
          result.push({
            dayOfWeek: day.dayOfWeek,
            openAtMinutes: open,
            closeAtMinutes: close,
            sortOrder: i,
          });
        }
      });
    }
    return result;
  }

  save(): void {
    const id = this.shopId();
    if (!id) return;
    const payload = this.buildPayload();
    for (const day of this.days) {
      for (const s of day.slots) {
        const open = timeToMinutes(s.openTime);
        const close = timeToMinutes(s.closeTime);
        if (open >= close) {
          this.error.set(`Λάθος ώρες για ${day.label}: η ώρα έναρξης πρέπει να είναι πριν την ώρα λήξης.`);
          return;
        }
      }
    }

    this.saving.set(true);
    this.error.set(null);
    this.success.set(false);
    this.shopHours.setHours(id, payload).subscribe({
      next: () => {
        this.success.set(true);
        this.saving.set(false);
        this.load();
        setTimeout(() => this.success.set(false), 3000);
      },
      error: (err) => {
        this.error.set(err.error?.message ?? 'Σφάλμα αποθήκευσης');
        this.saving.set(false);
      },
    });
  }
}
