
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class SteamService {

  private apiUrl =
    'https://api.steampowered.com/ISteamNews/GetNewsForApp/v2/';

  constructor(private http: HttpClient) {}

  getNoticias() {
    return this.http.get(
      this.apiUrl + '?appid=730&count=5'
    );
  }
}
