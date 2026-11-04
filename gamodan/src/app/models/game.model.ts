export type GameStatus = 'pendente' | 'jogando' | 'finalizado' | 'zerado';

export interface Game {
  id: number;
  nome: string;
  imagem: string;
  descricao?: string;
  desenvolvedor?: string;
  plataforma?: string;
  dataLancamento?: string;
  generos?: string[];
  nota?: number | null;
  estrelas: number;
  horasJogadas?: number;
  dataInicial: string;
  dataFinal?: string;
  favorito: boolean;
  wishlist: boolean;
  status: GameStatus;
}
