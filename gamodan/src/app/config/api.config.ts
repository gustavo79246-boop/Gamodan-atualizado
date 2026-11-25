// Endereço único da API. Antes, o "http://localhost:3000" estava repetido em 6 arquivos.
//
// Em desenvolvimento usa o mesmo host da página (localhost ou 127.0.0.1) na porta 3000, para o cookie de sessão
// continuar valendo. Em produção usa caminho relativo ("/api"): configure o servidor web para encaminhar
// /api e /auth para a API (proxy reverso), assim front e API ficam na mesma origem.
const host = typeof location !== 'undefined' && location.hostname ? location.hostname : 'localhost';
const isLocalHost = host === 'localhost' || host === '127.0.0.1';

export const API_ORIGIN = isLocalHost ? `http://${host}:3000` : '';
export const API_URL = `${API_ORIGIN}/api`;
export const STEAM_LOGIN_URL = `${API_ORIGIN}/auth/steam`;
