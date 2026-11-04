require('dotenv').config();

const express = require('express');
const cors = require('cors');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const passport = require('passport');
const SteamStrategy = require('passport-steam').Strategy;

const app = express();
const PORT = Number(process.env.PORT || 3000);
const FRONTEND_URLS = (process.env.FRONTEND_URL || 'http://localhost:4200').split(',').map(v => v.trim().replace(/\/$/, '')).filter(Boolean);
const FRONTEND_URL = FRONTEND_URLS[0];
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/gamodan';
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '').split(',').map(v => v.trim().toLowerCase()).filter(Boolean);
const ADMIN_STEAM_IDS = (process.env.ADMIN_STEAM_IDS || '').split(',').map(v => v.trim()).filter(Boolean);
if (process.env.NODE_ENV === 'production' && (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32)) {
  throw new Error('Defina SESSION_SECRET com pelo menos 32 caracteres em produção.');
}

app.set('trust proxy', 1);
app.use(cors({ origin(origin, callback) {
  if (!origin || FRONTEND_URLS.includes(origin.replace(/\/$/, ''))) return callback(null, true);
  return callback(new Error('Origem não autorizada pelo CORS.'));
}, credentials: true, methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'], allowedHeaders: ['Content-Type', 'Authorization'] }));
app.use(express.json({ limit: '2mb' }));
app.use(session({
  name: 'gamodan.sid',
  secret: process.env.SESSION_SECRET || 'change-this-secret-before-deploying',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: MONGODB_URI, collectionName: 'sessions' }),
  proxy: process.env.NODE_ENV === 'production',
  cookie: { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 1000 * 60 * 60 * 24 * 7 }
}));
app.use(passport.initialize());
app.use(passport.session());

const userSchema = new mongoose.Schema({
  nome: { type: String, required: true, trim: true, maxlength: 40 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  senhaHash: { type: String, required: true },
  foto: { type: String, default: '' },
  jogoFavoritoId: Number,
  generoFavorito: String,
  steamId: { type: String, sparse: true },
  admin: { type: Boolean, default: false }
}, { timestamps: true });
const User = mongoose.model('User', userSchema);

const reviewSchema = new mongoose.Schema({
  gameSlug: { type: String, required: true, index: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  username: { type: String, required: true },
  avatar: String,
  rating: { type: Number, required: true, min: 1, max: 5 },
  feedback: { type: String, required: true, trim: true, maxlength: 500 }
}, { timestamps: true });
reviewSchema.index({ gameSlug: 1, user: 1 }, { unique: true });
const Review = mongoose.model('Review', reviewSchema);

const communityPostSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  username: { type: String, required: true, trim: true, maxlength: 40 },
  avatar: { type: String, default: '' },
  text: { type: String, required: true, trim: true, maxlength: 1000 },
  gameName: { type: String, default: '', trim: true, maxlength: 80 },
}, { timestamps: true });
communityPostSchema.add({
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  comments: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    username: { type: String, required: true, maxlength: 40 },
    avatar: { type: String, default: '' },
    text: { type: String, required: true, trim: true, maxlength: 500 },
    createdAt: { type: Date, default: Date.now }
  }]
});
const CommunityPost = mongoose.model('CommunityPost', communityPostSchema);

const followSchema = new mongoose.Schema({
  follower: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  following: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });
followSchema.index({ follower: 1, following: 1 }, { unique: true });
followSchema.index({ following: 1 });
const Follow = mongoose.model('Follow', followSchema);

function publicUser(user) {
  const email = String(user.email || '').toLowerCase();
  const steamId = String(user.steamId || '');
  return { id: String(user._id), nome: user.nome, email: user.email, admin: ADMIN_EMAILS.includes(email) || ADMIN_STEAM_IDS.includes(steamId), foto: user.foto || '', steamId: steamId || null, steamLinked: Boolean(steamId), jogoFavoritoId: user.jogoFavoritoId, generoFavorito: user.generoFavorito };
}
function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ message: 'Faça login para continuar.' });
  next();
}

app.get('/api/health', (_req, res) => res.json({ ok: true, database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected' }));
app.post('/api/auth/register', async (req, res, next) => {
  try {
    const nome = String(req.body.nome || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    const senha = String(req.body.senha || '');
    const foto = typeof req.body.foto === 'string' ? req.body.foto : '';
    if (nome.length < 2 || nome.length > 40) return res.status(400).json({ message: 'Nome deve ter entre 2 e 40 caracteres.' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ message: 'E-mail inválido.' });
    if (senha.length < 8 || senha.length > 72) return res.status(400).json({ message: 'A senha deve ter entre 8 e 72 caracteres.' });
    if (foto.length > 1_500_000) return res.status(400).json({ message: 'A imagem enviada é muito grande.' });
    if (await User.exists({ email })) return res.status(409).json({ message: 'Este e-mail já está cadastrado.' });
    const senhaHash = await bcrypt.hash(senha, 12);
    const user = await User.create({ nome, email, senhaHash, foto, admin: ADMIN_EMAILS.includes(email) });
    req.login(user, err => { if (err) return next(err); res.status(201).json({ user: publicUser(user) }); });
  } catch (err) { if (err.code === 11000) return res.status(409).json({ message: 'Este e-mail já está cadastrado.' }); next(err); }
});
app.post('/api/auth/login', async (req, res, next) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const senha = String(req.body.senha || '');
    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(senha, user.senhaHash))) return res.status(401).json({ message: 'E-mail ou senha incorretos.' });
    req.login(user, err => { if (err) return next(err); res.json({ user: publicUser(user) }); });
  } catch (err) { next(err); }
});
app.get('/api/auth/me', (req, res) => req.user ? res.json({ user: publicUser(req.user) }) : res.status(401).json({ message: 'Não autenticado.' }));
app.post('/api/auth/logout', (req, res, next) => req.logout(err => {
  if (err) return next(err);
  req.session.destroy(error => { if (error) return next(error); res.clearCookie('gamodan.sid'); res.json({ ok: true }); });
}));
app.patch('/api/users/me', requireAuth, async (req, res, next) => {
  try {
    const changes = {};
    if (typeof req.body.foto === 'string' && req.body.foto.length <= 1_500_000) changes.foto = req.body.foto;
    if (typeof req.body.generoFavorito === 'string') changes.generoFavorito = req.body.generoFavorito.trim().slice(0, 60);
    if (req.body.jogoFavoritoId === null || Number.isInteger(req.body.jogoFavoritoId)) changes.jogoFavoritoId = req.body.jogoFavoritoId;
    const user = await User.findByIdAndUpdate(req.user._id, changes, { new: true, runValidators: true });
    res.json({ user: publicUser(user) });
  } catch (err) { next(err); }
});

app.get('/api/reviews/:gameSlug', async (req, res, next) => {
  try {
    const reviews = await Review.find({ gameSlug: req.params.gameSlug }).sort({ updatedAt: -1 }).limit(200).lean();
    res.json({ reviews: reviews.map(r => ({ id: String(r._id), username: r.username, avatar: r.avatar || '', rating: r.rating, feedback: r.feedback, fictitious: false, isMine: Boolean(req.user && String(r.user) === String(req.user._id)), createdAt: r.updatedAt })) });
  } catch (err) { next(err); }
});
app.put('/api/reviews/:gameSlug', requireAuth, async (req, res, next) => {
  try {
    const rating = Number(req.body.rating);
    const feedback = String(req.body.feedback || '').trim();
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) return res.status(400).json({ message: 'A avaliação deve ser de 1 a 5 estrelas.' });
    if (!feedback || feedback.length > 500) return res.status(400).json({ message: 'O comentário deve ter entre 1 e 500 caracteres.' });
    const review = await Review.findOneAndUpdate(
      { gameSlug: req.params.gameSlug, user: req.user._id },
      { $set: { username: req.user.nome, avatar: req.user.foto || '', rating, feedback } },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );
    res.json({ review: { id: String(review._id), username: review.username, avatar: review.avatar || '', rating: review.rating, feedback: review.feedback, fictitious: false, createdAt: review.updatedAt } });
  } catch (err) { next(err); }
});
app.delete('/api/reviews/:gameSlug', requireAuth, async (req, res, next) => {
  try { await Review.deleteOne({ gameSlug: req.params.gameSlug, user: req.user._id }); res.json({ ok: true }); }
  catch (err) { next(err); }
});

app.get('/api/community/posts', async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.feed === 'following') {
      if (!req.user) return res.status(401).json({ message: 'Entre para ver o feed de quem você segue.' });
      const follows = await Follow.find({ follower: req.user._id }).select('following').lean();
      const ids = follows.map(item => item.following);
      ids.push(req.user._id);
      filter.user = { $in: ids };
    }
    const posts = await CommunityPost.find(filter).sort({ createdAt: -1 }).limit(100).lean();
    res.json({ posts: posts.map(post => ({
      id: String(post._id), userId: String(post.user), username: post.username, avatar: post.avatar || '',
      text: post.text, gameName: post.gameName || '', createdAt: post.createdAt,
      isMine: Boolean(req.user && String(post.user) === String(req.user._id)),
      likedByMe: Boolean(req.user && (post.likes || []).some(id => String(id) === String(req.user._id))),
      likesCount: (post.likes || []).length, commentsCount: (post.comments || []).length,
      comments: (post.comments || []).slice(-3).map(c => ({ id: String(c._id), username: c.username, avatar: c.avatar || '', text: c.text, createdAt: c.createdAt, isMine: Boolean(req.user && String(c.user) === String(req.user._id)) }))
    })) });
  } catch (err) { next(err); }
});
app.post('/api/community/posts', requireAuth, async (req, res, next) => {
  try {
    const text = String(req.body.text || '').trim();
    const gameName = String(req.body.gameName || '').trim();
    if (!text || text.length > 1000) return res.status(400).json({ message: 'Escreva uma publicação de até 1.000 caracteres.' });
    if (gameName.length > 80) return res.status(400).json({ message: 'O nome do jogo deve ter até 80 caracteres.' });
    const post = await CommunityPost.create({ user: req.user._id, username: req.user.nome, avatar: req.user.foto || '', text, gameName, likes: [], comments: [] });
    res.status(201).json({ post: { id: String(post._id), userId: String(post.user), username: post.username, avatar: post.avatar, text: post.text, gameName: post.gameName, createdAt: post.createdAt, isMine: true, likedByMe: false, likesCount: 0, commentsCount: 0, comments: [] } });
  } catch (err) { next(err); }
});
app.delete('/api/community/posts/:id', requireAuth, async (req, res, next) => {
  try {
    const result = await CommunityPost.deleteOne({ _id: req.params.id, user: req.user._id });
    if (!result.deletedCount) return res.status(404).json({ message: 'Publicação não encontrada ou não pertence a você.' });
    res.json({ ok: true });
  } catch (err) { next(err); }
});
app.post('/api/community/posts/:id/like', requireAuth, async (req, res, next) => {
  try {
    const post = await CommunityPost.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Publicação não encontrada.' });
    const index = post.likes.findIndex(id => String(id) === String(req.user._id));
    if (index >= 0) post.likes.splice(index, 1); else post.likes.push(req.user._id);
    await post.save();
    res.json({ liked: index < 0, likesCount: post.likes.length });
  } catch (err) { next(err); }
});
app.post('/api/community/posts/:id/comments', requireAuth, async (req, res, next) => {
  try {
    const text = String(req.body.text || '').trim();
    if (!text || text.length > 500) return res.status(400).json({ message: 'O comentário deve ter entre 1 e 500 caracteres.' });
    const post = await CommunityPost.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Publicação não encontrada.' });
    post.comments.push({ user: req.user._id, username: req.user.nome, avatar: req.user.foto || '', text });
    await post.save();
    const comment = post.comments[post.comments.length - 1];
    res.status(201).json({ comment: { id: String(comment._id), username: comment.username, avatar: comment.avatar, text: comment.text, createdAt: comment.createdAt, isMine: true }, commentsCount: post.comments.length });
  } catch (err) { next(err); }
});
app.get('/api/community/people', async (req, res, next) => {
  try {
    const users = await User.find(req.user ? { _id: { $ne: req.user._id } } : {}).select('nome foto steamId').sort({ createdAt: -1 }).limit(12).lean();
    const ids = users.map(u => u._id);
    const [follows, counts] = await Promise.all([
      req.user ? Follow.find({ follower: req.user._id, following: { $in: ids } }).select('following').lean() : [],
      Follow.aggregate([{ $match: { following: { $in: ids } } }, { $group: { _id: '$following', total: { $sum: 1 } } }])
    ]);
    const followed = new Set(follows.map(f => String(f.following)));
    const totals = new Map(counts.map(c => [String(c._id), c.total]));
    res.json({ people: users.map(u => ({ id: String(u._id), username: u.nome, avatar: u.foto || '', steamLinked: Boolean(u.steamId), followersCount: totals.get(String(u._id)) || 0, isFollowing: followed.has(String(u._id)) })) });
  } catch (err) { next(err); }
});
app.post('/api/community/users/:id/follow', requireAuth, async (req, res, next) => {
  try {
    if (String(req.params.id) === String(req.user._id)) return res.status(400).json({ message: 'Você não pode seguir a si mesmo.' });
    const target = await User.findById(req.params.id).select('_id');
    if (!target) return res.status(404).json({ message: 'Usuário não encontrado.' });
    const existing = await Follow.findOne({ follower: req.user._id, following: target._id });
    if (existing) { await existing.deleteOne(); return res.json({ following: false }); }
    try { await Follow.create({ follower: req.user._id, following: target._id }); }
    catch (err) { if (err.code !== 11000) throw err; }
    res.json({ following: true });
  } catch (err) { next(err); }
});
app.get('/api/community/users/:id/follow-stats', async (req, res, next) => {
  try {
    const [followers, following, relation] = await Promise.all([
      Follow.countDocuments({ following: req.params.id }),
      Follow.countDocuments({ follower: req.params.id }),
      req.user ? Follow.exists({ follower: req.user._id, following: req.params.id }) : null
    ]);
    res.json({ followers, following, isFollowing: Boolean(relation) });
  } catch (err) { next(err); }
});

passport.serializeUser((user, done) => done(null, String(user._id)));
passport.deserializeUser(async (id, done) => { try { done(null, await User.findById(id)); } catch (err) { done(err); } });
const steamConfig = {
  apiKey: process.env.STEAM_API_KEY,
  returnURL: process.env.STEAM_RETURN_URL,
  realm: process.env.STEAM_REALM
};
const steamEnabled = Boolean(steamConfig.apiKey && steamConfig.returnURL && steamConfig.realm);
if (steamEnabled) {
  // O returnURL precisa ser exatamente o endereço cadastrado/definido no .env;
  // realm deve ser a origem pública do backend, terminando em barra.
  const callbackUrl = new URL(steamConfig.returnURL);
  const realmUrl = new URL(steamConfig.realm);
  if (!['http:', 'https:'].includes(callbackUrl.protocol) || !['http:', 'https:'].includes(realmUrl.protocol)) {
    throw new Error('STEAM_RETURN_URL e STEAM_REALM precisam usar HTTP ou HTTPS.');
  }
  passport.use('steam', new SteamStrategy(steamConfig, async (identifier, profile, done) => {
    try {
      const steamId = String(identifier || '').split('/').filter(Boolean).pop();
      if (!/^\d{15,20}$/.test(steamId || '')) return done(new Error('A Steam retornou um identificador inválido.'));
      let user = await User.findOne({ steamId });
      if (!user) {
        const email = `steam-${steamId}@gamodan.local`;
        const photos = Array.isArray(profile.photos) ? profile.photos : [];
        const foto = photos.find(photo => photo?.value)?.value || '';
        user = await User.create({ nome: String(profile.displayName || 'Jogador Steam').slice(0, 40), email, senhaHash: await bcrypt.hash(require('crypto').randomUUID(), 12), steamId, foto });
      } else {
        const photos = Array.isArray(profile.photos) ? profile.photos : [];
        const foto = photos.find(photo => photo?.value)?.value;
        const nome = String(profile.displayName || user.nome).slice(0, 40);
        if (foto || nome !== user.nome) {
          user.nome = nome;
          if (foto) user.foto = foto;
          await user.save();
        }
      }
      done(null, user);
    } catch (err) { done(err); }
  }));
  app.get('/auth/steam', (req, res, next) => {
    req.session.returnTo = `${FRONTEND_URL}/?login=sucesso`;
    passport.authenticate('steam')(req, res, next);
  });
  app.get('/auth/steam/return', (req, res, next) => {
    passport.authenticate('steam', { failureRedirect: `${FRONTEND_URL}/?login=erro` }, (err, user) => {
      if (err) return next(err);
      if (!user) return res.redirect(`${FRONTEND_URL}/?login=erro`);
      req.logIn(user, loginError => {
        if (loginError) return next(loginError);
        req.session.save(saveError => {
          if (saveError) return next(saveError);
          res.redirect(req.session.returnTo || `${FRONTEND_URL}/?login=sucesso`);
        });
      });
    })(req, res, next);
  });
} else {
  console.warn('Login Steam desativado: configure STEAM_API_KEY, STEAM_RETURN_URL e STEAM_REALM no .env.');
  app.get('/auth/steam', (_req, res) => res.status(503).send('Login Steam indisponível. Configure as variáveis STEAM_API_KEY, STEAM_RETURN_URL e STEAM_REALM no backend.'));
  app.get('/auth/steam/return', (_req, res) => res.redirect(`${FRONTEND_URL}/?login=erro`));
}

// Biblioteca Steam do usuário autenticado. A chave da Steam nunca sai do servidor.
app.get('/api/steam/games', requireAuth, async (req, res, next) => {
  try {
    const steamId = req.user.steamId;
    if (!steamId) return res.status(409).json({ message: 'Esta conta ainda não está vinculada à Steam.' });
    if (!process.env.STEAM_API_KEY) return res.status(503).json({ message: 'A integração com a Steam não está configurada no servidor.' });
    const url = new URL('https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/');
    url.search = new URLSearchParams({
      key: process.env.STEAM_API_KEY,
      steamid: steamId,
      include_appinfo: '1',
      include_played_free_games: '1'
    }).toString();
    const steamResponse = await fetch(url, { signal: AbortSignal.timeout(12000) });
    if (!steamResponse.ok) return res.status(502).json({ message: 'A Steam não conseguiu fornecer a biblioteca agora.' });
    const payload = await steamResponse.json();
    const data = payload?.response;
    if (!data || !Array.isArray(data.games)) {
      return res.status(403).json({ message: 'A biblioteca está privada ou a Steam não disponibilizou os jogos. Altere a privacidade dos detalhes de jogos na Steam para Público e tente novamente.' });
    }
    const games = data.games.map(game => ({
      appId: Number(game.appid),
      nome: String(game.name || `Jogo ${game.appid}`),
      horas: Math.round((Number(game.playtime_forever || 0) / 60) * 10) / 10,
      imagem: `https://cdn.cloudflare.steamstatic.com/steam/apps/${Number(game.appid)}/header.jpg`
    })).sort((a, b) => b.horas - a.horas);
    res.set('Cache-Control', 'private, no-store');
    res.json({ total: games.length, totalMinutos: Number(data.game_count || games.length), games });
  } catch (err) {
    if (err.name === 'TimeoutError' || err.name === 'AbortError') return res.status(504).json({ message: 'A Steam demorou para responder. Tente novamente.' });
    next(err);
  }
});

app.use((err, _req, res, _next) => {
  console.error('[API]', err?.message || err);
  if (err?.message?.includes('CORS')) return res.status(403).json({ message: 'Origem não autorizada.' });
  res.status(500).json({ message: 'Erro interno da API.' });
});

mongoose.connect(MONGODB_URI).then(() => {
  app.listen(PORT, () => console.log(`Gamodan API em http://localhost:${PORT} — MongoDB conectado`));
}).catch(err => {
  console.error('Não foi possível conectar ao MongoDB:', err.message);
  process.exit(1);
});
