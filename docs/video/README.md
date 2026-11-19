# Vídeo de apresentação do SangueConecta

**Arquivo:** [`sangueconecta-apresentacao.mp4`](sangueconecta-apresentacao.mp4) · 2min30s · 1920×1080 · 30 fps · com trilha sonora

Vídeo animado que apresenta o projeto: o problema, a solução, os três perfis (doador, equipe e administração), as telas reais do app, o reconhecimento dos doadores, a privacidade (LGPD), o app instalável (PWA), a arquitetura, o ODS 3 e a equipe. Termina com a logo e um QR code para a [demonstração](https://labdogui.github.io/Reposit-rioFMU/sangueconecta/).

As telas que aparecem no vídeo são capturas da própria demonstração do SangueConecta, com os dados fictícios do seed. A trilha é original, sintetizada pelo script `tools/trilha.py` (sem músicas de terceiros).

## Roteiro e sugestão de narração

O vídeo não tem locução: os textos estão na tela, e quem apresenta pode narrar por cima. A fala abaixo cabe no tempo de cada cena.

| Tempo | Cena | Sugestão de fala |
|---|---|---|
| 00:00 | Abertura: a gota cai e vira a logo | "Este é o SangueConecta: uma plataforma que conecta doadores a vidas que precisam de ajuda." |
| 00:08 | O problema | "Muita gente quer doar sangue, mas desiste no caminho: a informação está espalhada, é difícil achar a unidade e o horário, e quase ninguém é lembrado de voltar. Em 2023, só 1,6% da população brasileira doou sangue." |
| 00:19 | A solução: a jornada | "O SangueConecta reúne toda a jornada em um só lugar: da descoberta e do cadastro à pré-triagem, ao agendamento, aos lembretes, ao atendimento e ao incentivo para voltar a doar." |
| 00:29 | Três perfis | "São três perfis: o doador, a equipe de coleta e a gestão do hemocentro." |
| 00:37 | Página inicial | "Na página inicial, qualquer pessoa vê a situação do estoque por tipo sanguíneo, entende por que doar e como funciona, e recebe orientações antes de doar." |
| 00:46 | Área do Doador | "Na área do doador, o próximo passo está sempre à vista. A pré-triagem informativa tem seis etapas, e o agendamento, quatro passos: unidade, data, horário e confirmação." |
| 00:56 | Histórico, lembretes e comprovantes | "O doador acompanha o histórico, recebe notificações e lembretes e gera declarações em PDF, com QR code e verificação pública." |
| 01:05 | Reconhecimento | "Quem volta a doar é reconhecido com pontos, níveis e conquistas, nunca com dinheiro, porque a doação é voluntária. Há ainda ranking opcional e horas complementares para estudantes." |
| 01:14 | Área da Equipe | "A equipe da unidade vê a agenda do dia, faz o check-in do doador e registra a triagem e a doação. A decisão clínica é sempre do profissional de saúde." |
| 01:24 | Administração | "A administração acompanha os indicadores num só painel, com gráficos e filtros. O Banco de Sangue mostra o estoque de cada tipo sanguíneo, adequado, em atenção ou crítico, e exporta planilhas em Excel. Também há relatórios, agendamentos, unidades e horários, campanhas, gamificação, configurações e auditoria." |
| 01:44 | Privacidade (LGPD) | "A privacidade vem desde o projeto: coleta mínima, dados de saúde isolados, criptografia, consentimento sob controle e auditoria." |
| 01:52 | App instalável | "O SangueConecta pode ser instalado como app no celular ou no computador, direto pelo navegador." |
| 01:59 | Tecnologia | "Por dentro, são seis microsserviços com API REST, um API Gateway, PostgreSQL e RabbitMQ, com React no front-end e NestJS no back-end. A jornada completa é testada de ponta a ponta." |
| 02:10 | ODS 3 | "O projeto está alinhado ao ODS 3 da ONU, Saúde e Bem-Estar." |
| 02:16 | Quem fez | "Este é o nosso Trabalho de Conclusão de Semestre em Sistemas de Informação, no Centro Universitário FMU." |
| 02:23 | Encerramento | "SangueConecta: conectando doadores a vidas que precisam de ajuda. Experimente a demonstração pelo QR code." |

## Como o vídeo é feito

| Arquivo | O que é |
|---|---|
| `index.html` | A animação inteira, numa linha do tempo única (Web Animations API). `window.seek(t)` posiciona todas as cenas no segundo `t` |
| `assets/telas/` | Telas reais da demonstração (JPEG) |
| `assets/icons.js` | Ícones do lucide (os mesmos do app), gerados por `tools/icons.mjs` |
| `assets/qr-*.svg` | QR codes (demonstração e exemplo de declaração) |
| `tools/trilha.py` | Sintetiza a trilha sonora (`assets/trilha.wav`, não versionado) |
| `tools/render.mjs` | Grava `index.html` quadro a quadro com o Playwright e monta o MP4 com o ffmpeg |
| `tools/capturar-telas.mjs` | Refaz as capturas de tela a partir da demonstração |

Para ver a animação no navegador, sirva a raiz do repositório (`python3 -m http.server` na raiz) e abra `/docs/video/index.html` (espaço pausa, setas avançam e voltam 5 s, `?t=42` abre parado no segundo 42).

Para gerar o MP4 de novo (precisa de `npm ci`, Playwright com Chromium, ffmpeg, Python com numpy e scipy):

```bash
python3 docs/video/tools/trilha.py      # trilha sonora → docs/video/assets/trilha.wav
node docs/video/tools/render.mjs        # vídeo → docs/video/sangueconecta-apresentacao.mp4
```

Opções do `render.mjs`: `--fps 60`, `--workers 4`, `--crf 18`, `--stills 3,40,95` (só quadros de conferência em PNG). Se o Chromium do Playwright do repositório não estiver instalado, aponte outro com `CHROMIUM_PATH=/caminho/do/chrome`.
