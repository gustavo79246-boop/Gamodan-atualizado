import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';

import { Perfil } from './perfil';
import { AuthService } from '../services/auth';
import { GameService } from '../services/game';

describe('Perfil', () => {
  let component: Perfil;
  let auth: AuthService;
  let router: Router;
  let games: GameService;

  beforeEach(() => {
    localStorage.clear();

    TestBed.configureTestingModule({
      providers: [
        AuthService,
        GameService,
        {
          provide: Router,
          useValue: {
            navigateByUrl: vi.fn(),
          },
        },
      ],
    });

    auth = TestBed.inject(AuthService);
    games = TestBed.inject(GameService);
    router = TestBed.inject(Router);

    TestBed.runInInjectionContext(() => {
      component = new Perfil();
    });
  });

  it('deve criar o componente', () => {
    expect(component).toBeTruthy();
  });

  it('deve fazer logout e navegar para a página inicial', async () => {
    const logoutSpy = vi.spyOn(auth, 'logout');
    const navigateSpy = vi.spyOn(router, 'navigateByUrl');

    component.sair();

    expect(logoutSpy).toHaveBeenCalled();
    expect(navigateSpy).toHaveBeenCalledWith('/');
  });

  it('não deve fazer nada quando nenhuma foto for selecionada', () => {
    const atualizarFotoSpy = vi.spyOn(auth, 'atualizarFoto');

    const event = {
      target: {
        files: [],
      },
    } as unknown as Event;

    component.selecionarFoto(event);

    expect(atualizarFotoSpy).not.toHaveBeenCalled();
  });

  it('deve calcular estatísticas e horas por jogo', () => {
    auth.register({ nome: 'João', email: 'joao@example.com', senha: '123' });
    games.addGame({
      nome: 'Jogo A',
      imagem: 'a.jpg',
      estrelas: 4,
      horasJogadas: 6.5,
      dataInicial: '2026-01-01',
      favorito: false,
      wishlist: false,
      status: 'jogando',
    });
    games.addGame({
      nome: 'Jogo B',
      imagem: 'b.jpg',
      estrelas: 5,
      horasJogadas: 10,
      dataInicial: '2026-01-01',
      favorito: false,
      wishlist: false,
      status: 'zerado',
    });
    games.addGame({
      nome: 'Jogo C',
      imagem: 'c.jpg',
      estrelas: 3,
      horasJogadas: 0,
      dataInicial: '2026-01-01',
      favorito: false,
      wishlist: false,
      status: 'pendente',
    });

    expect(component.totalJogos()).toBe(3);
    expect(component.totalJogosJogados()).toBe(2);
    expect(component.totalJogosFinalizados()).toBe(1);
    expect(component.totalHorasJogadas()).toBe(16.5);
    expect(component.mediaEstrelas()).toBe(4);
  });

  it('deve salvar jogo e gênero favoritos no perfil', () => {
    auth.register({ nome: 'João', email: 'joao@example.com', senha: '123' });
    games.addGame({
      nome: 'Jogo favorito',
      imagem: 'favorito.jpg',
      estrelas: 5,
      dataInicial: '2026-01-01',
      favorito: true,
      wishlist: false,
      status: 'finalizado',
    });
    component.jogoFavoritoId.set('1');
    component.generoFavorito.set('RPG');

    component.salvarPreferencias();

    expect(auth.usuario()?.jogoFavoritoId).toBe(1);
    expect(auth.usuario()?.generoFavorito).toBe('RPG');
    expect(component.nomeJogoFavorito()).toBe('Jogo favorito');
    expect(component.preferenciasSalvas()).toBe(true);
  });

  it('deve atualizar a foto com a Data URL do arquivo', () => {
    const atualizarFotoSpy = vi.spyOn(auth, 'atualizarFoto');

    const file = new File(
      ['foto de teste'],
      'foto.png',
      { type: 'image/png' },
    );

    const mockReader = {
      result: 'data:image/png;base64,teste',
      onload: null as ((event: ProgressEvent<FileReader>) => void) | null,
      readAsDataURL: vi.fn(),
    };

    vi.spyOn(window, 'FileReader').mockImplementation(
      function () {
        return mockReader as unknown as FileReader;
      } as unknown as typeof FileReader,
    );

    mockReader.readAsDataURL.mockImplementation(() => {
      if (mockReader.onload) {
        mockReader.onload(
          new ProgressEvent('load') as ProgressEvent<FileReader>,
        );
      }
    });

    const event = {
      target: {
        files: [file],
      },
    } as unknown as Event;

    component.selecionarFoto(event);

    expect(mockReader.readAsDataURL).toHaveBeenCalledWith(file);
    expect(atualizarFotoSpy).toHaveBeenCalledWith(
      'data:image/png;base64,teste',
    );

    vi.restoreAllMocks();
  });
});