
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API_BASE_URL, API_URL } from './api.config';

@Injectable({
  providedIn: 'root'
})
export class SteamAuthService {
  private readonly api = API_BASE_URL;

  constructor(private http: HttpClient) {}

  login(): void {
    window.location.href = `${this.api}/auth/steam`;
  }

  getUser() {
    return this.http.get(
      `${API_URL}/auth/me`,
      { withCredentials: true }
    );
  }

  logout() {
    return this.http.post(
      `${API_URL}/auth/logout`,
      {},
      { withCredentials: true }
    );
  }
}
