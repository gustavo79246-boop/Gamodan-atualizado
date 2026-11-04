import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthMode, AuthService } from '../../services/auth';

@Component({
  selector: 'app-header',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './header.html',
  styleUrl: './header.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Header {
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly buscaAberta = signal(false);
  readonly termoBusca = signal('');
  readonly menuPerfilAberto = signal(false);

  abrirAutenticacao(modo: AuthMode): void {
    this.auth.abrirModal(modo);
  }

  alternarBusca(): void {
    const abrir = !this.buscaAberta();
    this.buscaAberta.set(abrir);
    if (!abrir) this.termoBusca.set('');
  }

  buscar(): void {
    const busca = this.termoBusca().trim();
    void this.router.navigate(['/lista'], {
      queryParams: { filtro: 'todos', busca },
    });
    this.buscaAberta.set(false);
  }

  alternarMenuPerfil(): void {
    this.menuPerfilAberto.update((aberto) => !aberto);
  }

  fecharMenuPerfil(): void {
    this.menuPerfilAberto.set(false);
  }

  sair(): void {
    this.fecharMenuPerfil();
    void this.auth.logout().finally(() => this.router.navigateByUrl('/'));
  }
}
