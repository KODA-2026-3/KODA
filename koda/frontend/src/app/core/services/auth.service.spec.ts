import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();

    TestBed.configureTestingModule({
      providers: [
        AuthService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
    sessionStorage.clear();
  });

  it('debe pedir el código de recuperación al backend', () => {
    service.solicitarRecuperacion(' mgarcia@hospital.org ').subscribe();

    const req = httpMock.expectOne((r) => r.url.endsWith('/auth/recuperacion'));
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ correo: 'mgarcia@hospital.org' });
    req.flush(null, { status: 204, statusText: 'No Content' });
  });

  it('debe enviar correo, código y contraseña al restablecer', () => {
    service.restablecerContrasena('mgarcia@hospital.org', '123456', 'NuevaClave1!').subscribe();

    const req = httpMock.expectOne((r) => r.url.endsWith('/auth/recuperacion/restablecer'));
    expect(req.request.body).toEqual({
      correo: 'mgarcia@hospital.org',
      codigo: '123456',
      nuevaContrasena: 'NuevaClave1!'
    });
    req.flush(null, { status: 204, statusText: 'No Content' });
  });

  it('debe mostrar el mensaje del backend si el código no sirve', (done) => {
    service.restablecerContrasena('mgarcia@hospital.org', '000000', 'NuevaClave1!').subscribe({
      next: () => fail('No debió restablecer con un código inválido'),
      error: (e: Error) => {
        expect(e.message).toBe('El código es incorrecto o venció.');
        done();
      }
    });

    httpMock
      .expectOne((r) => r.url.endsWith('/auth/recuperacion/restablecer'))
      .flush({ mensaje: 'El código es incorrecto o venció.' }, { status: 400, statusText: 'Bad Request' });
  });

  it('debe inicializarse sin usuario autenticado', () => {
    expect(service.autenticado()).toBeFalse();
    expect(service.usuario()).toBeNull();
    expect(service.rol()).toBeNull();
  });

  it('debe autenticar con credenciales mock si authMock es true', (done) => {
    // Si authMock es true en environment, usa iniciarSesionMock
    service.iniciarSesion('mgarcia@hospital.org', 'OsteoKnee2026!').subscribe({
      next: (usuario) => {
        expect(usuario.nombre).toBe('Dra. María García');
        expect(usuario.rol).toBe('MEDICO');
        done();
      },
      error: () => fail('No debió fallar con credenciales demo correctas')
    });
  });

  it('debe rechazar credenciales mock erróneas', (done) => {
    service.iniciarSesion('mgarcia@hospital.org', 'PasswordInvalido').subscribe({
      next: () => fail('Debió fallar con contraseña inválida'),
      error: (error: Error) => {
        expect(error.message).toContain('Las credenciales ingresadas no son válidas');
        done();
      }
    });
  });

  it('debe guardar y limpiar la sesión correctamente', () => {
    const usuarioMock = {
      id: 'u-1',
      nombre: 'Dra. María García',
      correo: 'mgarcia@hospital.org',
      usuario: 'mgarcia',
      rol: 'MEDICO' as const,
      iniciales: 'MG'
    };

    service.establecerSesion(usuarioMock, false);
    expect(service.autenticado()).toBeTrue();
    expect(service.usuario()?.nombre).toBe('Dra. María García');
    expect(service.rol()).toBe('MEDICO');

    service.cerrarSesion();
    expect(service.autenticado()).toBeFalse();
    expect(service.usuario()).toBeNull();
    expect(service.rol()).toBeNull();
  });
});
