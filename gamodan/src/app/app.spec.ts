import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';

import { describe, it, expect, beforeEach, vi } from 'vitest';

import { of, throwError } from 'rxjs';

import { App } from './app';
import { GameService } from './services/game.service';

describe('App', () => {

  let component: App;
  let gameService: GameService;

  beforeEach(() => {

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [GameService]
    });

    gameService = TestBed.inject(GameService);

    component = new App(gameService);
  });

  it('deve criar o componente', () => {
    expect(component).toBeTruthy();
  });

  // --- Testes da função pesquisar() ---

  it('não deve pesquisar se a busca estiver vazia', () => {

    const spy = vi.spyOn(gameService, 'buscarJogos');

    component.busca = '   ';

    component.pesquisar();

    expect(spy).not.toHaveBeenCalled();
  });

  it('deve pesquisar jogos com sucesso e atualizar a lista', () => {

    const mockResponse = [
      {
        id: 1,
        title: 'Zelda',
        thumbnail: 'https://exemplo.com/zelda.jpg',
        short_description: 'Descrição do jogo Zelda.',
        game_url: 'https://exemplo.com/zelda',
        genre: 'Action',
        platform: 'PC (Windows)',
        publisher: 'Nintendo',
        developer: 'Nintendo',
        release_date: '2026-01-01'
      }
    ];

    vi.spyOn(gameService, 'buscarJogos')
      .mockReturnValue(of(mockResponse));

    component.busca = 'Zelda';

    component.pesquisar();

    expect(component.jogos()).toEqual(mockResponse);

    expect(component.carregando()).toBe(false);
  });

  it('deve tratar erro ao pesquisar jogos', () => {

    vi.spyOn(gameService, 'buscarJogos')
      .mockReturnValue(
        throwError(() => new Error('Erro API'))
      );

    component.busca = 'Mario';

    component.pesquisar();

    expect(component.erro())
      .toBe('Não foi possível buscar os jogos.');

    expect(component.carregando()).toBe(false);
  });

  // --- Testes da função onNomeInput() ---

  it('deve limpar as sugestões se o nome digitado for menor que 3 caracteres', () => {

    const event = {
      target: {
        value: 'ab'
      }
    } as unknown as Event;

    component.onNomeInput(event);

    expect(component.sugestoes()).toEqual([]);

    expect(component.buscandoJogos()).toBe(false);
  });

  it('deve buscar sugestões com sucesso na FreeToGame', () => {

    const mockResponse = [
      {
        id: 1,
        title: 'Zelda',
        thumbnail: 'img.jpg',
        short_description: 'Descrição do Zelda',
        game_url: 'https://exemplo.com/zelda',
        genre: 'Action',
        platform: 'PC (Windows)',
        publisher: 'Nintendo',
        developer: 'Nintendo',
        release_date: '2026-01-01'
      },
      {
        id: 2,
        title: 'Zelda Online',
        thumbnail: 'img2.jpg',
        short_description: 'Outro jogo Zelda',
        game_url: 'https://exemplo.com/zelda-online',
        genre: 'MMORPG',
        platform: 'PC (Windows)',
        publisher: 'Nintendo',
        developer: 'Nintendo',
        release_date: '2026-02-01'
      }
    ];

    vi.spyOn(gameService, 'buscarJogos')
      .mockReturnValue(of(mockResponse));

    const event = {
      target: {
        value: 'Zelda'
      }
    } as unknown as Event;

    component.onNomeInput(event);

    expect(component.sugestoes().length).toBe(2);

    expect(component.sugestoes()[0].nome)
      .toBe('Zelda');

    expect(component.sugestoes()[0].descricao)
      .toBe('Descrição do Zelda');

    expect(component.buscandoJogos()).toBe(false);
  });

  it('deve tratar erro ao buscar sugestões', () => {

    vi.spyOn(gameService, 'buscarJogos')
      .mockReturnValue(
        throwError(() => new Error('Erro API'))
      );

    const event = {
      target: {
        value: 'Zelda'
      }
    } as unknown as Event;

    component.onNomeInput(event);

    expect(component.sugestoes()).toEqual([]);

    expect(component.buscandoJogos()).toBe(false);
  });

  it('deve lidar com uma resposta vazia da FreeToGame', () => {

    const mockResponse: any[] = [];

    vi.spyOn(gameService, 'buscarJogos')
      .mockReturnValue(of(mockResponse));

    const event = {
      target: {
        value: 'Zelda'
      }
    } as unknown as Event;

    component.onNomeInput(event);

    expect(component.sugestoes()).toEqual([]);

    expect(component.buscandoJogos()).toBe(false);
  });

});