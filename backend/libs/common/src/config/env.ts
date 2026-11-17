import { z } from 'zod';

/**
 * Reexporta o Zod usado pelos schemas de ambiente, para que cada processo
 * estenda `baseEnvSchema`/`serviceEnvSchema` com a mesma instância e sem
 * declarar o Zod como dependência própria.
 */
export { z };

/** Variáveis de ambiente que todo processo do back-end precisa. */
export const baseEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive(),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  LOG_PRETTY: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
  SERVICE_VERSION: z.string().default('0.1.0'),
  /** Segredo compartilhado das rotas /internal (rede interna). */
  INTERNAL_API_TOKEN: z.string().min(16, 'deve ter ao menos 16 caracteres'),
  /** Onde buscar as chaves públicas do identity-service. */
  JWKS_URL: z.string().url(),
  /**
   * "true" marca o ambiente como demonstração acadêmica: aceita os segredos
   * públicos do repositório e os dados fictícios mesmo com NODE_ENV=production.
   * Fora da demonstração, o processo recusa subir com eles (veja loadEnv).
   */
  DEMO_MODE: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
});

/** Variáveis adicionais de um serviço de domínio (banco + broker). */
export const serviceEnvSchema = baseEnvSchema.extend({
  DATABASE_URL: z.string().startsWith('postgresql://'),
  RABBITMQ_URL: z.string().startsWith('amqp'),
  /** "true" grava os dados fictícios de demonstração na primeira subida (banco vazio). */
  SEED_DEMO_DATA: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
});

/** Chave AES-256 (32 bytes em base64) dos campos cifrados (FieldEncryption). */
export const fieldEncryptionKeySchema = z
  .string()
  .refine((value) => Buffer.from(value, 'base64').length === 32, {
    message: 'deve ter 32 bytes em base64 (gere com: openssl rand -base64 32)',
  });

export type BaseEnv = z.infer<typeof baseEnvSchema>;
export type ServiceEnv = z.infer<typeof serviceEnvSchema>;

/**
 * Valida as variáveis de ambiente e falha cedo, com uma mensagem legível,
 * se algo estiver faltando ou inválido.
 */
export function loadEnv<T extends z.ZodTypeAny>(
  schema: T,
  source: Record<string, string | undefined> = process.env,
): z.infer<T> {
  const parsed = schema.safeParse(source);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `${issue.path.join('.') || '(raiz)'}: ${issue.message}`)
      .join('; ');
    throw new Error(`Configuração inválida: ${issues}`);
  }
  const unsafe = productionSafetyIssues(parsed.data);
  if (unsafe.length > 0) {
    throw new Error(
      `Configuração insegura para produção: ${unsafe.join('; ')}. ` +
        'Defina segredos próprios no .env (veja .env.example) ou, só para a demonstração ' +
        'acadêmica, use DEMO_MODE=true (npm run docker:up).',
    );
  }
  return parsed.data;
}

/**
 * Segredos de desenvolvimento publicados no repositório (.env.example,
 * docker-compose.yml, scripts/dev-backend.mjs). Qualquer pessoa os conhece.
 */
const PUBLIC_DEV_SECRETS = new Set([
  'pulso-dev-internal-token-troque-em-producao',
  'cHVsc28tZGV2LWlkZW50aXR5LWtleS0zMmJ5dGVzISE=',
  'cHVsc28tZGV2LWNsaW5pY2FsLWtleS0zMmJ5dGVzISE=',
]);

/** Senhas padrão de banco e broker: pulso_dev, <serviço>_dev_password, <serviço>_broker_dev. */
const PUBLIC_DEV_PASSWORD = /^(pulso_dev|[a-z]+_dev_password|[a-z]+_broker_dev)$/;

function urlPassword(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  try {
    return decodeURIComponent(new URL(value).password) || undefined;
  } catch {
    return undefined;
  }
}

/**
 * Com NODE_ENV=production e fora da demonstração (DEMO_MODE), lista o que
 * deixaria a instalação aberta: segredos públicos do repositório, dados
 * fictícios (contas admin@demo.com com senha conhecida) e cookie de sessão
 * sem a flag Secure. Lista vazia = configuração aceitável.
 */
export function productionSafetyIssues(env: unknown): string[] {
  if (typeof env !== 'object' || env === null) return [];
  const values = env as Record<string, unknown>;
  if (values.NODE_ENV !== 'production' || values.DEMO_MODE === true) return [];

  const issues: string[] = [];
  for (const key of ['INTERNAL_API_TOKEN', 'FIELD_ENCRYPTION_KEY']) {
    const value = values[key];
    if (typeof value === 'string' && PUBLIC_DEV_SECRETS.has(value)) {
      issues.push(`${key} usa o valor público de desenvolvimento`);
    }
  }
  for (const key of ['DATABASE_URL', 'RABBITMQ_URL']) {
    const password = urlPassword(values[key]);
    if (password && PUBLIC_DEV_PASSWORD.test(password)) {
      issues.push(`${key} usa a senha pública de desenvolvimento`);
    }
  }
  if (values.SEED_DEMO_DATA === true) {
    issues.push('SEED_DEMO_DATA=true criaria as contas de demonstração (senha pública)');
  }
  if (values.COOKIE_SECURE === false) {
    issues.push('COOKIE_SECURE=false envia o cookie de sessão sem HTTPS');
  }
  return issues;
}
