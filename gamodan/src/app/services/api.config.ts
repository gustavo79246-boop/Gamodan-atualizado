/** URL base da API. Em desenvolvimento, frontend e backend usam o mesmo hostname
 * (localhost ou 127.0.0.1), evitando que o cookie de sessão fique em outro host. */
const configuredApiUrl = (globalThis as typeof globalThis & { GAMODAN_API_URL?: string }).GAMODAN_API_URL;
export const API_BASE_URL = (configuredApiUrl || `${window.location.protocol}//${window.location.hostname}:3000`).replace(/\/$/, '');
export const API_URL = `${API_BASE_URL}/api`;
