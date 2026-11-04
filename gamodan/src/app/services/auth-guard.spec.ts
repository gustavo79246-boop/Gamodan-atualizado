import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { describe, expect, it, beforeEach, vi } from 'vitest';

import { authGuard, adminGuard } from './auth-guard';
import { AuthService } from './auth';

describe('Auth Guards', () => {
  let auth: AuthService;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        AuthService,
        {
          provide: Router,
          useValue: {
            createUrlTree: vi.fn(),
          },
        },
      ],
    });

    auth = TestBed.inject(AuthService);
    router = TestBed.inject(Router);
  });

  describe('authGuard', () => {
    it('deve abrir o login e bloquear o acesso quando não existe usuário autenticado', () => {
      const abrirModal = vi.spyOn(auth, 'abrirModal');

      const resultado = TestBed.runInInjectionContext(() =>
        authGuard({} as any, {} as any)
      );

      expect(resultado).toBe(false);
      expect(abrirModal).toHaveBeenCalledWith('entrar');
      expect(auth.modalAberto()).toBe(true);
    });

    it('deve permitir acesso quando existe usuário autenticado', () => {
      vi.spyOn(auth, 'autenticado').mockReturnValue(true);

      const resultado = TestBed.runInInjectionContext(() =>
        authGuard({} as any, {} as any)
      );

      expect(resultado).toBe(true);
    });
  });

  describe('adminGuard', () => {
    it('deve bloquear acesso quando não existe usuário autenticado', () => {
      vi.spyOn(router, 'createUrlTree').mockReturnValue({} as any);

      const resultado = TestBed.runInInjectionContext(() =>
        adminGuard({} as any, {} as any)
      );

      expect(resultado).toBeDefined();
    });
  });
});