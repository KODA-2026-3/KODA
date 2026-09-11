import { Pipe, PipeTransform } from '@angular/core';

/**
 * Convierte un instante ISO-8601 en una descripcion breve:
 * "Hace 10 min", "Ayer, 18:40", "24 sept 2026". Sin valor devuelve
 * un texto que deja claro que la cuenta nunca entro.
 */
@Pipe({ name: 'tiempoRelativo', standalone: true })
export class TiempoRelativoPipe implements PipeTransform {
  transform(valor: string | null | undefined): string {
    if (!valor) {
      return 'Sin accesos';
    }

    const fecha = new Date(valor);
    if (Number.isNaN(fecha.getTime())) {
      return 'Sin accesos';
    }

    const minutos = Math.floor((Date.now() - fecha.getTime()) / 60000);

    if (minutos < 1) return 'Hace un momento';
    if (minutos < 60) return `Hace ${minutos} min`;

    const horas = Math.floor(minutos / 60);
    if (horas < 24) return `Hace ${horas} ${horas === 1 ? 'hora' : 'horas'}`;

    const hoy = new Date();
    const ayer = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - 1);
    const esAyer =
      fecha.getFullYear() === ayer.getFullYear() &&
      fecha.getMonth() === ayer.getMonth() &&
      fecha.getDate() === ayer.getDate();

    const hora = fecha.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
    if (esAyer) return `Ayer, ${hora}`;

    return fecha.toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' });
  }
}
