import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { Community } from './community';

describe('Community', () => {
  let component: Community;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    component = TestBed.runInInjectionContext(() => new Community());
  });

  it('deve reunir comentários fictícios de diferentes perfis e jogos', () => {
    expect(component.comentarios).toHaveLength(18);
    expect(new Set(component.comentarios.map(({ perfil }) => perfil.username)).size).toBe(6);
    expect(new Set(component.comentarios.map(({ game }) => game.nome)).size).toBe(6);
    expect(
      component.comentarios.every(({ perfil, game, feedback }) =>
        Boolean(perfil.initials && game.imagem && feedback),
      ),
    ).toBe(true);
  });
});
