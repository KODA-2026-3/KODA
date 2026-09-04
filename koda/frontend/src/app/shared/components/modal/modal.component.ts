import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';

/** Dialogo modal centrado sobre un velo oscuro. El contenido se proyecta. */
@Component({
  selector: 'app-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (abierto) {
      <div
        class="fixed inset-0 z-50 flex items-center justify-center bg-navy-900/70 p-4 animate-fade-in"
        role="dialog"
        aria-modal="true"
        [attr.aria-label]="etiqueta"
        (click)="cerrarPorVelo()"
      >
        <div
          class="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-modal animate-scale-in"
          (click)="$event.stopPropagation()"
        >
          <ng-content />
        </div>
      </div>
    }
  `
})
export class ModalComponent {
  @Input() abierto = false;
  @Input() etiqueta = '';
  /** Permite cerrar haciendo clic fuera del dialogo. */
  @Input() cerrableConVelo = true;
  @Output() cerrar = new EventEmitter<void>();

  cerrarPorVelo(): void {
    if (this.cerrableConVelo) {
      this.cerrar.emit();
    }
  }
}
