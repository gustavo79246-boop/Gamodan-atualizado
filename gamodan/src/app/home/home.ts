import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Game, GameStatus } from '../models/game.model';
import { AuthService } from '../services/auth';
import { CatalogItem, CatalogService } from '../services/catalog';
import { GameService } from '../services/game';
import { FreeToGame, FreeToGameService } from '../services/free-to-game';
import { slugifyGameTitle } from '../services/community-reviews';

type Aba = 'recentemente' | 'favoritos';

interface JogoRanking extends Game {
  metric: number;
}

@Component({
  selector: 'app-home',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './home.html',
  styleUrls: ['./home.css', './home-carousels.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Home implements OnDestroy {
  private readonly freeToGame = inject(FreeToGameService);
  private readonly games = inject(GameService);
  private readonly catalog = inject(CatalogService);
  private readonly fb = inject(FormBuilder);
  protected readonly auth = inject(AuthService);
  private autoplay: ReturnType<typeof setInterval> | null = null;
  readonly veioDaAPI = signal(false);
  readonly termoAPIBusca = signal('');
  readonly estrelas = [1, 2, 3, 4, 5];
  readonly aba = signal<Aba>('recentemente');
  readonly modalAberto = signal(false);
  readonly catalogoAberto = signal(false);
  readonly detalhes = signal<Game | null>(null);
  readonly detalhesApi = signal<FreeToGame | null>(null);
  readonly carregandoDetalhesApi = signal(false);
  readonly erroDetalhesApi = signal('');
  readonly indice = signal(0);
  readonly termoBusca = signal('');
  readonly buscandoJogos = signal(false);
  readonly mensagemBusca = signal('');
  private buscaId = 0;
  private buscaDetalhesId = 0;

  readonly previewJogos: Game[] = [
    {
      id: 101,
      nome: 'Minecraft',
      imagem: 'assets/games/minecraft.jpeg',
      estrelas: 5,
      dataInicial: '2026-01-10',
      favorito: true,
      wishlist: false,
      status: 'jogando',
    },
    {
      id: 102,
      nome: 'Hollow Knight',
      imagem: 'assets/games/hollowknight.jpg',
      estrelas: 5,
      dataInicial: '2026-01-15',
      favorito: true,
      wishlist: false,
      status: 'finalizado',
    },
    {
      id: 103,
      nome: 'Stardew Valley',
      imagem: 'assets/games/stardewvalley.jpg',
      estrelas: 4.5,
      dataInicial: '2026-02-01',
      favorito: false,
      wishlist: true,
      status: 'pendente',
    },
    {
      id: 104,
      nome: 'Grand Theft Auto V',
      imagem: 'assets/games/grandtheftautoV.jpg',
      estrelas: 4,
      dataInicial: '2026-02-05',
      favorito: false,
      wishlist: false,
      status: 'jogando',
    },
    {
      id: 105,
      nome: 'Undertale',
      imagem: 'assets/games/undertale.jpg',
      estrelas: 5,
      dataInicial: '2026-02-10',
      favorito: true,
      wishlist: false,
      status: 'finalizado',
    },
    {
      id: 106,
      nome: 'Red Dead Redemption 2',
      imagem: 'assets/games/reddeadredemption.jpg',
      estrelas: 5,
      dataInicial: '2026-02-15',
      favorito: true,
      wishlist: true,
      status: 'pendente',
    },
  ];
  readonly jogosEmDestaque = signal(this.embaralhar(this.previewJogos));
  readonly indiceBanner = signal(0);
  readonly jogoBanner = computed(
    () => this.jogosEmDestaque()[this.indiceBanner()] ?? this.previewJogos[0],
  );
  readonly indiceDestaque = signal(0);
  readonly indiceMaisJogados = signal(0);
  readonly indiceMaisAvaliados = signal(0);
  readonly visiveisDestaque = computed(() =>
    this.rotacionar(this.jogosEmDestaque(), this.indiceDestaque()),
  );

  readonly jogosMaisJogados = this.criarRanking([
    [101, 48200],
    [102, 39100],
    [103, 35700],
    [104, 32600],
    [105, 29100],
    [106, 26400],
  ]);
  readonly jogosMaisAvaliados = this.criarRanking([
    [102, 98500],
    [101, 91200],
    [105, 86400],
    [106, 77900],
    [103, 72100],
    [104, 65800],
  ]);
  readonly visiveisMaisJogados = computed(() =>
    this.rotacionar(this.jogosMaisJogados, this.indiceMaisJogados()),
  );
  readonly visiveisMaisAvaliados = computed(() =>
    this.rotacionar(this.jogosMaisAvaliados, this.indiceMaisAvaliados()),
  );

  private embaralhar(jogos: Game[]): Game[] {
    const embaralhados = [...jogos];
    for (let index = embaralhados.length - 1; index > 0; index--) {
      const aleatorio = Math.floor(Math.random() * (index + 1));
      [embaralhados[index], embaralhados[aleatorio]] = [
        embaralhados[aleatorio],
        embaralhados[index],
      ];
    }
    return embaralhados;
  }

  private criarRanking(metricas: [number, number][]): JogoRanking[] {
    return metricas.flatMap(([id, metric]) => {
      const jogo = this.previewJogos.find((item) => item.id === id);
      return jogo ? [{ ...jogo, metric }] : [];
    });
  }

  private rotacionar<T extends Game>(jogos: T[], indice: number): T[] {
    if (jogos.length <= 3) return jogos;
    const inicio = indice % jogos.length;
    return [
      jogos[(inicio - 1 + jogos.length) % jogos.length],
      jogos[inicio],
      jogos[(inicio + 1) % jogos.length],
    ];
  }

  avancarDestaque(): void {
    this.indiceDestaque.update((index) => (index + 1) % this.jogosEmDestaque().length);
  }

  selecionarBanner(index: number): void {
    this.indiceBanner.set(index);
  }

  voltarDestaque(): void {
    this.indiceDestaque.update(
      (index) => (index - 1 + this.jogosEmDestaque().length) % this.jogosEmDestaque().length,
    );
  }

  avancarMaisJogados(): void {
    this.indiceMaisJogados.update((index) => (index + 1) % this.jogosMaisJogados.length);
  }

  voltarMaisJogados(): void {
    this.indiceMaisJogados.update(
      (index) => (index - 1 + this.jogosMaisJogados.length) % this.jogosMaisJogados.length,
    );
  }

  avancarMaisAvaliados(): void {
    this.indiceMaisAvaliados.update((index) => (index + 1) % this.jogosMaisAvaliados.length);
  }

  voltarMaisAvaliados(): void {
    this.indiceMaisAvaliados.update(
      (index) => (index - 1 + this.jogosMaisAvaliados.length) % this.jogosMaisAvaliados.length,
    );
  }

  formatarNumero(value: number): string {
    return new Intl.NumberFormat('pt-BR').format(value);
  }

  readonly jogos = computed(() => {
    if (this.auth.admin()) {
      return this.catalog.items().map((item, index) => ({
        id: index + 1,
        nome: item.nome,
        imagem: item.imagem,
        estrelas: 3,
        dataInicial: '',
        favorito: false,
        wishlist: false,
        status: 'pendente' as const,
      }));
    }
    if (!this.auth.autenticado()) return this.previewJogos;
    const base =
      this.aba() === 'favoritos'
        ? this.games.games().filter((game) => game.favorito)
        : [...this.games.games()].sort((a, b) => b.id - a.id);
    return base.length ? base.slice(0, 6) : this.previewJogos;
  });
  readonly visiveis = computed(() => {
    const games = this.jogos();
    if (games.length <= 3) return games;
    const index = this.indice() % games.length;
    return [
      games[(index - 1 + games.length) % games.length],
      games[index],
      games[(index + 1) % games.length],
    ];
  });
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
  readonly formCatalogo = this.fb.nonNullable.group({
    nome: ['', [Validators.required, Validators.maxLength(50)]],
    imagem: ['', [Validators.required]],
  });
  readonly sugestoes = computed(() => this.catalog.buscar(this.termoBusca()));
  readonly catalogoEditando = signal<string | null>(null);
  readonly jogosAPI = signal<FreeToGame[]>([]);
  readonly apiAberta = signal(false);
  constructor() {
    effect(
      () => {
        const total = this.jogos().length;
        if (this.indice() >= total) this.indice.set(0);
        this.limparAutoplay();
        if (total > 1 && !this.modalAberto() && !this.detalhes())
          this.autoplay = setInterval(() => this.avancar(), 3500);
      },
      { allowSignalWrites: true },
    );
  }
  abrirJogo(): void {
    if (this.auth.autenticado()) {
      this.modalAberto.set(true);
    } else {
      this.auth.abrirModal('entrar');
    }
  }

  abrirBuscaAPI(): void {
    if (!this.auth.autenticado()) {
      this.auth.abrirModal('entrar');
      return;
    }

    this.apiAberta.set(true);
  }

  abrirCatalogo(jogo?: Game, event?: MouseEvent): void {
    if (event) event.stopPropagation();
    if (jogo) {
      this.catalogoEditando.set(jogo.nome);
      this.formCatalogo.reset({ nome: jogo.nome, imagem: jogo.imagem });
    } else {
      this.catalogoEditando.set(null);
      this.formCatalogo.reset({ nome: '', imagem: '' });
    }
    this.catalogoAberto.set(true);
  }
  buscarJogosAPI(nome: string): void {
    const busca = nome.trim();

    this.termoAPIBusca.set(busca);

    if (!busca) {
      this.jogosAPI.set([]);
      return;
    }

    this.freeToGame.buscarJogos(busca).subscribe({
      next: (jogos) => {
        const termo = busca.toLowerCase();

        const filtrados = jogos
          .filter((jogo) => jogo.title.toLowerCase().startsWith(termo))
          .slice(0, 5);

        this.jogosAPI.set(filtrados);
      },

      error: (erro) => {
        console.error('Erro ao buscar jogos:', erro);
        this.jogosAPI.set([]);
      },
    });
  }
  excluirCatalogo(nome: string, event: MouseEvent): void {
    event.stopPropagation();
    this.catalog.removeItem(nome);
    if (this.catalogoEditando() === nome) {
      this.catalogoEditando.set(null);
      this.catalogoAberto.set(false);
    }
  }
  selecionarArquivoCatalogo(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => this.formCatalogo.controls.imagem.setValue(String(reader.result));
    reader.readAsDataURL(file);
  }
  onNomeInput(event: Event): void {
    this.termoBusca.set((event.target as HTMLInputElement).value);
  }
  selecionarSugestao(item: CatalogItem): void {
    this.form.controls.nome.setValue(item.nome);
    this.form.controls.imagem.setValue(item.imagem);
    this.termoBusca.set('');
  }
  salvarCatalogo(): void {
    if (this.formCatalogo.invalid) return this.formCatalogo.markAllAsTouched();
    const value = this.formCatalogo.getRawValue();
    const original = this.catalogoEditando();
    if (original) this.catalog.updateItem(original, value);
    else this.catalog.addItem(value);
    this.formCatalogo.reset({ nome: '', imagem: '' });
    this.termoBusca.set('');
    this.catalogoEditando.set(null);
    this.catalogoAberto.set(false);
  }
  filtrar(): void {
    if (!this.auth.autenticado()) return this.auth.abrirModal('entrar');
    this.aba.set(this.aba() === 'recentemente' ? 'favoritos' : 'recentemente');
    this.indice.set(0);
  }
  avancar(): void {
    const total = this.jogos().length;
    if (total > 1) this.indice.update((value) => (value + 1) % total);
  }
  voltar(): void {
    const total = this.jogos().length;
    if (total > 1) this.indice.update((value) => (value - 1 + total) % total);
  }
  irPara(index: number): void {
    this.indice.set(index);
  }
  abrirDetalhes(game: Game): void {
    if (!this.auth.autenticado()) return this.auth.abrirModal('entrar');
    this.detalhes.set(game);
    this.buscarDetalhesApi(game.nome);
  }
  slugDoJogo(nome: string): string {
    return slugifyGameTitle(nome);
  }
  fecharDetalhes(): void {
    this.buscaDetalhesId++;
    this.detalhes.set(null);
    this.detalhesApi.set(null);
    this.carregandoDetalhesApi.set(false);
    this.erroDetalhesApi.set('');
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
  salvar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

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
      dataInicial: '',
      dataFinal: '',
      favorito: false,
      wishlist: false,
      status: 'pendente',
    });

    this.termoBusca.set('');
    this.veioDaAPI.set(false);
    this.modalAberto.set(false);
    this.aba.set('recentemente');
  }
  adicionarJogoAPI(jogo: FreeToGame): void {
    this.form.reset({
      nome: jogo.title,
      imagem: jogo.thumbnail,
      descricao: jogo.short_description,
      desenvolvedor: jogo.developer,
      plataforma: jogo.platform,
      dataLancamento: jogo.release_date,
      generos: jogo.genre,
      estrelas: 0,
      horasJogadas: 0,
      dataInicial: new Date().toISOString().split('T')[0],
      dataFinal: '',
      favorito: false,
      wishlist: false,
      status: 'pendente',
    });

    this.veioDaAPI.set(true);

    this.apiAberta.set(false);

    this.termoAPIBusca.set('');
    this.jogosAPI.set([]);

    this.modalAberto.set(true);
  }
  definirEstrelas(star: number, event: MouseEvent): void {
    const box = (event.currentTarget as HTMLElement).getBoundingClientRect();
    this.form.controls.estrelas.setValue(
      event.clientX - box.left <= box.width / 2 ? star - 0.5 : star,
    );
  }
  selecionarArquivo(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => this.form.controls.imagem.setValue(String(reader.result));
    reader.readAsDataURL(file);
  }
  estadoEstrela(value: number, star: number): string {
    return value >= star ? 'full' : value >= star - 0.5 ? 'half' : '';
  }
  formatarData(value: string): string {
    return new Intl.DateTimeFormat('pt-BR').format(new Date(`${value}T00:00:00`));
  }
  ngOnDestroy(): void {
    this.limparAutoplay();
  }
  private limparAutoplay(): void {
    if (this.autoplay) clearInterval(this.autoplay);
    this.autoplay = null;
  }
}
