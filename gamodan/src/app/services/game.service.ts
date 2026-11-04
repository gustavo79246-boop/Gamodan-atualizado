import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class GameService {

  private http = inject(HttpClient);

  private apiUrl = 'https://www.freetogame.com/api/games';

  buscarJogos(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl);
  }
}