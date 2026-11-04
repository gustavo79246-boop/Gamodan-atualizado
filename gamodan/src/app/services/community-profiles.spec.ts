import { describe, expect, it } from 'vitest';
import { CommunityProfilesService } from './community-profiles';

describe('CommunityProfilesService', () => {
  const service = new CommunityProfilesService();

  it('deve encontrar perfis fictícios com lista e feedback para todos os jogos', () => {
    const profile = service.buscar('pixel_nomade');

    expect(profile).not.toBeNull();
    expect(profile?.reviews.length).toBeGreaterThan(1);
    expect(profile?.reviews.every((review) => review.feedback.trim().length > 0)).toBe(true);
    expect(profile?.favoriteGame).toBe('Minecraft');
    expect(profile?.favoriteGenre).toBe('Sandbox');
  });

  it('deve retornar null para usuário desconhecido', () => {
    expect(service.buscar('usuario_inexistente')).toBeNull();
    expect(service.buscar(null)).toBeNull();
  });
});
