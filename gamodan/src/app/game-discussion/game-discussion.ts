import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../services/auth';
import { CommunityReviewsService, slugifyGameTitle } from '../services/community-reviews';

@Component({
  selector: 'app-game-discussion',
  imports: [RouterLink],
  templateUrl: './game-discussion.html',
  styleUrl: './game-discussion.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GameDiscussion {
  protected readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly reviews = inject(CommunityReviewsService);
  private readonly params = toSignal(this.route.paramMap, {
    initialValue: this.route.snapshot.paramMap,
  });

  readonly slug = computed(() => this.params().get('slug') ?? '');
  readonly loadingComments = signal(false);
  readonly game = computed(() => this.reviews.buscarJogo(this.slug()));
  readonly comments = computed(() => this.reviews.comentariosDoJogo(this.slug()));
  readonly userComment = computed(() => {
    const user = this.auth.usuario();
    return user ? this.reviews.comentarioDoUsuario(this.slug(), user.email) : null;
  });
  readonly rating = signal(0);
  readonly feedback = signal('');
  readonly message = signal('');
  readonly stars = [1, 2, 3, 4, 5];

  constructor() {
    effect(() => {
      const slug = this.slug();
      if (!slug) return;
      this.loadingComments.set(true);
      void this.reviews.carregarComentarios(slug)
        .catch(error => this.message.set(error instanceof Error ? error.message : 'Erro ao carregar comentários.'))
        .finally(() => this.loadingComments.set(false));
    });
  }
  readonly averageRating = computed(() => {
    const comments = this.comments();
    if (!comments.length) return 0;
    return (
      Math.round(
        (comments.reduce((total, comment) => total + comment.rating, 0) / comments.length) * 10,
      ) / 10
    );
  });

  avaliar(nota: number): void {
    this.rating.set(nota);
    this.message.set('');
  }

  async enviarComentario(): Promise<void> {
    const user = this.auth.usuario();
    if (!user) {
      this.auth.abrirModal('entrar');
      return;
    }
    if (!this.game()) {
      this.message.set('Não foi possível encontrar este jogo.');
      return;
    }
    if (this.rating() < 1 || this.rating() > 5) {
      this.message.set('Escolha uma avaliação de 1 a 5 estrelas.');
      return;
    }
    if (!this.feedback().trim()) {
      this.message.set('Escreva seu comentário antes de publicar.');
      return;
    }

    try {
      await this.reviews.salvarComentario(this.slug(), user, this.rating(), this.feedback());
      this.feedback.set('');
      this.message.set('Sua avaliação foi salva no banco de dados.');
    } catch (error: unknown) {
      this.message.set(
        error instanceof Error ? error.message : 'Não foi possível publicar sua avaliação.',
      );
    }
  }

  slugDoJogo(nome: string): string {
    return slugifyGameTitle(nome);
  }
}
