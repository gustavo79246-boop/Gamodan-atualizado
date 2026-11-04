import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthService } from './auth';
import { GameService } from './game';
import { Game } from '../models/game.model';

describe('GameService', () => {

  beforeEach(() => {
    localStorage.clear();

    TestBed.configureTestingModule({
      providers: [
        AuthService,
        GameService,
      ],
    });
  });

  it('deve iniciar com lista vazia', () => {
    const games = TestBed.inject(GameService);

    expect(games.games()).toEqual([]);
  });

  it('deve adicionar jogo', () => {
    const auth = TestBed.inject(AuthService);
    const games = TestBed.inject(GameService);

    auth.register({
      email: 'player@example.com',
      senha: '123',
    });

    games.addGame({
      nome: 'Minecraft',
      imagem: 'minecraft.jpg',
      estrelas: 5,
      dataInicial: '2026-01-01',
      favorito: true,
      wishlist: false,
      status: 'jogando',
    });

    expect(games.games()).toHaveLength(1);
    expect(games.games()[0].nome).toBe('Minecraft');
  });

  it('deve gerar IDs sequenciais', () => {
    const auth = TestBed.inject(AuthService);
    const games = TestBed.inject(GameService);

    auth.register({
      email: 'player@example.com',
      senha: '123',
    });

    games.addGame({
      nome: 'Jogo 1',
      imagem: '1.jpg',
      estrelas: 5,
      dataInicial: '2026-01-01',
      favorito: false,
      wishlist: false,
      status: 'pendente',
    });

    games.addGame({
      nome: 'Jogo 2',
      imagem: '2.jpg',
      estrelas: 4,
      dataInicial: '2026-01-02',
      favorito: false,
      wishlist: false,
      status: 'jogando',
    });

    expect(games.games()[0].id).toBe(1);
    expect(games.games()[1].id).toBe(2);
  });

  it('deve alternar favorito', () => {
    const auth = TestBed.inject(AuthService);
    const games = TestBed.inject(GameService);

    auth.register({
      email: 'player@example.com',
      senha: '123',
    });

    games.addGame({
      nome: 'Minecraft',
      imagem: 'minecraft.jpg',
      estrelas: 5,
      dataInicial: '2026-01-01',
      favorito: false,
      wishlist: false,
      status: 'jogando',
    });

    const id = games.games()[0].id;

    games.toggleFavorito(id);

    expect(games.games()[0].favorito).toBe(true);

    games.toggleFavorito(id);

    expect(games.games()[0].favorito).toBe(false);
  });

  it('deve alterar status', () => {
    const auth = TestBed.inject(AuthService);
    const games = TestBed.inject(GameService);

    auth.register({
      email: 'player@example.com',
      senha: '123',
    });

    games.addGame({
      nome: 'Minecraft',
      imagem: 'minecraft.jpg',
      estrelas: 5,
      dataInicial: '2026-01-01',
      favorito: false,
      wishlist: false,
      status: 'pendente',
    });

    const id = games.games()[0].id;

    games.setStatus(id, 'finalizado');

    expect(games.games()[0].status).toBe('finalizado');
  });

  it('deve atualizar jogo', () => {
    const auth = TestBed.inject(AuthService);
    const games = TestBed.inject(GameService);

    auth.register({
      email: 'player@example.com',
      senha: '123',
    });

    games.addGame({
      nome: 'Minecraft',
      imagem: 'minecraft.jpg',
      estrelas: 4,
      dataInicial: '2026-01-01',
      favorito: false,
      wishlist: false,
      status: 'jogando',
    });

    const id = games.games()[0].id;

    games.updateGame(id, {
      nome: 'Minecraft Java',
      imagem: 'novo.jpg',
      estrelas: 5,
      dataInicial: '2026-01-01',
      favorito: true,
      wishlist: false,
      status: 'finalizado',
    });

    expect(games.games()[0].nome).toBe('Minecraft Java');
    expect(games.games()[0].estrelas).toBe(5);
  });

  it('deve remover jogo', () => {
    const auth = TestBed.inject(AuthService);
    const games = TestBed.inject(GameService);

    auth.register({
      email: 'player@example.com',
      senha: '123',
    });

    games.addGame({
      nome: 'Minecraft',
      imagem: 'minecraft.jpg',
      estrelas: 5,
      dataInicial: '2026-01-01',
      favorito: false,
      wishlist: false,
      status: 'jogando',
    });

    const id = games.games()[0].id;

    games.removeGame(id);

    expect(games.games()).toHaveLength(0);
  });

  it('deve salvar jogos no localStorage', () => {
    const auth = TestBed.inject(AuthService);
    const games = TestBed.inject(GameService);

    auth.register({
      email: 'player@example.com',
      senha: '123',
    });

    games.addGame({
      nome: 'Minecraft',
      imagem: 'minecraft.jpg',
      estrelas: 5,
      dataInicial: '2026-01-01',
      favorito: false,
      wishlist: false,
      status: 'jogando',
    });

    const key = auth.getStorageKeyForUser('player@example.com');
    const saved = localStorage.getItem(key);

    expect(saved).toBeTruthy();

    const parsed = JSON.parse(saved!);

    expect(parsed.games).toHaveLength(1);
  });

  describe('GameService - Cobertura de Ramificações e Erros', () => {

    it('deve restaurar jogos e calcular nextId via Math.max se nextId não for número válido no JSON', () => {
      const mockGame1 = { id: 5, nome: 'Game 5', status: 'jogando', favorito: false } as Game;
      const mockGame2 = { id: 10, nome: 'Game 10', status: 'jogando', favorito: false } as Game;

      vi.spyOn(Storage.prototype, 'getItem').mockImplementation((key: string) => {
        if (key.includes('teste@email.com')) {
          return JSON.stringify({
            games: [mockGame1, mockGame2]
          });
        }
        return null;
      });

      const service = TestBed.inject(GameService);
      (service as any).load({ email: 'teste@email.com' });

      expect(service.games().length).toBe(2);
      expect((service as any).nextId).toBe(11);
    });

    it('deve usar 1 para nextId se o array de jogos estiver vazio e nextId no JSON for inválido', () => {
      vi.spyOn(Storage.prototype, 'getItem').mockReturnValue(JSON.stringify({ games: [], nextId: -5 }));

      const service = TestBed.inject(GameService);
      (service as any).load({ email: 'teste@email.com' });

      expect((service as any).nextId).toBe(1);
    });

    it('deve capturar erro no JSON.parse e redefinir estado no catch (linhas 60-61)', () => {
      vi.spyOn(Storage.prototype, 'getItem').mockReturnValue('{ json_corrompido: ');

      const service = TestBed.inject(GameService);
      (service as any).load({ email: 'teste@email.com' });

      expect(service.games()).toEqual([]);
      expect((service as any).nextId).toBe(1);
    });

    it('deve limpar estado quando o usuário for null ou localStorage indisponível', () => {
      const service = TestBed.inject(GameService);

      (service as any).load(null);
      expect(service.games()).toEqual([]);

      vi.spyOn(service['auth'], 'usuario').mockReturnValue(null);
      const spySet = vi.spyOn(Storage.prototype, 'setItem');
      
      (service as any).save([]);
      expect(spySet).not.toHaveBeenCalled();
    });

    it('deve alternar status e favorito apenas para o jogo correspondente ao ID', () => {
      const game1 = { id: 1, nome: 'Game 1', status: 'pendente', favorito: false } as Game;
      const game2 = { id: 2, nome: 'Game 2', status: 'pendente', favorito: false } as Game;

      vi.spyOn(Storage.prototype, 'getItem').mockReturnValue(
        JSON.stringify({
          games: [game1, game2],
          nextId: 3
        })
      );

      const service = TestBed.inject(GameService);
      (service as any).load({ email: 'teste@email.com' });

      service.toggleFavorito(1);
      service.setStatus(1, 'finalizado');

      expect(service.games()[0].favorito).toBe(true);
      expect(service.games()[0].status).toBe('finalizado');
      expect(service.games()[1].favorito).toBe(false);
      expect(service.games()[1].status).toBe('pendente');
    });

    it('deve cobrir adição e remoção de jogos mantendo o estado sincronizado', () => {
      vi.spyOn(Storage.prototype, 'getItem').mockReturnValue(null);
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {});

      const service = TestBed.inject(GameService);
      vi.spyOn(service['auth'], 'usuario').mockReturnValue({ email: 'teste@email.com', nome: 'Teste', admin: false });

     const mockNovoJogo = {
  nome: 'Novo Jogo',
  imagem: 'capa.jpg',
  estrelas: 5,
  dataInicial: '2026-01-01',
  favorito: false,
  wishlist: false,
  status: 'jogando',
 } as Omit<Game, 'id'>;
      service.addGame(mockNovoJogo);
      expect(service.games().length).toBe(1);

      service.updateGame(1, { ...mockNovoJogo, nome: 'Novo Jogo Atualizado', status: 'finalizado' });
      expect(service.games()[0].nome).toBe('Novo Jogo Atualizado');

      service.removeGame(1);
      expect(service.games().length).toBe(0);
    });
  });
});