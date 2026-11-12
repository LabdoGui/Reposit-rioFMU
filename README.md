# SangueConecta

<p align="center">
  <img src="docs/marca/sangueconecta-logo-horizontal.png" alt="Logotipo do SangueConecta: gota vermelha com duas pessoas formando um coração, ao lado do nome Sangue, em vermelho, e Conecta, em azul" width="420">
</p>

> **Conectando doadores a vidas que precisam de ajuda.**

[![CI](https://github.com/LabdoGui/Reposit-rioFMU/actions/workflows/ci.yml/badge.svg)](https://github.com/LabdoGui/Reposit-rioFMU/actions/workflows/ci.yml)
[![Abrir no GitHub Codespaces](https://github.com/codespaces/badge.svg)](https://codespaces.new/LabdoGui/Reposit-rioFMU?quickstart=1)

**Experimente no celular ou no computador, sem instalar nada:** <https://labdogui.github.io/Reposit-rioFMU/sangueconecta/> (demonstração no navegador com dados fictícios; contas na seção [Contas de demonstração](#contas-de-demonstração), senha `Pulso@2026`).

O **SangueConecta** é uma plataforma web responsiva (PWA) de apoio à doação de sangue. Ela acompanha a jornada de quem doa (descoberta, cadastro, pré-triagem informativa, agendamento, lembretes, atendimento, pós-doação e incentivo à recorrência) e oferece à equipe de coleta e à gestão ferramentas para organizar a agenda, registrar o atendimento e acompanhar o estoque de sangue.

Projeto **acadêmico**, desenvolvido com **dados fictícios**. Não substitui o sistema de um hemocentro nem decide quem pode doar.

## Integrantes do grupo

Trabalho de Conclusão de Semestre do curso de **Sistemas de Informação** do **Centro Universitário FMU** (São Paulo, 2026).

| Integrantes |
|---|
| Eduarda Rodrigues Mardegan |
| Guilherme dos Santos Gonçalves |
| Joao Pedro Pereira Brandao |
| Lucas Pereira Dorado da Silva |
| Murilo Santos Da Silva |
| Paulo Henrique Noronha Oliveira |

**Orientador:** Prof. Gerson Lourenco Gazola

## Sobre o projeto

Muita gente quer doar sangue, mas desiste no caminho: as informações sobre quem pode doar estão espalhadas, nem sempre é fácil achar a unidade e o horário, e quem doa uma vez raramente recebe um lembrete ou um agradecimento que o traga de volta. O **SangueConecta** reúne essa jornada em um só lugar: orienta a pessoa antes da doação, facilita o agendamento, acompanha o histórico e reconhece quem volta a doar. Para os hemocentros, organiza a agenda, o atendimento e o estoque.

O projeto foi desenvolvido como **Trabalho de Conclusão de Semestre** do curso de **Sistemas de Informação** do **Centro Universitário FMU** (São Paulo, 2026), alinhado ao **ODS 3 — Saúde e Bem-Estar** da ONU. A equipe está em [Integrantes do grupo](#integrantes-do-grupo).

### Documento do projeto

O documento consolidado do trabalho está em **[docs/Projeto_SangueConecta_Documento_Consolidado_Revisado.docx](docs/Projeto_SangueConecta_Documento_Consolidado_Revisado.docx)** (Word; no GitHub, use *Download raw file* para abrir). Ele reúne:

- resumo e *abstract*;
- descrição do problema, público afetado e recorte legal de benefícios ao doador;
- fontes públicas de referência e integrações futuras;
- proposta de solução: funcionalidades, tecnologias, microsserviços e cuidados de implementação;
- identidade visual (logotipo, cores, tipografia e diretrizes de uso);
- pitch, diferenciais, conclusão e referências.

## Identidade visual

### Logotipo

<p align="center">
  <img src="docs/marca/sangueconecta-simbolo.svg" alt="Símbolo do SangueConecta: gota vermelha com duas pessoas formando um coração" height="130">
  &nbsp;&nbsp;&nbsp;
  <img src="docs/marca/sangueconecta-logo-horizontal.png" alt="Logotipo completo do SangueConecta, com o slogan" height="130">
</p>

O símbolo é uma **gota de sangue com duas pessoas cujos braços se unem formando um coração**: quem doa e quem recebe, conectados pela doação. No nome, **"Sangue" fica em vermelho** (ação e solidariedade) e **"Conecta" em azul** (confiança e saúde).

- **Slogan:** *"Conectando doadores a vidas que precisam de ajuda."*
- **Versões:**
  - completa: símbolo, nome e slogan, para apresentações e documentos;
  - horizontal: símbolo e nome, usada no topo do app;
  - só o símbolo, em 3D: ícone da aba do navegador e do app na tela de início do celular (a mesma gota 3D da página inicial).
- **Arquivos:** [`docs/marca`](docs/marca) (arte original e versão vetorial do símbolo, `sangueconecta-simbolo.svg`).

### Paleta de cores

| | Cor | Código | Onde é usada |
|---|---|---|---|
| ![](docs/marca/cores/d30a04.png) | Vermelho da marca | `#D30A04` | Gota do símbolo e "Sangue" no logotipo |
| ![](docs/marca/cores/215f8f.png) | Azul da marca | `#215F8F` | "Conecta" no logotipo |
| ![](docs/marca/cores/e4e3e5.png) | Cinza claro | `#E4E3E5` | Figuras dentro da gota |
| ![](docs/marca/cores/a3123a.png) | Carmim Vital | `#A3123A` | Botões principais e destaques do app |
| ![](docs/marca/cores/0e4d64.png) | Petróleo Clínico | `#0E4D64` | Navegação, áreas da equipe e da administração |
| ![](docs/marca/cores/faf8f6.png) | Linho | `#FAF8F6` | Fundo das telas |
| ![](docs/marca/cores/1f2328.png) | Grafite | `#1F2328` | Texto principal |
| ![](docs/marca/cores/57606a.png) | Cinza Ardósia | `#57606A` | Textos de apoio e legendas |

**Cores de situação** (só para estado, sempre acompanhadas de ícone e texto):

| | Situação | Código | Exemplo |
|---|---|---|---|
| ![](docs/marca/cores/1e7f4f.png) | Adequado | `#1E7F4F` | Estoque acima do ideal, agendamento confirmado |
| ![](docs/marca/cores/b25e00.png) | Atenção | `#B25E00` | Estoque entre o mínimo e o ideal |
| ![](docs/marca/cores/d92d20.png) | Crítico | `#D92D20` | Estoque abaixo do mínimo, erros |

O vermelho de "crítico" é propositalmente diferente do vermelho da marca, para um alerta nunca ser confundido com a identidade. Todas as combinações de texto atendem ao contraste mínimo da WCAG (AA).

### Tipografia

| Uso | Fonte | Por quê |
|---|---|---|
| Títulos | **Plus Jakarta Sans** | Geométrica e humana: moderna sem parecer infantil |
| Textos e interface | **Inter** | Muito legível em tela, com números alinhados nos painéis |

As duas são gratuitas e ficam dentro do próprio app (não dependem de serviço externo).

### Diretrizes de uso

- Fundos claros e alto contraste; o vermelho é destaque, nunca a tela inteira.
- Situação nunca só pela cor: sempre ícone e texto juntos.
- Ícones de contorno, arredondados e com rótulo.
- Linguagem acolhedora: nada de imagens de agulhas, cenas hospitalares fortes ou comunicação baseada em medo e culpa.
- Não usar a cruz vermelha (emblema protegido pelas Convenções de Genebra).

### A identidade aplicada no app

![Página inicial do SangueConecta no computador e tela inicial do doador no celular, com a logo, as cores e as fontes da marca](docs/marca/identidade-no-app.jpg)

O guia completo, com escala tipográfica, componentes e identidade de cada tela, está em [docs/12 — Identidade visual](docs/12-identidade-visual.md).

---

## Sumário

- [Integrantes do grupo](#integrantes-do-grupo)
- [Sobre o projeto](#sobre-o-projeto)
- [Identidade visual](#identidade-visual)
- [Objetivo](#objetivo)
- [ODS 3 — Saúde e Bem-Estar](#ods-3--saúde-e-bem-estar)
- [Reconhecimento dos doadores (premiações)](#reconhecimento-dos-doadores-premiações)
- [Status do desenvolvimento](#status-do-desenvolvimento)
- [Arquitetura](#arquitetura)
- [Tecnologias](#tecnologias)
- [Requisitos](#requisitos)
- [Como executar](#como-executar)
- [Desenvolvimento local](#desenvolvimento-local)
- [Configuração](#configuração)
- [Banco de dados](#banco-de-dados)
- [Contas de demonstração](#contas-de-demonstração)
- [APIs](#apis)
- [Estrutura do projeto](#estrutura-do-projeto)
- [LGPD e dados fictícios](#lgpd-e-dados-fictícios)
- [Documentação do projeto](#documentação-do-projeto)

---

## Objetivo

Aumentar a **recorrência** e a **organização** da doação de sangue com uma experiência digital única para três públicos:

| Perfil | O que faz no sistema |
|---|---|
| **Doador** | Cadastro, pré-triagem informativa, agendamento, histórico, notificações, conquistas, horas complementares e comprovantes |
| **Equipe** (colaborador e enfermeiro) | Agenda do dia, check-in, triagem presencial e registro da doação |
| **Administração** | Usuários, unidades, horários, campanhas, estoque, gamificação, relatórios (com planilhas Excel) e auditoria |

O problema, as personas e os requisitos estão detalhados em [docs/01](docs/01-visao-geral-problema-ods.md), [docs/02](docs/02-personas-e-jornada.md) e [docs/03](docs/03-requisitos.md).

## ODS 3 — Saúde e Bem-Estar

O projeto se alinha ao **Objetivo de Desenvolvimento Sustentável 3** da ONU: assegurar uma vida saudável e promover o bem-estar para todos. A disponibilidade de sangue depende de doadores regulares; o SangueConecta ataca as barreiras de informação, agendamento e lembrete que fazem a pessoa não voltar a doar. A justificativa completa está em [docs/01](docs/01-visao-geral-problema-ods.md).

## Reconhecimento dos doadores (premiações)

O SangueConecta premia a **participação** com reconhecimento, nunca com dinheiro ou brindes: no Brasil a doação de sangue é voluntária e não remunerada, e a Constituição proíbe qualquer tipo de comercialização do sangue (art. 199, § 4º; ver também a Lei 10.205/2001). Por isso não há prêmio material, e o comparecimento vale o mesmo para quem pôde doar e para quem a triagem pediu para voltar outro dia.

**Pontos.** O doador ganha pontos a cada atendimento finalizado:

| Situação | Pontos |
|---|---|
| Primeiro comparecimento | 100 |
| Cada novo comparecimento | 150 |
| Bônus por comparecer durante uma campanha | +50 |

**Níveis.** Os pontos acumulados definem o nível do doador:

| Nível | A partir de |
|---|---|
| Primeiro Passo | 0 pontos |
| Doador | 100 pontos |
| Doador Frequente | 400 pontos |
| Herói da Comunidade | 700 pontos |

**Conquistas.** Medalhas desbloqueadas pelas doações concluídas, com a data em que foram conquistadas:

| Conquista | Como desbloquear |
|---|---|
| Primeira Doação | Concluir a primeira doação |
| Doador Recorrente | Voltar e concluir a segunda doação |
| 3 Doações | Concluir três doações |
| 5 Doações | Concluir cinco doações |
| Campanha Especial | Doar durante uma campanha, quando o estoque mais precisa |

**Ranking.** Opcional: só aparece quem escolhe participar, com um apelido no lugar do nome. O administrador pode desligar o ranking.

**Horas complementares.** O estudante vinculado a uma instituição de ensino parceira recebe um pedido de horas a cada doação concluída (a quantidade é definida pela instituição). O pedido nasce pendente e só vale depois de aprovado pela instituição (no protótipo, o administrador faz essa aprovação); o sistema nunca concede horas sozinho.

**Comprovantes e benefícios legais.** O doador gera em PDF a declaração de comparecimento e a declaração de doação, cada uma com um código que qualquer pessoa pode conferir na página pública de verificação, que mostra só as iniciais do titular. No protótipo, os comprovantes são acadêmicos; em uso real, a declaração oficial é emitida pelo hemocentro e é ela que garante, por exemplo, a ausência justificada ao trabalho por um dia a cada 12 meses (CLT, art. 473).

Os valores de pontos, as conquistas e as horas por doação são configuráveis pelo administrador. As regras de negócio estão em [docs/03](docs/03-requisitos.md) (RN12, RN13 e RN15) e a implementação em [docs/16](docs/16-plano-de-implementacao.md).

## Status do desenvolvimento

O desenvolvimento seguiu as 14 fases do [plano de implementação](docs/16-plano-de-implementacao.md#8-roadmap-de-implementação), cada uma com critério de pronto verificável.

| Fase | Entrega | Como verificar |
|---|---|---|
| 1 | Arquitetura: monorepo, bibliotecas comuns, 6 serviços e gateway, Docker Compose e CI | `npm run smoke` |
| 2 | Banco (Prisma, migrações dos 6 schemas), autenticação (JWT RS256, refresh rotativo, RBAC), outbox e eventos | testes do identity e da mensageria |
| 3 | Cadastro (18+), perfil, consentimentos, exportação e exclusão da conta | telas Perfil e Privacidade |
| 4 | Pré-triagem em 6 etapas com regras configuráveis no back-end (informativa) | tela Pré-triagem |
| 5 | Unidades, grade, disponibilidade, agendamento, cancelamento e reagendamento | teste de concorrência do scheduling |
| 6 | Área da equipe: agenda do dia, check-in, triagem configurável | área `/equipe` |
| 7 | Registro da doação e eventos | jornada E2E, passos 11 a 13 |
| 8 | Pontos, níveis, conquistas, ranking opt-in e horas complementares | tela Conquistas |
| 9 | Declarações em PDF e verificação pública | `/verificar/<código>` |
| 10 | Dashboard e relatórios com filtros (composição no gateway) | `/admin` e `/admin/relatorios` |
| 11 | Banco de Sangue: estoque, movimentações, tendência e histórico | `/admin/estoque` |
| 12 | Central de notificações alimentada por eventos | sino de notificações |
| 13 | Segurança e testes: jornada E2E, matriz de autorização, carga, usuários do broker por serviço | `npm run e2e`, `npm run authz`, `npm run test:load` |
| 14 | Polimento visual, responsividade e acessibilidade | `npm run e2e:ui` e revisão com Playwright (360 px) |

## Arquitetura

Microsserviços com **API Gateway**, **um schema PostgreSQL por serviço** e **eventos assíncronos** no RabbitMQ. O nginx serve a SPA e encaminha `/api/` ao gateway, então navegador e API compartilham a mesma origem.

```mermaid
flowchart LR
    U(["Navegador"]) --> NG["nginx :8080<br/>SPA React + proxy /api/"]
    NG -->|"/api/v1"| GW["gateway :3000<br/>proxy, JWT, rate limit,<br/>request-id, documentação"]
    GW --> ID["identity :3001"]
    GW --> SC["scheduling :3002"]
    GW --> CL["clinical :3003"]
    GW --> IN["inventory :3004"]
    GW --> EN["engagement :3005"]
    GW --> NO["notification :3006"]
    CL -->|"REST interno"| SC
    ID & SC & CL & IN & EN -->|"outbox → publish"| MQ[["RabbitMQ<br/>exchange pulso.events"]]
    MQ --> SC & CL & EN & NO
    ID & SC & CL & IN & EN & NO --> PG[("PostgreSQL 16<br/>1 schema + 1 usuário por serviço")]
```

| Componente | Porta | Responsabilidade |
|---|---|---|
| `frontend` (nginx) | 8080 | SPA React (doador, equipe e administração); proxy de `/api/` para o gateway; cabeçalhos de segurança |
| `gateway` | 3000 | Entrada única da API: roteamento por prefixo, validação de JWT, rate limit, `x-request-id`, CORS, estado dos serviços e documentação unificada |
| `identity` | 3001 | Contas, autenticação (JWT RS256 + JWKS), perfis de doador e profissional, consentimentos (LGPD) |
| `scheduling` | 3002 | Unidades, grade de horários, vagas, agendamentos e campanhas |
| `clinical` | 3003 | Pré-triagem, triagem presencial, doações e comprovantes (todos os dados de saúde em um só lugar) |
| `inventory` | 3004 | Estoque central de sangue e movimentações (sem dados pessoais) |
| `engagement` | 3005 | Pontos, níveis, conquistas, ranking e horas complementares (consumidor de eventos) |
| `notification` | 3006 | Central de notificações (consumidor de eventos) |
| `postgres` | 5432 | PostgreSQL 16: um schema e um usuário por serviço |
| `rabbitmq` | 5672 / 15672 | Broker de eventos (exchange *topic* `pulso.events`) e painel de gestão |

Por que 6 serviços e não 11, como os eventos fluem e as decisões tomadas: [docs/16](docs/16-plano-de-implementacao.md) e [docs/06](docs/06-arquitetura.md).

## Tecnologias

### Linguagens

| Linguagem | Onde é usada |
|---|---|
| **TypeScript** | Linguagem principal (mais de 90% do código): o front-end React e todos os serviços NestJS. Os tipos da API ficam em `backend/libs/contracts` e são usados pelos dois lados |
| **SQL** | Migrações do PostgreSQL (`prisma/migrations` de cada serviço), inclusive as regras que o Prisma não expressa (CHECK e índices únicos parciais) |
| **Prisma Schema** | Modelo de dados de cada serviço (`prisma/schema.prisma`) |
| **HTML e CSS** | Páginas da interface; o estilo é escrito com as classes do Tailwind CSS |
| **JavaScript** | Scripts de teste e automação (`scripts/*.mjs`) e o service worker do PWA (`frontend/public/sw.js`) |
| **Shell** | Inicialização dos contêineres, do banco e do Codespaces (`docker/`, `database/init/`, `.devcontainer/`) |
| **Dockerfile** | Imagens dos serviços e do front-end (`docker/`) |
| **YAML** | Docker Compose e GitHub Actions |

### Bibliotecas e ferramentas

| Camada | Tecnologias |
|---|---|
| Frontend | React 19, TypeScript, Vite 7, Tailwind CSS 4, React Router 7, TanStack Query 5, React Hook Form + Zod, Recharts, lucide-react, Luxon (datas), ExcelJS (planilhas Excel) |
| Back-end | Node.js 22, NestJS 11, TypeScript 5.9, class-validator, npm workspaces (monorepo) |
| API Gateway | NestJS com `http-proxy-middleware`, rate limit próprio e documentação unificada |
| Dados | PostgreSQL 16, Prisma 6 (um `schema.prisma` e migrações próprias por serviço) |
| Mensageria | RabbitMQ 3.13 (`amqplib` + `amqp-connection-manager`), com outbox transacional e consumidores idempotentes |
| Segurança | `jose` (JWT RS256 + JWKS), Argon2id (`@node-rs/argon2`), helmet, AES-256-GCM para campos sensíveis |
| Documentos | PDFKit + `qrcode` (declarações em PDF com QR code de verificação); jsPDF na demonstração no navegador |
| Tarefas agendadas | `@nestjs/schedule` (lembretes de agendamento, agendamentos vencidos e retenção das respostas da pré-triagem) |
| Observabilidade | Logs JSON com `nestjs-pino` e `x-request-id` de ponta a ponta |
| Documentação | `@nestjs/swagger` (OpenAPI) em cada serviço, unificada no gateway |
| PWA | Manifest e service worker próprio (`frontend/public/sw.js`), sem dependências |
| Testes | Jest + ts-jest (unitários), jornada E2E dos 22 passos, matriz de autorização e teste de carga (scripts Node sem dependências), Playwright (jornada pela interface) |
| Infraestrutura | Docker, Docker Compose, nginx 1.27, GitHub Actions, GitHub Codespaces e GitHub Pages (demonstração em arquivo único com `vite-plugin-singlefile`) |

## Requisitos

- **Docker** com **Docker Compose v2** (`docker compose version`) — para rodar tudo em contêineres.
- **Node.js 22** e npm 10 — só para desenvolvimento local (a versão está em `.nvmrc`).
- Livres no computador: porta **8080** e, só em `127.0.0.1`, as portas 3000–3006, 5432, 5672 e 15672.

## Como executar

### Sem instalar nada: GitHub Codespaces

1. Clique no botão **Abrir no GitHub Codespaces** no topo desta página (ou abra <https://codespaces.new/LabdoGui/Reposit-rioFMU?quickstart=1>) e confirme em **Create codespace**. Precisa de uma conta do GitHub; o plano gratuito inclui horas de Codespaces todo mês.
2. O editor abre no navegador e o terminal mostra o app subindo (`.devcontainer/start.sh`). Da primeira vez leva alguns minutos.
3. No fim, o terminal mostra **"SangueConecta no ar"** com o link `https://<nome-do-codespace>-8080.app.github.dev`. O link fica público quando a conta permite, e aí abre em qualquer celular ou computador; se não, a aba **PORTAS** permite torná-lo público (botão direito na porta 8080 → Visibilidade da porta → Pública).

O Codespace desliga sozinho depois de 30 minutos sem uso e o link para de abrir. Para religar, abra o Codespace de novo pela página do repositório (**Code → Codespaces**): o app volta em menos de um minuto, com os mesmos dados. Para não gastar as horas gratuitas, apague o Codespace quando não precisar mais dele.

### Demonstração no navegador (sem servidor)

Para mostrar o app num celular sem subir nada, existe uma demonstração em um **único arquivo HTML**: o mesmo front-end, com um servidor simulado dentro da própria página ([`frontend/src/demo`](frontend/src/demo)) que responde às rotas `/api/v1` com os mesmos dados fictícios do seed e as mesmas regras do back-end (pré-triagem, agenda, triagem, doação, pontos, conquistas, estoque, notificações, auditoria).

```bash
npm ci
npm run build:demo -w @pulso/frontend   # gera frontend/dist-demo/demo.html (~2,6 MB)
npm run dev:demo -w @pulso/frontend     # ou: versão de desenvolvimento em /demo.html
```

A versão publicada fica em <https://labdogui.github.io/Reposit-rioFMU/sangueconecta/> (GitHub Pages, branch `gh-pages`, pasta `sangueconecta/`; o endereço antigo `/pulso/` redireciona para ele). A publicação é automática: a cada mudança no front-end que entra no `main`, o workflow [`demo-pages.yml`](.github/workflows/demo-pages.yml) constrói a demonstração e troca a pasta `sangueconecta/` do `gh-pages` (o `demo.html` como `index.html`, junto com `sw.js`, `manifest.webmanifest`, `favicon.svg`, `favicon.png` e `icons/`, que fazem a demonstração ser instalável: [Instalar como app](#instalar-como-app-pwa)). Em pull requests, o mesmo workflow guarda a demonstração construída como artefato (`demonstracao`), para quem revisa abrir antes do merge. O arquivo abre com dois cliques no navegador ou publicado em qualquer hospedagem estática; as rotas ficam depois do `#` (ex.: `demo.html#/admin`). As contas de demonstração são as mesmas. O que a pessoa faz fica só naquele aparelho (localStorage), recomeça a cada dia e pode ser apagado pelo botão **Recomeçar** do aviso. A jornada de 22 passos roda também na demonstração (`BASE_URL=http://localhost:4173/demo.html npm run e2e:ui`, com `npx vite preview --mode demo` em `frontend/`), e o CI a executa a cada push. O build normal do app (`npm run build`) não inclui nada da demonstração.

### Instalar como app (PWA)

O SangueConecta pode ser instalado no celular e no computador, com ícone próprio e abrindo em tela cheia: na demonstração publicada, no Codespaces ou no app rodando no Docker (o navegador exige HTTPS ou `localhost`).

- **Android (Chrome):** menu ⋮ → **Instalar app** (ou o aviso que aparece na parte de baixo da tela).
- **iPhone (Safari):** botão Compartilhar → **Adicionar à Tela de Início**.
- **Computador (Chrome ou Edge):** ícone de instalar na barra de endereço.

O [`manifest.webmanifest`](frontend/public/manifest.webmanifest) descreve o app (nome, cores e ícones) e o [service worker](frontend/public/sw.js) guarda no aparelho só o casco do app: HTML, JS, CSS, fontes e ícones. As páginas vêm da rede primeiro, então quem instalou recebe cada versão nova sem fazer nada; sem internet, ou com a rede demorando mais de 3,5 s, abre a última versão guardada. **Respostas da API nunca são guardadas no aparelho** (dados pessoais e de saúde, LGPD): sem internet o app abre, mas as telas ficam sem os dados até a conexão voltar. A demonstração, que tem o servidor simulado dentro da própria página, funciona inteira sem internet depois da primeira visita. O service worker só é registrado no build de produção (no `npm run dev`, não).

### No seu computador

```bash
git clone https://github.com/LabdoGui/Reposit-rioFMU.git sangueconecta
cd sangueconecta
docker compose up --build
```

Não é preciso criar o `.env`: todas as variáveis têm valores padrão de desenvolvimento. O primeiro build baixa as dependências e leva alguns minutos; os seguintes usam o cache.

| O quê | Endereço |
|---|---|
| Aplicação | <http://localhost:8080> |
| Página de status dos serviços | <http://localhost:8080/status> |
| Documentação da API (Swagger unificado) | <http://localhost:8080/api/docs> |
| Estado dos serviços (JSON) | <http://localhost:8080/api/v1/health/services> |
| Painel do RabbitMQ (usuário `pulso`, senha `pulso_dev`) | <http://localhost:15672> |
| Swagger de cada serviço (depuração) | `http://localhost:3001/docs` … `http://localhost:3006/docs` |

Para conferir se tudo subiu (frontend, gateway, 6 serviços, banco, broker e documentação):

```bash
npm run smoke          # ou: node scripts/smoke.mjs
```

O smoke test só usa o Node 22 (sem dependências) e espera até 120 s o ambiente ficar pronto (`--timeout=180` para mudar; `BASE_URL` para outro endereço).

Na primeira subida, cada serviço aplica as próprias migrações e grava os **dados fictícios de demonstração** (unidades, horários, agendamentos de hoje e dos próximos dias, um ano de doações, estoque com 90 dias de movimentações, conquistas e notificações).

### Testes de ponta a ponta

Com o ambiente no ar:

```bash
npm run e2e          # os 22 passos do critério de aceite, pela API real
npm run e2e:ui       # os mesmos 22 passos clicando nas telas (Playwright), sem erros no console
npm run authz        # matriz de autorização: 5 perfis × rotas de todos os serviços, IDOR e token adulterado
npm run test:load    # carga leve: latência p50/p95/p99 e erros (veja o aviso sobre o rate limit no script)
node backend/services/scheduling/test/concurrency.e2e.mjs   # reservas simultâneas: nunca passa da capacidade
```

Para a jornada pelo navegador, instale o Chromium do Playwright uma vez: `npx playwright install chromium` (com `E2E_SCREENSHOTS=./capturas` ela guarda uma captura por passo).

A jornada E2E cadastra um doador, responde a pré-triagem, agenda, entra como enfermeiro, faz check-in, triagem e doação, confere pontos, conquista, notificação e PDF (com verificação pública) e termina no dashboard, no estoque (entrada e saída), nos gráficos e no histórico.

Comandos úteis:

```bash
docker compose ps                 # estado e saúde dos contêineres
docker compose logs -f gateway    # logs de um serviço
docker compose down               # para tudo (os dados ficam nos volumes)
docker compose down -v            # para tudo e APAGA banco e broker
```

**Limite de downloads do Docker Hub?** Copie o `.env.example` para `.env` e troque as imagens base por um espelho, por exemplo `NODE_IMAGE=mirror.gcr.io/library/node:22-alpine` (o mesmo vale para `NGINX_IMAGE`, `POSTGRES_IMAGE` e `RABBITMQ_IMAGE`).

## Desenvolvimento local

Para programar com recarga rápida, rode banco e broker no Docker e os processos Node no seu computador:

```bash
npm ci                             # dependências de todos os workspaces
npm run infra:up                   # só PostgreSQL e RabbitMQ (docker compose)
npm run build                      # bibliotecas, serviços (prisma generate) e gateway
npm run dev:backend                # sobe os 6 serviços + gateway a partir de dist/
npm run dev -w @pulso/frontend     # frontend em http://localhost:5173 (proxy de /api para o gateway)
```

O `scripts/dev-backend.mjs` inicia cada processo com as variáveis corretas (as mesmas do `docker-compose.yml`, apontando para `localhost`), mostra os logs com um prefixo colorido por serviço e encerra todos com **Ctrl+C**. Para subir só alguns: `npm run dev:backend -- --only=identity,gateway`. Depois de alterar um serviço, recompile-o (`npm run build -w @pulso/identity-service`) e reinicie o script.

Outros comandos:

| Comando | O que faz |
|---|---|
| `npm test` | Testes unitários (Jest) de todos os workspaces |
| `npm run typecheck` | Checagem de tipos sem gerar arquivos |
| `npm run format` / `npm run format:check` | Formata / confere a formatação (Prettier) |
| `npm run infra:down` | Para os contêineres do Compose |
| `npm run docker:up` / `docker:down` | Sobe (com build) / derruba o ambiente completo em contêineres |
| `npm run docker:reset` | Derruba tudo e **apaga** os volumes (banco e broker) |
| `npm run dlq:replay -- <serviço> [--dry-run]` | Devolve à fila principal os eventos que esgotaram as tentativas (ex.: `notification-service`) |

## Configuração

As variáveis estão documentadas no [`.env.example`](.env.example), com os mesmos valores padrão do `docker-compose.yml`. Para mudar algo, copie para `.env` e edite. As marcadas com **[SEGREDO]** precisam ser trocadas fora do ambiente acadêmico.

| Variável | Para quê |
|---|---|
| `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` | Superusuário e banco do PostgreSQL |
| `<SERVIÇO>_DB_PASSWORD` | Senha do usuário de cada schema (aplicada na criação do volume ou ao reaplicar o script; veja [Banco de dados](#banco-de-dados)) |
| `RABBITMQ_USER`, `RABBITMQ_PASSWORD` | Administrador do broker (painel de gestão e `npm run dlq:replay`) |
| `RABBITMQ_<SERVIÇO>_PASSWORD` | Senha do usuário `<serviço>_svc` no broker: só o exchange `pulso.events` e as próprias filas, publicando só as próprias routing keys ([`docker/rabbitmq/init-users.sh`](docker/rabbitmq/init-users.sh)) |
| `IDENTITY_FIELD_ENCRYPTION_KEY`, `CLINICAL_FIELD_ENCRYPTION_KEY` | Chaves AES-256 dos campos cifrados (telefone; respostas e valores de saúde) |
| `COOKIE_SECURE` | Flag `Secure` do cookie de sessão (`true` em produção com HTTPS) |
| `RUN_MIGRATIONS`, `SEED_DEMO_DATA` | Migrações no boot e dados fictícios de demonstração |
| `BOOTSTRAP_ADMIN_EMAIL`, `BOOTSTRAP_ADMIN_PASSWORD` | Sem dados de demonstração: primeiro administrador, criado no boot se ainda não houver nenhum |
| `PUBLIC_APP_URL` | Endereço do app no link e no QR code de verificação das declarações em PDF (no Codespaces, preenchido pelo `start.sh`) |
| `DEMO_EARLY_CHECK_IN` | Só para demonstração: check-in de agendamentos de dias futuros (jornada completa numa sessão) |
| `INTERNAL_API_TOKEN` | Token das rotas `/internal/*` entre serviços |
| `LOG_LEVEL` | Nível dos logs JSON |
| `CORS_ORIGINS`, `RATE_LIMIT_*` | Políticas de borda do gateway |
| `FRONTEND_PORT`, `GATEWAY_PORT`, `POSTGRES_PORT`, `RABBITMQ_PORT`, `RABBITMQ_UI_PORT` | Portas publicadas no computador |
| `NODE_IMAGE`, `NGINX_IMAGE`, `POSTGRES_IMAGE`, `RABBITMQ_IMAGE` | Imagens base (para usar um espelho) |

Cada processo valida as próprias variáveis na inicialização (Zod) e não sobe se faltar alguma, com uma mensagem clara no log.

## Banco de dados

Uma instância PostgreSQL 16 com **um schema e um usuário por serviço**. Cada serviço só enxerga o próprio schema; entre serviços, apenas UUIDs (nunca chaves estrangeiras).

| Schema | Usuário | Serviço |
|---|---|---|
| `identity` | `identity_app` | identity |
| `scheduling` | `scheduling_app` | scheduling |
| `clinical` | `clinical_app` | clinical |
| `inventory` | `inventory_app` | inventory |
| `engagement` | `engagement_app` | engagement |
| `notification` | `notification_app` | notification |

Os schemas e usuários são criados por [`database/init/01-init.sh`](database/init/01-init.sh) na **primeira** inicialização do volume `pgdata`. O script é idempotente: num volume que já existe, ele recria o que faltar e reaplica as senhas, sem apagar dados (por exemplo, depois de mudar uma senha no `.env` ou ao atualizar o repositório):

```bash
docker compose up -d postgres                                        # aplica o .env ao contêiner
docker compose exec postgres sh /docker-entrypoint-initdb.d/01-init.sh
docker compose up -d                                                 # serviços com as novas senhas
```

Para começar do zero, `docker compose down -v` apaga os volumes (e os dados).

**Banco de sombra do Prisma.** O `prisma migrate dev` testa as migrações num banco descartável (*shadow database*). Para que os usuários dos serviços não precisem de `CREATEDB`, o script também cria o banco `pulso_shadow`, com um schema por serviço, de propriedade do usuário do serviço. Lá cada usuário só pode conectar e criar schemas (o Prisma apaga e recria o próprio schema a cada execução); continua sem acesso aos schemas dos outros serviços. A URL segue o padrão `postgresql://<serviço>_app:<senha>@localhost:5432/pulso_shadow?schema=<serviço>`. O `scripts/dev-backend.mjs` já define `SHADOW_DATABASE_URL` para cada serviço, usada pelo `shadowDatabaseUrl` dos `schema.prisma`. Para rodar o Prisma à mão:

```bash
DATABASE_URL='postgresql://identity_app:identity_dev_password@localhost:5432/pulso?schema=identity' \
SHADOW_DATABASE_URL='postgresql://identity_app:identity_dev_password@localhost:5432/pulso_shadow?schema=identity' \
npm run db:migrate:dev -w @pulso/identity-service -- --name nome-da-migracao
```

No banco `pulso` os usuários dos serviços não podem criar schemas. Por isso **não use `prisma migrate reset`** (nem aceite o reset que o `migrate dev` oferece quando encontra divergência): o Prisma apagaria o schema e não conseguiria recriá-lo. Para zerar um serviço, apague o schema como superusuário e reaplique o script (que também recupera um schema apagado por engano):

```bash
docker compose exec postgres psql -U pulso -d pulso -c 'DROP SCHEMA identity CASCADE'
docker compose exec postgres sh /docker-entrypoint-initdb.d/01-init.sh
```

**Migrações.** Cada serviço tem as suas em `backend/services/<serviço>/prisma/migrations` e as aplica no boot (`RUN_MIGRATIONS=true`, com `prisma migrate deploy`). Restrições que o Prisma não expressa (CHECKs e o índice único parcial "um agendamento ativo por doador") estão em SQL na migração inicial; ao gerar uma migração nova no scheduling, apague qualquer `DROP INDEX "appointments_one_active_per_donor"` que o Prisma proponha.

**Dados de referência.** Mesmo sem demonstração, o boot cria o que o sistema precisa para funcionar: uma linha de estoque por tipo sanguíneo (zerada, crítica até a primeira entrada), o questionário base da pré-triagem, os campos da triagem, as configurações e o catálogo de conquistas.

**Dados de demonstração.** Com `SEED_DEMO_DATA=true`, cada serviço grava a sua parte de um conjunto **fictício e determinístico** (`backend/libs/common/src/seed/dataset.ts`, mesmos IDs em todos os schemas) quando as suas tabelas estão vazias. As datas são relativas ao dia da subida, então o painel sempre tem histórico recente e a agenda de hoje tem atendimentos. Para gerar tudo de novo: `docker compose down -v && docker compose up -d`.

O modelo de dados está em [docs/16, item 5](docs/16-plano-de-implementacao.md#5-modelo-do-banco-por-schema) e em cada `prisma/schema.prisma`.

## Contas de demonstração

Todas as contas são **fictícias** e usam a mesma senha: **`Pulso@2026`**. A tela de login tem um atalho que preenche cada uma.

| Perfil | E-mail | O que dá para fazer |
|---|---|---|
| Doador | `doador@demo.com` | Pré-triagem, agendar, histórico (já tem uma doação), conquistas, horas complementares, documentos e notificações |
| Enfermeiro | `enfermeiro@demo.com` | Agenda do dia das unidades Centro e Campus, check-in, triagem e registro da doação |
| Colaborador | `colaborador@demo.com` | Agenda do dia da unidade Centro e check-in (sem dados clínicos) |
| Administrador | `admin@demo.com` | Dashboard, relatórios e Banco de Sangue (com download em planilha Excel), unidades e grade, campanhas, usuários, gamificação, configurações e auditoria |

Também há 70 doadores fictícios (`…@exemplo.test`, mesma senha) com histórico, para o painel e o ranking terem dados.

**Jornada completa pelo navegador** (os 22 passos): crie uma conta em *Quero doar*, responda a pré-triagem e agende; saia e entre como `enfermeiro@demo.com`, escolha a data do agendamento na agenda, faça o check-in e abra o atendimento para a triagem e a doação; volte como doador para ver a doação, os pontos, a conquista e gerar a declaração; por fim, entre como `admin@demo.com` para o dashboard e o Banco de Sangue. No ambiente de demonstração o check-in de dias futuros fica liberado (`DEMO_EARLY_CHECK_IN=true`); em uso real ele vale só no dia do agendamento.

## APIs

O SangueConecta é construído sobre uma **API REST** própria: o front-end (e qualquer outro sistema autorizado) conversa com um **API Gateway**, que encaminha cada pedido para um dos seis microsserviços. Todas as rotas públicas ficam em **`/api/v1`**.

| Serviço | Para que serve | Exemplos de rotas |
|---|---|---|
| **identity** | Cadastro, login, perfil, consentimentos (LGPD) e usuários | `POST /auth/register` · `POST /auth/login` · `GET /users/me` · `PUT /consents/me` |
| **scheduling** | Unidades, horários, campanhas, agendamentos e agenda da equipe | `GET /units` · `GET /appointments/availability` · `POST /appointments` · `GET /agenda` |
| **clinical** | Pré-triagem informativa, triagem da equipe, doações e declarações em PDF | `POST /screenings/pre-check` · `POST /donations` · `POST /documents/donation` · `GET /documents/verify/:code` |
| **inventory** | Estoque de sangue por tipo e movimentações | `GET /blood-inventory/public` · `POST /blood-inventory/movements` |
| **engagement** | Pontos, níveis, conquistas, ranking e horas complementares | `GET /gamification/profile` · `GET /achievements` · `GET /gamification/ranking` |
| **notification** | Central de notificações e lembretes | `GET /notifications` · `PATCH /notifications/read-all` |

**Como funciona por dentro:**

- **Autenticação:** token de acesso JWT (RS256) de curta duração e *refresh token* rotativo em cookie seguro. Cada rota verifica o perfil de quem chama (doador, colaborador, enfermeiro ou administrador).
- **Comunicação entre serviços:** além das chamadas REST, os serviços trocam **eventos** pelo RabbitMQ (por exemplo, "doação registrada" gera pontos, conquistas e notificação), com *outbox* para nenhum evento se perder.
- **Demonstração no navegador:** a versão publicada no GitHub Pages simula essas mesmas rotas dentro do próprio navegador, com dados fictícios.

**APIs externas:** o protótipo **não usa APIs de terceiros**; todos os dados são fictícios e gerados pelo próprio projeto. Integrações futuras previstas no documento do projeto: API de Localidades do IBGE (estados e municípios), Portal Brasileiro de Dados Abertos e sistemas de hemocentros parceiros (horários e estoque reais), sempre com autorização institucional.

### Documentação da API

- **Swagger unificado:** <http://localhost:8080/api/docs> (OpenAPI em <http://localhost:8080/api/docs-json>). O gateway reúne a documentação de todos os serviços.
- **Swagger de cada serviço:** `http://localhost:<porta>/docs` (portas 3001 a 3006, só em `127.0.0.1`).
- **Prefixo:** todas as rotas públicas ficam em `/api/v1`; rotas `/internal/*` nunca passam pelo gateway.
- **Erros:** padrão RFC 9457 (`application/problem+json`) com mensagem em português e `requestId` para suporte.
- **Rastreamento:** o cabeçalho `x-request-id` é aceito ou gerado na borda e acompanha a requisição em todos os logs.

O desenho completo da API está em [docs/09](docs/09-api.md) e [docs/16, item 4](docs/16-plano-de-implementacao.md#4-microsserviços-responsabilidades-e-endpoints).

## Estrutura do projeto

```
/
├─ frontend/                 React + Vite (doador, equipe e administração); PWA em public/
├─ backend/
│  ├─ gateway/               NestJS: proxy, segurança de borda, estado dos serviços, documentação
│  ├─ services/
│  │  ├─ identity/           NestJS + Prisma (schema identity)
│  │  ├─ scheduling/
│  │  ├─ clinical/
│  │  ├─ inventory/
│  │  ├─ engagement/
│  │  └─ notification/
│  └─ libs/
│     ├─ contracts/          @pulso/contracts: tipos, enums, papéis e eventos (front e back)
│     └─ common/             @pulso/common: bootstrap, configuração, logs, auth, erros, saúde, mensageria
├─ database/init/            criação de schemas e usuários por serviço
├─ docker/                   service.Dockerfile (imagem única dos processos Nest), frontend.Dockerfile, nginx.conf, rabbitmq/
├─ scripts/                  smoke, jornadas E2E (API e navegador), matriz de autorização, carga, DLQ e back-end local
├─ docs/                     documentação acadêmica e técnica
├─ .github/workflows/ci.yml  build, testes, imagens Docker, smoke, jornadas E2E e autorização
├─ docker-compose.yml
└─ package.json              npm workspaces
```

## LGPD e dados fictícios

- **Nenhum dado real** é usado: doadores, triagens, doações, estoques e instituições são **fictícios**. Não cadastre dados pessoais verdadeiros no ambiente de demonstração.
- A **pré-triagem é informativa**: orienta, mas nunca libera nem bloqueia a doação. A decisão é sempre da equipe de saúde do hemocentro.
- A **triagem presencial** e o **estoque** são **simulação acadêmica**. As perguntas e regras da pré-triagem e o intervalo entre doações ficam em tabelas configuráveis, marcados como **pendentes de validação por profissional de saúde**; a triagem profissional não tem limiares automáticos (o resultado é sempre decisão do enfermeiro).
- O comprovante gerado é **acadêmico e verificável**; não é o atestado oficial de doação.
- Os dados de saúde ficam concentrados no serviço `clinical`, com respostas e valores **cifrados** (AES-256-GCM), nunca em eventos, logs ou auditoria. O doador não vê o resultado nem os valores da triagem profissional; as notificações nunca citam dados clínicos.
- Consentimento por finalidade (termos obrigatórios; comunicações opcional), compartilhamento da pré-triagem decidido a cada envio e revogável, cópia dos dados em JSON e exclusão da conta. Acessos e ações administrativas ficam na trilha de auditoria. Detalhes em [docs/10](docs/10-seguranca-lgpd.md).
- A equipe só vê a pré-triagem compartilhada **mais recente e dentro da validade**, e só enquanto o atendimento está em aberto (no dia ou depois do check-in); cada acesso é auditado.
- A **exclusão da conta** anonimiza a identidade e chega a todos os serviços pelo evento `identity.user.deleted`: agendamentos em aberto são cancelados (a vaga volta para a agenda), respostas e orientações da pré-triagem, PDFs emitidos e notificações são apagados e o apelido sai do ranking. Triagens e doações ficam pseudonimizadas (só o identificador), por obrigação de guarda da instituição de saúde.
- Depois da exclusão, cada serviço guarda só o identificador da conta excluída: tokens ainda válidos não conseguem mais gravar nada (401) e eventos atrasados daquele doador são ignorados.
- As respostas da pré-triagem são apagadas todo dia depois da validade (fica só o resultado, para as estatísticas); cada pré-triagem guarda a versão das regras com que foi calculada.
- Lembretes de agendamento só saem para quem mantém o consentimento de comunicações. Colaboradores da recepção não veem o tipo sanguíneo do doador; a equipe só vê o resultado de um atendimento enquanto ele está em aberto.
- Senhas: tentativas erradas contam por conta de forma atômica (logins simultâneos não furam o bloqueio) e ficam na auditoria, inclusive na troca de senha e na exclusão da conta.
- Os segredos do `.env.example` e do `docker-compose.yml` são públicos e servem só para desenvolvimento.

## Documentação do projeto

| # | Documento |
|---|---|
| 01 | [Visão geral, problema e ODS 3](docs/01-visao-geral-problema-ods.md) |
| 02 | [Público-alvo, personas e jornada do doador](docs/02-personas-e-jornada.md) |
| 03 | [Requisitos e regras de negócio](docs/03-requisitos.md) |
| 04 | [Casos de uso](docs/04-casos-de-uso.md) |
| 05 | [Fluxos](docs/05-fluxos.md) |
| 06 | [Arquitetura: microsserviços + API REST](docs/06-arquitetura.md) |
| 07 | [Banco de dados](docs/07-banco-de-dados.md) |
| 08 | [Stack tecnológica](docs/08-stack.md) |
| 09 | [API REST v1](docs/09-api.md) |
| 10 | [Segurança e LGPD](docs/10-seguranca-lgpd.md) |
| 11 | [Pesquisa, benchmarking e dados públicos](docs/11-pesquisa-benchmarking.md) |
| 12 | [Identidade visual](docs/12-identidade-visual.md) |
| 13 | [MVP e roadmap](docs/13-mvp-roadmap.md) |
| 14 | [Riscos, diferenciais e recomendações](docs/14-riscos-diferenciais-recomendacoes.md) |
| 15 | [Roteiro do Checkpoint 1](docs/15-checkpoint-1.md) |
| 16 | [Plano de implementação](docs/16-plano-de-implementacao.md) (especificação técnica de referência) |
| — | [Referências verificadas](docs/referencias.md) |
| — | [Documento consolidado do projeto (Word)](docs/Projeto_SangueConecta_Documento_Consolidado_Revisado.docx) |

Os documentos 01 a 15 formam a proposta do Checkpoint 1 (com stack Spring Boot); o documento 16 registra o que mudou na implementação (NestJS + Prisma, 4 papéis fixos, estoque central). Os documentos da proposta que citam ferramentas não usadas trazem um aviso no topo, e a stack que está no código fica em [Tecnologias](#tecnologias) e na [stack implementada](docs/08-stack.md#stack-implementada). Os documentos usam etiquetas para separar fatos de hipóteses:

| Etiqueta | Significado |
|---|---|
| **[FONTE]** | Informação com origem verificável, listada em [referencias.md](docs/referencias.md) |
| **[HIPÓTESE]** | Suposição do grupo, a confirmar em pesquisa de campo ou com a instituição parceira |
| **[VALIDAR-SAÚDE]** | Depende de legislação, protocolo de hemoterapia ou decisão de profissional de saúde |
| **[VALIDAR-JURÍDICO]** | Depende de análise jurídica, LGPD, validade documental ou convênio |
| **[SIMULAÇÃO]** | Existe apenas para demonstração acadêmica, com dados fictícios |
