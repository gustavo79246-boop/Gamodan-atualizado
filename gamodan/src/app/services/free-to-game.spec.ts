import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { API_URL } from '../config/api.config';
import { FreeToGame, FreeToGameService } from './free-to-game';

describe('FreeToGameService', () => {
  let service: FreeToGameService;
  let httpMock: HttpTestingController;
  const base = `${API_URL}/free-games`;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(FreeToGameService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('busca jogos pela nossa API, enviando o termo e o limite', () => {
    const jogos = [{ id: 1, title: 'Shooter Game' } as FreeToGame];
    service.buscarJogos(' Shooter ', 5).subscribe((resultado) => expect(resultado).toEqual(jogos));

    const req = httpMock.expectOne((r) => r.url === base);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('q')).toBe('Shooter');
    expect(req.request.params.get('limit')).toBe('5');
    req.flush({ games: jogos });
  });

  it('não chama a API quando o termo está vazio', () => {
    service.buscarJogos('   ').subscribe((resultado) => expect(resultado).toEqual([]));
    httpMock.expectNone(base);
  });

  it('busca um jogo por id', () => {
    const jogo = { id: 123, title: 'Specific Game' } as FreeToGame;
    service.buscarPorId(123).subscribe((resultado) => expect(resultado).toEqual(jogo));
    httpMock.expectOne(`${base}/123`).flush({ game: jogo });
  });

  it('busca os detalhes pelo título exato em uma única chamada', () => {
    const jogo = { id: 123, title: 'Specific Game', short_description: 'Descrição' } as FreeToGame;
    service.buscarDetalhesPorTitulo(' Specific Game ').subscribe((resultado) => expect(resultado).toEqual(jogo));

    const req = httpMock.expectOne((r) => r.url === `${base}/by-title`);
    expect(req.request.params.get('title')).toBe('Specific Game');
    req.flush({ game: jogo });
  });

  it('retorna null quando o título não existe', () => {
    service.buscarDetalhesPorTitulo('Minecraft').subscribe((resultado) => expect(resultado).toBeNull());
    httpMock.expectOne((r) => r.url === `${base}/by-title`).flush({ game: null });
  });

  it('retorna null sem chamar a API quando o título está vazio', () => {
    service.buscarDetalhesPorTitulo('  ').subscribe((resultado) => expect(resultado).toBeNull());
    httpMock.expectNone(`${base}/by-title`);
  });
});
