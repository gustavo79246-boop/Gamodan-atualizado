import { Injectable } from '@angular/core';
import { Game, GameStatus } from '../models/game.model';

export interface CommunityReview {
  game: Game;
  feedback: string;
}

export interface CommunityProfile {
  username: string;
  initials: string;
  favoriteGame: string;
  favoriteGenre: string;
  reviews: CommunityReview[];
  featuredLikes: number;
}

function createGame(
  id: number,
  nome: string,
  imagem: string,
  generos: string[],
  estrelas: number,
  horasJogadas: number,
  status: GameStatus,
): Game {
  return {
    id,
    nome,
    imagem,
    generos,
    estrelas,
    horasJogadas,
    dataInicial: '2026-01-10',
    favorito: false,
    wishlist: false,
    status,
  };
}

@Injectable({ providedIn: 'root' })
export class CommunityProfilesService {
  readonly profiles: CommunityProfile[] = [
    {
      username: 'pixel_nomade',
      initials: 'PN',
      favoriteGame: 'Minecraft',
      favoriteGenre: 'Sandbox',
      featuredLikes: 128,
      reviews: [
        {
          game: createGame(
            1,
            'Minecraft',
            'assets/games/minecraft.jpeg',
            ['Sandbox', 'Sobrevivência'],
            5,
            148,
            'jogando',
          ),
          feedback:
            'Comecei só para relaxar e de repente já estava construindo minha terceira casa.',
        },
        {
          game: createGame(
            2,
            'Stardew Valley',
            'assets/games/stardewvalley.jpg',
            ['Simulação', 'RPG'],
            4.5,
            72,
            'finalizado',
          ),
          feedback: 'A rotina da fazenda virou meu ritual favorito para desacelerar.',
        },
        {
          game: createGame(
            3,
            'Grand Theft Auto V',
            'assets/games/grandtheftautoV.jpg',
            ['Ação', 'Aventura'],
            4,
            46,
            'finalizado',
          ),
          feedback: 'Cada expedição rende uma história nova e uma vontade de explorar mais.',
        },
      ],
    },
    {
      username: 'savepoint',
      initials: 'SP',
      favoriteGame: 'Hollow Knight',
      favoriteGenre: 'Metroidvania',
      featuredLikes: 94,
      reviews: [
        {
          game: createGame(
            4,
            'Hollow Knight',
            'assets/games/hollowknight.jpg',
            ['Metroidvania', 'Ação'],
            5,
            61,
            'finalizado',
          ),
          feedback:
            'Cada descoberta parece conquistada. A trilha sonora ainda ficou comigo depois dos créditos.',
        },
        {
          game: createGame(
            5,
            'Undertale',
            'assets/games/undertale.jpg',
            ['RPG', 'Aventura'],
            5,
            19,
            'finalizado',
          ),
          feedback: 'Um RPG pequeno no tamanho e enorme nas escolhas e nos sentimentos.',
        },
        {
          game: createGame(
            6,
            'Red Dead Redemption 2',
            'assets/games/reddeadredemption.jpg',
            ['Ação', 'Aventura'],
            4.5,
            28,
            'jogando',
          ),
          feedback: 'Desafiador e acolhedor ao mesmo tempo; cada avanço dá orgulho.',
        },
      ],
    },
    {
      username: 'cafe_com_pixel',
      initials: 'CP',
      favoriteGame: 'Stardew Valley',
      favoriteGenre: 'Simulação',
      featuredLikes: 76,
      reviews: [
        {
          game: createGame(
            7,
            'Stardew Valley',
            'assets/games/stardewvalley.jpg',
            ['Simulação', 'RPG'],
            4.5,
            96,
            'jogando',
          ),
          feedback:
            'Entrei para cuidar da fazenda e saí com uma rotina nova e muito carinho pelos moradores.',
        },
        {
          game: createGame(
            8,
            'Minecraft',
            'assets/games/minecraft.jpeg',
            ['Sandbox', 'Sobrevivência'],
            4,
            54,
            'finalizado',
          ),
          feedback: 'Construir no meu próprio ritmo é sempre uma boa pausa.',
        },
        {
          game: createGame(
            9,
            'Undertale',
            'assets/games/undertale.jpg',
            ['RPG', 'Aventura'],
            5,
            17,
            'finalizado',
          ),
          feedback: 'Personagens inesquecíveis e uma história que recompensa a curiosidade.',
        },
      ],
    },
    {
      username: 'controle2',
      initials: 'C2',
      favoriteGame: 'Grand Theft Auto V',
      favoriteGenre: 'Ação e aventura',
      featuredLikes: 62,
      reviews: [
        {
          game: createGame(
            10,
            'Grand Theft Auto V',
            'assets/games/grandtheftautoV.jpg',
            ['Ação', 'Aventura'],
            4,
            112,
            'jogando',
          ),
          feedback:
            'A cidade é um playground caótico. Sempre aparece alguma história inesperada no caminho.',
        },
        {
          game: createGame(
            11,
            'Red Dead Redemption 2',
            'assets/games/reddeadredemption.jpg',
            ['Ação', 'Aventura'],
            5,
            88,
            'finalizado',
          ),
          feedback: 'Um mundo que parece vivo e que vale a pena percorrer sem pressa.',
        },
        {
          game: createGame(
            12,
            'Minecraft',
            'assets/games/minecraft.jpeg',
            ['Sandbox', 'Sobrevivência'],
            4,
            37,
            'finalizado',
          ),
          feedback: 'Uma experiência simples de começar e difícil de largar.',
        },
      ],
    },
    {
      username: 'rota_secreta',
      initials: 'RS',
      favoriteGame: 'Undertale',
      favoriteGenre: 'RPG',
      featuredLikes: 113,
      reviews: [
        {
          game: createGame(
            13,
            'Undertale',
            'assets/games/undertale.jpg',
            ['RPG', 'Aventura'],
            5,
            24,
            'finalizado',
          ),
          feedback:
            'Engraçado, estranho e muito mais emotivo do que eu esperava. Vale chegar até o fim.',
        },
        {
          game: createGame(
            14,
            'Hollow Knight',
            'assets/games/hollowknight.jpg',
            ['Metroidvania', 'Ação'],
            4.5,
            43,
            'finalizado',
          ),
          feedback: 'Um mapa cheio de segredos que me fez querer voltar a cada sessão.',
        },
        {
          game: createGame(
            15,
            'Stardew Valley',
            'assets/games/stardewvalley.jpg',
            ['Simulação', 'RPG'],
            4,
            39,
            'jogando',
          ),
          feedback: 'A melhor parte é descobrir aos poucos a vida de cada personagem.',
        },
      ],
    },
    {
      username: 'poeira_e_pixels',
      initials: 'PP',
      favoriteGame: 'Red Dead Redemption 2',
      favoriteGenre: 'Aventura',
      featuredLikes: 87,
      reviews: [
        {
          game: createGame(
            16,
            'Red Dead Redemption 2',
            'assets/games/reddeadredemption.jpg',
            ['Ação', 'Aventura'],
            5,
            104,
            'finalizado',
          ),
          feedback:
            'Um mundo enorme para explorar e personagens que continuam na cabeça depois de jogar.',
        },
        {
          game: createGame(
            17,
            'Grand Theft Auto V',
            'assets/games/grandtheftautoV.jpg',
            ['Ação', 'Aventura'],
            4,
            58,
            'finalizado',
          ),
          feedback: 'A liberdade de escolher o caminho rende momentos inesperados.',
        },
        {
          game: createGame(
            18,
            'Minecraft',
            'assets/games/minecraft.jpeg',
            ['Sandbox', 'Sobrevivência'],
            4.5,
            66,
            'jogando',
          ),
          feedback: 'Sempre encontro um projeto novo quando volto para esse mundo.',
        },
      ],
    },
  ];

  buscar(username: string | null): CommunityProfile | null {
    if (!username) return null;
    return this.profiles.find((profile) => profile.username === username) ?? null;
  }
}
