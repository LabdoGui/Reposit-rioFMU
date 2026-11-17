import { z } from 'zod';
import { baseEnvSchema, loadEnv, serviceEnvSchema } from './env';

const VALID_BASE = {
  PORT: '3002',
  INTERNAL_API_TOKEN: 'dev-internal-token-change-me',
  JWKS_URL: 'http://localhost:3001/api/v1/.well-known/jwks.json',
};

const VALID_SERVICE = {
  ...VALID_BASE,
  DATABASE_URL: 'postgresql://scheduling_app:senha@localhost:5432/pulso?schema=scheduling',
  RABBITMQ_URL: 'amqp://pulso:pulso_dev@localhost:5672',
};

describe('loadEnv', () => {
  it('aceita um ambiente válido e converte tipos', () => {
    const env = loadEnv(serviceEnvSchema, VALID_SERVICE);

    expect(env.PORT).toBe(3002);
    expect(env.DATABASE_URL).toBe(VALID_SERVICE.DATABASE_URL);
    expect(env.RABBITMQ_URL).toBe(VALID_SERVICE.RABBITMQ_URL);
  });

  it('aplica os valores padrão quando as variáveis opcionais faltam', () => {
    const env = loadEnv(baseEnvSchema, VALID_BASE);

    expect(env).toMatchObject({
      NODE_ENV: 'development',
      LOG_LEVEL: 'info',
      LOG_PRETTY: false,
      SERVICE_VERSION: '0.1.0',
    });
  });

  it('respeita valores explícitos e converte LOG_PRETTY para booleano', () => {
    const env = loadEnv(baseEnvSchema, {
      ...VALID_BASE,
      NODE_ENV: 'production',
      LOG_LEVEL: 'debug',
      LOG_PRETTY: 'true',
      SERVICE_VERSION: '1.2.3',
    });

    expect(env).toMatchObject({
      NODE_ENV: 'production',
      LOG_LEVEL: 'debug',
      LOG_PRETTY: true,
      SERVICE_VERSION: '1.2.3',
    });
  });

  it('rejeita ambiente inválido com mensagem legível listando cada problema', () => {
    const invalid = { ...VALID_SERVICE, PORT: 'abc', INTERNAL_API_TOKEN: 'curto' };

    expect(() => loadEnv(serviceEnvSchema, invalid)).toThrow(/^Configuração inválida: /);
    expect(() => loadEnv(serviceEnvSchema, invalid)).toThrow(/PORT: /);
    expect(() => loadEnv(serviceEnvSchema, invalid)).toThrow(
      /INTERNAL_API_TOKEN: deve ter ao menos 16 caracteres/,
    );
  });

  it('rejeita variáveis obrigatórias ausentes', () => {
    const { JWKS_URL: _omit, ...withoutJwks } = VALID_BASE;

    expect(() => loadEnv(baseEnvSchema, withoutJwks)).toThrow(/JWKS_URL: /);
  });

  it('rejeita URLs de banco e broker com protocolo errado', () => {
    const invalid = {
      ...VALID_SERVICE,
      DATABASE_URL: 'mysql://usuario@localhost/pulso',
      RABBITMQ_URL: 'http://localhost:5672',
    };

    expect(() => loadEnv(serviceEnvSchema, invalid)).toThrow(/DATABASE_URL: .*RABBITMQ_URL: /);
  });

  it('rejeita valores fora dos enums', () => {
    expect(() => loadEnv(baseEnvSchema, { ...VALID_BASE, LOG_LEVEL: 'verbose' })).toThrow(
      /LOG_LEVEL: /,
    );
  });

  it('identifica erros na raiz do objeto', () => {
    expect(() => loadEnv(z.string(), {})).toThrow('Configuração inválida: (raiz): ');
  });

  it('lê process.env quando nenhuma fonte é informada', () => {
    const keys = Object.keys(VALID_BASE);
    const backup = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
    try {
      Object.assign(process.env, VALID_BASE, { PORT: '4321' });
      expect(loadEnv(baseEnvSchema).PORT).toBe(4321);
    } finally {
      for (const key of keys) {
        if (backup[key] === undefined) delete process.env[key];
        else process.env[key] = backup[key];
      }
    }
  });
});

describe('loadEnv em produção (segredos públicos e demonstração)', () => {
  const PROD_SERVICE = {
    ...VALID_SERVICE,
    NODE_ENV: 'production',
    INTERNAL_API_TOKEN: 'um-token-interno-forte-gerado-por-ambiente',
    DATABASE_URL: 'postgresql://scheduling_app:S3nh4-Forte@db:5432/pulso?schema=scheduling',
    RABBITMQ_URL: 'amqp://scheduling_svc:Br0ker-Forte@rabbitmq:5672',
  };

  it('aceita produção com segredos próprios e sem dados de demonstração', () => {
    const env = loadEnv(serviceEnvSchema, PROD_SERVICE);
    expect(env.DEMO_MODE).toBe(false);
    expect(env.SEED_DEMO_DATA).toBe(false);
  });

  it('recusa o token interno público do repositório', () => {
    expect(() =>
      loadEnv(serviceEnvSchema, {
        ...PROD_SERVICE,
        INTERNAL_API_TOKEN: 'pulso-dev-internal-token-troque-em-producao',
      }),
    ).toThrow(/^Configuração insegura para produção: INTERNAL_API_TOKEN/);
  });

  it.each([
    ['DATABASE_URL', 'postgresql://scheduling_app:scheduling_dev_password@db:5432/pulso'],
    ['RABBITMQ_URL', 'amqp://scheduling_svc:scheduling_broker_dev@rabbitmq:5672'],
    ['RABBITMQ_URL', 'amqp://pulso:pulso_dev@rabbitmq:5672'],
  ])('recusa a senha pública em %s', (key, url) => {
    expect(() => loadEnv(serviceEnvSchema, { ...PROD_SERVICE, [key]: url })).toThrow(
      new RegExp(`${key} usa a senha pública`),
    );
  });

  it('recusa os dados de demonstração (contas com senha conhecida)', () => {
    expect(() => loadEnv(serviceEnvSchema, { ...PROD_SERVICE, SEED_DEMO_DATA: 'true' })).toThrow(
      /SEED_DEMO_DATA=true/,
    );
  });

  it('recusa a chave de cifragem pública e o cookie sem Secure', () => {
    const schema = serviceEnvSchema.extend({
      FIELD_ENCRYPTION_KEY: z.string(),
      COOKIE_SECURE: z.enum(['true', 'false']).transform((value) => value === 'true'),
    });
    expect(() =>
      loadEnv(schema, {
        ...PROD_SERVICE,
        FIELD_ENCRYPTION_KEY: 'cHVsc28tZGV2LWlkZW50aXR5LWtleS0zMmJ5dGVzISE=',
        COOKIE_SECURE: 'false',
      }),
    ).toThrow(/FIELD_ENCRYPTION_KEY usa o valor público.*COOKIE_SECURE=false/);
  });

  it('com DEMO_MODE=true aceita os valores públicos (demonstração acadêmica)', () => {
    const env = loadEnv(serviceEnvSchema, {
      ...PROD_SERVICE,
      DEMO_MODE: 'true',
      SEED_DEMO_DATA: 'true',
      INTERNAL_API_TOKEN: 'pulso-dev-internal-token-troque-em-producao',
      RABBITMQ_URL: 'amqp://pulso:pulso_dev@rabbitmq:5672',
    });
    expect(env.DEMO_MODE).toBe(true);
  });

  it('fora de produção não bloqueia os valores de desenvolvimento', () => {
    expect(() =>
      loadEnv(serviceEnvSchema, {
        ...VALID_SERVICE,
        NODE_ENV: 'development',
        SEED_DEMO_DATA: 'true',
        INTERNAL_API_TOKEN: 'pulso-dev-internal-token-troque-em-producao',
      }),
    ).not.toThrow();
  });
});
