import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { App } from './app';
import { AuthService } from './services/auth';

describe('App', () => {
  const auth = { abrirModal: vi.fn(), sincronizarSessao: vi.fn() };
  const router = { navigateByUrl: vi.fn() };

  const criarApp = (search: string) => {
    window.history.replaceState({}, '', `/${search}`);
    return TestBed.runInInjectionContext(() => new App());
  };

  beforeEach(() => {
    vi.clearAllMocks();
    auth.sincronizarSessao.mockResolvedValue(true);
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: auth },
        { provide: Router, useValue: router },
      ],
    });
  });

  afterEach(() => window.history.replaceState({}, '', '/'));

  it('cria o componente sem mexer no login quando não há parâmetro', () => {
    expect(criarApp('')).toBeTruthy();
    expect(auth.sincronizarSessao).not.toHaveBeenCalled();
    expect(auth.abrirModal).not.toHaveBeenCalled();
  });

  it('abre o modal de login quando a Steam volta com erro e limpa a URL', () => {
    criarApp('?login=erro');
    expect(auth.abrirModal).toHaveBeenCalledWith('entrar');
    expect(window.location.search).toBe('');
  });

  it('revalida a sessão e abre o perfil quando a Steam volta com sucesso', async () => {
    criarApp('?login=sucesso');
    await vi.waitFor(() => expect(router.navigateByUrl).toHaveBeenCalledWith('/perfil'));
    expect(auth.sincronizarSessao).toHaveBeenCalled();
    expect(window.location.search).toBe('');
  });

  it('abre o modal de login se a sessão não puder ser confirmada', async () => {
    auth.sincronizarSessao.mockResolvedValue(false);
    criarApp('?login=sucesso');
    await vi.waitFor(() => expect(auth.abrirModal).toHaveBeenCalledWith('entrar'));
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });
});
