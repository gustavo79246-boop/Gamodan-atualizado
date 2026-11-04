import { describe, expect, it, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { CommunityProfilesService } from './community-profiles';
import { CommunityReviewsService, slugifyGameTitle } from './community-reviews';
import { AuthUser } from './auth';

describe('CommunityReviewsService', () => {
  let service: CommunityReviewsService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [CommunityProfilesService, CommunityReviewsService],
    });
    service = TestBed.inject(CommunityReviewsService);
  });

  it('deve normalizar títulos para criar uma rota de jogo', () => {
    expect(slugifyGameTitle('Pokémon: Let’s Go!')).toBe('pokemon-let-s-go');
  });

  it('deve reunir os comentários fictícios de todos os perfis para um jogo', () => {
    const jogo = service.buscarJogo('minecraft');
    const comments = service.comentariosDoJogo('minecraft');

    expect(jogo?.nome).toBe('Minecraft');
    expect(comments).toHaveLength(4);
    expect(comments.every((comment) => comment.fictitious)).toBe(true);
    expect(comments.every((comment) => comment.feedback.length > 0)).toBe(true);
  });

  it('deve salvar e atualizar um comentário público por usuário e jogo', () => {
    const user: AuthUser = {
      nome: 'Jogadora',
      email: 'player@example.com',
      admin: false,
    };

    service.salvarComentario('minecraft', user, 4, 'Bom jogo!');
    service.salvarComentario('minecraft', user, 5, 'Muito bom!');

    const comments = service.comentariosDoJogo('minecraft');
    const mine = comments.find((comment) => comment.username === 'Jogadora');
    expect(comments).toHaveLength(5);
    expect(mine).toMatchObject({
      username: 'Jogadora',
      rating: 5,
      feedback: 'Muito bom!',
      fictitious: false,
    });
    expect(JSON.stringify(comments)).not.toContain(user.email);
    expect(service.comentarioDoUsuario('minecraft', user.email)?.feedback).toBe('Muito bom!');
  });

  it('deve rejeitar comentários inválidos ou jogos desconhecidos', () => {
    const user: AuthUser = {
      nome: 'Jogadora',
      email: 'player@example.com',
      admin: false,
    };

    expect(() => service.salvarComentario('minecraft', user, 0, 'Feedback')).toThrow();
    expect(() => service.salvarComentario('minecraft', user, 5, '  ')).toThrow();
    expect(() => service.salvarComentario('jogo-inexistente', user, 5, 'Feedback')).toThrow();
  });
});
