import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

import { ETIQUETAS_KL, GradoKL } from '../../../core/models/analisis.model';

/** Etiqueta de color para un grado de la escala Kellgren-Lawrence. */
@Component({
  selector: 'app-badge-kl',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span class="badge" [class]="clases">{{ texto }}</span>`
})
export class BadgeKlComponent {
  @Input({ required: true }) grado!: GradoKL;

  private static readonly ESTILOS: Record<GradoKL, string> = {
    0: 'bg-emerald-100 text-emerald-800',
    1: 'bg-lime-100 text-lime-800',
    2: 'bg-amber-100 text-amber-800',
    3: 'bg-orange-100 text-orange-800',
    4: 'bg-red-100 text-red-800'
  };

  get clases(): string {
    return BadgeKlComponent.ESTILOS[this.grado];
  }

  get texto(): string {
    return `Grado ${this.grado} · ${ETIQUETAS_KL[this.grado]}`;
  }
}
