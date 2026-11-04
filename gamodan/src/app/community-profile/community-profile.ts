import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CommunityProfilesService } from '../services/community-profiles';

@Component({
  selector: 'app-community-profile',
  imports: [RouterLink],
  templateUrl: './community-profile.html',
  styleUrl: './community-profile.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CommunityProfilePage {
  private readonly route = inject(ActivatedRoute);
  private readonly profiles = inject(CommunityProfilesService);
  private readonly params = toSignal(this.route.paramMap, {
    initialValue: this.route.snapshot.paramMap,
  });

  readonly profile = computed(() => this.profiles.buscar(this.params().get('usuario')));
  readonly totalJogos = computed(() => this.profile()?.reviews.length ?? 0);
  readonly totalJogosIniciados = computed(
    () => this.profile()?.reviews.filter(({ game }) => game.status !== 'pendente').length ?? 0,
  );
  readonly totalFinalizados = computed(
    () =>
      this.profile()?.reviews.filter(
        ({ game }) => game.status === 'finalizado' || game.status === 'zerado',
      ).length ?? 0,
  );
  readonly totalHoras = computed(
    () =>
      this.profile()?.reviews.reduce((total, { game }) => total + (game.horasJogadas ?? 0), 0) ?? 0,
  );
  readonly mediaEstrelas = computed(() => {
    const reviews = this.profile()?.reviews ?? [];
    if (!reviews.length) return 0;
    return (
      Math.round(
        (reviews.reduce((total, { game }) => total + game.estrelas, 0) / reviews.length) * 10,
      ) / 10
    );
  });
}
