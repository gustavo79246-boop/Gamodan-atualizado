import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { AuthService } from '../services/auth';
import { SteamLibraryService } from '../services/steam-library';

@Component({
  selector: 'app-lista',
  imports: [],
  templateUrl: './lista.html',
  styleUrl: './lista.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Lista {
  protected readonly auth = inject(AuthService);
  readonly steam = inject(SteamLibraryService);
  readonly buscaSteam = signal('');

  readonly jogosSteam = computed(() => {
    const termo = this.buscaSteam().trim().toLocaleLowerCase();
    const jogos = this.steam.jogos();
    return termo ? jogos.filter(jogo => jogo.nome.toLocaleLowerCase().includes(termo)) : jogos;
  });

  readonly totalGeral = computed(() => this.steam.jogos().length);

  constructor() {
    // O usuário pode ser restaurado de forma assíncrona; o effect espera o estado real.
    effect(() => {
      if (this.auth.usuario()?.steamLinked && !this.steam.carregado() && !this.steam.carregando()) {
        void this.steam.carregar();
      }
    });
  }

  atualizarBibliotecaSteam(): void {
    void this.steam.carregar();
  }
}
