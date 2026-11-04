import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth';

export const authGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  await auth.ready;
  if (auth.autenticado()) return true;
  auth.abrirModal('entrar');
  return false;
};

export const adminGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  await auth.ready;
  return auth.admin() || inject(Router).createUrlTree(['/']);
};
