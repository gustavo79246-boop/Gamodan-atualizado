import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { API_URL } from './api.config';

export interface SteamGame {
  appId: number;
  nome: string;
  horas: number;
  imagem: string;
}
interface SteamGamesResponse { total: number; totalMinutos: number; games: SteamGame[]; }

@Injectable({ providedIn: 'root' })
export class SteamLibraryService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${API_URL}/steam/games`;
  readonly jogos = signal<SteamGame[]>([]);
  readonly carregando = signal(false);
  readonly erro = signal('');
  readonly carregado = signal(false);

  async carregar(): Promise<void> {
    this.carregando.set(true);
    this.erro.set('');
    try {
      const response = await firstValueFrom(this.http.get<SteamGamesResponse>(this.apiUrl, { withCredentials: true }));
      this.jogos.set(response.games || []);
      this.carregado.set(true);
    } catch (error: any) {
      this.jogos.set([]);
      this.erro.set(error?.error?.message || 'Não foi possível carregar sua biblioteca Steam.');
    } finally { this.carregando.set(false); }
  }
}
