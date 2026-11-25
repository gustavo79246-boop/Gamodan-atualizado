# O que mudou

## Tema vidro
- `src/styles.css`: tokens (`--glass-*`), fundo aurora fixo, foco dos campos, fallback sem `backdrop-filter` e com "reduzir transparência".
- Cabeçalho, cards, modais, menus e campos dos componentes agora usam os tokens. Para ajustar o visual, edite só o início do `styles.css`.

## Erros corrigidos (front)
- `adminGuard` chamava `inject(Router)` depois de um `await` (erro NG0203). Agora o Router é obtido antes.
- A busca da FreeToGame baixava o catálogo inteiro a cada digitação, e a API não aceita CORS nem o parâmetro `title`. Agora passa pela nossa API, com cache.
- Respostas antigas da busca na home podiam sobrescrever as novas.
- Removidos: `game.service.ts` (classe `GameService` duplicada), `steam.ts` e `steam-auth.ts` (sem uso), e ~120 linhas mortas do `app.ts`.
- `http://localhost:3000` estava em 6 arquivos; agora há `config/api.config.ts` e um interceptor (cookie + mensagem clara quando a API está fora).
- Aviso do Angular (RouterLink sem uso) e orçamento de CSS do `home.css` ajustados.

## API
- Segurança: helmet, limite de tentativas (login/cadastro e escritas), CORS com lista, foto só PNG/JPG/WEBP/GIF (antes aceitava qualquer texto), login sem diferença de tempo para e-mail inexistente.
- Fotos: deixam de ser copiadas em cada post/comentário/avaliação e enviadas em base64. A API devolve uma URL cacheável (`/api/users/:id/avatar`).
- IDs e slugs inválidos retornam 400 (antes 500). Corpo ausente não quebra (Express 5).
- Curtir e comentar agora são atômicos; limite de 500 comentários por post; paginação do feed.
- Erros padronizados (JSON inválido, validação, duplicado), rota 404 em JSON, encerramento limpo.
- Steam: cache de 5 min, nome longo não quebra o cadastro, botão sem configuração volta ao app em vez de "Cannot GET", `totalMinutos` agora é de fato em minutos.
- Novo proxy `/api/free-games`.
