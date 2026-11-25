import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../services/auth';
import { API_URL } from '../config/api.config';

interface CommunityComment {
  id: string; username: string; avatar: string; text: string; createdAt: string; isMine?: boolean;
}
interface CommunityPost {
  id: string; userId: string; username: string; avatar: string; text: string; gameName: string;
  createdAt: string; isMine?: boolean; likedByMe: boolean; likesCount: number;
  commentsCount: number; comments: CommunityComment[]; commentDraft?: string; showComments?: boolean;
}
interface CommunityPerson {
  id: string; username: string; avatar: string; steamLinked: boolean;
  followersCount: number; isFollowing: boolean;
}

@Component({
  selector: 'app-community',
  imports: [FormsModule],
  templateUrl: './community.html',
  styleUrl: './community.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Community {
  protected readonly auth = inject(AuthService);
  private readonly http = inject(HttpClient);
  readonly posts = signal<CommunityPost[]>([]);
  readonly people = signal<CommunityPerson[]>([]);
  readonly texto = signal('');
  readonly jogo = signal('');
  readonly carregando = signal(false);
  readonly enviando = signal(false);
  readonly erro = signal('');
  readonly feed = signal<'todos' | 'seguindo'>('todos');

  constructor() { void this.carregar(); void this.carregarPessoas(); }

  async carregar(): Promise<void> {
    this.carregando.set(true); this.erro.set('');
    try {
      const suffix = this.feed() === 'seguindo' ? '?feed=following' : '';
      const response = await firstValueFrom(this.http.get<{posts: CommunityPost[]}>(`${API_URL}/community/posts${suffix}`, { withCredentials: true }));
      this.posts.set((response.posts || []).map(post => ({ ...post, comments: post.comments || [], commentDraft: '', showComments: false })));
    } catch (error: any) {
      this.erro.set(error?.error?.message || 'Não foi possível carregar as publicações. Confira se o backend está ligado.');
    } finally { this.carregando.set(false); }
  }

  async carregarPessoas(): Promise<void> {
    try {
      const response = await firstValueFrom(this.http.get<{people: CommunityPerson[]}>(`${API_URL}/community/people`, { withCredentials: true }));
      this.people.set(response.people || []);
    } catch { /* As sugestões não impedem o uso do feed. */ }
  }

  mudarFeed(feed: 'todos' | 'seguindo'): void {
    if (feed === 'seguindo' && !this.auth.autenticado()) { this.auth.abrirModal('entrar'); return; }
    this.feed.set(feed); void this.carregar();
  }

  async publicar(): Promise<void> {
    const text = this.texto().trim();
    if (!this.auth.autenticado()) { this.auth.abrirModal('entrar'); return; }
    if (!text || text.length > 1000) { this.erro.set('Escreva uma publicação de até 1.000 caracteres.'); return; }
    this.enviando.set(true); this.erro.set('');
    try {
      const response = await firstValueFrom(this.http.post<{post: CommunityPost}>(`${API_URL}/community/posts`, { text, gameName: this.jogo().trim() }, { withCredentials: true }));
      if (this.feed() === 'todos') this.posts.update(posts => [{ ...response.post, comments: [], commentDraft: '', showComments: false }, ...posts]);
      this.texto.set(''); this.jogo.set('');
    } catch (error: any) { this.erro.set(error?.error?.message || 'Não foi possível publicar. Entre novamente e tente outra vez.'); }
    finally { this.enviando.set(false); }
  }

  async curtir(post: CommunityPost): Promise<void> {
    if (!this.auth.autenticado()) { this.auth.abrirModal('entrar'); return; }
    try {
      const result = await firstValueFrom(this.http.post<{liked: boolean; likesCount: number}>(`${API_URL}/community/posts/${encodeURIComponent(post.id)}/like`, {}, { withCredentials: true }));
      this.posts.update(posts => posts.map(item => item.id === post.id ? { ...item, likedByMe: result.liked, likesCount: result.likesCount } : item));
    } catch (error: any) { this.erro.set(error?.error?.message || 'Não foi possível registrar a curtida.'); }
  }

  async comentar(post: CommunityPost): Promise<void> {
    if (!this.auth.autenticado()) { this.auth.abrirModal('entrar'); return; }
    const text = (post.commentDraft || '').trim();
    if (!text) return;
    try {
      const result = await firstValueFrom(this.http.post<{comment: CommunityComment; commentsCount: number}>(`${API_URL}/community/posts/${encodeURIComponent(post.id)}/comments`, { text }, { withCredentials: true }));
      this.posts.update(posts => posts.map(item => item.id === post.id ? { ...item, comments: [...item.comments, result.comment].slice(-3), commentsCount: result.commentsCount, commentDraft: '', showComments: true } : item));
    } catch (error: any) { this.erro.set(error?.error?.message || 'Não foi possível enviar o comentário.'); }
  }

  async seguir(person: CommunityPerson): Promise<void> {
    if (!this.auth.autenticado()) { this.auth.abrirModal('entrar'); return; }
    try {
      const result = await firstValueFrom(this.http.post<{following: boolean}>(`${API_URL}/community/users/${encodeURIComponent(person.id)}/follow`, {}, { withCredentials: true }));
      this.people.update(people => people.map(item => item.id === person.id ? { ...item, isFollowing: result.following, followersCount: Math.max(0, item.followersCount + (result.following ? 1 : -1)) } : item));
    } catch (error: any) { this.erro.set(error?.error?.message || 'Não foi possível atualizar quem você segue.'); }
  }

  async excluir(post: CommunityPost): Promise<void> {
    if (!post.isMine) return;
    try {
      await firstValueFrom(this.http.delete(`${API_URL}/community/posts/${encodeURIComponent(post.id)}`, { withCredentials: true }));
      this.posts.update(posts => posts.filter(item => item.id !== post.id));
    } catch { this.erro.set('Não foi possível excluir a publicação.'); }
  }

  formatarData(value: string): string {
    return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
  }
}
