import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, catchError, delay, map, of, throwError } from 'rxjs';

import { environment } from '../../../environments/environment';
import { RolUsuario, Usuario } from '../models/usuario.model';

/** Respuesta de POST /auth/login. */
interface LoginResponse {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  usuario: {
    id: string;
    nombre: string;
    correo: string;
    usuario: string;
    rol: RolUsuario;
    matricula: string | null;
    especialidad: string | null;
    institucion: string | null;
    iniciales: string;
  };
}

interface CredencialDemo {
  correo: string;
  contrasena: string;
  usuario: Usuario;
}

const MENSAJE_CREDENCIALES = 'Las credenciales ingresadas no son válidas. Intente nuevamente.';
const MENSAJE_SIN_CONEXION =
  'No se pudo contactar al servidor. Verifique que el backend esté en ejecución.';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);

  private readonly CLAVE_SESION = 'koda.sesion';
  private readonly CLAVE_TOKEN = 'koda_access_token';

  /**
   * Cuentas usadas solo cuando environment.authMock es true, para poder
   * recorrer las pantallas sin levantar el backend.
   */
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

  isAuthenticated(): boolean {
    return this.autenticado();
  }

  getToken(): string | null {
    try {
      return localStorage.getItem(this.CLAVE_TOKEN) ?? sessionStorage.getItem(this.CLAVE_TOKEN);
    } catch {
      return null;
    }
  }

  iniciarSesion(correo: string, contrasena: string, recordar = false): Observable<Usuario> {
    if (environment.authMock) {
      return this.iniciarSesionMock(correo, contrasena);
    }

    return this.http
      .post<LoginResponse>(`${environment.apiBaseUrl}/auth/login`, {
        email: correo.trim(),
        password: contrasena,
        rememberSession: recordar
      })
      .pipe(
        map((respuesta) => {
          this.guardarToken(respuesta.accessToken, recordar);
          return this.aUsuario(respuesta);
        }),
        catchError((error: HttpErrorResponse) => throwError(() => this.aError(error)))
      );
  }

  establecerSesion(usuario: Usuario, recordar: boolean): void {
    this._usuario.set(usuario);
    const almacen = recordar ? localStorage : sessionStorage;
    try {
      almacen.setItem(this.CLAVE_SESION, JSON.stringify(usuario));
    } catch {
      /* almacenamiento no disponible: la sesión vive solo en memoria */
    }
  }

  cerrarSesion(): void {
    this._usuario.set(null);
    try {
      for (const almacen of [localStorage, sessionStorage]) {
        almacen.removeItem(this.CLAVE_SESION);
        almacen.removeItem(this.CLAVE_TOKEN);
      }
    } catch {
      /* nada que limpiar */
    }
  }

  /** Alias conservado por compatibilidad con el interceptor y el layout. */
  clearSession(): void {
    this.cerrarSesion();
  }

  /** Paso 1 del flujo de recuperación. Pendiente de endpoint en el backend. */
  solicitarRecuperacion(_correo: string): Observable<void> {
    return of(void 0).pipe(delay(700));
  }

  /** Paso 2 del flujo de recuperación. Pendiente de endpoint en el backend. */
  restablecerContrasena(_correo: string, _contrasena: string): Observable<void> {
    return of(void 0).pipe(delay(700));
  }

  private aUsuario(respuesta: LoginResponse): Usuario {
    const u = respuesta.usuario;
    return {
      id: u.id,
      nombre: u.nombre,
      correo: u.correo,
      usuario: u.usuario,
      rol: u.rol,
      matricula: u.matricula ?? undefined,
      especialidad: u.especialidad ?? undefined,
      institucion: u.institucion ?? undefined,
      iniciales: u.iniciales
    };
  }

  private aError(error: HttpErrorResponse): Error {
    if (error.status === 0) {
      return new Error(MENSAJE_SIN_CONEXION);
    }
    if (error.status === 401 || error.status === 403) {
      return new Error(error.error?.mensaje ?? MENSAJE_CREDENCIALES);
    }
    return new Error(error.error?.mensaje ?? 'Ocurrió un error al iniciar sesión.');
  }

  private guardarToken(token: string, recordar: boolean): void {
    try {
      (recordar ? localStorage : sessionStorage).setItem(this.CLAVE_TOKEN, token);
    } catch {
      /* almacenamiento no disponible */
    }
  }

  private iniciarSesionMock(correo: string, contrasena: string): Observable<Usuario> {
    const encontrado = this.credenciales.find(
      (c) => c.correo.toLowerCase() === correo.trim().toLowerCase() && c.contrasena === contrasena
    );

    return encontrado
      ? of(encontrado.usuario).pipe(delay(600))
      : throwError(() => new Error(MENSAJE_CREDENCIALES)).pipe(delay(600));
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
