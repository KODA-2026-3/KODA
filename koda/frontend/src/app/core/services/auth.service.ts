import { Injectable, computed, signal } from '@angular/core';
import { Observable, delay, of, throwError } from 'rxjs';

import { RolUsuario, Usuario } from '../models/usuario.model';

interface CredencialDemo {
  correo: string;
  contrasena: string;
  usuario: Usuario;
}

/**
 * Autenticacion de la aplicacion.
 *
 * Implementacion temporal en memoria: cuando el backend exponga
 * POST /api/auth/login se reemplaza el cuerpo de los metodos por llamadas HttpClient
 * conservando las mismas firmas.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly CLAVE_SESION = 'koda.sesion';

  private readonly credenciales: CredencialDemo[] = [
    {
      correo: 'mgarcia@hospital.org',
      contrasena: 'OsteoKnee2026!',
      usuario: {
        id: 'u-1',
        nombre: 'Dra. María García',
        correo: 'mgarcia@hospital.org',
        usuario: 'mgarcia',
        rol: 'MEDICO',
        matricula: 'M.P. 48291',
        especialidad: 'Radiología / Reumatología',
        institucion: 'Centro Médico de Diagnóstico',
        iniciales: 'MG'
      }
    },
    {
      correo: 'cmendez@hospital.org',
      contrasena: 'OsteoKnee2026!',
      usuario: {
        id: 'u-2',
        nombre: 'Carlos Méndez',
        correo: 'cmendez@hospital.org',
        usuario: 'cmendez',
        rol: 'ADMIN',
        institucion: 'Hospital de Clínicas',
        iniciales: 'CM'
      }
    }
  ];

  private readonly _usuario = signal<Usuario | null>(this.leerSesion());

  readonly usuario = this._usuario.asReadonly();
  readonly autenticado = computed(() => this._usuario() !== null);
  readonly rol = computed<RolUsuario | null>(() => this._usuario()?.rol ?? null);

  iniciarSesion(correo: string, contrasena: string, recordar = false): Observable<Usuario> {
    const encontrado = this.credenciales.find(
      (c) => c.correo.toLowerCase() === correo.trim().toLowerCase() && c.contrasena === contrasena
    );

    if (!encontrado) {
      return throwError(
        () => new Error('Las credenciales ingresadas no son válidas. Intente nuevamente.')
      ).pipe(delay(600));
    }

    return of(encontrado.usuario).pipe(delay(600));
  }

  establecerSesion(usuario: Usuario, recordar: boolean): void {
    this._usuario.set(usuario);
    const almacen = recordar ? localStorage : sessionStorage;
    try {
      almacen.setItem(this.CLAVE_SESION, JSON.stringify(usuario));
    } catch {
      /* almacenamiento no disponible: la sesion vive solo en memoria */
    }
  }

  cerrarSesion(): void {
    this._usuario.set(null);
    try {
      localStorage.removeItem(this.CLAVE_SESION);
      sessionStorage.removeItem(this.CLAVE_SESION);
    } catch {
      /* nada que limpiar */
    }
  }

  /** Paso 1 del flujo de recuperacion: envio del enlace/codigo al correo. */
  solicitarRecuperacion(correo: string): Observable<void> {
    return of(void 0).pipe(delay(700));
  }

  /** Paso 2 del flujo de recuperacion: registro de la nueva contrasena. */
  restablecerContrasena(correo: string, contrasena: string): Observable<void> {
    return of(void 0).pipe(delay(700));
  }

  private leerSesion(): Usuario | null {
    try {
      const bruto =
        localStorage.getItem(this.CLAVE_SESION) ?? sessionStorage.getItem(this.CLAVE_SESION);
      return bruto ? (JSON.parse(bruto) as Usuario) : null;
    } catch {
      return null;
    }
  }
}
