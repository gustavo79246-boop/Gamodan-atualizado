import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { describe, expect, it, beforeEach, vi } from 'vitest';

import { Header } from './header';
import { AuthService } from '../../services/auth';

describe('Header', () => {
  let component: Header;
  let auth: AuthService;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        AuthService,
        {
          provide: Router,
          useValue: {
            navigate: vi.fn(),
            navigateByUrl: vi.fn(),
          },
        },
      ],
    });

    auth = TestBed.inject(AuthService);
    router = TestBed.inject(Router);

    component = TestBed.runInInjectionContext(() => new Header());
  });

  it('deve criar o componente', () => {
    expect(component).toBeTruthy();
  });

  it('deve abrir o modal de autenticação', () => {
    const spy = vi.spyOn(auth, 'abrirModal');

    component.abrirAutenticacao('entrar');

    expect(spy).toHaveBeenCalledWith('entrar');
  });

  it('deve abrir o modal no modo criar', () => {
    const spy = vi.spyOn(auth, 'abrirModal');

    component.abrirAutenticacao('criar');

    expect(spy).toHaveBeenCalledWith('criar');
  });

  it('deve fazer logout', () => {
    const spy = vi.spyOn(auth, 'logout');

    component.sair();

    expect(spy).toHaveBeenCalled();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/');
  });

  it('deve pesquisar na lista de jogos', () => {
    component.termoBusca.set('Hollow Knight');

    component.buscar();

    expect(router.navigate).toHaveBeenCalledWith(['/lista'], {
      queryParams: { filtro: 'todos', busca: 'Hollow Knight' },
    });
    expect(component.buscaAberta()).toBe(false);
  });

  it('deve alternar o menu do perfil e fechar ao sair', () => {
    component.alternarMenuPerfil();
    expect(component.menuPerfilAberto()).toBe(true);

    component.sair();

    expect(component.menuPerfilAberto()).toBe(false);
    expect(auth.usuario()).toBeNull();
  });
});
