import {
  ChangeDetectionStrategy,
  Component,
  signal
} from '@angular/core';

import { RouterOutlet } from '@angular/router';
import { AuthModal } from './components/auth-modal/auth-modal';
import { Header } from './components/header/header';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { GameService } from './services/game.service';
import { AuthService } from './services/auth';
import { Router } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    Header,
    RouterOutlet,
    AuthModal,
    CommonModule,
    FormsModule,
    ReactiveFormsModule
  ],
  templateUrl: './app.html',
  styleUrl: './app.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {

  busca = '';

  jogos = signal<any[]>([]);

  carregando = signal(false);

  erro = signal('');

  sugestoes = signal<any[]>([]);

  buscandoJogos = signal(false);

  constructor(
    private gameService: GameService,
    private auth: AuthService,
    private router: Router,
  ) {
    // A Steam retorna para /?login=sucesso. Revalida o cookie e abre o perfil logado.
    const params = new URLSearchParams(window.location.search);
    if (params.get('login') === 'sucesso') {
      void this.auth.sincronizarSessao().then((ok) => {
        window.history.replaceState({}, document.title, window.location.pathname);
        if (ok) void this.router.navigateByUrl('/perfil');
        else this.auth.abrirModal('entrar');
      });
    } else if (params.get('login') === 'erro') {
      window.history.replaceState({}, document.title, window.location.pathname);
      this.auth.abrirModal('entrar');
    }
  }

  // Busca todos os jogos da FreeToGame
  pesquisar() {

    const busca = this.busca.trim();

    // Não faz a requisição se o campo estiver vazio
    if (!busca) {
      return;
    }

    this.carregando.set(true);
    this.erro.set('');

    this.gameService.buscarJogos().subscribe({

      next: (res) => {
        console.log('Resposta da FreeToGame:', res);

        this.jogos.set(res);

        this.carregando.set(false);
      },

      error: (err) => {
        console.error('Erro na FreeToGame:', err);

        this.erro.set(
          'Não foi possível buscar os jogos.'
        );

        this.carregando.set(false);
      }

    });
  }

  // Sugestões enquanto o usuário digita
  onNomeInput(event: Event) {

    const input = event.target as HTMLInputElement;

    const nome = input.value.trim().toLowerCase();

    if (nome.length < 3) {

      this.sugestoes.set([]);

      this.buscandoJogos.set(false);

      return;
    }

    this.buscandoJogos.set(true);

    this.gameService.buscarJogos().subscribe({

      next: (jogos) => {

        console.log('Jogos da FreeToGame:', jogos);

        const resultados = jogos
          .filter((jogo: any) =>
            jogo.title
              ?.toLowerCase()
              .includes(nome)
          )
          .slice(0, 5)
          .map((jogo: any) => ({
            id: jogo.id,
            nome: jogo.title,
            imagem: jogo.thumbnail,
            descricao: jogo.short_description,
            plataforma: jogo.platform,
            dataLancamento: jogo.release_date,
            genero: jogo.genre,
            publisher: jogo.publisher,
            developer: jogo.developer,
            url: jogo.game_url
          }));

        this.sugestoes.set(resultados);

        this.buscandoJogos.set(false);
      },

      error: (err) => {

        console.error(
          'Erro na FreeToGame:',
          err
        );

        this.sugestoes.set([]);

        this.buscandoJogos.set(false);
      }

    });
  }
}