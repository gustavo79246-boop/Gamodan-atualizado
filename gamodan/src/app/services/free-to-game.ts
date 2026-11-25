import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map, of } from 'rxjs';
import { API_URL } from '../config/api.config';

export interface FreeToGame {
  id: number;
  title: string;
  thumbnail: string;
  short_description: string;
  game_url: string;
  genre: string;
  platform: string;
  publisher: string;
  developer: string;
  release_date: string;
}

/**
 * Consulta os jogos gratuitos pela NOSSA API (que guarda a lista em cache).
 * Chamar a freetogame.com direto do navegador falha por CORS e baixava o catálogo inteiro a cada busca.
 */
@Injectable({ providedIn: 'root' })
export class FreeToGameService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${API_URL}/free-games`;

  /** Jogos cujo título começa com o texto digitado. */
  buscarJogos(nome: string, limite = 6): Observable<FreeToGame[]> {
    const termo = nome.trim();
    if (!termo) return of([]);
    const params = new HttpParams().set('q', termo).set('limit', limite);
    return this.http.get<{ games: FreeToGame[] }>(this.apiUrl, { params }).pipe(map((res) => res.games ?? []));
  }

  buscarPorId(id: number): Observable<FreeToGame> {
    return this.http.get<{ game: FreeToGame }>(`${this.apiUrl}/${id}`).pipe(map((res) => res.game));
  }

  /** Detalhes do jogo cujo título é exatamente o informado (ou null). */
  buscarDetalhesPorTitulo(nome: string): Observable<FreeToGame | null> {
    const titulo = nome.trim();
    if (!titulo) return of(null);
    const params = new HttpParams().set('title', titulo);
    return this.http
      .get<{ game: FreeToGame | null }>(`${this.apiUrl}/by-title`, { params })
      .pipe(map((res) => res.game ?? null));
  }
}
