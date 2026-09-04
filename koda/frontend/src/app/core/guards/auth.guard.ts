import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from '../services/auth.service';

/** Exige sesion iniciada. */
export const authGuard: CanActivateFn = (_ruta, estado) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.autenticado()) {
    return true;
  }
  return router.createUrlTree(['/login'], { queryParams: { redirigir: estado.url } });
};

/** Exige sesion iniciada con rol administrador. */
export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.rol() === 'ADMIN') {
    return true;
  }
  return router.createUrlTree([auth.autenticado() ? '/app/cargar' : '/login']);
};

/** Impide volver al login con una sesion activa. */
export const invitadoGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.autenticado()) {
    return true;
  }
  return router.createUrlTree([auth.rol() === 'ADMIN' ? '/admin/medicos' : '/app/cargar']);
};
