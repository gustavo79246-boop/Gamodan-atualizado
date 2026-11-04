import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';

import { Admin } from './admin';
import { AuthService } from '../../services/auth';

describe('Admin', () => {
  let component: Admin;
  let auth: AuthService;
  let router: Router;

  beforeEach(() => {
    localStorage.clear();

    TestBed.configureTestingModule({
      providers: [
        AuthService,
        {
          provide: Router,
          useValue: {
            navigateByUrl: vi.fn(),
          },
        },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParamMap: {
                get: vi.fn(),
              },
            },
          },
        },
      ],
    });

    auth = TestBed.inject(AuthService);
    router = TestBed.inject(Router);

    TestBed.runInInjectionContext(() => {
      component = new Admin();
    });
  });

  it('deve criar o componente', () => {
    expect(component).toBeTruthy();
  });

  it('deve iniciar sem erro', () => {
    expect(component.erro).toBe(false);
  });

  it('não deve fazer login quando o formulário for inválido', () => {
    const loginSpy = vi.spyOn(auth, 'login');

    component.entrar();

    expect(component.form.invalid).toBe(true);
    expect(loginSpy).not.toHaveBeenCalled();
    expect(component.erro).toBe(false);
  });

  it('deve definir erro quando o login for inválido', () => {
    const loginSpy = vi
      .spyOn(auth, 'login')
      .mockReturnValue(false);

    component.form.setValue({
      email: 'admin@email.com',
      senha: 'senhaerrada',
    });

    component.entrar();

    expect(loginSpy).toHaveBeenCalledWith({
      email: 'admin@email.com',
      senha: 'senhaerrada',
      nome: 'Administrador',
    });

    expect(component.erro).toBe(true);
  });

  it('deve fazer login e navegar para returnUrl', () => {
    vi.spyOn(auth, 'login').mockReturnValue(true);

    const navigateSpy = vi.spyOn(router, 'navigateByUrl');

    const route = TestBed.inject(ActivatedRoute);

    vi.spyOn(route.snapshot.queryParamMap, 'get')
      .mockReturnValue('/lista');

    component.form.setValue({
      email: 'admin@email.com',
      senha: 'senha123',
    });

    component.entrar();

    expect(navigateSpy).toHaveBeenCalledWith('/lista');
    expect(component.erro).toBe(false);
  });

  it('deve navegar para a página inicial quando não houver returnUrl', () => {
    vi.spyOn(auth, 'login').mockReturnValue(true);

    const navigateSpy = vi.spyOn(router, 'navigateByUrl');

    const route = TestBed.inject(ActivatedRoute);

    vi.spyOn(route.snapshot.queryParamMap, 'get')
      .mockReturnValue(null);

    component.form.setValue({
      email: 'admin@email.com',
      senha: 'senha123',
    });

    component.entrar();

    expect(navigateSpy).toHaveBeenCalledWith('/');
  });
});