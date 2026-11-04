import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL, API_URL } from './api.config';

export type AuthMode = 'entrar' | 'criar';
export interface AuthUser {
  id: string;
  nome: string;
  email: string;
  admin: boolean;
  foto?: string;
  steamId?: string | null;
  steamLinked?: boolean;
  jogoFavoritoId?: number;
  generoFavorito?: string;
}
export interface AuthCredentials { nome?: string; email: string; senha: string; foto?: string; }
interface AuthResponse { user: AuthUser; }
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly sessionState = signal<AuthUser | null>(null);
  private readonly modalState = signal(false);
  private readonly modeState = signal<AuthMode>('entrar');
  private readonly readyState = signal(false);
  readonly usuario = this.sessionState.asReadonly();
  readonly modalAberto = this.modalState.asReadonly();
  readonly modo = this.modeState.asReadonly();
  readonly pronto = this.readyState.asReadonly();
  readonly autenticado = computed(() => this.usuario() !== null);
  readonly isLogado = this.autenticado;
  readonly admin = computed(() => this.usuario()?.admin ?? false);
  readonly ready: Promise<void>;
  erroApi = '';

  constructor() { this.ready = this.restaurarSessao(); }

  private async restaurarSessao(): Promise<void> {
    try {
      const response = await firstValueFrom(this.http.get<AuthResponse>(`${API_URL}/auth/me`, { withCredentials: true }));
      this.sessionState.set(response.user);
    } catch { this.sessionState.set(null); }
    finally { this.readyState.set(true); }
  }

  async sincronizarSessao(): Promise<boolean> {
    try {
      const response = await firstValueFrom(this.http.get<AuthResponse>(`${API_URL}/auth/me`, { withCredentials: true }));
      this.sessionState.set(response.user);
      this.readyState.set(true);
      return true;
    } catch {
      this.sessionState.set(null);
      this.readyState.set(true);
      return false;
    }
  }

  entrarComSteam(): void {
    // Redireciona ao backend no mesmo hostname usado pelo navegador.
    window.location.assign(`${API_BASE_URL}/auth/steam`);
  }

  abrirModal(modo: AuthMode = 'entrar'): void { this.modeState.set(modo); this.modalState.set(true); }
  fecharModal(): void { this.modalState.set(false); }

  async login(credentials: AuthCredentials): Promise<boolean> {
    const email = credentials.email.trim().toLowerCase();
    if (!EMAIL_PATTERN.test(email) || !credentials.senha) return false;
    this.erroApi = '';
    try {
      const response = await firstValueFrom(this.http.post<AuthResponse>(`${API_URL}/auth/login`, { email, senha: credentials.senha }, { withCredentials: true }));
      this.sessionState.set(response.user); this.fecharModal(); return true;
    } catch (error: any) { this.erroApi = error?.error?.message || 'Não foi possível entrar na conta.'; return false; }
  }

  async register(credentials: AuthCredentials): Promise<boolean> {
    const email = credentials.email.trim().toLowerCase();
    const nome = credentials.nome?.trim() || email.split('@')[0];
    if (!EMAIL_PATTERN.test(email) || nome.length < 2 || credentials.senha.length < 8) {
      this.erroApi = 'Confira os dados. A senha precisa ter pelo menos 8 caracteres.'; return false;
    }
    this.erroApi = '';
    try {
      const response = await firstValueFrom(this.http.post<AuthResponse>(`${API_URL}/auth/register`, { nome, email, senha: credentials.senha, foto: credentials.foto || '' }, { withCredentials: true }));
      this.sessionState.set(response.user); this.fecharModal(); return true;
    } catch (error: any) { this.erroApi = error?.error?.message || 'Não foi possível criar a conta.'; return false; }
  }

  async logout(): Promise<void> {
    try { await firstValueFrom(this.http.post(`${API_URL}/auth/logout`, {}, { withCredentials: true })); }
    catch (error) { console.warn('A API não confirmou o logout:', error); }
    finally { this.sessionState.set(null); this.fecharModal(); }
  }

  async atualizarFoto(foto: string): Promise<void> { await this.atualizarPerfil({ foto }); }
  async atualizarPreferencias(jogoFavoritoId: number | undefined, generoFavorito: string): Promise<void> {
    await this.atualizarPerfil({ jogoFavoritoId: jogoFavoritoId ?? null, generoFavorito: generoFavorito.trim() });
  }
  private async atualizarPerfil(changes: Record<string, unknown>): Promise<void> {
    const response = await firstValueFrom(this.http.patch<AuthResponse>(`${API_URL}/users/me`, changes, { withCredentials: true }));
    this.sessionState.set(response.user);
  }

  getStorageKeyForUser(email: string): string { return `gamodan-games:${email.trim().toLowerCase()}`; }
}
