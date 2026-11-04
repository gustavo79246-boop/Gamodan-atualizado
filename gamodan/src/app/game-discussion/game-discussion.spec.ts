import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { describe, expect, it, beforeEach } from 'vitest';
import { GameDiscussion } from './game-discussion';
import { AuthService } from '../services/auth';
import { CommunityProfilesService } from '../services/community-profiles';
import { CommunityReviewsService } from '../services/community-reviews';

describe('GameDiscussion', () => {
  let component: GameDiscussion;
  let auth: AuthService;
  let routeParams: BehaviorSubject<ReturnType<typeof convertToParamMap>>;

  beforeEach(() => {
    localStorage.clear();
    routeParams = new BehaviorSubject(convertToParamMap({ slug: 'minecraft' }));
    TestBed.configureTestingModule({
      providers: [
        AuthService,
        CommunityProfilesService,
        CommunityReviewsService,
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: routeParams.asObservable(),
            snapshot: { paramMap: routeParams.value },
          },
        },
      ],
    });
    auth = TestBed.inject(AuthService);
    component = TestBed.runInInjectionContext(() => new GameDiscussion());
  });

  it('deve carregar o jogo e agregar os comentários da comunidade', () => {
    expect(component.game()?.nome).toBe('Minecraft');
    expect(component.comments()).toHaveLength(4);
    expect(component.averageRating()).toBeGreaterThan(0);

    routeParams.next(convertToParamMap({ slug: 'desconhecido' }));
    expect(component.game()).toBeNull();
  });

  it('deve solicitar autenticação para quem ainda não entrou', () => {
    component.enviarComentario();

    expect(auth.modalAberto()).toBe(true);
    expect(auth.modo()).toBe('entrar');
  });

  it('deve exigir nota e texto antes de publicar', () => {
    auth.register({ nome: 'Jogadora', email: 'player@example.com', senha: 'senha-segura' });

    component.enviarComentario();
    expect(component.message()).toBe('Escolha uma avaliação de 1 a 5 estrelas.');

    component.avaliar(5);
    component.enviarComentario();
    expect(component.message()).toBe('Escreva seu comentário antes de publicar.');
  });

  it('deve publicar um comentário e atualizar a lista pública', () => {
    auth.register({ nome: 'Jogadora', email: 'player@example.com', senha: 'senha-segura' });
    component.avaliar(5);
    component.feedback.set('Adorei explorar este mundo.');

    component.enviarComentario();

    expect(component.message()).toBe('Sua avaliação foi publicada.');
    expect(component.comments()).toHaveLength(5);
    expect(component.userComment()?.feedback).toBe('Adorei explorar este mundo.');
    expect(component.feedback()).toBe('');
  });
});
