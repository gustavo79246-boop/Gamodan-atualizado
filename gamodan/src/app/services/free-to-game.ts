import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map, of, switchMap } from 'rxjs';

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

@Injectable({
  providedIn: 'root',
})
export class FreeToGameService {
  private readonly http = inject(HttpClient);

  private readonly apiUrl = 'https://www.freetogame.com/api';

  buscarJogos(nome: string): Observable<FreeToGame[]> {
    const params = new HttpParams().set('title', nome);

    return this.http.get<FreeToGame[]>(`${this.apiUrl}/games`, { params });
  }

  buscarTodos(): Observable<FreeToGame[]> {
    return this.http.get<FreeToGame[]>(`${this.apiUrl}/games`);
  }

  buscarPorId(id: number): Observable<FreeToGame> {
    return this.http.get<FreeToGame>(`${this.apiUrl}/game?id=${id}`);
  }

  buscarDetalhesPorTitulo(nome: string): Observable<FreeToGame | null> {
    const titulo = nome.trim().toLocaleLowerCase();
    if (!titulo) return of(null);

    return this.buscarJogos(nome).pipe(
      map((jogos) => jogos.find((jogo) => jogo.title.trim().toLocaleLowerCase() === titulo)),
      switchMap((jogo) => (jogo ? this.buscarPorId(jogo.id) : of(null))),
    );
  }
}
