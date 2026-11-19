# Vídeo de apresentação do SangueConecta

**Arquivos** (2min30s · 1920×1080 · 30 fps):

- [`sangueconecta-apresentacao-narrado.mp4`](sangueconecta-apresentacao-narrado.mp4): com narração (voz do ElevenLabs) e trilha sonora;
- [`sangueconecta-apresentacao.mp4`](sangueconecta-apresentacao.mp4): só com a trilha, para quem apresenta narrar ao vivo.

Vídeo animado que apresenta o projeto: o problema, a solução, os três perfis (doador, equipe e administração), as telas reais do app, o reconhecimento dos doadores, a privacidade (LGPD), o app instalável (PWA), a arquitetura, o ODS 3 e a equipe. Termina com a logo e um QR code para a [demonstração](https://labdogui.github.io/Reposit-rioFMU/sangueconecta/).

As telas que aparecem no vídeo são capturas da própria demonstração do SangueConecta, com os dados fictícios do seed. A trilha é original, sintetizada pelo script `tools/trilha.py` (sem músicas de terceiros).

## Roteiro e narração

Cada fala abaixo cabe no tempo da sua cena. A versão pronta para colar numa ferramenta de voz sintética (com o segundo exato de cada fala) está em [`narracao-elevenlabs.txt`](narracao-elevenlabs.txt).

A versão narrada usa a gravação `assets/narracao-elevenlabs.mp3`, feita no ElevenLabs com essas 19 falas. O script `tools/narrar.py` corta cada fala da gravação, coloca no segundo da cena e abaixa a música enquanto a voz fala. A gravação também leu os horários em voz alta; esses trechos ficam de fora. Para trocar a voz, gere uma gravação nova, ajuste a tabela `CORTES` no script e rode `python3 docs/video/tools/narrar.py`.

| Tempo | Fala |
|---|---|
| 00:02 | Doar sangue salva vidas. O SangueConecta deixa esse caminho mais simples. |
| 00:08 | Muita gente quer doar, mas desiste no caminho: falta informação, horário e um lembrete para voltar. |
| 00:14 | Em dois mil e vinte e três, só um vírgula seis por cento da população doou sangue. |
| 00:19 | O SangueConecta reúne toda a jornada em um só lugar: cadastro, pré-triagem, agendamento, lembretes, atendimento e o incentivo para voltar. |
| 00:29 | São três perfis: quem doa, a equipe de coleta e a gestão do hemocentro. |
| 00:37 | Na página inicial, qualquer pessoa vê o estoque de sangue por tipo, entende por que doar e como funciona. |
| 00:46 | Na área do doador, o próximo passo está sempre à vista. A pré-triagem tem seis etapas, e o agendamento, só quatro passos. |
| 00:56 | O doador acompanha o histórico, recebe lembretes e gera declarações em PDF, que qualquer pessoa confere pelo QR code. |
| 01:05 | Quem volta a doar ganha pontos, sobe de nível e desbloqueia conquistas. É reconhecimento, nunca dinheiro: doar é um ato voluntário. |
| 01:14 | Na área da equipe: agenda do dia, check-in, triagem e registro da doação. A decisão clínica é sempre do profissional de saúde. |
| 01:24 | Na administração, os indicadores ficam num só painel, com gráficos e filtros. |
| 01:31 | O Banco de Sangue mostra o estoque de cada tipo: adequado, em atenção ou crítico, com planilha em Excel. |
| 01:38 | E ainda: relatórios, agendamentos, unidades, campanhas, gamificação e auditoria. |
| 01:44 | A privacidade vem desde o projeto: coleta mínima, dados de saúde protegidos e tudo auditado, como pede a LGPD. |
| 01:52 | E dá para instalar o SangueConecta como aplicativo, no celular ou no computador. |
| 01:59 | Por dentro, são seis microsserviços, um gateway de entrada, banco de dados e mensageria. E a jornada completa é testada de ponta a ponta. |
| 02:10 | O projeto está alinhado ao ODS três da ONU: Saúde e Bem-Estar. |
| 02:16 | Um Trabalho de Conclusão de Semestre de Sistemas de Informação, no Centro Universitário FMU. |
| 02:23 | SangueConecta: conectando doadores a vidas que precisam de ajuda. Obrigado! |

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
