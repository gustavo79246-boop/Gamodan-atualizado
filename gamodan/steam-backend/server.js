require('dotenv').config();

const crypto = require('crypto');
const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const passport = require('passport');
const SteamStrategy = require('passport-steam').Strategy;

/* ------------------------------------------------------------------ */
/* Configuração                                                        */
/* ------------------------------------------------------------------ */
const IS_PROD = process.env.NODE_ENV === 'production';
const PORT = Number(process.env.PORT || 3000);
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/gamodan';
const list = (value) => String(value || '').split(',').map((v) => v.trim()).filter(Boolean);
const FRONTEND_ORIGINS = list(process.env.FRONTEND_URL || 'http://localhost:4200').map((v) => v.replace(/\/+$/, ''));
const FRONTEND_URL = FRONTEND_ORIGINS[0];
const PUBLIC_API_URL = String(process.env.PUBLIC_API_URL || '').replace(/\/+$/, '');
const ADMIN_EMAILS = list(process.env.ADMIN_EMAILS).map((v) => v.toLowerCase());
const ADMIN_STEAM_IDS = list(process.env.ADMIN_STEAM_IDS);
const LOCAL_ORIGIN = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

if (IS_PROD && (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32)) {
  throw new Error('Defina SESSION_SECRET com pelo menos 32 caracteres em produção.');
}
if (!IS_PROD && !process.env.SESSION_SECRET) {
  console.warn('Aviso: SESSION_SECRET não definido. Usando um segredo temporário (as sessões caem a cada reinício).');
}
const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');

mongoose.set('strictQuery', true);

/* ------------------------------------------------------------------ */
/* Middlewares globais                                                 */
/* ------------------------------------------------------------------ */
const app = express();
if (IS_PROD) app.set('trust proxy', 1); // necessário atrás de Nginx/Render/Railway para HTTPS e IP corretos

// crossOriginResourcePolicy: o Angular (outra origem) precisa carregar as fotos de perfil servidas pela API.
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  credentials: true,
  origin(origin, callback) {
    const allowed = !origin || FRONTEND_ORIGINS.includes(origin) || (!IS_PROD && LOCAL_ORIGIN.test(origin));
    callback(null, allowed);
  },
}));
app.use(express.json({ limit: '2mb' }));
// No Express 5, req.body fica undefined quando a requisição não tem corpo. Normaliza para não quebrar os handlers.
app.use((req, _res, next) => { if (req.body === undefined) req.body = {}; next(); });

app.use(session({
  name: 'gamodan.sid',
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: MONGODB_URI, collectionName: 'sessions', ttl: 60 * 60 * 24 * 7 }),
  cookie: {
    httpOnly: true,
    sameSite: process.env.COOKIE_SAMESITE || 'lax',
    secure: IS_PROD,
    maxAge: 1000 * 60 * 60 * 24 * 7,
  },
}));
app.use(passport.initialize());
app.use(passport.session());

/* ------------------------------------------------------------------ */
/* Limites de requisição                                               */
/* ------------------------------------------------------------------ */
const limiterOptions = (windowMs, limit, message) => ({
  windowMs, limit, standardHeaders: 'draft-7', legacyHeaders: false, message: { message },
});
const apiLimiter = rateLimit(limiterOptions(60 * 1000, 300, 'Muitas requisições. Aguarde um instante.'));
const authLimiter = rateLimit({
  ...limiterOptions(15 * 60 * 1000, 20, 'Muitas tentativas. Aguarde alguns minutos e tente novamente.'),
  skipSuccessfulRequests: true,
});
const writeLimiter = rateLimit(limiterOptions(60 * 1000, 30, 'Você está publicando rápido demais. Aguarde um momento.'));

app.use('/api', apiLimiter);
app.use(['/api/auth/login', '/api/auth/register'], authLimiter);
app.use(['/api/community', '/api/reviews', '/api/users'], (req, res, next) =>
  (req.method === 'GET' || req.method === 'HEAD' ? next() : writeLimiter(req, res, next)));

/* ------------------------------------------------------------------ */
/* Modelos                                                             */
/* ------------------------------------------------------------------ */
const userSchema = new mongoose.Schema({
  nome: { type: String, required: true, trim: true, maxlength: 40 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  senhaHash: { type: String, required: true },
  foto: { type: String, default: '' },
  jogoFavoritoId: Number,
  generoFavorito: String,
  steamId: { type: String, unique: true, sparse: true },
  admin: { type: Boolean, default: false },
}, { timestamps: true });
const User = mongoose.model('User', userSchema);

// O avatar NÃO é mais copiado para avaliações, posts e comentários: ele é lido do usuário na hora de responder.
const reviewSchema = new mongoose.Schema({
  gameSlug: { type: String, required: true, index: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  username: { type: String, required: true },
  avatar: String, // legado
  rating: { type: Number, required: true, min: 1, max: 5 },
  feedback: { type: String, required: true, trim: true, maxlength: 500 },
}, { timestamps: true });
reviewSchema.index({ gameSlug: 1, user: 1 }, { unique: true });
const Review = mongoose.model('Review', reviewSchema);

const communityPostSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  username: { type: String, required: true, trim: true, maxlength: 40 },
  avatar: { type: String, default: '' }, // legado
  text: { type: String, required: true, trim: true, maxlength: 1000 },
  gameName: { type: String, default: '', trim: true, maxlength: 80 },
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  comments: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    username: { type: String, required: true, maxlength: 40 },
    avatar: { type: String, default: '' }, // legado
    text: { type: String, required: true, trim: true, maxlength: 500 },
    createdAt: { type: Date, default: Date.now },
  }],
}, { timestamps: true });
communityPostSchema.index({ createdAt: -1 });
const CommunityPost = mongoose.model('CommunityPost', communityPostSchema);

const followSchema = new mongoose.Schema({
  follower: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  following: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });
followSchema.index({ follower: 1, following: 1 }, { unique: true });
followSchema.index({ following: 1 });
const Follow = mongoose.model('Follow', followSchema);

/* ------------------------------------------------------------------ */
/* Utilitários                                                         */
/* ------------------------------------------------------------------ */
const OBJECT_ID = /^[a-f\d]{24}$/i;
const GAME_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DATA_IMAGE = /^data:image\/(png|jpe?g|webp|gif);base64,([A-Za-z0-9+/]+={0,2})$/;
const MAX_FOTO_LENGTH = 1_500_000;
const MAX_COMMENTS_PER_POST = 500;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DUMMY_HASH = bcrypt.hashSync('gamodan-dummy-password', 12); // igualar o tempo de resposta quando o e-mail não existe

// Ids inválidos viram 400 em vez de estourar CastError (500).
app.param('id', (_req, res, next, value) => (OBJECT_ID.test(value) ? next() : res.status(400).json({ message: 'Identificador inválido.' })));
app.param('gameSlug', (_req, res, next, value) => (value.length <= 120 && GAME_SLUG.test(value) ? next() : res.status(400).json({ message: 'Jogo inválido.' })));
app.param('freeGameId', (_req, res, next, value) => (/^\d{1,9}$/.test(value) ? next() : res.status(400).json({ message: 'Identificador do jogo inválido.' })));

const isHttpUrl = (value) => /^https?:\/\//i.test(String(value || ''));

/** Valida a foto enviada pelo usuário: vazia (remover) ou imagem em data URL de tipo seguro. */
function validateFoto(value) {
  if (typeof value !== 'string') return { error: 'Foto inválida.' };
  if (value === '') return { value };
  if (value.length > MAX_FOTO_LENGTH) return { error: 'A imagem enviada é muito grande.' };
  if (!DATA_IMAGE.test(value)) return { error: 'Envie uma imagem PNG, JPG, WEBP ou GIF.' };
  return { value };
}

function apiBase(req) {
  return PUBLIC_API_URL || `${req.protocol}://${req.get('host')}`;
}

/** URL da foto: o app carrega a imagem por URL (cacheável) em vez de receber base64 em toda resposta. */
function avatarUrl(req, { id, hasFoto, externalUrl, updatedAt }) {
  if (externalUrl) return externalUrl;
  if (!hasFoto) return '';
  return `${apiBase(req)}/api/users/${id}/avatar?v=${new Date(updatedAt || 0).getTime()}`;
}
function userAvatar(req, user) {
  return avatarUrl(req, {
    id: user._id, hasFoto: Boolean(user.foto), externalUrl: isHttpUrl(user.foto) ? user.foto : '', updatedAt: user.updatedAt,
  });
}

// Calcula no próprio MongoDB se há foto, sem trazer o base64 (até 1,5 MB) para o Node.
const AUTHOR_PROJECTION = {
  nome: 1, updatedAt: 1, steamId: 1,
  hasFoto: { $gt: [{ $strLenCP: { $ifNull: ['$foto', ''] } }, 0] },
  externalFoto: { $cond: [{ $regexMatch: { input: { $ifNull: ['$foto', ''] }, regex: '^https?://' } }, '$foto', ''] },
};
async function loadAuthors(ids) {
  const unique = [...new Set(ids.map(String))].map((id) => new mongoose.Types.ObjectId(id));
  if (!unique.length) return new Map();
  const authors = await User.aggregate([{ $match: { _id: { $in: unique } } }, { $project: AUTHOR_PROJECTION }]);
  return new Map(authors.map((author) => [String(author._id), author]));
}
function authorInfo(req, authors, userId, fallbackName) {
  const author = authors.get(String(userId));
  if (!author) return { username: fallbackName || 'Usuário removido', avatar: '' };
  return {
    username: author.nome,
    avatar: avatarUrl(req, { id: author._id, hasFoto: author.hasFoto, externalUrl: author.externalFoto, updatedAt: author.updatedAt }),
  };
}

function publicUser(req, user) {
  const email = String(user.email || '').toLowerCase();
  const steamId = String(user.steamId || '');
  return {
    id: String(user._id), nome: user.nome, email: user.email,
    admin: ADMIN_EMAILS.includes(email) || ADMIN_STEAM_IDS.includes(steamId),
    foto: userAvatar(req, user), steamId: steamId || null, steamLinked: Boolean(steamId),
    jogoFavoritoId: user.jogoFavoritoId, generoFavorito: user.generoFavorito,
  };
}

function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ message: 'Faça login para continuar.' });
  next();
}

const reviewJson = (req, review, authors) => ({
  id: String(review._id),
  ...authorInfo(req, authors, review.user, review.username),
  rating: review.rating, feedback: review.feedback, fictitious: false,
  isMine: Boolean(req.user && String(review.user) === String(req.user._id)),
  createdAt: review.updatedAt,
});

/* ------------------------------------------------------------------ */
/* Saúde e autenticação                                                */
/* ------------------------------------------------------------------ */
app.get('/api/health', (_req, res) => res.json({ ok: true, database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected' }));

app.post('/api/auth/register', async (req, res, next) => {
  const nome = String(req.body.nome || '').trim();
  const email = String(req.body.email || '').trim().toLowerCase();
  const senha = String(req.body.senha || '');
  const fotoCheck = validateFoto(req.body.foto ?? '');
  if (nome.length < 2 || nome.length > 40) return res.status(400).json({ message: 'Nome deve ter entre 2 e 40 caracteres.' });
  if (!EMAIL_PATTERN.test(email)) return res.status(400).json({ message: 'E-mail inválido.' });
  if (senha.length < 8 || senha.length > 72) return res.status(400).json({ message: 'A senha deve ter entre 8 e 72 caracteres.' });
  if (fotoCheck.error) return res.status(400).json({ message: fotoCheck.error });
  if (await User.exists({ email })) return res.status(409).json({ message: 'Este e-mail já está cadastrado.' });
  const senhaHash = await bcrypt.hash(senha, 12);
  const user = await User.create({ nome, email, senhaHash, foto: fotoCheck.value });
  req.login(user, (err) => (err ? next(err) : res.status(201).json({ user: publicUser(req, user) })));
});

app.post('/api/auth/login', async (req, res, next) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const senha = String(req.body.senha || '');
  const user = await User.findOne({ email });
  const valid = await bcrypt.compare(senha, user ? user.senhaHash : DUMMY_HASH);
  if (!user || !valid) return res.status(401).json({ message: 'E-mail ou senha incorretos.' });
  req.login(user, (err) => (err ? next(err) : res.json({ user: publicUser(req, user) })));
});

app.get('/api/auth/me', (req, res) => (req.user
  ? res.json({ user: publicUser(req, req.user) })
  : res.status(401).json({ message: 'Não autenticado.' })));

app.post('/api/auth/logout', (req, res, next) => req.logout((err) => {
  if (err) return next(err);
  req.session.destroy((error) => {
    if (error) return next(error);
    res.clearCookie('gamodan.sid');
    res.json({ ok: true });
  });
}));

/* ------------------------------------------------------------------ */
/* Perfil                                                              */
/* ------------------------------------------------------------------ */
app.patch('/api/users/me', requireAuth, async (req, res) => {
  const changes = {};
  if (req.body.foto !== undefined) {
    const fotoCheck = validateFoto(req.body.foto);
    if (fotoCheck.error) return res.status(400).json({ message: fotoCheck.error });
    changes.foto = fotoCheck.value;
  }
  if (req.body.generoFavorito !== undefined) {
    if (typeof req.body.generoFavorito !== 'string') return res.status(400).json({ message: 'Gênero favorito inválido.' });
    changes.generoFavorito = req.body.generoFavorito.trim().slice(0, 60);
  }
  if (req.body.jogoFavoritoId !== undefined) {
    if (req.body.jogoFavoritoId !== null && !Number.isInteger(req.body.jogoFavoritoId)) return res.status(400).json({ message: 'Jogo favorito inválido.' });
    changes.jogoFavoritoId = req.body.jogoFavoritoId;
  }
  if (!Object.keys(changes).length) return res.status(400).json({ message: 'Nenhuma alteração enviada.' });
  const user = await User.findByIdAndUpdate(req.user._id, changes, { returnDocument: 'after', runValidators: true });
  res.json({ user: publicUser(req, user) });
});

// Serve a foto de perfil como imagem de verdade, com cache (a URL muda quando a foto muda).
app.get('/api/users/:id/avatar', async (req, res) => {
  const user = await User.findById(req.params.id).select('foto').lean();
  const foto = user?.foto || '';
  if (isHttpUrl(foto)) return res.redirect(302, foto);
  const match = DATA_IMAGE.exec(foto);
  if (!match) return res.status(404).end();
  res.set({
    'Content-Type': `image/${match[1] === 'jpg' ? 'jpeg' : match[1]}`,
    'Cache-Control': 'public, max-age=86400, immutable',
    'X-Content-Type-Options': 'nosniff',
  });
  res.send(Buffer.from(match[2], 'base64'));
});

/* ------------------------------------------------------------------ */
/* Avaliações                                                          */
/* ------------------------------------------------------------------ */
app.get('/api/reviews/:gameSlug', async (req, res) => {
  const reviews = await Review.find({ gameSlug: req.params.gameSlug }).select('-avatar').sort({ updatedAt: -1 }).limit(200).lean();
  const authors = await loadAuthors(reviews.map((review) => review.user));
  const average = reviews.length ? Math.round((reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length) * 10) / 10 : 0;
  res.json({ reviews: reviews.map((review) => reviewJson(req, review, authors)), summary: { count: reviews.length, average } });
});

app.put('/api/reviews/:gameSlug', requireAuth, async (req, res) => {
  const rating = Number(req.body.rating);
  const feedback = String(req.body.feedback || '').trim();
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return res.status(400).json({ message: 'A avaliação deve ser de 1 a 5 estrelas.' });
  if (!feedback || feedback.length > 500) return res.status(400).json({ message: 'O comentário deve ter entre 1 e 500 caracteres.' });
  const review = await Review.findOneAndUpdate(
    { gameSlug: req.params.gameSlug, user: req.user._id },
    { $set: { username: req.user.nome, rating, feedback } },
    { returnDocument: 'after', upsert: true, runValidators: true, setDefaultsOnInsert: true },
  ).lean();
  res.json({ review: reviewJson(req, review, new Map([[String(req.user._id), { _id: req.user._id, nome: req.user.nome, updatedAt: req.user.updatedAt, hasFoto: Boolean(req.user.foto), externalFoto: isHttpUrl(req.user.foto) ? req.user.foto : '' }]])) });
});

app.delete('/api/reviews/:gameSlug', requireAuth, async (req, res) => {
  await Review.deleteOne({ gameSlug: req.params.gameSlug, user: req.user._id });
  res.json({ ok: true });
});

/* ------------------------------------------------------------------ */
/* Comunidade                                                          */
/* ------------------------------------------------------------------ */
const commentJson = (req, comment, authors) => ({
  id: String(comment._id),
  ...authorInfo(req, authors, comment.user, comment.username),
  text: comment.text, createdAt: comment.createdAt,
  isMine: Boolean(req.user && String(comment.user) === String(req.user._id)),
});

app.get('/api/community/posts', async (req, res) => {
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 100, 1), 100);
  const match = {};
  if (req.query.before) {
    const before = new Date(String(req.query.before));
    if (Number.isNaN(before.getTime())) return res.status(400).json({ message: 'Cursor inválido.' });
    match.createdAt = { $lt: before };
  }
  if (req.query.feed === 'following') {
    if (!req.user) return res.status(401).json({ message: 'Entre para ver o feed de quem você segue.' });
    const follows = await Follow.find({ follower: req.user._id }).select('following').lean();
    match.user = { $in: [...follows.map((item) => item.following), req.user._id] };
  }
  // O MongoDB devolve só contagens e os 3 últimos comentários; o array completo de curtidas/comentários não trafega.
  const posts = await CommunityPost.aggregate([
    { $match: match },
    { $sort: { createdAt: -1 } },
    { $limit: limit },
    {
      $project: {
        user: 1, username: 1, text: 1, gameName: 1, createdAt: 1,
        likesCount: { $size: { $ifNull: ['$likes', []] } },
        likedByMe: req.user ? { $in: [req.user._id, { $ifNull: ['$likes', []] }] } : { $literal: false },
        commentsCount: { $size: { $ifNull: ['$comments', []] } },
        // Só os 3 últimos comentários, sem o campo legado "avatar" (base64) que ainda pode existir em dados antigos.
        comments: {
          $map: {
            input: { $slice: [{ $ifNull: ['$comments', []] }, -3] },
            as: 'c',
            in: { _id: '$$c._id', user: '$$c.user', username: '$$c.username', text: '$$c.text', createdAt: '$$c.createdAt' },
          },
        },
      },
    },
  ]);
  const authors = await loadAuthors(posts.flatMap((post) => [post.user, ...post.comments.map((comment) => comment.user)]));
  res.json({
    posts: posts.map((post) => ({
      id: String(post._id), userId: String(post.user), ...authorInfo(req, authors, post.user, post.username),
      text: post.text, gameName: post.gameName || '', createdAt: post.createdAt,
      isMine: Boolean(req.user && String(post.user) === String(req.user._id)),
      likedByMe: post.likedByMe, likesCount: post.likesCount, commentsCount: post.commentsCount,
      comments: post.comments.map((comment) => commentJson(req, comment, authors)),
    })),
    nextCursor: posts.length === limit ? posts[posts.length - 1].createdAt : null,
  });
});

app.post('/api/community/posts', requireAuth, async (req, res) => {
  const text = String(req.body.text || '').trim();
  const gameName = String(req.body.gameName || '').trim();
  if (!text || text.length > 1000) return res.status(400).json({ message: 'Escreva uma publicação de até 1.000 caracteres.' });
  if (gameName.length > 80) return res.status(400).json({ message: 'O nome do jogo deve ter até 80 caracteres.' });
  const post = await CommunityPost.create({ user: req.user._id, username: req.user.nome, text, gameName, likes: [], comments: [] });
  res.status(201).json({
    post: {
      id: String(post._id), userId: String(post.user), username: req.user.nome, avatar: userAvatar(req, req.user),
      text: post.text, gameName: post.gameName, createdAt: post.createdAt,
      isMine: true, likedByMe: false, likesCount: 0, commentsCount: 0, comments: [],
    },
  });
});

app.delete('/api/community/posts/:id', requireAuth, async (req, res) => {
  const result = await CommunityPost.deleteOne({ _id: req.params.id, user: req.user._id });
  if (!result.deletedCount) return res.status(404).json({ message: 'Publicação não encontrada ou não pertence a você.' });
  res.json({ ok: true });
});

// Curtir/descurtir de forma atômica: duas pessoas curtindo ao mesmo tempo não se sobrescrevem mais.
app.post('/api/community/posts/:id/like', requireAuth, async (req, res) => {
  const pulled = await CommunityPost.updateOne({ _id: req.params.id, likes: req.user._id }, { $pull: { likes: req.user._id } });
  let liked = false;
  if (!pulled.modifiedCount) {
    const added = await CommunityPost.updateOne({ _id: req.params.id }, { $addToSet: { likes: req.user._id } });
    if (!added.matchedCount) return res.status(404).json({ message: 'Publicação não encontrada.' });
    liked = true;
  }
  const [post] = await CommunityPost.aggregate([
    { $match: { _id: new mongoose.Types.ObjectId(req.params.id) } },
    { $project: { likesCount: { $size: { $ifNull: ['$likes', []] } } } },
  ]);
  res.json({ liked, likesCount: post ? post.likesCount : 0 });
});

app.post('/api/community/posts/:id/comments', requireAuth, async (req, res) => {
  const text = String(req.body.text || '').trim();
  if (!text || text.length > 500) return res.status(400).json({ message: 'O comentário deve ter entre 1 e 500 caracteres.' });
  // Atômico e com limite: só adiciona se o post ainda não chegou ao máximo de comentários.
  const post = await CommunityPost.findOneAndUpdate(
    { _id: req.params.id, [`comments.${MAX_COMMENTS_PER_POST - 1}`]: { $exists: false } },
    { $push: { comments: { user: req.user._id, username: req.user.nome, text, createdAt: new Date() } } },
    { returnDocument: 'after' },
  ).select('comments._id comments.text comments.createdAt').lean();
  if (!post) {
    return (await CommunityPost.exists({ _id: req.params.id }))
      ? res.status(409).json({ message: 'Esta publicação atingiu o limite de comentários.' })
      : res.status(404).json({ message: 'Publicação não encontrada.' });
  }
  const saved = post.comments[post.comments.length - 1];
  res.status(201).json({
    comment: { id: String(saved._id), username: req.user.nome, avatar: userAvatar(req, req.user), text: saved.text, createdAt: saved.createdAt, isMine: true },
    commentsCount: post.comments.length,
  });
});

app.get('/api/community/people', async (req, res) => {
  const match = req.user ? { _id: { $ne: req.user._id } } : {};
  const users = await User.aggregate([
    { $match: match }, { $sort: { createdAt: -1 } }, { $limit: 12 }, { $project: AUTHOR_PROJECTION },
  ]);
  const ids = users.map((user) => user._id);
  const [follows, counts] = await Promise.all([
    req.user ? Follow.find({ follower: req.user._id, following: { $in: ids } }).select('following').lean() : [],
    Follow.aggregate([{ $match: { following: { $in: ids } } }, { $group: { _id: '$following', total: { $sum: 1 } } }]),
  ]);
  const followed = new Set(follows.map((follow) => String(follow.following)));
  const totals = new Map(counts.map((row) => [String(row._id), row.total]));
  res.json({
    people: users.map((user) => ({
      id: String(user._id), username: user.nome,
      avatar: avatarUrl(req, { id: user._id, hasFoto: user.hasFoto, externalUrl: user.externalFoto, updatedAt: user.updatedAt }),
      steamLinked: Boolean(user.steamId), followersCount: totals.get(String(user._id)) || 0, isFollowing: followed.has(String(user._id)),
    })),
  });
});

app.post('/api/community/users/:id/follow', requireAuth, async (req, res) => {
  if (String(req.params.id) === String(req.user._id)) return res.status(400).json({ message: 'Você não pode seguir a si mesmo.' });
  const target = await User.findById(req.params.id).select('_id');
  if (!target) return res.status(404).json({ message: 'Usuário não encontrado.' });
  const removed = await Follow.deleteOne({ follower: req.user._id, following: target._id });
  if (removed.deletedCount) return res.json({ following: false });
  try { await Follow.create({ follower: req.user._id, following: target._id }); }
  catch (err) { if (err.code !== 11000) throw err; }
  res.json({ following: true });
});

app.get('/api/community/users/:id/follow-stats', async (req, res) => {
  const [followers, following, relation] = await Promise.all([
    Follow.countDocuments({ following: req.params.id }),
    Follow.countDocuments({ follower: req.params.id }),
    req.user ? Follow.exists({ follower: req.user._id, following: req.params.id }) : null,
  ]);
  res.json({ followers, following, isFollowing: Boolean(relation) });
});

/* ------------------------------------------------------------------ */
/* FreeToGame (proxy com cache)                                        */
/* ------------------------------------------------------------------ */
// A API da FreeToGame não envia CORS e não filtra por título. O servidor busca uma vez, guarda em cache e filtra aqui.
const FTG_BASE = 'https://www.freetogame.com/api';
const FTG_LIST_TTL = 30 * 60 * 1000;
const FTG_DETAIL_TTL = 60 * 60 * 1000;
const FTG_DETAIL_MAX = 500;
const ftgList = { at: 0, data: null, pending: null };
const ftgDetails = new Map();

async function fetchFreeToGame(path) {
  const response = await fetch(`${FTG_BASE}${path}`, { signal: AbortSignal.timeout(10000), headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`FreeToGame respondeu ${response.status}`);
  return response.json();
}
async function getFreeGames() {
  if (ftgList.data && Date.now() - ftgList.at < FTG_LIST_TTL) return ftgList.data;
  ftgList.pending ??= fetchFreeToGame('/games')
    .then((data) => {
      if (!Array.isArray(data)) throw new Error('Resposta inesperada da FreeToGame');
      ftgList.data = data; ftgList.at = Date.now();
      return data;
    })
    .catch((err) => {
      if (ftgList.data) { console.warn('FreeToGame indisponível, usando cache antigo:', err.message); return ftgList.data; }
      throw err;
    })
    .finally(() => { ftgList.pending = null; });
  return ftgList.pending;
}
async function getFreeGameDetail(id) {
  const cached = ftgDetails.get(id);
  if (cached && Date.now() - cached.at < FTG_DETAIL_TTL) return cached.data;
  const data = await fetchFreeToGame(`/game?id=${id}`);
  if (ftgDetails.size >= FTG_DETAIL_MAX) ftgDetails.delete(ftgDetails.keys().next().value);
  ftgDetails.set(id, { at: Date.now(), data });
  return data;
}
const freeGamesFailure = (res) => res.status(502).json({ message: 'Não foi possível consultar o catálogo de jogos gratuitos agora.' });

app.get('/api/free-games', async (req, res) => {
  try {
    const term = String(req.query.q || '').trim().toLowerCase().slice(0, 80);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 6, 1), 50);
    const games = await getFreeGames();
    const filtered = term ? games.filter((game) => String(game.title || '').toLowerCase().startsWith(term)) : games;
    res.set('Cache-Control', 'public, max-age=300');
    res.json({ games: filtered.slice(0, limit) });
  } catch (err) { console.error('FreeToGame:', err.message); freeGamesFailure(res); }
});

app.get('/api/free-games/by-title', async (req, res) => {
  try {
    const title = String(req.query.title || '').trim().toLowerCase();
    if (!title) return res.json({ game: null });
    const match = (await getFreeGames()).find((game) => String(game.title || '').trim().toLowerCase() === title);
    res.set('Cache-Control', 'public, max-age=300');
    res.json({ game: match ? await getFreeGameDetail(match.id) : null });
  } catch (err) { console.error('FreeToGame:', err.message); freeGamesFailure(res); }
});

app.get('/api/free-games/:freeGameId', async (req, res) => {
  try {
    res.set('Cache-Control', 'public, max-age=300');
    res.json({ game: await getFreeGameDetail(req.params.freeGameId) });
  } catch (err) { console.error('FreeToGame:', err.message); freeGamesFailure(res); }
});

/* ------------------------------------------------------------------ */
/* Steam                                                               */
/* ------------------------------------------------------------------ */
passport.serializeUser((user, done) => done(null, String(user._id)));
passport.deserializeUser(async (id, done) => { try { done(null, await User.findById(id)); } catch (err) { done(err); } });

if (process.env.STEAM_API_KEY && process.env.STEAM_RETURN_URL && process.env.STEAM_REALM) {
  passport.use(new SteamStrategy({ returnURL: process.env.STEAM_RETURN_URL, realm: process.env.STEAM_REALM, apiKey: process.env.STEAM_API_KEY }, async (identifier, profile, done) => {
    try {
      const steamId = identifier.split('/').pop();
      let user = await User.findOne({ steamId });
      if (!user) {
        user = await User.create({
          nome: String(profile.displayName || 'Jogador Steam').trim().slice(0, 40) || 'Jogador Steam',
          email: `steam-${steamId}@gamodan.local`,
          senhaHash: await bcrypt.hash(crypto.randomUUID(), 12),
          steamId,
          foto: profile.photos?.[2]?.value || '',
        });
      }
      done(null, user);
    } catch (err) { done(err); }
  }));
  app.get('/auth/steam', passport.authenticate('steam', { failureRedirect: `${FRONTEND_URL}/?login=erro` }));
  // Persiste a sessão antes de voltar ao Angular; isso evita retornar à tela deslogada.
  app.get('/auth/steam/return', (req, res, next) => {
    passport.authenticate('steam', (err, user, info) => {
      if (err) return next(err);
      if (!user) {
        console.error('Steam não autenticou o usuário:', info || 'sem detalhes');
        return res.redirect(`${FRONTEND_URL}/?login=erro`);
      }
      req.logIn(user, (loginError) => {
        if (loginError) return next(loginError);
        req.session.save((saveError) => (saveError ? next(saveError) : res.redirect(`${FRONTEND_URL}/?login=sucesso`)));
      });
    })(req, res, next);
  });
} else {
  // Sem as variáveis da Steam, o botão "Entrar com Steam" volta ao app com erro em vez de mostrar "Cannot GET".
  app.get(['/auth/steam', '/auth/steam/return'], (_req, res) => res.redirect(`${FRONTEND_URL}/?login=erro`));
}

// Biblioteca Steam do usuário autenticado. A chave da Steam nunca sai do servidor.
const STEAM_CACHE_TTL = 5 * 60 * 1000;
const steamCache = new Map();
app.get('/api/steam/games', requireAuth, async (req, res) => {
  const steamId = req.user.steamId;
  if (!steamId) return res.status(409).json({ message: 'Esta conta ainda não está vinculada à Steam.' });
  if (!process.env.STEAM_API_KEY) return res.status(503).json({ message: 'A integração com a Steam não está configurada no servidor.' });
  res.set('Cache-Control', 'private, no-store');
  const cached = steamCache.get(steamId);
  if (cached && Date.now() - cached.at < STEAM_CACHE_TTL) return res.json(cached.payload);
  try {
    const url = new URL('https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/');
    url.search = new URLSearchParams({ key: process.env.STEAM_API_KEY, steamid: steamId, include_appinfo: '1', include_played_free_games: '0' }).toString();
    const steamResponse = await fetch(url, { signal: AbortSignal.timeout(12000) });
    if (!steamResponse.ok) return res.status(502).json({ message: 'A Steam não conseguiu fornecer a biblioteca agora.' });
    const data = (await steamResponse.json())?.response;
    if (!data || !Array.isArray(data.games)) {
      return res.status(403).json({ message: 'A biblioteca está privada ou a Steam não disponibilizou os jogos. Altere a privacidade dos detalhes de jogos na Steam para Público e tente novamente.' });
    }
    const games = data.games.map((game) => ({
      appId: Number(game.appid),
      nome: String(game.name || `Jogo ${game.appid}`),
      horas: Math.round((Number(game.playtime_forever || 0) / 60) * 10) / 10,
      imagem: `https://cdn.cloudflare.steamstatic.com/steam/apps/${Number(game.appid)}/header.jpg`,
    })).sort((a, b) => b.horas - a.horas);
    const payload = { total: games.length, totalMinutos: data.games.reduce((sum, game) => sum + Number(game.playtime_forever || 0), 0), games };
    steamCache.set(steamId, { at: Date.now(), payload });
    res.json(payload);
  } catch (err) {
    if (err.name === 'TimeoutError' || err.name === 'AbortError') return res.status(504).json({ message: 'A Steam demorou para responder. Tente novamente.' });
    throw err;
  }
});

/* ------------------------------------------------------------------ */
/* Erros                                                               */
/* ------------------------------------------------------------------ */
app.use('/api', (_req, res) => res.status(404).json({ message: 'Rota não encontrada.' }));

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, next) => {
  if (res.headersSent) return next(err);
  if (err.type === 'entity.parse.failed') return res.status(400).json({ message: 'JSON inválido.' });
  if (err.type === 'entity.too.large') return res.status(413).json({ message: 'O envio é grande demais.' });
  if (err.name === 'ValidationError') return res.status(400).json({ message: Object.values(err.errors)[0]?.message || 'Dados inválidos.' });
  if (err.name === 'CastError') return res.status(400).json({ message: 'Dados inválidos.' });
  if (err.code === 11000) return res.status(409).json({ message: 'Este registro já existe.' });
  console.error(err);
  res.status(500).json({ message: 'Erro interno da API.' });
});

/* ------------------------------------------------------------------ */
/* Inicialização                                                       */
/* ------------------------------------------------------------------ */
async function start() {
  await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 8000 });
  const server = app.listen(PORT, () => console.log(`Gamodan API em http://localhost:${PORT} — MongoDB conectado`));
  const shutdown = (signal) => {
    console.log(`${signal} recebido. Encerrando...`);
    server.close(async () => { await mongoose.disconnect(); process.exit(0); });
    setTimeout(() => process.exit(1), 10000).unref();
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

process.on('unhandledRejection', (reason) => console.error('Promessa rejeitada sem tratamento:', reason));

if (require.main === module) {
  start().catch((err) => {
    console.error('Não foi possível conectar ao MongoDB:', err.message);
    process.exit(1);
  });
}

module.exports = { app };
