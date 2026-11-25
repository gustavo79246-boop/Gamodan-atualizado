import { TestBed } from '@angular/core/testing';
import { FormBuilder } from '@angular/forms';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { BehaviorSubject } from 'rxjs';

import { Lista } from './lista';
import { GameService } from '../services/game';
import { AuthService } from '../services/auth';
import { CatalogService } from '../services/catalog';
import { FreeToGame, FreeToGameService } from '../services/free-to-game';
import { Game } from '../models/game.model';
import { of } from 'rxjs';

describe('Lista', () => {
  let component: Lista;
  let gameService: GameService;
  let queryParams: BehaviorSubject<ReturnType<typeof convertToParamMap>>;

  const jogosMock: Game[] = [
    {
      id: 1,
      nome: 'Minecraft',
      imagem: 'minecraft.jpg',
      estrelas: 5,
      dataInicial: '2026-01-10',
      favorito: true,
      wishlist: false,
      status: 'jogando',
    },
    {
      id: 2,
      nome: 'Hollow Knight',
      imagem: 'hollow.jpg',
      estrelas: 4.5,
      dataInicial: '2026-01-15',
      favorito: true,
      wishlist: true,
      status: 'finalizado',
    },
    {
      id: 3,
      nome: 'Stardew Valley',
      imagem: 'stardew.jpg',
      estrelas: 4,
      dataInicial: '2026-02-01',
      favorito: false,
      wishlist: true,
      status: 'pendente',
    },
    {
      id: 4,
      nome: 'GTA V',
      imagem: 'gta.jpg',
      estrelas: 4,
      dataInicial: '2026-02-05',
      favorito: false,
      wishlist: false,
      status: 'jogando',
    },
  ];

  beforeEach(() => {
    localStorage.clear();
    queryParams = new BehaviorSubject(convertToParamMap({}));

    TestBed.configureTestingModule({
      providers: [
        GameService,
        AuthService,
        CatalogService,
        {
          provide: FreeToGameService,
          useValue: { buscarJogos: vi.fn(), buscarDetalhesPorTitulo: vi.fn(() => of(null)) },
        },
        {
          provide: ActivatedRoute,
          useValue: {
            queryParamMap: queryParams.asObservable(),
            snapshot: { queryParamMap: convertToParamMap({}) },
          },
        },
        FormBuilder,
      ],
    });

    gameService = TestBed.inject(GameService);

    TestBed.runInInjectionContext(() => {
      component = new Lista();
    });
  });

  it('deve criar o componente', () => {
    expect(component).toBeTruthy();
  });

  it('deve iniciar com filtro todos', () => {
    expect(component.filtro()).toBe('todos');
  });

  it('deve iniciar sem jogo selecionado', () => {
    expect(component.jogoSelecionado()).toBeNull();
  });

  it('deve iniciar sem edição', () => {
    expect(component.editando()).toBe(false);
  });

  it('deve aplicar filtros e busca enviados pela navegação do menu', () => {
    TestBed.inject(AuthService).register({
      nome: 'Jogadora de teste',
      email: 'jogadora@example.com',
      senha: 'senha-segura',
    });
    TestBed.flushEffects();
    jogosMock.forEach(({ id: _id, ...jogo }) => gameService.addGame(jogo));

    queryParams.next(convertToParamMap({ filtro: 'favoritos', busca: 'hollow' }));
    TestBed.flushEffects();

    expect(component.filtro()).toBe('favoritos');
    expect(component.termoBusca()).toBe('hollow');
    expect(component.jogos().map((jogo) => jogo.nome)).toEqual(['Hollow Knight']);
  });

  it('deve adicionar um jogo pago à lista', () => {
    component.abrirNovoJogo();
    component.form.patchValue({
      nome: 'Jogo pago',
      imagem: 'jogo.jpg',
      descricao: 'Uma aventura de teste.',
      desenvolvedor: 'Estúdio Gamodan',
      plataforma: 'PC',
      dataLancamento: '2024-01-15',
      generos: 'Ação, Aventura',
      horasJogadas: 4,
    });

    component.salvarNovoJogo();

    expect(gameService.games()[0].nome).toBe('Jogo pago');
    expect(gameService.games()[0].horasJogadas).toBe(4);
    expect(gameService.games()[0].descricao).toBe('Uma aventura de teste.');
    expect(gameService.games()[0].desenvolvedor).toBe('Estúdio Gamodan');
    expect(gameService.games()[0].plataforma).toBe('PC');
    expect(gameService.games()[0].dataLancamento).toBe('2024-01-15');
    expect(gameService.games()[0].generos).toEqual(['Ação', 'Aventura']);
    expect(component.novoJogoAberto()).toBe(false);
  });

  it('deve pesquisar e adicionar jogos gratuitos à lista', () => {
    const api = TestBed.inject(FreeToGameService);
    vi.spyOn(api, 'buscarJogos').mockReturnValue(
      of([
        {
          id: 42,
          title: 'Guild Wars 2',
          thumbnail: 'guild.jpg',
          short_description: 'A fantasy MMO',
          game_url: 'https://example.com',
          genre: 'MMORPG',
          platform: 'PC',
          publisher: 'Publisher',
          developer: 'Developer',
          release_date: '2012-08-28',
        },
      ]),
    );

    component.abrirBuscaGratis();
    component.buscarJogosGratis('Guild');

    expect(component.jogosGratis()).toHaveLength(1);
    component.adicionarJogoGratis(component.jogosGratis()[0]);

    expect(gameService.games()[0].nome).toBe('Guild Wars 2');
    expect(gameService.games()[0].desenvolvedor).toBe('Developer');
    expect(gameService.games()[0].dataLancamento).toBe('2012-08-28');
    expect(gameService.games()[0].plataforma).toBe('PC');
    expect(gameService.games()[0].generos).toEqual(['MMORPG']);
    expect(component.buscaGratisAberta()).toBe(false);
  });

  it('deve retornar todos os jogos', () => {
    jogosMock.forEach((jogo) => {
      gameService.addGame({
        nome: jogo.nome,
        imagem: jogo.imagem,
        estrelas: jogo.estrelas,
        horasJogadas: 0,
        dataInicial: jogo.dataInicial,
        dataFinal: jogo.dataFinal,
        favorito: jogo.favorito,
        wishlist: jogo.wishlist,
        status: jogo.status,
      });
    });

    expect(component.jogos().length).toBe(4);
  });

  it('deve ordenar os jogos pelo id decrescente', () => {
    jogosMock.forEach((jogo) => {
      gameService.addGame({
        nome: jogo.nome,
        imagem: jogo.imagem,
        estrelas: jogo.estrelas,
        horasJogadas: jogo.horasJogadas ?? 0,
        dataInicial: jogo.dataInicial,
        dataFinal: jogo.dataFinal,
        favorito: jogo.favorito,
        wishlist: jogo.wishlist,
        status: jogo.status,
      });
    });

    expect(component.jogos()[0].nome).toBe('GTA V');
    expect(component.jogos()[3].nome).toBe('Minecraft');
  });

  it('deve filtrar favoritos', () => {
    jogosMock.forEach((jogo) => {
      gameService.addGame({
        nome: jogo.nome,
        imagem: jogo.imagem,
        estrelas: jogo.estrelas,
        horasJogadas: 0,
        dataInicial: jogo.dataInicial,
        dataFinal: jogo.dataFinal,
        favorito: jogo.favorito,
        wishlist: jogo.wishlist,
        status: jogo.status,
      });
    });

    component.definirFiltro('favoritos');

    expect(component.jogos().length).toBe(2);
    expect(component.jogos().every((jogo) => jogo.favorito)).toBe(true);
  });

  it('deve filtrar wishlist', () => {
    jogosMock.forEach((jogo) => {
      gameService.addGame({
        nome: jogo.nome,
        imagem: jogo.imagem,
        estrelas: jogo.estrelas,
        dataInicial: jogo.dataInicial,
        dataFinal: jogo.dataFinal,
        favorito: jogo.favorito,
        wishlist: jogo.wishlist,
        status: jogo.status,
      });
    });

    component.definirFiltro('wishlist');

    expect(component.jogos().length).toBe(2);
    expect(component.jogos().every((jogo) => jogo.wishlist)).toBe(true);
  });

  it('deve filtrar por status jogando', () => {
    jogosMock.forEach((jogo) => {
      gameService.addGame({
        nome: jogo.nome,
        imagem: jogo.imagem,
        estrelas: jogo.estrelas,
        dataInicial: jogo.dataInicial,
        dataFinal: jogo.dataFinal,
        favorito: jogo.favorito,
        wishlist: jogo.wishlist,
        status: jogo.status,
      });
    });

    component.definirFiltro('jogando');

    expect(component.jogos().length).toBe(2);
    expect(component.jogos().every((jogo) => jogo.status === 'jogando')).toBe(true);
  });

  it('deve filtrar por status finalizado', () => {
    jogosMock.forEach((jogo) => {
      gameService.addGame({
        nome: jogo.nome,
        imagem: jogo.imagem,
        estrelas: jogo.estrelas,
        dataInicial: jogo.dataInicial,
        dataFinal: jogo.dataFinal,
        favorito: jogo.favorito,
        wishlist: jogo.wishlist,
        status: jogo.status,
      });
    });

    component.definirFiltro('finalizado');

    expect(component.jogos().length).toBe(1);
    expect(component.jogos()[0].status).toBe('finalizado');
  });

  it('deve filtrar por status pendente', () => {
    jogosMock.forEach((jogo) => {
      gameService.addGame({
        nome: jogo.nome,
        imagem: jogo.imagem,
        estrelas: jogo.estrelas,
        dataInicial: jogo.dataInicial,
        dataFinal: jogo.dataFinal,
        favorito: jogo.favorito,
        wishlist: jogo.wishlist,
        status: jogo.status,
      });
    });

    component.definirFiltro('pendente');

    expect(component.jogos().length).toBe(1);
    expect(component.jogos()[0].status).toBe('pendente');
  });

  it('deve definir filtro como todos', () => {
    component.definirFiltro('favoritos');
    component.definirFiltro('todos');

    expect(component.filtro()).toBe('todos');
  });

  it('deve definir filtro de status', () => {
    component.definirFiltroStatus('jogando');

    expect(component.filtro()).toBe('jogando');
    expect(component.filtroStatusSelecionado()).toBe('jogando');
  });

  it('deve voltar para todos quando filtro de status estiver vazio', () => {
    component.definirFiltro('jogando');

    component.definirFiltroStatus('');

    expect(component.filtro()).toBe('todos');
    expect(component.filtroStatusSelecionado()).toBe('');
  });

  it('deve calcular o total geral', () => {
    jogosMock.forEach((jogo) => {
      gameService.addGame({
        nome: jogo.nome,
        imagem: jogo.imagem,
        estrelas: jogo.estrelas,
        dataInicial: jogo.dataInicial,
        dataFinal: jogo.dataFinal,
        favorito: jogo.favorito,
        wishlist: jogo.wishlist,
        status: jogo.status,
      });
    });

    expect(component.totalGeral()).toBe(4);
  });

  it('deve calcular o total de favoritos', () => {
    jogosMock.forEach((jogo) => {
      gameService.addGame({
        nome: jogo.nome,
        imagem: jogo.imagem,
        estrelas: jogo.estrelas,
        dataInicial: jogo.dataInicial,
        dataFinal: jogo.dataFinal,
        favorito: jogo.favorito,
        wishlist: jogo.wishlist,
        status: jogo.status,
      });
    });

    expect(component.totalFavoritos()).toBe(2);
  });

  it('deve calcular o total da wishlist', () => {
    jogosMock.forEach((jogo) => {
      gameService.addGame({
        nome: jogo.nome,
        imagem: jogo.imagem,
        estrelas: jogo.estrelas,
        dataInicial: jogo.dataInicial,
        dataFinal: jogo.dataFinal,
        favorito: jogo.favorito,
        wishlist: jogo.wishlist,
        status: jogo.status,
      });
    });

    expect(component.totalWishlist()).toBe(2);
  });

  it('deve abrir detalhes de um jogo', () => {
    const jogo = jogosMock[0];

    component.abrirDetalhes(jogo);

    expect(component.jogoSelecionado()).toEqual(jogo);
    expect(component.editando()).toBe(false);
  });

  it('deve consultar os dados da API ao abrir detalhes', () => {
    const jogoApi: FreeToGame = {
      id: 42,
      title: 'Minecraft',
      thumbnail: 'minecraft.jpg',
      short_description: 'Descrição da API',
      game_url: 'https://example.com',
      genre: 'Sandbox',
      platform: 'PC',
      publisher: 'Mojang',
      developer: 'Mojang Studios',
      release_date: '2011-11-18',
    };
    const api = TestBed.inject(FreeToGameService);
    vi.spyOn(api, 'buscarDetalhesPorTitulo').mockReturnValue(of(jogoApi));

    component.abrirDetalhes(jogosMock[0]);

    expect(api.buscarDetalhesPorTitulo).toHaveBeenCalledWith(jogosMock[0].nome);
    expect(component.detalhesApi()).toEqual(jogoApi);
    expect(component.carregandoDetalhesApi()).toBe(false);
  });

  it('deve iniciar edição de um jogo', () => {
    const jogo = jogosMock[0];

    component.iniciarEdicao(jogo);

    expect(component.jogoSelecionado()).toEqual(jogo);
    expect(component.editando()).toBe(true);

    expect(component.form.getRawValue()).toEqual({
      nome: jogo.nome,
      imagem: jogo.imagem,
      descricao: '',
      desenvolvedor: '',
      plataforma: '',
      dataLancamento: '',
      generos: '',
      estrelas: jogo.estrelas,
      horasJogadas: 0,
      dataInicial: jogo.dataInicial,
      dataFinal: '',
      favorito: jogo.favorito,
      wishlist: jogo.wishlist,
      status: jogo.status,
    });
  });

  it('deve iniciar edição e parar propagação do evento', () => {
    const jogo = jogosMock[0];

    const event = {
      stopPropagation: vi.fn(),
    } as unknown as MouseEvent;

    component.iniciarEdicao(jogo, event);

    expect(event.stopPropagation).toHaveBeenCalled();
    expect(component.editando()).toBe(true);
  });

  it('deve fechar o modal', () => {
    component.abrirDetalhes(jogosMock[0]);
    component.iniciarEdicao(jogosMock[0]);

    component.fecharModal();

    expect(component.jogoSelecionado()).toBeNull();
    expect(component.editando()).toBe(false);
  });

  it('deve salvar a edição de um jogo', () => {
    gameService.addGame({
      nome: 'Minecraft',
      imagem: 'minecraft.jpg',
      estrelas: 3,
      dataInicial: '2026-09-01',
      dataFinal: undefined,
      favorito: false,
      wishlist: false,
      status: 'pendente',
    });

    const jogo = gameService.games()[0];

    component.iniciarEdicao(jogo);

    component.form.setValue({
      nome: 'Minecraft Atualizado',
      imagem: 'minecraft.jpg',
      descricao: 'Descrição atualizada',
      desenvolvedor: 'Mojang',
      plataforma: 'PC',
      dataLancamento: '2011-11-18',
      generos: 'Sandbox, Sobrevivência',
      estrelas: 4,
      horasJogadas: 8.5,
      dataInicial: '2026-09-01',
      dataFinal: '2026-09-17',
      favorito: false,
      wishlist: false,
      status: 'finalizado',
    });

    component.salvarEdicao();

    const atualizado = gameService.games()[0];

    expect(atualizado.nome).toBe('Minecraft Atualizado');
    expect(atualizado.descricao).toBe('Descrição atualizada');
    expect(atualizado.desenvolvedor).toBe('Mojang');
    expect(atualizado.plataforma).toBe('PC');
    expect(atualizado.dataLancamento).toBe('2011-11-18');
    expect(atualizado.generos).toEqual(['Sandbox', 'Sobrevivência']);
    expect(atualizado.dataFinal).toBe('2026-09-17');
    expect(atualizado.estrelas).toBe(4);
    expect(atualizado.horasJogadas).toBe(8.5);
    expect(atualizado.status).toBe('finalizado');
    expect(component.editando()).toBe(false);
  });

  it('não deve salvar edição sem jogo selecionado', () => {
    component.form.setValue({
      nome: 'Minecraft',
      imagem: 'minecraft.jpg',
      descricao: '',
      desenvolvedor: '',
      plataforma: '',
      dataLancamento: '',
      generos: '',
      estrelas: 4,
      horasJogadas: 0,
      dataInicial: '2026-09-01',
      dataFinal: '',
      favorito: false,
      wishlist: false,
      status: 'pendente',
    });

    component.salvarEdicao();

    expect(component.jogoSelecionado()).toBeNull();
  });

  it('deve excluir um jogo', () => {
    gameService.addGame({
      nome: 'Minecraft',
      imagem: 'minecraft.jpg',
      estrelas: 5,
      dataInicial: '2026-01-01',
      favorito: false,
      wishlist: false,
      status: 'pendente',
    });

    const id = gameService.games()[0].id;

    component.excluirJogo(id);

    expect(gameService.games().length).toBe(0);
  });

  it('deve excluir o jogo selecionado e fechar o modal', () => {
    gameService.addGame({
      nome: 'Minecraft',
      imagem: 'minecraft.jpg',
      estrelas: 5,
      dataInicial: '2026-01-01',
      favorito: false,
      wishlist: false,
      status: 'pendente',
    });

    const jogo = gameService.games()[0];

    component.abrirDetalhes(jogo);

    component.excluirJogo(jogo.id);

    expect(component.jogoSelecionado()).toBeNull();
    expect(component.editando()).toBe(false);
  });

  it('deve excluir jogo e parar propagação do evento', () => {
    gameService.addGame({
      nome: 'Minecraft',
      imagem: 'minecraft.jpg',
      estrelas: 5,
      dataInicial: '2026-01-01',
      favorito: false,
      wishlist: false,
      status: 'pendente',
    });

    const id = gameService.games()[0].id;

    const event = {
      stopPropagation: vi.fn(),
    } as unknown as MouseEvent;

    component.excluirJogo(id, event);

    expect(event.stopPropagation).toHaveBeenCalled();
  });

  it('deve alterar o status do jogo', () => {
    gameService.addGame({
      nome: 'Minecraft',
      imagem: 'minecraft.jpg',
      estrelas: 5,
      dataInicial: '2026-01-01',
      favorito: false,
      wishlist: false,
      status: 'pendente',
    });

    const id = gameService.games()[0].id;

    const event = {
      stopPropagation: vi.fn(),
    } as unknown as Event;

    component.alterarStatus(id, 'jogando', event);

    expect(gameService.games()[0].status).toBe('jogando');
    expect(event.stopPropagation).toHaveBeenCalled();
  });

  it('não deve alterar status inválido', () => {
    gameService.addGame({
      nome: 'Minecraft',
      imagem: 'minecraft.jpg',
      estrelas: 5,
      dataInicial: '2026-01-01',
      favorito: false,
      wishlist: false,
      status: 'pendente',
    });

    const id = gameService.games()[0].id;

    const event = {
      stopPropagation: vi.fn(),
    } as unknown as Event;

    component.alterarStatus(id, 'invalido', event);

    expect(gameService.games()[0].status).toBe('pendente');
  });

  it('deve alternar favorito', () => {
    gameService.addGame({
      nome: 'Minecraft',
      imagem: 'minecraft.jpg',
      estrelas: 5,
      dataInicial: '2026-01-01',
      favorito: false,
      wishlist: false,
      status: 'pendente',
    });

    const id = gameService.games()[0].id;

    const event = {
      stopPropagation: vi.fn(),
    } as unknown as MouseEvent;

    component.alternarFavorito(id, event);

    expect(gameService.games()[0].favorito).toBe(true);
    expect(event.stopPropagation).toHaveBeenCalled();
  });

  it('deve definir meia estrela', () => {
    const event = {
      currentTarget: {
        getBoundingClientRect: () => ({
          left: 0,
          width: 100,
        }),
      },
      clientX: 20,
    } as unknown as MouseEvent;

    component.definirEstrelas(3, event);

    expect(component.form.controls.estrelas.value).toBe(2.5);
  });

  it('deve definir estrela inteira', () => {
    const event = {
      currentTarget: {
        getBoundingClientRect: () => ({
          left: 0,
          width: 100,
        }),
      },
      clientX: 80,
    } as unknown as MouseEvent;

    component.definirEstrelas(3, event);

    expect(component.form.controls.estrelas.value).toBe(3);
  });

  it('deve retornar estrela cheia', () => {
    expect(component.estadoEstrela(5, 4)).toBe('full');
  });

  it('deve retornar meia estrela', () => {
    expect(component.estadoEstrela(3.5, 4)).toBe('half');
  });

  it('deve retornar estrela vazia', () => {
    expect(component.estadoEstrela(2, 4)).toBe('');
  });

  it('deve formatar uma data', () => {
    expect(component.formatarData('2026-09-17')).toBe('17/09/2026');
  });
  describe('selecionarArquivo', () => {
    it('deve carregar a imagem em base64 e atualizar o form quando um arquivo for selecionado', () => {
      const mockFile = new File(['conteudo'], 'game-cover.png', { type: 'image/png' });
      const event = {
        target: {
          files: [mockFile],
        },
      } as unknown as Event;

      const mockResult = 'data:image/png;base64,mockImageBase64';

      // Intercepta a leitura do arquivo e simula o disparo síncrono do evento onload
      vi.spyOn(FileReader.prototype, 'readAsDataURL').mockImplementation(function (
        this: FileReader,
      ) {
        Object.defineProperty(this, 'result', { value: mockResult, writable: true });
        if (this.onload) {
          this.onload({ target: this } as any);
        }
      });

      component.selecionarArquivo(event);

      expect(component.form.controls.imagem.value).toBe(mockResult);
    });

    it('não deve atualizar o form se nenhum arquivo for selecionado (cancelar modal de arquivo)', () => {
      const event = {
        target: {
          files: [],
        },
      } as unknown as Event;

      const initialValue = component.form.controls.imagem.value;

      component.selecionarArquivo(event);

      expect(component.form.controls.imagem.value).toBe(initialValue);
    });

    it('não deve atualizar o form se files for null ou undefined', () => {
      const event = {
        target: {
          files: null,
        },
      } as unknown as Event;

      const initialValue = component.form.controls.imagem.value;

      component.selecionarArquivo(event);

      expect(component.form.controls.imagem.value).toBe(initialValue);
    });
  });
  it('deve converter dataFinal vazia para undefined e cobrir fallback null no find (?? null)', () => {
    const mockGame = { id: 1, nome: 'Jogo Teste' } as any;
    component.jogoSelecionado.set(mockGame);
    component.editando.set(true);

    // Preenche o formulário garantindo que todos os campos obrigatórios estejam válidos
    component.form.patchValue({
      nome: 'Jogo Sem Data Final',
      imagem: 'capa.jpg',
      estrelas: 5,
      dataInicial: '2026-01-01',
      favorito: false,
      wishlist: false,
      status: 'jogando',
      dataFinal: '', // Força a string vazia para testar o fallback 'undefined'
    });

    // Simula a lista de jogos vazia para acionar o fallback (?? null) do find
    vi.spyOn(component['games'], 'games').mockReturnValue([]);
    const spyUpdate = vi.spyOn(component['games'], 'updateGame');

    component.salvarEdicao();

    expect(spyUpdate).toHaveBeenCalledWith(
      1,
      expect.objectContaining({
        dataFinal: undefined,
      }),
    );
    expect(component.jogoSelecionado()).toBeNull();
    expect(component.editando()).toBe(false);
  });
});
