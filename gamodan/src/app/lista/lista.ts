import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Game, GameStatus } from '../models/game.model';
import { AuthService } from '../services/auth';
import { GameService } from '../services/game';
import { CatalogService } from '../services/catalog';
import { FreeToGame, FreeToGameService } from '../services/free-to-game';
import { SteamLibraryService } from '../services/steam-library';

type FiltroLista = 'todos' | 'favoritos' | 'wishlist' | GameStatus;

@Component({
  selector: 'app-lista',
  imports: [ReactiveFormsModule],
  templateUrl: './lista.html',
  styleUrls: ['./lista.css', './lista-add.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Lista {
  private readonly games = inject(GameService);
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly queryParams = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });
  protected readonly auth = inject(AuthService);
  private readonly freeToGame = inject(FreeToGameService);
  private readonly catalog = inject(CatalogService);
  readonly steam = inject(SteamLibraryService);

  readonly estrelas = [1, 2, 3, 4, 5];
  readonly filtro = signal<FiltroLista>('todos');
  readonly termoBusca = signal('');
  readonly jogoSelecionado = signal<Game | null>(null);
  readonly editando = signal(false);
  readonly novoJogoAberto = signal(false);
  readonly buscaGratisAberta = signal(false);
  readonly jogosGratis = signal<FreeToGame[]>([]);
  readonly detalhesApi = signal<FreeToGame | null>(null);
  readonly carregandoDetalhesApi = signal(false);
  readonly erroDetalhesApi = signal('');
  readonly buscandoGratis = signal(false);
  readonly mensagemBuscaGratis = signal('');
  readonly termoBuscaGratis = signal('');
  private buscaGratisId = 0;
  private buscaDetalhesId = 0;

  constructor() {
    if (this.auth.usuario()?.steamLinked) void this.steam.carregar();
    effect(() => {
      const params = this.queryParams();
      const filtro = params.get('filtro');
      if (filtro === 'todos' || filtro === 'favoritos' || filtro === 'wishlist') {
        this.filtro.set(filtro);
      }
      this.termoBusca.set(params.get('busca') ?? '');
    });
  }

  readonly jogos = computed(() => {
    const todos = [...this.games.games()].sort((a, b) => b.id - a.id);
    const tipo = this.filtro();
    const filtrados =
      tipo === 'favoritos'
        ? todos.filter((game) => game.favorito)
        : tipo === 'wishlist'
          ? todos.filter((game) => game.wishlist)
          : tipo === 'pendente' || tipo === 'jogando' || tipo === 'finalizado'
            ? todos.filter((game) => game.status === tipo)
            : todos;
    const busca = this.termoBusca().trim().toLocaleLowerCase();
    if (busca) return filtrados.filter((game) => game.nome.toLocaleLowerCase().includes(busca));
    return filtrados;
  });

  readonly totalGeral = computed(() => this.games.games().length);
  readonly totalFavoritos = computed(() => this.games.games().filter((g) => g.favorito).length);
  readonly totalWishlist = computed(() => this.games.games().filter((g) => g.wishlist).length);

  readonly form = this.fb.nonNullable.group({
    nome: ['', [Validators.required, Validators.maxLength(50)]],
    imagem: ['', [Validators.required]],
    descricao: [''],
    desenvolvedor: [''],
    plataforma: [''],
    dataLancamento: [''],
    generos: [''],
    estrelas: [3, [Validators.min(0.5), Validators.max(5)]],
    horasJogadas: [0, [Validators.min(0)]],
    dataInicial: ['', Validators.required],
    dataFinal: [''],
    favorito: [false],
    wishlist: [false],
    status: ['pendente' as GameStatus],
  });

  atualizarBibliotecaSteam(): void { void this.steam.carregar(); }

  definirFiltro(tipo: FiltroLista): void {
    this.filtro.set(tipo);
  }

  abrirNovoJogo(): void {
    this.jogoSelecionado.set(null);
    this.editando.set(false);
    this.form.reset({
      nome: '',
      imagem: '',
      descricao: '',
      desenvolvedor: '',
      plataforma: '',
      dataLancamento: '',
      generos: '',
      estrelas: 3,
      horasJogadas: 0,
      dataInicial: new Date().toISOString().slice(0, 10),
      dataFinal: '',
      favorito: false,
      wishlist: false,
      status: 'pendente',
    });
    this.novoJogoAberto.set(true);
  }

  fecharNovoJogo(): void {
    this.novoJogoAberto.set(false);
  }

  salvarNovoJogo(): void {
    if (this.form.invalid) return this.form.markAllAsTouched();
    const value = this.form.getRawValue();
    const generos = value.generos
      .split(',')
      .map((genero) => genero.trim())
      .filter(Boolean);
    this.games.addGame({
      nome: value.nome,
      imagem: value.imagem,
      descricao: value.descricao || undefined,
      desenvolvedor: value.desenvolvedor || undefined,
      plataforma: value.plataforma || undefined,
      dataLancamento: value.dataLancamento || undefined,
      generos: generos.length ? generos : undefined,
      estrelas: value.estrelas,
      horasJogadas: value.horasJogadas,
      dataInicial: value.dataInicial,
      favorito: value.favorito,
      wishlist: value.wishlist,
      status: value.status,
      dataFinal: value.dataFinal || undefined,
    });
    this.novoJogoAberto.set(false);
    this.filtro.set('todos');
  }

  abrirBuscaGratis(): void {
    this.buscaGratisAberta.set(true);
    this.jogosGratis.set([]);
    this.termoBuscaGratis.set('');
    this.mensagemBuscaGratis.set('');
  }

  buscarJogosGratis(termo: string): void {
    const busca = termo.trim();
    const buscaId = ++this.buscaGratisId;
    this.termoBuscaGratis.set(busca);
    this.mensagemBuscaGratis.set('');

    if (!busca) {
      this.jogosGratis.set([]);
      this.buscandoGratis.set(false);
      return;
    }

    this.buscandoGratis.set(true);
    this.freeToGame.buscarJogos(busca).subscribe({
      next: (resultados) => {
        if (buscaId !== this.buscaGratisId) return;
        this.jogosGratis.set(
          resultados
            .filter((jogo) => jogo.title.toLowerCase().startsWith(busca.toLowerCase()))
            .slice(0, 6),
        );
        this.buscandoGratis.set(false);
      },
      error: (error: unknown) => {
        if (buscaId !== this.buscaGratisId) return;
        console.error('Erro ao buscar jogos gratuitos:', error);
        this.jogosGratis.set([]);
        this.buscandoGratis.set(false);
        this.mensagemBuscaGratis.set('Não foi possível buscar jogos agora. Tente novamente.');
      },
    });
  }

  adicionarJogoGratis(jogo: FreeToGame): void {
    const hoje = new Date().toISOString().slice(0, 10);
    this.games.addGame({
      nome: jogo.title,
      imagem: jogo.thumbnail,
      descricao: jogo.short_description,
      desenvolvedor: jogo.developer,
      generos: jogo.genre ? [jogo.genre] : [],
      plataforma: jogo.platform,
      dataLancamento: jogo.release_date,
      estrelas: 0,
      horasJogadas: 0,
      dataInicial: hoje,
      favorito: false,
      wishlist: false,
      status: 'pendente',
    });
    this.buscaGratisAberta.set(false);
    this.filtro.set('todos');
  }

  readonly filtroStatusSelecionado = computed(() => {
    const tipo = this.filtro();
    return tipo === 'jogando' || tipo === 'pendente' || tipo === 'finalizado' ? tipo : '';
  });

  definirFiltroStatus(status: string): void {
    this.filtro.set(status === '' ? 'todos' : (status as GameStatus));
  }

  abrirDetalhes(jogo: Game): void {
    this.jogoSelecionado.set(jogo);
    this.editando.set(false);
    this.buscarDetalhesApi(jogo.nome);
  }

  private buscarDetalhesApi(nome: string): void {
    const buscaId = ++this.buscaDetalhesId;
    this.detalhesApi.set(null);
    this.erroDetalhesApi.set('');
    this.carregandoDetalhesApi.set(true);

    this.freeToGame.buscarDetalhesPorTitulo(nome).subscribe({
      next: (jogo) => {
        if (buscaId !== this.buscaDetalhesId) return;
        this.detalhesApi.set(jogo);
        this.carregandoDetalhesApi.set(false);
      },
      error: (error: unknown) => {
        if (buscaId !== this.buscaDetalhesId) return;
        console.error('Erro ao carregar detalhes do jogo:', error);
        this.carregandoDetalhesApi.set(false);
        this.erroDetalhesApi.set('Não foi possível carregar os dados externos deste jogo.');
      },
    });
  }

  iniciarEdicao(jogo: Game, event?: MouseEvent): void {
    if (event) event.stopPropagation();
    this.buscaDetalhesId++;
    this.detalhesApi.set(null);
    this.carregandoDetalhesApi.set(false);
    this.erroDetalhesApi.set('');
    this.jogoSelecionado.set(jogo);
    this.editando.set(true);
    this.form.reset({
      nome: jogo.nome,
      imagem: jogo.imagem,
      descricao: jogo.descricao ?? '',
      desenvolvedor: jogo.desenvolvedor ?? '',
      plataforma: jogo.plataforma ?? '',
      dataLancamento: jogo.dataLancamento ?? '',
      generos: jogo.generos?.join(', ') ?? '',
      estrelas: jogo.estrelas,
      horasJogadas: jogo.horasJogadas ?? 0,
      dataInicial: jogo.dataInicial,
      dataFinal: jogo.dataFinal ?? '',
      favorito: jogo.favorito,
      wishlist: jogo.wishlist,
      status: jogo.status,
    });
  }

  fecharModal(): void {
    this.buscaDetalhesId++;
    this.jogoSelecionado.set(null);
    this.editando.set(false);
    this.detalhesApi.set(null);
    this.carregandoDetalhesApi.set(false);
    this.erroDetalhesApi.set('');
  }

  salvarEdicao(): void {
    const atual = this.jogoSelecionado();
    if (!atual) return;
    if (this.form.invalid) return this.form.markAllAsTouched();
    const value = this.form.getRawValue();
    const generos = value.generos
      .split(',')
      .map((genero) => genero.trim())
      .filter(Boolean);
    this.games.updateGame(atual.id, {
      nome: value.nome,
      imagem: value.imagem,
      descricao: value.descricao || undefined,
      desenvolvedor: value.desenvolvedor || undefined,
      plataforma: value.plataforma || undefined,
      dataLancamento: value.dataLancamento || undefined,
      generos: generos.length ? generos : undefined,
      estrelas: value.estrelas,
      horasJogadas: value.horasJogadas,
      dataInicial: value.dataInicial,
      favorito: value.favorito,
      wishlist: value.wishlist,
      status: value.status,
      dataFinal: value.dataFinal || undefined,
    });
    const atualizado = this.games.games().find((g) => g.id === atual.id) ?? null;
    this.jogoSelecionado.set(atualizado);
    this.editando.set(false);
  }

  excluirJogo(id: number, event?: MouseEvent): void {
    if (event) event.stopPropagation();
    this.games.removeGame(id);
    if (this.jogoSelecionado()?.id === id) {
      this.fecharModal();
    }
  }

  alterarStatus(id: number, status: string, event: Event): void {
    event.stopPropagation();
    if (status === 'pendente' || status === 'jogando' || status === 'finalizado') {
      this.games.setStatus(id, status);
    }
  }

  alternarFavorito(id: number, event: MouseEvent): void {
    event.stopPropagation();
    this.games.toggleFavorito(id);
  }

  selecionarArquivo(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => this.form.controls.imagem.setValue(String(reader.result));
    reader.readAsDataURL(file);
  }

  selecionarSugestao(nome: string, imagem: string): void {
    this.form.patchValue({ nome, imagem });
  }

  buscarSugestoes(termo: string) {
    return this.catalog.buscar(termo);
  }

  definirEstrelas(star: number, event: MouseEvent): void {
    const box = (event.currentTarget as HTMLElement).getBoundingClientRect();
    this.form.controls.estrelas.setValue(
      event.clientX - box.left <= box.width / 2 ? star - 0.5 : star,
    );
  }

  estadoEstrela(value: number, star: number): string {
    return value >= star ? 'full' : value >= star - 0.5 ? 'half' : '';
  }

  formatarData(value: string): string {
    return new Intl.DateTimeFormat('pt-BR').format(new Date(`${value}T00:00:00`));
  }
}
