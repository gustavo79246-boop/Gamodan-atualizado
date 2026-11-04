import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { FreeToGameService, FreeToGame } from './free-to-game';

describe('FreeToGameService', () => {
  let service: FreeToGameService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [FreeToGameService],
    });
    service = TestBed.inject(FreeToGameService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('deve ser criado com sucesso', () => {
    expect(service).toBeTruthy();
  });

  it('deve buscar jogos pelo nome com o parâmetro title', () => {
    const mockGames: FreeToGame[] = [{ id: 1, title: 'Shooter Game' } as FreeToGame];
    const nomeJogo = 'Shooter';

    service.buscarJogos(nomeJogo).subscribe((games) => {
      expect(games).toEqual(mockGames);
    });

    const req = httpMock.expectOne((request) => {
      return (
        request.url === 'https://www.freetogame.com/api/games' &&
        request.params.get('title') === nomeJogo
      );
    });

    expect(req.request.method).toBe('GET');
    req.flush(mockGames);
  });

  it('deve buscar todos os jogos', () => {
    const mockGames: FreeToGame[] = [{ id: 1, title: 'All Games' } as FreeToGame];

    service.buscarTodos().subscribe((games) => {
      expect(games).toEqual(mockGames);
    });

    const req = httpMock.expectOne('https://www.freetogame.com/api/games');
    expect(req.request.method).toBe('GET');
    req.flush(mockGames);
  });

  it('deve buscar jogo específico por ID', () => {
    const mockGame: FreeToGame = { id: 123, title: 'Specific Game' } as FreeToGame;

    service.buscarPorId(123).subscribe((game) => {
      expect(game).toEqual(mockGame);
    });

    const req = httpMock.expectOne('https://www.freetogame.com/api/game?id=123');
    expect(req.request.method).toBe('GET');
    req.flush(mockGame);
  });

  it('deve buscar detalhes por título e consultar o resultado correspondente por ID', () => {
    const resultadoBusca: FreeToGame = {
      id: 123,
      title: 'Specific Game',
    } as FreeToGame;
    const detalhes: FreeToGame = {
      ...resultadoBusca,
      short_description: 'Game description',
    };

    service.buscarDetalhesPorTitulo(' specific game ').subscribe((jogo) => {
      expect(jogo).toEqual(detalhes);
    });

    const busca = httpMock.expectOne(
      (request) =>
        request.url === 'https://www.freetogame.com/api/games' &&
        request.params.get('title') === ' specific game ',
    );
    busca.flush([resultadoBusca]);

    const detalhe = httpMock.expectOne('https://www.freetogame.com/api/game?id=123');
    detalhe.flush(detalhes);
  });

  it('deve retornar null quando o título não existe na API', () => {
    service.buscarDetalhesPorTitulo('Minecraft').subscribe((jogo) => {
      expect(jogo).toBeNull();
    });

    const busca = httpMock.expectOne(
      (request) =>
        request.url === 'https://www.freetogame.com/api/games' &&
        request.params.get('title') === 'Minecraft',
    );
    busca.flush([{ id: 1, title: 'Minecraft Dungeons' }]);
  });
});
