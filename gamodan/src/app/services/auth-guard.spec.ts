import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { adminGuard, authGuard } from './auth-guard';
import { AuthService } from './auth';

describe('Auth Guards', () => {
  const urlTree = { tree: true };
  const auth = {
    ready: Promise.resolve(),
    autenticado: vi.fn(),
    admin: vi.fn(),
    abrirModal: vi.fn(),
  };
  const router = { createUrlTree: vi.fn(() => urlTree) };

  const rodar = (guard: typeof authGuard) =>
    TestBed.runInInjectionContext(() => guard({} as never, {} as never)) as Promise<unknown>;

  beforeEach(() => {
    vi.clearAllMocks();
    auth.autenticado.mockReturnValue(false);
    auth.admin.mockReturnValue(false);
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: auth },
        { provide: Router, useValue: router },
      ],
    });
  });

  describe('authGuard', () => {
    it('abre o login e bloqueia quando não há usuário autenticado', async () => {
      expect(await rodar(authGuard)).toBe(false);
      expect(auth.abrirModal).toHaveBeenCalledWith('entrar');
    });

    it('libera o acesso quando há usuário autenticado', async () => {
      auth.autenticado.mockReturnValue(true);
      expect(await rodar(authGuard)).toBe(true);
      expect(auth.abrirModal).not.toHaveBeenCalled();
    });
  });

  describe('adminGuard', () => {
    it('redireciona para a home quando o usuário não é admin (Router injetado antes do await)', async () => {
      expect(await rodar(adminGuard)).toBe(urlTree);
      expect(router.createUrlTree).toHaveBeenCalledWith(['/']);
    });

    it('libera o acesso para admin', async () => {
      auth.admin.mockReturnValue(true);
      expect(await rodar(adminGuard)).toBe(true);
      expect(router.createUrlTree).not.toHaveBeenCalled();
    });
  });
});
