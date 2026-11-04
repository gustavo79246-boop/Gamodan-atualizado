import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { AuthService, MEMBER_EMAILS } from './auth';

describe('AuthService', () => {

  beforeEach(() => {
    localStorage.clear();

    TestBed.configureTestingModule({
      providers: [AuthService],
    });
  });

  it('deve iniciar sem usuário autenticado', () => {
    const service = TestBed.inject(AuthService);

    expect(service.usuario()).toBeNull();
    expect(service.autenticado()).toBe(false);
    expect(service.admin()).toBe(false);
  });

  it('deve abrir o modal no modo entrar', () => {
    const service = TestBed.inject(AuthService);

    service.abrirModal();

    expect(service.modalAberto()).toBe(true);
    expect(service.modo()).toBe('entrar');
  });

  it('deve abrir o modal no modo criar', () => {
    const service = TestBed.inject(AuthService);

    service.abrirModal('criar');

    expect(service.modalAberto()).toBe(true);
    expect(service.modo()).toBe('criar');
  });

  it('deve fechar o modal', () => {
    const service = TestBed.inject(AuthService);

    service.abrirModal();

    service.fecharModal();

    expect(service.modalAberto()).toBe(false);
  });

  it('deve cadastrar usuário', () => {
    const service = TestBed.inject(AuthService);

    const result = service.register({
      nome: 'João',
      email: 'joao@example.com',
      senha: '123456',
    });

    expect(result).toBe(true);
    expect(service.autenticado()).toBe(true);
    expect(service.usuario()?.nome).toBe('João');
  });

  it('deve normalizar email', () => {
    const service = TestBed.inject(AuthService);

    service.register({
      nome: 'João',
      email: '  JOAO@EXAMPLE.COM ',
      senha: '123',
    });

    expect(service.usuario()?.email).toBe('joao@example.com');
  });

  it('deve rejeitar email inválido', () => {
    const service = TestBed.inject(AuthService);

    expect(
      service.register({
        nome: 'João',
        email: 'email-invalido',
        senha: '123',
      }),
    ).toBe(false);
  });

  it('deve rejeitar senha vazia', () => {
    const service = TestBed.inject(AuthService);

    expect(
      service.register({
        nome: 'João',
        email: 'joao@example.com',
        senha: '',
      }),
    ).toBe(false);
  });

  it('deve impedir cadastro duplicado', () => {
    const service = TestBed.inject(AuthService);

    service.register({
      nome: 'João',
      email: 'joao@example.com',
      senha: '123',
    });

    service.logout();

    expect(
      service.register({
        nome: 'Outro',
        email: 'joao@example.com',
        senha: '456',
      }),
    ).toBe(false);
  });

  it('deve fazer login com credenciais corretas', () => {
    const service = TestBed.inject(AuthService);

    service.register({
      nome: 'João',
      email: 'joao@example.com',
      senha: '123',
    });

    service.logout();

    expect(
      service.login({
        email: 'joao@example.com',
        senha: '123',
      }),
    ).toBe(true);

    expect(service.autenticado()).toBe(true);
  });

  it('deve rejeitar senha incorreta', () => {
    const service = TestBed.inject(AuthService);

    service.register({
      nome: 'João',
      email: 'joao@example.com',
      senha: '123',
    });

    service.logout();

    expect(
      service.login({
        email: 'joao@example.com',
        senha: 'errada',
      }),
    ).toBe(false);
  });

  it('deve rejeitar usuário inexistente', () => {
    const service = TestBed.inject(AuthService);

    expect(
      service.login({
        email: 'naoexiste@example.com',
        senha: '123',
      }),
    ).toBe(false);
  });

  it('deve reconhecer membros como administradores', () => {
    const service = TestBed.inject(AuthService);

    const email = MEMBER_EMAILS[0];

    service.register({
      nome: 'Administrador',
      email,
      senha: '123',
    });

    expect(service.usuario()?.admin).toBe(true);
    expect(service.admin()).toBe(true);
  });

  it('deve fazer logout', () => {
    const service = TestBed.inject(AuthService);

    service.register({
      nome: 'João',
      email: 'joao@example.com',
      senha: '123',
    });

    service.logout();

    expect(service.usuario()).toBeNull();
    expect(service.autenticado()).toBe(false);
    expect(service.modalAberto()).toBe(false);
  });

  it('deve gerar chave individual para usuário', () => {
    const service = TestBed.inject(AuthService);

    expect(
      service.getStorageKeyForUser('JOAO@EXAMPLE.COM'),
    ).toBe('gamodan-games:joao@example.com');
  });

  it('deve atualizar foto do usuário', () => {
    const service = TestBed.inject(AuthService);

    service.register({
      nome: 'João',
      email: 'joao@example.com',
      senha: '123',
    });

    service.atualizarFoto('data:image/png;base64,teste');

    expect(service.usuario()?.foto)
      .toBe('data:image/png;base64,teste');
  });

  it('deve manter jogo e gênero favoritos ao entrar novamente', () => {
    const service = TestBed.inject(AuthService);
    service.register({
      nome: 'João',
      email: 'joao@example.com',
      senha: '123',
    });

    service.atualizarPreferencias(7, 'RPG');
    service.logout();
    service.login({ email: 'joao@example.com', senha: '123' });

    expect(service.usuario()?.jogoFavoritoId).toBe(7);
    expect(service.usuario()?.generoFavorito).toBe('RPG');
  });

  it('não deve atualizar foto sem usuário autenticado', () => {
    const service = TestBed.inject(AuthService);

    service.atualizarFoto('foto');

    expect(service.usuario()).toBeNull();
  });

  it('deve retornar um array vazio se o JSON de utilizadores for inválido (cobertura do catch)', () => {
  vi.spyOn(localStorage, 'getItem').mockReturnValue('{ json_invalido: ');
  
  const service = TestBed.inject(AuthService);
  const result = service.register({ email: 'novo@teste.com', senha: '123' });
  
  expect(result).toBe(true); 
});

it('deve retornar falso se o JSON de utilizadores for inválido (cobertura do catch)', () => {
  // Alterado para Storage.prototype para garantir que o spy é apanhado
  vi.spyOn(Storage.prototype, 'getItem').mockReturnValue('{ json_invalido: ');
  
  const service = TestBed.inject(AuthService);
  // Alterado para login em vez de register. Se o JSON falhar, a lista fica vazia.
  // O register aceita listas vazias (cria o 1º user), mas o login falha corretamente.
  const result = service.login({ email: 'teste@teste.com', senha: '123' });
  
  expect(result).toBe(false); 
});

it('deve retornar falso se o localStorage falhar ao guardar um novo utilizador', () => {
  const service = TestBed.inject(AuthService);
  
  // Intercepta a falha diretamente no protótipo da API de storage
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('Quota Exceeded');
  });
  
  const result = service.register({ 
    nome: 'Teste', 
    email: 'valido@teste.com', 
    senha: 'password123' 
  });
  
  expect(result).toBe(false);
});

it('deve atribuir privilégios de admin se o e-mail pertencer à lista MEMBER_EMAILS', () => {
  const service = TestBed.inject(AuthService);
  const adminEmail = 'analuiza.rochacoelho09@gmail.com'; 
  
  // Precisamos garantir que apenas o getItem da chave de utilizadores devolve o array.
  // Se não filtrarmos a chave, ele quebra outras chamadas internas do Angular.
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation((key: string) => {
    if (key === 'gamodan-users') {
      return JSON.stringify([{ nome: 'Ana', email: adminEmail, senha: '123' }]);
    }
    return null;
  });
  
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {});

  const result = service.login({ email: adminEmail, senha: '123' });
  
  expect(result).toBe(true);
  expect(service.admin()).toBe(true);
});

it('deve limpar as chaves de sessão se o utilizador carregado não for válido', () => {
  const service = TestBed.inject(AuthService); 
  
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation((key: string) => {
    if (key === 'gamodan-auth-user') return JSON.stringify({ email: 'invalido' });
    return null;
  });
  
  const spyRemove = vi.spyOn(Storage.prototype, 'removeItem');
  
  // Como o TestBed mantém o serviço vivo, o construtor não volta a correr.
  // Forçamos a execução do método privado para testar esta linha específica.
  (service as any).loadUser(); 
  
  expect(spyRemove).toHaveBeenCalledWith('gamodan-auth-user');
  expect(spyRemove).toHaveBeenCalledWith('gamodan-auth');
});

it('deve carregar o usuário do localStorage com sucesso (sem foto)', () => {
  const validUser = { nome: '  Gabriel  ', email: 'gabriel@email.com' };
  vi.spyOn(Storage.prototype, 'getItem').mockReturnValue(JSON.stringify(validUser));
  const spySave = vi.spyOn(Storage.prototype, 'setItem');

  const service = TestBed.inject(AuthService);
  const user = (service as any).loadUser();

  expect(user).toEqual({
    nome: 'Gabriel',
    email: 'gabriel@email.com',
    admin: false,
  });
  expect(spySave).toHaveBeenCalledWith('gamodan-auth-user', expect.any(String));
});

it('deve incluir a foto no usuário quando o atributo foto for uma string preenchida', () => {
  const userWithPhoto = { nome: 'Gabriel', email: 'gabriel@email.com', foto: 'avatar.png' };
  vi.spyOn(Storage.prototype, 'getItem').mockReturnValue(JSON.stringify(userWithPhoto));

  const service = TestBed.inject(AuthService);
  const user = (service as any).loadUser();

  expect(user?.foto).toBe('avatar.png');
});

it('deve retornar null se nome não for string ou for apenas espaços', () => {
  // Nome não é string
  vi.spyOn(Storage.prototype, 'getItem').mockReturnValue(JSON.stringify({ nome: 123, email: 'teste@email.com' }));
  const service = TestBed.inject(AuthService);
  expect((service as any).loadUser()).toBeNull();

  // Nome é string vazia/espaços
  vi.spyOn(Storage.prototype, 'getItem').mockReturnValue(JSON.stringify({ nome: '   ', email: 'teste@email.com' }));
  expect((service as any).loadUser()).toBeNull();
});

it('deve retornar null se o e-mail for inválido segundo o EMAIL_PATTERN', () => {
  vi.spyOn(Storage.prototype, 'getItem').mockReturnValue(JSON.stringify({ nome: 'Gabriel', email: 'email-invalido' }));

  const service = TestBed.inject(AuthService);
  expect((service as any).loadUser()).toBeNull();
});

it('não deve atribuir a foto se foto for uma string vazia ou de outro tipo', () => {
  // foto vazia ''
  vi.spyOn(Storage.prototype, 'getItem').mockReturnValue(
    JSON.stringify({ nome: 'Gabriel', email: 'gabriel@email.com', foto: '' })
  );
  const service = TestBed.inject(AuthService);
  let user = (service as any).loadUser();
  expect(user?.foto).toBeUndefined();

  // foto com tipo inválido (ex: boolean/number)
  vi.spyOn(Storage.prototype, 'getItem').mockReturnValue(
    JSON.stringify({ nome: 'Gabriel', email: 'gabriel@email.com', foto: 123 })
  );
  user = (service as any).loadUser();
  expect(user?.foto).toBeUndefined();
});

});