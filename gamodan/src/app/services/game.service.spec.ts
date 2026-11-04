
import { TestBed } from '@angular/core/testing';
import {
  HttpClientTestingModule,
  HttpTestingController
} from '@angular/common/http/testing';

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { GameService } from './game.service';

describe('GameService', () => {

  let service: GameService;
  let httpMock: HttpTestingController;

  beforeEach(() => {

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [GameService]
    });

    service = TestBed.inject(GameService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('deve ser criado', () => {
    expect(service).toBeTruthy();
  });

  it('deve buscar jogos na API FreeToGame', () => {

    const mockResponse = [
      {
        id: 1,
        title: 'Zelda',
        thumbnail: 'https://exemplo.com/zelda.jpg',
        short_description: 'Descrição do jogo',
        game_url: 'https://exemplo.com',
        genre: 'Action',
        platform: 'PC',
        publisher: 'Nintendo',
        developer: 'Nintendo',
        release_date: '2025-01-01'
      }
    ];

    service.buscarJogos().subscribe((response) => {
      expect(response).toEqual(mockResponse);
    });

    const req = httpMock.expectOne(
      'https://www.freetogame.com/api/games'
    );

    expect(req.request.method).toBe('GET');

    req.flush(mockResponse);
  });

});
