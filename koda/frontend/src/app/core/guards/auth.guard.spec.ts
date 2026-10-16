import { TestBed } from '@angular/core/testing';
import { Router, ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree } from '@angular/router';
import { authGuard, adminGuard, invitadoGuard } from './auth.guard';
import { AuthService } from '../services/auth.service';
import { signal } from '@angular/core';
import { Usuario } from '../models/usuario.model';

describe('Guards de Autenticación y Autorización', () => {
  let mockAuthService: {
    autenticado: jasmine.Spy;
    rol: jasmine.Spy;
  };
  let router: Router;
  const mockRoute = {} as ActivatedRouteSnapshot;
  const mockState = { url: '/app/cargar' } as RouterStateSnapshot;

  beforeEach(() => {
    mockAuthService = {
      autenticado: jasmine.createSpy('autenticado'),
      rol: jasmine.createSpy('rol')
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: mockAuthService }
      ]
    });
    router = TestBed.inject(Router);
  });

  describe('authGuard', () => {
    it('debe permitir acceso si el usuario está autenticado', () => {
      mockAuthService.autenticado.and.returnValue(true);
      const resultado = TestBed.runInInjectionContext(() => authGuard(mockRoute, mockState));
      expect(resultado).toBeTrue();
    });

    it('debe redirigir al login si el usuario NO está autenticado', () => {
      mockAuthService.autenticado.and.returnValue(false);
      const resultado = TestBed.runInInjectionContext(() => authGuard(mockRoute, mockState));
      expect(resultado instanceof UrlTree).toBeTrue();
      expect((resultado as UrlTree).toString()).toContain('/login?redirigir=');
    });
  });

  describe('adminGuard', () => {
    it('debe permitir acceso si el rol es ADMIN', () => {
      mockAuthService.rol.and.returnValue('ADMIN');
      const resultado = TestBed.runInInjectionContext(() => adminGuard(mockRoute, mockState));
      expect(resultado).toBeTrue();
    });

    it('debe redirigir si el rol no es ADMIN', () => {
      mockAuthService.rol.and.returnValue('MEDICO');
      mockAuthService.autenticado.and.returnValue(true);
      const resultado = TestBed.runInInjectionContext(() => adminGuard(mockRoute, mockState));
      expect(resultado instanceof UrlTree).toBeTrue();
      expect((resultado as UrlTree).toString()).toBe('/app/cargar');
    });
  });

  describe('invitadoGuard', () => {
    it('debe permitir acceso si NO está autenticado', () => {
      mockAuthService.autenticado.and.returnValue(false);
      const resultado = TestBed.runInInjectionContext(() => invitadoGuard(mockRoute, mockState));
      expect(resultado).toBeTrue();
    });

    it('debe redirigir si ya tiene sesión activa como MEDICO', () => {
      mockAuthService.autenticado.and.returnValue(true);
      mockAuthService.rol.and.returnValue('MEDICO');
      const resultado = TestBed.runInInjectionContext(() => invitadoGuard(mockRoute, mockState));
      expect(resultado instanceof UrlTree).toBeTrue();
      expect((resultado as UrlTree).toString()).toBe('/app/cargar');
    });

    it('debe redirigir si ya tiene sesión activa como ADMIN', () => {
      mockAuthService.autenticado.and.returnValue(true);
      mockAuthService.rol.and.returnValue('ADMIN');
      const resultado = TestBed.runInInjectionContext(() => invitadoGuard(mockRoute, mockState));
      expect(resultado instanceof UrlTree).toBeTrue();
      expect((resultado as UrlTree).toString()).toBe('/admin/estadisticas');
    });
  });
});
