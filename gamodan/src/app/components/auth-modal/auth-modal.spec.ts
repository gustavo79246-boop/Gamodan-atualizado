import { TestBed } from '@angular/core/testing';
import { describe, expect, it, beforeEach, vi } from 'vitest';

import { AuthModal } from './auth-modal';
import { AuthService } from '../../services/auth';
import { Router } from '@angular/router';

describe('AuthModal', () => {
  let component: AuthModal;
  let auth: AuthService;

  beforeEach(() => {
  TestBed.configureTestingModule({
    providers: [
      AuthService,
      {
        provide: Router,
        useValue: {
          navigateByUrl: vi.fn(),
        },
      },
    ],
  });

  component = TestBed.runInInjectionContext(() => new AuthModal());
  auth = TestBed.inject(AuthService);
});

  it('deve criar o componente', () => {
    expect(component).toBeTruthy();
  });

  it('deve iniciar com os controles de senha ocultos', () => {
    expect(component.mostrarSenhaLogin()).toBe(false);
    expect(component.mostrarSenhaCadastro()).toBe(false);
    expect(component.mostrarConfirmacao()).toBe(false);
  });

  it('deve alternar a visibilidade da senha de login', () => {
    component.alternarSenha('login');

    expect(component.mostrarSenhaLogin()).toBe(true);

    component.alternarSenha('login');

    expect(component.mostrarSenhaLogin()).toBe(false);
  });

  it('deve alternar a visibilidade da senha de cadastro', () => {
    component.alternarSenha('cadastro');

    expect(component.mostrarSenhaCadastro()).toBe(true);

    component.alternarSenha('cadastro');

    expect(component.mostrarSenhaCadastro()).toBe(false);
  });

  it('deve alternar a visibilidade da confirmação de senha', () => {
    component.alternarSenha('confirmar');

    expect(component.mostrarConfirmacao()).toBe(true);

    component.alternarSenha('confirmar');

    expect(component.mostrarConfirmacao()).toBe(false);
  });

  it('não deve permitir login com formulário inválido', () => {
    component.entrar();

    expect(component.loginForm.touched).toBe(true);
  });

  it('deve chamar login com dados válidos', () => {
    const spy = vi.spyOn(auth, 'login').mockReturnValue(true);

    component.loginForm.setValue({
      email: 'teste@email.com',
      senha: '123456',
    });

    component.entrar();

    expect(spy).toHaveBeenCalledWith({
      email: 'teste@email.com',
      senha: '123456',
      nome: 'teste',
    });
  });

  it('deve limpar o formulário depois de login bem-sucedido', () => {
    vi.spyOn(auth, 'login').mockReturnValue(true);

    component.loginForm.setValue({
      email: 'teste@email.com',
      senha: '123456',
    });

    component.entrar();

    expect(component.loginForm.getRawValue()).toEqual({
      email: '',
      senha: '',
    });

    expect(component.erroAcesso).toBe(false);
  });

  it('deve indicar erro quando o login falhar', () => {
    vi.spyOn(auth, 'login').mockReturnValue(false);

    component.loginForm.setValue({
      email: 'teste@email.com',
      senha: 'senhaerrada',
    });

    component.entrar();

    expect(component.erroAcesso).toBe(true);
  });

  it('não deve permitir cadastro com formulário inválido', () => {
    component.cadastrar();

    expect(component.cadastroForm.touched).toBe(true);
  });

  it('deve validar se as senhas de cadastro são iguais', () => {
    component.cadastroForm.patchValue({
      nome: 'Gabriel',
      email: 'gabriel@email.com',
      senha: '123456',
      confirmar: '654321',
    });

    expect(component.cadastroForm.controls.confirmar.invalid).toBe(true);
    expect(component.cadastroForm.controls.confirmar.errors).toHaveProperty(
      'mismatch'
    );
  });

  it('deve aceitar confirmação de senha igual', () => {
    component.cadastroForm.patchValue({
      nome: 'Gabriel',
      email: 'gabriel@email.com',
      senha: '123456',
      confirmar: '123456',
    });

    expect(component.cadastroForm.controls.confirmar.valid).toBe(true);
  });

  it('deve cadastrar usuário com dados válidos', () => {
    const spy = vi.spyOn(auth, 'register').mockReturnValue(true);

    component.cadastroForm.setValue({
      nome: 'Gabriel',
      email: 'gabriel@email.com',
      senha: '123456',
      confirmar: '123456',
    });

    component.cadastrar();

    expect(spy).toHaveBeenCalled();
    expect(component.erroAcesso).toBe(false);
  });

  it('deve indicar erro quando o cadastro falhar', () => {
    vi.spyOn(auth, 'register').mockReturnValue(false);

    component.cadastroForm.setValue({
      nome: 'Gabriel',
      email: 'gabriel@email.com',
      senha: '123456',
      confirmar: '123456',
    });

    component.cadastrar();

    expect(component.erroAcesso).toBe(true);
  });

  it('deve alterar o modo de autenticação', () => {
    const spy = vi.spyOn(auth, 'abrirModal');

    component.erroAcesso = true;

    component.mudarModo('entrar');

    expect(component.erroAcesso).toBe(false);
    expect(spy).toHaveBeenCalledWith('entrar');
  });

  it('deve retornar true quando um campo inválido foi tocado', () => {
    component.loginForm.controls.email.markAsTouched();

    expect(component.erro('login', 'email')).toBe(true);
  });

  it('deve retornar false quando um campo válido não possui erro', () => {
    component.loginForm.controls.email.setValue('teste@email.com');
    component.loginForm.controls.email.markAsTouched();

    expect(component.erro('login', 'email')).toBe(false);
  });

 it('deve fechar o modal e navegar para /admin ao chamar irAdmin', () => {
  const router = TestBed.inject(Router);
  const spyNavigate = vi.spyOn(router, 'navigateByUrl');
  const spyFechar = vi.spyOn(auth, 'fecharModal');

  component.irAdmin();

  expect(spyFechar).toHaveBeenCalled();
  expect(spyNavigate).toHaveBeenCalledWith('/admin');
});

it('não deve fazer nada se nenhum arquivo for selecionado em selecionarFoto', () => {
  const event = { target: { files: [] } } as unknown as Event;

  component.selecionarFoto(event);

  expect(component.fotoCadastro()).toBe('');
});

it('deve carregar a imagem em base64 ao selecionar um arquivo válido', () => {
  const mockFile = new File(['conteudo'], 'avatar.png', { type: 'image/png' });
  const event = { target: { files: [mockFile] } } as unknown as Event;
  const mockResult = 'data:image/png;base64,mockBase64String';

  vi.spyOn(FileReader.prototype, 'readAsDataURL').mockImplementation(function (this: FileReader) {
    Object.defineProperty(this, 'result', { value: mockResult, writable: true });
    if (this.onload) {
      this.onload({ target: this } as any);
    }
  });

  component.selecionarFoto(event);

  expect(component.fotoCadastro()).toBe(mockResult);
});

});