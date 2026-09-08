import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => true;

export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return auth.rol() === 'ADMIN'
    ? true
    : router.createUrlTree([auth.autenticado() ? '/app/cargar' : '/login']);
};

export const invitadoGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return !auth.autenticado()
    ? true
    : router.createUrlTree([auth.rol() === 'ADMIN' ? '/admin/medicos' : '/app/cargar']);
};