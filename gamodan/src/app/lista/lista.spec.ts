import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { Lista } from './lista';
import { AuthService } from '../services/auth';
import { SteamLibraryService, SteamGame } from '../services/steam-library';

describe('Lista', () => {
  const steamGames: SteamGame[] = [
    { appId: 730, nome: 'Counter-Strike 2', horas: 120.5, imagem: 'cs2.jpg' },
    { appId: 570, nome: 'Dota 2', horas: 80, imagem: 'dota.jpg' },
  ];

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: { usuario: signal({ steamLinked: true, nome: 'Teste' }) } },
        { provide: SteamLibraryService, useValue: {
          jogos: signal(steamGames), carregando: signal(false), carregado: signal(true), erro: signal(''),
          carregar: vi.fn().mockResolvedValue(undefined),
        } },
      ],
    });
  });

  it('cria a página Minha lista', () => {
    const component = TestBed.runInInjectionContext(() => new Lista());
    expect(component).toBeTruthy();
  });

  it('mostra a quantidade de jogos recebidos da Steam', () => {
    const component = TestBed.runInInjectionContext(() => new Lista());
    expect(component.totalGeral()).toBe(2);
  });

  it('filtra somente jogos que vieram da biblioteca Steam', () => {
    const component = TestBed.runInInjectionContext(() => new Lista());
    component.buscaSteam.set('counter');
    expect(component.jogosSteam().map(jogo => jogo.nome)).toEqual(['Counter-Strike 2']);
  });
});
