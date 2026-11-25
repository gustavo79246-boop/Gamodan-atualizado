import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';
import { API_URL } from './api.config';

const OFFLINE_MESSAGE = 'Não foi possível conectar à API. Verifique se o servidor está ligado.';

/**
 * Para toda chamada à nossa API: envia o cookie de sessão e transforma "API fora do ar" (status 0)
 * em uma mensagem legível, no mesmo formato { error: { message } } que a API usa nos outros erros.
 */
export const apiInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(API_URL)) return next(req);

  return next(req.clone({ withCredentials: true })).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && error.status === 0) {
        return throwError(
          () =>
            new HttpErrorResponse({
              error: { message: OFFLINE_MESSAGE },
              headers: error.headers,
              status: 0,
              statusText: error.statusText,
              url: error.url ?? undefined,
            }),
        );
      }
      return throwError(() => error);
    }),
  );
};
