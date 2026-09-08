import { ChangeDetectionStrategy, Component } from '@angular/core';

import { IconComponent } from '../../../shared/components/icon/icon.component';

/**
 * Configuracion del sistema (rol administrador).
 * Pendiente de mockup: se deja el marco de la pantalla con los bloques previstos.
 */
@Component({
  selector: 'app-configuracion',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    <div class="mx-auto max-w-4xl">
      <h1 class="text-3xl font-extrabold tracking-tight text-navy-950">Configuración</h1>
      <p class="mt-2 text-sm text-slate-600">
        Parámetros generales del sistema y del servicio de inferencia.
      </p>

      <div class="card mt-6 flex flex-col items-center px-6 py-16 text-center">
        <span
          class="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-navy-100 text-navy-700"
        >
          <app-icon name="sliders" [size]="26" />
        </span>
        <p class="text-lg font-bold text-navy-950">Pantalla pendiente de diseño</p>
        <p class="mt-2 max-w-md text-sm leading-relaxed text-slate-600">
          Los bloques previstos son: umbral mínimo de confianza, retención de imágenes, parámetros
          del modelo de inferencia y registro de auditoría.
        </p>
      </div>
    </div>
  `
})
export class ConfiguracionComponent {}
