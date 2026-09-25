import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

/**
 * Marca institucional de KODA, recortada por CSS desde assets/logo.jpeg.
 *
 * El archivo original es el lockup completo (marca + palabra + bajada) sobre
 * fondo blanco. Aqui se muestra solo la articulacion, apoyada en un cuadro
 * blanco redondeado: asi es legible en tamanos chicos y funciona sobre la
 * barra lateral azul, donde el fondo blanco del archivo recortaria un
 * rectangulo.
 */
@Component({
  selector: 'app-logo-koda',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span
      class="block shrink-0 overflow-hidden rounded-xl bg-white bg-[url('assets/logo.jpeg')]"
      role="img"
      aria-label="KODA"
      [style.width.px]="size"
      [style.height.px]="size"
      style="background-size: 190%; background-position: 51.7% 18.8%;"
    ></span>
  `
})
export class LogoKodaComponent {
  /** Lado del cuadro, en pixeles. */
  @Input() size = 40;
}
