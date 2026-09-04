import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

export type IconName =
  | 'upload-cloud' | 'file-text' | 'user' | 'users' | 'log-out' | 'hospital'
  | 'alert-triangle' | 'alert-circle' | 'shield' | 'shield-check' | 'trash' | 'pencil'
  | 'search' | 'filter' | 'calendar' | 'chevron-left' | 'chevron-right' | 'chevron-down'
  | 'check' | 'check-double' | 'plus' | 'download' | 'sliders' | 'cpu'
  | 'mail' | 'lock' | 'phone' | 'at-sign' | 'eye' | 'info' | 'arrow-right'
  | 'x' | 'zoom-in' | 'zoom-out' | 'maximize' | 'image';

/**
 * Iconos de linea (24x24, trazo currentColor) usados en toda la aplicacion.
 * Se mantienen inline para no depender de una libreria externa de iconos.
 */
@Component({
  selector: 'app-icon',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      [attr.stroke-width]="strokeWidth"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
      focusable="false"
      [style.width.px]="size"
      [style.height.px]="size"
      class="shrink-0"
    >
      @switch (name) {
        @case ('upload-cloud') {
          <path d="M12 13v8" /><path d="m8 17 4-4 4 4" />
          <path d="M20.88 18.09A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.29" />
        }
        @case ('file-text') {
          <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
          <path d="M14 2v4a2 2 0 0 0 2 2h4" /><path d="M8 13h8" /><path d="M8 17h5" />
        }
        @case ('user') {
          <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
        }
        @case ('users') {
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
        }
        @case ('log-out') {
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="m16 17 5-5-5-5" /><path d="M21 12H9" />
        }
        @case ('hospital') {
          <path d="M12 6v4" /><path d="M14 14h-4" /><path d="M14 18h-4" /><path d="M14 8h-4" />
          <path d="M18 12h2a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2h2" />
          <path d="M18 22V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v18" />
        }
        @case ('alert-triangle') {
          <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
          <path d="M12 9v4" /><path d="M12 17h.01" />
        }
        @case ('alert-circle') {
          <circle cx="12" cy="12" r="10" /><path d="M12 8v4" /><path d="M12 16h.01" />
        }
        @case ('shield') {
          <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
        }
        @case ('shield-check') {
          <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
          <path d="m9 12 2 2 4-4" />
        }
        @case ('trash') {
          <path d="M3 6h18" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
          <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><path d="M10 11v6" /><path d="M14 11v6" />
        }
        @case ('pencil') {
          <path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
        }
        @case ('search') { <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /> }
        @case ('filter') { <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" /> }
        @case ('calendar') {
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path d="M16 2v4" /><path d="M8 2v4" /><path d="M3 10h18" />
        }
        @case ('chevron-left') { <path d="m15 18-6-6 6-6" /> }
        @case ('chevron-right') { <path d="m9 18 6-6-6-6" /> }
        @case ('chevron-down') { <path d="m6 9 6 6 6-6" /> }
        @case ('check') { <path d="M20 6 9 17l-5-5" /> }
        @case ('check-double') { <path d="M18 6 7 17l-5-5" /><path d="m22 10-7.5 7.5L13 16" /> }
        @case ('plus') { <path d="M5 12h14" /><path d="M12 5v14" /> }
        @case ('download') {
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="m7 10 5 5 5-5" /><path d="M12 15V3" />
        }
        @case ('sliders') {
          <path d="M20 7h-9" /><path d="M14 17H5" />
          <circle cx="17" cy="17" r="3" /><circle cx="7" cy="7" r="3" />
        }
        @case ('cpu') {
          <rect x="4" y="4" width="16" height="16" rx="2" /><rect x="9" y="9" width="6" height="6" />
          <path d="M15 2v2" /><path d="M15 20v2" /><path d="M2 15h2" /><path d="M2 9h2" />
          <path d="M20 15h2" /><path d="M20 9h2" /><path d="M9 2v2" /><path d="M9 20v2" />
        }
        @case ('mail') { <rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-10 5L2 7" /> }
        @case ('lock') { <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /> }
        @case ('phone') {
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
        }
        @case ('at-sign') {
          <circle cx="12" cy="12" r="4" /><path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-3.92 7.94" />
        }
        @case ('eye') {
          <path d="M2.06 12.35a1 1 0 0 1 0-.7 10.75 10.75 0 0 1 19.88 0 1 1 0 0 1 0 .7 10.75 10.75 0 0 1-19.88 0" />
          <circle cx="12" cy="12" r="3" />
        }
        @case ('info') { <circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" /> }
        @case ('arrow-right') { <path d="M5 12h14" /><path d="m12 5 7 7-7 7" /> }
        @case ('x') { <path d="M18 6 6 18" /><path d="m6 6 12 12" /> }
        @case ('zoom-in') { <circle cx="12" cy="12" r="10" /><path d="M8 12h8" /><path d="M12 8v8" /> }
        @case ('zoom-out') { <circle cx="12" cy="12" r="10" /><path d="M8 12h8" /> }
        @case ('maximize') {
          <path d="M8 3H5a2 2 0 0 0-2 2v3" /><path d="M21 8V5a2 2 0 0 0-2-2h-3" />
          <path d="M3 16v3a2 2 0 0 0 2 2h3" /><path d="M16 21h3a2 2 0 0 0 2-2v-3" />
        }
        @case ('image') {
          <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="9" cy="9" r="2" />
          <path d="m21 15-3.09-3.09a2 2 0 0 0-2.83 0L6 21" />
        }
      }
    </svg>
  `
})
export class IconComponent {
  @Input({ required: true }) name!: IconName;
  @Input() size = 20;
  @Input() strokeWidth = 2;
}
