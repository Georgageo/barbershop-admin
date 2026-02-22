import { Component, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';

const LANG_STORAGE_KEY = 'admin-lang';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  template: `
    <router-outlet />
  `,
})
export class AppComponent implements OnInit {
  private translate = inject(TranslateService);

  ngOnInit(): void {
    const saved = localStorage.getItem(LANG_STORAGE_KEY);
    const lang = saved === 'en' || saved === 'el' ? saved : 'el';
    this.translate.use(lang);
  }
}

export { LANG_STORAGE_KEY };
