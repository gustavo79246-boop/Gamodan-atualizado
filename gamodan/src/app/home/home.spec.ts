import { TestBed } from '@angular/core/testing';
import { FormBuilder } from '@angular/forms';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { throwError } from 'rxjs';

import { Home } from './home';
import { AuthService } from '../services/auth';
import { CatalogService } from '../services/catalog';
import { GameService } from '../services/game';
import { FreeToGameService } from '../services/free-to-game';
import { Game } from '../models/game.model';
import { of } from 'rxjs';
import { FreeToGame } from '../services/free-to-game';
describe('Home', () => {
  let component: Home;
  let auth: AuthService;
  let catalog: CatalogService;
  let games: GameService;
  let freeToGame: FreeToGameService;

  beforeEach(() => {
    localStorage.clear();

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [AuthService, CatalogService, GameService, FreeToGameService, FormBuilder],
    });

    auth = TestBed.inject(AuthService);
    catalog = TestBed.inject(CatalogService);
    games = TestBed.inject(GameService);
    freeToGame = TestBed.inject(FreeToGameService);
    vi.spyOn(freeToGame, 'buscarDetalhesPorTitulo').mockReturnValue(of(null));

    TestBed.runInInjectionContext(() => {
      component = new Home();
    });
  });

  afterEach(() => {
    component.ngOnDestroy();
    vi.restoreAllMocks();
  });

  it('deve criar o componente', () => {
    expect(component).toBeTruthy();
  });

  it('deve iniciar na aba recentemente', () => {
    expect(component.aba()).toBe('recentemente');
  });

  it('deve iniciar com os modais fechados', () => {
    expect(component.modalAberto()).toBe(false);
    expect(component.catalogoAberto()).toBe(false);
  });

  it('deve iniciar sem detalhes', () => {
    expect(component.detalhes()).toBeNull();
  });

  it('deve iniciar com índice zero', () => {
    expect(component.indice()).toBe(0);
  });

  it('deve retornar os jogos de preview quando usuário não estiver autenticado', () => {
    expect(component.jogos()).toEqual(component.previewJogos);
  });

  it('deve destacar jogos aleatórios e mostrar rankings demonstrativos separados', () => {
    expect(component.jogosEmDestaque()).toHaveLength(component.previewJogos.length);
    expect(new Set(component.jogosEmDestaque().map((jogo) => jogo.id)).size).toBe(
      component.previewJogos.length,
    );
    expect(component.jogosMaisJogados).toHaveLength(component.previewJogos.length);
    expect(component.jogosMaisAvaliados).toHaveLength(component.previewJogos.length);
    expect(component.visiveisMaisJogados().length).toBe(3);
    expect(component.visiveisMaisAvaliados().length).toBe(3);
  });

  it('deve retornar os jogos do usuário autenticado', () => {
    vi.spyOn(auth, 'autenticado').mockReturnValue(true);

    games.addGame({
      nome: 'Minecraft',
      imagem: 'minecraft.jpg',
      estrelas: 5,
      dataInicial: '2026-01-10',
      favorito: true,
      wishlist: false,
      status: 'jogando',
    });

    expect(component.jogos()[0].nome).toBe('Minecraft');
  });

  it('deve retornar somente favoritos na aba favoritos', () => {
    vi.spyOn(auth, 'autenticado').mockReturnValue(true);

    games.addGame({
      nome: 'Minecraft',
      imagem: 'minecraft.jpg',
      estrelas: 5,
      dataInicial: '2026-01-10',
      favorito: true,
      wishlist: false,
      status: 'jogando',
    });

    games.addGame({
      nome: 'Stardew Valley',
      imagem: 'stardew.jpg',
      estrelas: 4,
      dataInicial: '2026-02-01',
      favorito: false,
      wishlist: false,
      status: 'pendente',
    });

    component.aba.set('favoritos');

    expect(component.jogos()).toHaveLength(1);
    expect(component.jogos()[0].nome).toBe('Minecraft');
  });

  it('deve usar preview quando usuário autenticado não possuir jogos', () => {
    vi.spyOn(auth, 'autenticado').mockReturnValue(true);

    expect(component.jogos()).toEqual(component.previewJogos);
  });

  it('deve retornar jogos do catálogo quando usuário for administrador', () => {
    vi.spyOn(auth, 'admin').mockReturnValue(true);

    catalog.addItem({
      nome: 'Minecraft',
      imagem: 'minecraft.jpg',
    });

    const resultado = component.jogos();

    expect(resultado).toHaveLength(1);
    expect(resultado[0].nome).toBe('Minecraft');
    expect(resultado[0].status).toBe('pendente');
    expect(resultado[0].estrelas).toBe(3);
  });

  it('deve limitar os jogos visíveis a três', () => {
    const resultado = component.visiveis();

    expect(resultado).toHaveLength(3);
  });

  it('deve retornar todos os jogos quando houver no máximo três', () => {
    vi.spyOn(auth, 'autenticado').mockReturnValue(true);

    games.addGame({
      nome: 'Minecraft',
      imagem: 'minecraft.jpg',
      estrelas: 5,
      dataInicial: '2026-01-10',
      favorito: true,
      wishlist: false,
      status: 'jogando',
    });

    games.addGame({
      nome: 'Hollow Knight',
      imagem: 'hollow.jpg',
      estrelas: 5,
      dataInicial: '2026-01-15',
      favorito: false,
      wishlist: false,
      status: 'finalizado',
    });

    expect(component.visiveis()).toHaveLength(2);
  });

  it('deve abrir o modal para usuário autenticado', () => {
    vi.spyOn(auth, 'autenticado').mockReturnValue(true);

    component.abrirJogo();

    expect(component.modalAberto()).toBe(true);
  });

  it('deve abrir o modal de login para usuário não autenticado', () => {
    const spy = vi.spyOn(auth, 'abrirModal');

    vi.spyOn(auth, 'autenticado').mockReturnValue(false);

    component.abrirJogo();

    expect(spy).toHaveBeenCalledWith('entrar');
    expect(component.modalAberto()).toBe(false);
  });

  it('deve abrir catálogo para adicionar item', () => {
    component.abrirCatalogo();

    expect(component.catalogoAberto()).toBe(true);
    expect(component.catalogoEditando()).toBeNull();
    expect(component.formCatalogo.controls.nome.value).toBe('');
  });

  it('deve abrir catálogo para editar item', () => {
    const item: Game = {
      id: 1,
      nome: 'Minecraft',
      imagem: 'minecraft.jpg',
      estrelas: 5,
      dataInicial: '2026-01-10',
      favorito: true,
      wishlist: false,
      status: 'jogando',
    };

    component.abrirCatalogo(item);

    expect(component.catalogoAberto()).toBe(true);
    expect(component.catalogoEditando()).toBe('Minecraft');
    expect(component.formCatalogo.controls.nome.value).toBe('Minecraft');
    expect(component.formCatalogo.controls.imagem.value).toBe('minecraft.jpg');
  });

  it('deve abrir catálogo e parar propagação do evento', () => {
    const stopPropagation = vi.fn();

    const event = {
      stopPropagation,
    } as unknown as MouseEvent;

    component.abrirCatalogo(undefined, event);

    expect(stopPropagation).toHaveBeenCalled();
  });

  it('deve excluir item do catálogo', () => {
    const spy = vi.spyOn(catalog, 'removeItem');

    const event = {
      stopPropagation: vi.fn(),
    } as unknown as MouseEvent;

    component.excluirCatalogo('Minecraft', event);

    expect(event.stopPropagation).toHaveBeenCalled();
    expect(spy).toHaveBeenCalledWith('Minecraft');
  });

  it('deve fechar catálogo ao excluir o item que está sendo editado', () => {
    component.catalogoEditando.set('Minecraft');
    component.catalogoAberto.set(true);

    const event = {
      stopPropagation: vi.fn(),
    } as unknown as MouseEvent;

    component.excluirCatalogo('Minecraft', event);

    expect(component.catalogoEditando()).toBeNull();
    expect(component.catalogoAberto()).toBe(false);
  });

  it('deve atualizar o termo de busca', () => {
    const event = {
      target: {
        value: 'Minecraft',
      },
    } as unknown as Event;

    component.onNomeInput(event);

    expect(component.termoBusca()).toBe('Minecraft');
  });

  it('deve selecionar uma sugestão do catálogo', () => {
    const item = {
      id: 1,
      nome: 'Minecraft',
      imagem: 'minecraft.jpg',
    };

    component.termoBusca.set('Mine');

    component.selecionarSugestao(item);

    expect(component.form.controls.nome.value).toBe('Minecraft');
    expect(component.form.controls.imagem.value).toBe('minecraft.jpg');
    expect(component.termoBusca()).toBe('');
  });

  it('não deve salvar catálogo com formulário inválido', () => {
    const addSpy = vi.spyOn(catalog, 'addItem');

    component.salvarCatalogo();

    expect(addSpy).not.toHaveBeenCalled();
    expect(component.catalogoAberto()).toBe(false);
  });

  it('deve adicionar item ao catálogo', () => {
    const spy = vi.spyOn(catalog, 'addItem');

    component.formCatalogo.setValue({
      nome: 'Minecraft',
      imagem: 'minecraft.jpg',
    });

    component.catalogoEditando.set(null);
    component.catalogoAberto.set(true);

    component.salvarCatalogo();

    expect(spy).toHaveBeenCalledWith({
      nome: 'Minecraft',
      imagem: 'minecraft.jpg',
    });

    expect(component.catalogoEditando()).toBeNull();
    expect(component.catalogoAberto()).toBe(false);
  });

  it('deve editar item do catálogo', () => {
    const spy = vi.spyOn(catalog, 'updateItem');

    component.catalogoEditando.set('Minecraft');
    component.formCatalogo.setValue({
      nome: 'Minecraft Atualizado',
      imagem: 'minecraft2.jpg',
    });

    component.salvarCatalogo();

    expect(spy).toHaveBeenCalledWith('Minecraft', {
      nome: 'Minecraft Atualizado',
      imagem: 'minecraft2.jpg',
    });

    expect(component.catalogoEditando()).toBeNull();
    expect(component.catalogoAberto()).toBe(false);
  });

  it('deve alternar entre recentemente e favoritos', () => {
    vi.spyOn(auth, 'autenticado').mockReturnValue(true);

    expect(component.aba()).toBe('recentemente');

    component.filtrar();

    expect(component.aba()).toBe('favoritos');

    component.filtrar();

    expect(component.aba()).toBe('recentemente');
  });

  it('deve abrir login ao filtrar sem autenticação', () => {
    const spy = vi.spyOn(auth, 'abrirModal');

    vi.spyOn(auth, 'autenticado').mockReturnValue(false);

    component.filtrar();

    expect(spy).toHaveBeenCalledWith('entrar');
  });

  it('deve avançar no carrossel', () => {
    vi.spyOn(auth, 'autenticado').mockReturnValue(false);

    component.irPara(0);
    component.avancar();

    expect(component.indice()).toBe(1);
  });

  it('deve voltar no carrossel', () => {
    vi.spyOn(auth, 'autenticado').mockReturnValue(false);

    component.irPara(0);
    component.voltar();

    expect(component.indice()).toBe(component.jogos().length - 1);
  });

  it('deve definir um índice específico', () => {
    component.irPara(3);

    expect(component.indice()).toBe(3);
  });

  it('não deve avançar quando houver apenas um jogo', () => {
    vi.spyOn(auth, 'autenticado').mockReturnValue(true);

    games.addGame({
      nome: 'Minecraft',
      imagem: 'minecraft.jpg',
      estrelas: 5,
      dataInicial: '2026-01-10',
      favorito: false,
      wishlist: false,
      status: 'jogando',
    });

    component.irPara(0);
    component.avancar();

    expect(component.indice()).toBe(0);
  });

  it('deve abrir detalhes para usuário autenticado', () => {
    vi.spyOn(auth, 'autenticado').mockReturnValue(true);

    const game = component.previewJogos[0];

    component.abrirDetalhes(game);

    expect(component.detalhes()).toEqual(game);
  });

  it('deve carregar os dados externos ao abrir detalhes', () => {
    const dadosApi: FreeToGame = {
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
    vi.spyOn(auth, 'autenticado').mockReturnValue(true);
    vi.spyOn(freeToGame, 'buscarDetalhesPorTitulo').mockReturnValue(of(dadosApi));

    component.abrirDetalhes(component.previewJogos[0]);

    expect(freeToGame.buscarDetalhesPorTitulo).toHaveBeenCalledWith(component.previewJogos[0].nome);
    expect(component.detalhesApi()).toEqual(dadosApi);
    expect(component.carregandoDetalhesApi()).toBe(false);
  });

  it('deve pedir login ao abrir detalhes sem autenticação', () => {
    const spy = vi.spyOn(auth, 'abrirModal');

    vi.spyOn(auth, 'autenticado').mockReturnValue(false);

    const game = component.previewJogos[0];

    component.abrirDetalhes(game);

    expect(spy).toHaveBeenCalledWith('entrar');
    expect(component.detalhes()).toBeNull();
  });

  it('não deve salvar jogo com formulário inválido', () => {
    const spy = vi.spyOn(games, 'addGame');

    component.salvar();

    expect(spy).not.toHaveBeenCalled();
  });

  it('deve salvar um novo jogo', () => {
    const spy = vi.spyOn(games, 'addGame');

    component.form.patchValue({
      nome: 'Minecraft',
      imagem: 'minecraft.jpg',
      descricao: '',
      estrelas: 5,
      horasJogadas: 0,
      dataInicial: '2026-01-10',
      dataFinal: '',
      favorito: true,
      wishlist: false,
      status: 'jogando',
    });

    component.salvar();

    expect(spy).toHaveBeenCalledWith({
      nome: 'Minecraft',
      imagem: 'minecraft.jpg',
      descricao: undefined,
      desenvolvedor: undefined,
      plataforma: undefined,
      dataLancamento: undefined,
      generos: undefined,
      estrelas: 5,
      horasJogadas: 0,
      dataInicial: '2026-01-10',
      dataFinal: undefined,
      favorito: true,
      wishlist: false,
      status: 'jogando',
    });

    expect(component.modalAberto()).toBe(false);
    expect(component.aba()).toBe('recentemente');
    expect(component.termoBusca()).toBe('');
  });

  it('deve definir meia estrela', () => {
    const event = {
      currentTarget: {
        getBoundingClientRect: () => ({
          left: 100,
          width: 20,
        }),
      },
      clientX: 105,
    } as unknown as MouseEvent;

    component.definirEstrelas(3, event);

    expect(component.form.controls.estrelas.value).toBe(2.5);
  });

  it('deve definir estrela inteira', () => {
    const event = {
      currentTarget: {
        getBoundingClientRect: () => ({
          left: 100,
          width: 20,
        }),
      },
      clientX: 115,
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
    expect(component.formatarData('2026-01-10')).toBe('10/01/2026');
  });

  it('deve carregar imagem do catálogo como Data URL', () => {
    const file = new File(['imagem'], 'teste.png', { type: 'image/png' });

    const mockReader = {
      result: 'data:image/png;base64,catalogo',
      onload: null as ((event: ProgressEvent) => void) | null,
      readAsDataURL: vi.fn(),
    };

    vi.spyOn(window, 'FileReader').mockImplementation(function () {
      return mockReader as unknown as FileReader;
    } as unknown as typeof FileReader);

    mockReader.readAsDataURL.mockImplementation(() => {
      if (mockReader.onload) {
        mockReader.onload(new ProgressEvent('load') as ProgressEvent);
      }
    });

    const event = {
      target: {
        files: [file],
      },
    } as unknown as Event;

    component.selecionarArquivoCatalogo(event);

    expect(component.formCatalogo.controls.imagem.value).toBe('data:image/png;base64,catalogo');
  });

  it('não deve carregar imagem do catálogo sem arquivo', () => {
    const event = {
      target: {
        files: [],
      },
    } as unknown as Event;

    component.selecionarArquivoCatalogo(event);

    expect(component.formCatalogo.controls.imagem.value).toBe('');
  });

  it('deve carregar imagem do jogo como Data URL', () => {
    const file = new File(['imagem'], 'teste.png', { type: 'image/png' });

    const mockReader = {
      result: 'data:image/png;base64,jogo',
      onload: null as ((event: ProgressEvent) => void) | null,
      readAsDataURL: vi.fn(),
    };

    vi.spyOn(window, 'FileReader').mockImplementation(function () {
      return mockReader as unknown as FileReader;
    } as unknown as typeof FileReader);

    mockReader.readAsDataURL.mockImplementation(() => {
      if (mockReader.onload) {
        mockReader.onload(new ProgressEvent('load') as ProgressEvent);
      }
    });

    const event = {
      target: {
        files: [file],
      },
    } as unknown as Event;

    component.selecionarArquivo(event);

    expect(component.form.controls.imagem.value).toBe('data:image/png;base64,jogo');
  });

  it('não deve carregar imagem do jogo sem arquivo', () => {
    const event = {
      target: {
        files: [],
      },
    } as unknown as Event;

    component.selecionarArquivo(event);

    expect(component.form.controls.imagem.value).toBe('');
  });

  it('deve limpar o autoplay ao destruir o componente', () => {
    const clearIntervalSpy = vi.spyOn(globalThis, 'clearInterval');

    TestBed.runInInjectionContext(() => {
      const novoComponente = new Home();
      TestBed.flushEffects();
      novoComponente.ngOnDestroy();
    });

    expect(clearIntervalSpy).toHaveBeenCalled();
    clearIntervalSpy.mockRestore();
  });

  it('deve excluir item do catálogo e fechar se for o que está sendo editado', () => {
    component.catalogoEditando.set('Jogo Teste');
    component.catalogoAberto.set(true);

    const eventoMock = { stopPropagation: vi.fn() } as unknown as MouseEvent;

    component.excluirCatalogo('Jogo Teste', eventoMock);

    expect(eventoMock.stopPropagation).toHaveBeenCalled();
    expect(component.catalogoEditando()).toBeNull();
    expect(component.catalogoAberto()).toBe(false);
  });

  it('não deve carregar imagem do catálogo se nenhum arquivo for selecionado', () => {
    const event = { target: { files: [] } } as unknown as Event;
    component.selecionarArquivoCatalogo(event);
    expect(component.formCatalogo.controls.imagem.value).toBe('');
  });

  it('deve definir meia estrela e estrela inteira corretamente', () => {
    const mockElement = document.createElement('div');
    vi.spyOn(mockElement, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      width: 100,
      top: 0,
      height: 0,
      bottom: 0,
      right: 0,
      x: 0,
      y: 0,
      toJSON: () => {},
    });

    const eventLeft = { currentTarget: mockElement, clientX: 20 } as unknown as MouseEvent;
    component.definirEstrelas(4, eventLeft);
    expect(component.form.controls.estrelas.value).toBe(3.5);

    const eventRight = { currentTarget: mockElement, clientX: 80 } as unknown as MouseEvent;
    component.definirEstrelas(4, eventRight);
    expect(component.form.controls.estrelas.value).toBe(4);
  });

  it('deve retornar o estado correto das estrelas (full, half, vazia)', () => {
    expect(component.estadoEstrela(4, 4)).toBe('full');
    expect(component.estadoEstrela(3.5, 4)).toBe('half');
    expect(component.estadoEstrela(3, 4)).toBe('');
  });

  it('deve abrir catálogo para adicionar novo item quando nenhum jogo for passado', () => {
    component.abrirCatalogo();

    expect(component.catalogoEditando()).toBeNull();
    expect(component.formCatalogo.value.nome).toBe('');
    expect(component.formCatalogo.value.imagem).toBe('');
    expect(component.catalogoAberto()).toBe(true);
  });

  it('deve abrir catálogo para editar um jogo existente preenchendo o formulário', () => {
    const jogoExemplo = { id: 1, nome: 'Zelda', imagem: 'zelda.jpg' } as any;
    component.abrirCatalogo(jogoExemplo);

    expect(component.catalogoEditando()).toBe('Zelda');
    expect(component.formCatalogo.value.nome).toBe('Zelda');
    expect(component.formCatalogo.value.imagem).toBe('zelda.jpg');
    expect(component.catalogoAberto()).toBe(true);
  });

  it('deve formatar uma data corretamente com formatarData', () => {
    const dataFormatada = component.formatarData('2026-01-10');
    expect(dataFormatada).toBeDefined();
    expect(typeof dataFormatada).toBe('string');
  });

  it('deve testar o fluxo de erro na busca da API FreeToGame', () => {
    const freeToGameService = TestBed.inject(FreeToGameService);
    vi.spyOn(freeToGameService, 'buscarJogos').mockReturnValue(
      throwError(() => new Error('Erro API')),
    );

    component.buscarJogosAPI('Zelda');

    expect(component.jogosAPI()).toEqual([]);
  });

  it('não deve salvar o jogo principal se o formulário estiver inválido', () => {
    const gameService = TestBed.inject(GameService);
    const spy = vi.spyOn(gameService, 'addGame');
    component.form.patchValue({ nome: '' });

    component.salvar();

    expect(spy).not.toHaveBeenCalled();
    expect(component.form.touched).toBe(true);
  });

  it('não deve salvar o catálogo se o formulário do catálogo estiver inválido', () => {
    const catalogService = TestBed.inject(CatalogService);
    const spy = vi.spyOn(catalogService, 'addItem');
    component.formCatalogo.patchValue({ nome: '' });

    component.salvarCatalogo();

    expect(spy).not.toHaveBeenCalled();
    expect(component.formCatalogo.touched).toBe(true);
  });

  it('deve buscar e filtrar com sucesso os jogos da API FreeToGame', () => {
    const freeToGameService = TestBed.inject(FreeToGameService);
    const mockJogos = [
      { title: 'Zelda Adventure', thumbnail: 'z1.jpg' },
      { title: 'Mario Bros', thumbnail: 'm1.jpg' },
    ];

    vi.spyOn(freeToGameService, 'buscarJogos').mockReturnValue(of(mockJogos as any));

    component.buscarJogosAPI('Zelda');

    expect(component.jogosAPI()).toHaveLength(1);
    expect(component.jogosAPI()[0].title).toBe('Zelda Adventure');
  });

  it('deve abrir a busca da API se o usuário estiver autenticado', () => {
    vi.spyOn(auth, 'autenticado').mockReturnValue(true);

    component.abrirBuscaAPI();

    expect(component.apiAberta()).toBe(true);
  });

  it('deve abrir o modal de login e não abrir a busca se o usuário não estiver autenticado', () => {
    const spy = vi.spyOn(auth, 'abrirModal');
    vi.spyOn(auth, 'autenticado').mockReturnValue(false);

    component.abrirBuscaAPI();

    expect(spy).toHaveBeenCalledWith('entrar');
    expect(component.apiAberta()).toBe(false);
  });

  it('deve limpar os jogos da API e retornar se o termo de busca estiver vazio', () => {
    const freeToGameService = TestBed.inject(FreeToGameService);
    const spy = vi.spyOn(freeToGameService, 'buscarJogos');

    component.buscarJogosAPI('   '); // Passando apenas espaços

    expect(component.jogosAPI()).toEqual([]);
    expect(spy).not.toHaveBeenCalled();
  });

  it('deve preencher o formulário e abrir o modal principal ao adicionar um jogo da API', () => {
    const jogoMock: FreeToGame = {
      id: 1,
      title: 'Free Game Title',
      thumbnail: 'thumb.jpg',
    } as FreeToGame;

    // Configura estados iniciais para testar a limpeza
    component.apiAberta.set(true);
    component.termoAPIBusca.set('Free');
    component.jogosAPI.set([jogoMock]);

    component.adicionarJogoAPI(jogoMock);

    expect(component.form.controls.nome.value).toBe('Free Game Title');
    expect(component.form.controls.imagem.value).toBe('thumb.jpg');
    expect(component.form.controls.estrelas.value).toBe(0);
    expect(component.veioDaAPI()).toBe(true);
    expect(component.apiAberta()).toBe(false);
    expect(component.termoAPIBusca()).toBe('');
    expect(component.jogosAPI()).toEqual([]);
    expect(component.modalAberto()).toBe(true);
  });
});
