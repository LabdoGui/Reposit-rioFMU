import { QueryClient } from '@tanstack/react-query';
import { ApiError } from './api-error';

/** Não repete erros do cliente (4xx): repetir não muda o resultado. */
function shouldRetry(failureCount: number, error: Error): boolean {
  if (error instanceof ApiError && error.status >= 400 && error.status < 500) return false;
  return failureCount < 2;
}

/**
 * Sem internet, o app pausa as consultas até a conexão voltar (a API está no servidor).
 * Na demonstração o "servidor" roda dentro da página, então ela funciona inteira offline
 * depois de instalada (PWA).
 */
const networkMode = import.meta.env.MODE === 'demo' ? 'always' : 'online';

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: shouldRetry,
        networkMode,
      },
      mutations: {
        retry: false,
        networkMode,
      },
    },
  });
}
