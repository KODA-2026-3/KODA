import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';

import { AuthService } from '../services/auth.service';

export const jwtInterceptor: HttpInterceptorFn = (request, next) => {
  const token = inject(AuthService).getToken();

  return token
    ? next(request.clone({ setHeaders: { Authorization: `Bearer ${token}` } }))
    : next(request);
};