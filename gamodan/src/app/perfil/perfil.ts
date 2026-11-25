import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth';
import { GameService } from '../services/game';
import { SteamLibraryService } from '../services/steam-library';

@Component({
  selector: 'app-perfil',
  templateUrl: './perfil.html',
  styleUrl: './perfil.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Perfil {
  protected readonly auth = inject(AuthService);
  private readonly games = inject(GameService);
  readonly steam = inject(SteamLibraryService);
  private readonly router = inject(Router);

  readonly jogoFavoritoId = signal(
    this.auth.usuario()?.jogoFavoritoId ? String(this.auth.usuario()?.jogoFavoritoId) : '',
  );
  readonly generoFavorito = signal(this.auth.usuario()?.generoFavorito ?? '');
  readonly jogos = computed(() => this.games.games());
  readonly totalJogos = computed(() => this.jogos().length);
  readonly totalJogosJogados = computed(
    () => this.jogos().filter((jogo) => jogo.status !== 'pendente').length,
  );
  readonly totalJogosFinalizados = computed(
    () =>
      this.jogos().filter((jogo) => jogo.status === 'finalizado' || jogo.status === 'zerado')
        .length,
  );
  readonly totalHorasJogadas = computed(() =>
    this.jogos().reduce((total, jogo) => total + (jogo.horasJogadas ?? 0), 0),
  );
  readonly mediaEstrelas = computed(() => {
    const jogos = this.jogos();
    return jogos.length
      ? Math.round((jogos.reduce((total, jogo) => total + jogo.estrelas, 0) / jogos.length) * 10) /
          10
      : 0;
  });
  readonly nomeJogoFavorito = computed(() => {
    const id = Number(this.jogoFavoritoId());
    return this.jogos().find((jogo) => jogo.id === id)?.nome ?? '';
  });
  readonly preferenciasSalvas = signal(false);

  constructor() {
    if (this.auth.usuario()?.steamLinked) void this.steam.carregar();
  }

  carregarJogosSteam(): void { void this.steam.carregar(); }

  sair(): void {
    void this.auth.logout().finally(() => this.router.navigateByUrl('/'));
  }

  salvarPreferencias(): void {
    const id = Number(this.jogoFavoritoId());
    const jogoFavoritoId = this.jogos().some((jogo) => jogo.id === id) ? id : undefined;
    this.auth.atualizarPreferencias(jogoFavoritoId, this.generoFavorito());
    this.preferenciasSalvas.set(true);
  }

  selecionarFoto(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => this.auth.atualizarFoto(String(reader.result));
    reader.readAsDataURL(file);
  }
}
