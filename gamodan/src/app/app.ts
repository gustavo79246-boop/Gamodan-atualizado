import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { AuthModal } from './components/auth-modal/auth-modal';
import { Header } from './components/header/header';
import { AuthService } from './services/auth';

@Component({
  selector: 'app-root',
  imports: [Header, RouterOutlet, AuthModal],
  templateUrl: './app.html',
  styleUrl: './app.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  constructor() {
    // A Steam retorna para /?login=sucesso. Revalida o cookie e abre o perfil logado.
    const params = new URLSearchParams(window.location.search);
    const login = params.get('login');
    if (login === 'sucesso') {
      void this.auth.sincronizarSessao().then((ok) => {
        window.history.replaceState({}, document.title, window.location.pathname);
        if (ok) void this.router.navigateByUrl('/perfil');
        else this.auth.abrirModal('entrar');
      });
    } else if (login === 'erro') {
      window.history.replaceState({}, document.title, window.location.pathname);
      this.auth.abrirModal('entrar');
    }
  }
}
