import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AuthUser } from './auth';
import { CommunityProfilesService } from './community-profiles';
import { Game } from '../models/game.model';
import { CatalogService } from './catalog';
import { API_URL } from './api.config';

export interface CommunityGameComment {
  id: string; username: string; avatar?: string; rating: number; feedback: string;
  fictitious: boolean; createdAt?: string; ownerEmail?: string; isMine?: boolean;
}
interface StoredCommunityReview extends CommunityGameComment { gameSlug: string; ownerEmail: string; }
interface ReviewListResponse { reviews: CommunityGameComment[]; }
interface ReviewResponse { review: CommunityGameComment; }

export function slugifyGameTitle(title: string): string {
  return title.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

@Injectable({ providedIn: 'root' })
export class CommunityReviewsService {
  private readonly http = inject(HttpClient);
  private readonly profiles = inject(CommunityProfilesService);
  private readonly catalog = inject(CatalogService);
  private readonly savedReviews = signal<StoredCommunityReview[]>([]);
  private readonly loadedSlugs = new Set<string>();

  buscarJogo(slug: string): Game | null {
    for (const profile of this.profiles.profiles) {
      const review = profile.reviews.find(({ game }) => slugifyGameTitle(game.nome) === slug);
      if (review) return review.game;
    }

    // Também permite abrir a página de discussão de jogos adicionados ao catálogo.
    const catalogItem = this.catalog.items().find(item => slugifyGameTitle(item.nome) === slug);
    if (catalogItem) {
      return {
        id: 0, nome: catalogItem.nome, imagem: catalogItem.imagem, estrelas: 0,
        dataInicial: '', favorito: false, wishlist: false, status: 'pendente',
      };
    }

    // O jogo pode ter vindo de uma seleção da página inicial ou de uma lista pessoal.
    const nome = slug.split('-').filter(Boolean).map(parte => parte.charAt(0).toUpperCase() + parte.slice(1)).join(' ');
    if (!nome) return null;
    return {
      id: 0, nome, imagem: '', estrelas: 0, dataInicial: '',
      favorito: false, wishlist: false, status: 'pendente',
    };
  }

  async carregarComentarios(slug: string): Promise<void> {
    try {
      const response = await firstValueFrom(this.http.get<ReviewListResponse>(`${API_URL}/reviews/${encodeURIComponent(slug)}`, { withCredentials: true }));
      const current = this.savedReviews().filter(review => review.gameSlug !== slug);
      const mapped = response.reviews.map(review => ({ ...review, gameSlug: slug, ownerEmail: '', fictitious: false }));
      this.savedReviews.set([...current, ...mapped]);
      this.loadedSlugs.add(slug);
    } catch (error) {
      console.error('Falha ao carregar comentários do servidor:', error);
      throw new Error('Não foi possível carregar os comentários. Verifique se a API está ligada.');
    }
  }

  comentariosDoJogo(slug: string): CommunityGameComment[] {
    const ficticios = this.profiles.profiles.flatMap(profile => profile.reviews
      .filter(({ game }) => slugifyGameTitle(game.nome) === slug)
      .map(({ game, feedback }) => ({ id: `demo-${profile.username}-${game.id}`, username: profile.username, rating: game.estrelas, feedback, fictitious: true })));
    const reais = this.savedReviews().filter(review => review.gameSlug === slug)
      .map(({ gameSlug: _gameSlug, ownerEmail: _ownerEmail, ...review }) => ({ ...review, fictitious: false }));
    return [...reais, ...ficticios];
  }

  comentarioDoUsuario(slug: string, email: string): CommunityGameComment | null {
    return this.savedReviews().find(review => review.gameSlug === slug && (review.isMine || review.ownerEmail === email.toLowerCase())) ?? null;
  }

  async salvarComentario(slug: string, user: AuthUser, rating: number, feedback: string): Promise<void> {
    const normalizedFeedback = feedback.trim();
    if (!this.buscarJogo(slug)) throw new Error('O jogo selecionado não foi encontrado.');
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw new Error('A avaliação deve ser entre 1 e 5 estrelas.');
    if (!normalizedFeedback || normalizedFeedback.length > 500) throw new Error('O comentário deve ter entre 1 e 500 caracteres.');
    try {
      const response = await firstValueFrom(this.http.put<ReviewResponse>(`${API_URL}/reviews/${encodeURIComponent(slug)}`, { rating, feedback: normalizedFeedback }, { withCredentials: true }));
      const saved: StoredCommunityReview = { ...response.review, gameSlug: slug, ownerEmail: user.email, isMine: true, fictitious: false };
      this.savedReviews.update(reviews => [...reviews.filter(review => !(review.gameSlug === slug && review.ownerEmail === user.email)), saved]);
    } catch (error: any) {
      throw new Error(error?.error?.message || 'Não foi possível salvar a avaliação. Confira se a API está funcionando e se você está conectado.');
    }
  }
}
