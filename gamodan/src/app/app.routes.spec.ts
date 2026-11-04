import { routes } from './app.routes';

describe('routes', () => {
  it('deve possuir todas as rotas principais', () => {
    const paths = routes.map((route) => route.path);

    expect(paths).toEqual([
      '',
      'admin',
      'comunidade',
      'catalogo',
      'contato',
      'comunidade/:usuario',
      'jogo/:slug',
      'lista',
      'perfil',
      '**',
    ]);
  });

  it('deve proteger as rotas de catalogo, lista e perfil', () => {
    const catalogo = routes.find((route) => route.path === 'catalogo');
    const lista = routes.find((route) => route.path === 'lista');
    const perfil = routes.find((route) => route.path === 'perfil');

    expect(catalogo?.canActivate).toHaveLength(1);
    expect(lista?.canActivate).toHaveLength(1);
    expect(perfil?.canActivate).toHaveLength(1);
  });

  it('deve deixar os perfis públicos de demonstração acessíveis sem autenticação', async () => {
    const comunidade = routes.find((route) => route.path === 'comunidade/:usuario');

    expect(comunidade?.canActivate).toBeUndefined();
    expect(await comunidade!.loadComponent!()).toBeTruthy();
  });

  it('deve carregar a página pública da comunidade', async () => {
    const comunidade = routes.find((route) => route.path === 'comunidade');

    expect(comunidade?.canActivate).toBeUndefined();
    expect(await comunidade!.loadComponent!()).toBeTruthy();
  });

  it('deve deixar a página pública de comentários de jogos acessível', async () => {
    const jogo = routes.find((route) => route.path === 'jogo/:slug');

    expect(jogo?.canActivate).toBeUndefined();
    expect(await jogo!.loadComponent!()).toBeTruthy();
  });

  it('deve redirecionar rotas desconhecidas para a home', () => {
    const rota = routes.find((route) => route.path === '**');

    expect(rota?.redirectTo).toBe('');
  });

  it('deve carregar o componente Home', async () => {
    const rota = routes.find((route) => route.path === '');

    expect(rota?.loadComponent).toBeDefined();

    const componente = await rota!.loadComponent!();

    expect(componente).toBeTruthy();
  });

  it('deve carregar o componente Admin', async () => {
    const rota = routes.find((route) => route.path === 'admin');

    const componente = await rota!.loadComponent!();

    expect(componente).toBeTruthy();
  });

  it('deve carregar o componente Catalogo', async () => {
    const rota = routes.find((route) => route.path === 'catalogo');

    const componente = await rota!.loadComponent!();

    expect(componente).toBeTruthy();
  });

  it('deve carregar o componente Contato', async () => {
    const rota = routes.find((route) => route.path === 'contato');

    const componente = await rota!.loadComponent!();

    expect(componente).toBeTruthy();
  });

  it('deve carregar o componente Lista', async () => {
    const rota = routes.find((route) => route.path === 'lista');

    const componente = await rota!.loadComponent!();

    expect(componente).toBeTruthy();
  });

  it('deve carregar o componente Perfil', async () => {
    const rota = routes.find((route) => route.path === 'perfil');

    const componente = await rota!.loadComponent!();

    expect(componente).toBeTruthy();
  });
});
