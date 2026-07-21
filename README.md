# Fluxy — Landing Page (React + Vite)

Landing page do Fluxy convertida de HTML puro para React, componentizada,
mantendo exatamente o mesmo visual e efeitos da versão original.

## Como rodar

```bash
npm install
npm run dev
```

Abra o endereço mostrado no terminal (normalmente http://localhost:5173).

## Build de produção

```bash
npm run build
npm run preview
```

## Estrutura

```
src/
  components/
    Reveal.jsx        # wrapper do efeito de fade/slide ao rolar a tela
    GrowthLine.jsx     # linha rosa animada que "desenha" com o scroll
    Header.jsx
    Hero.jsx
    Ticker.jsx         # faixa de frases rolando (marquee)
    LeadIn.jsx         # texto de introdução antes de cada VSL
    VideoBlock.jsx     # placeholder de vídeo em tela cheia (sem vídeo real)
    AboutFluxy.jsx     # explicação do Fluxy + grade de funcionalidades
    Feature.jsx
    CTASection.jsx     # botão de compra (sem link/ação)
    AlphaSection.jsx   # explicação do Grupo Alpha
    AlphaItem.jsx
    Footer.jsx
  hooks/
    useReveal.js       # IntersectionObserver do efeito de scroll reveal
    useGrowthLine.js    # progresso de scroll aplicado ao SVG da linha
  data/
    features.js        # conteúdo das 12 funcionalidades do Fluxy
    alphaBenefits.js    # conteúdo dos benefícios do Grupo Alpha
  App.jsx              # monta a página inteira, na ordem original
  index.css            # todo o CSS do site (idêntico ao original)
  main.jsx             # entry point
```

## Observações

- Os blocos marcados como "Área do vídeo" são apenas placeholders visuais
  em tela cheia (100vw x 100vh) — nenhum vídeo real foi inserido.
- O botão "Quero usar o Fluxy" não possui link ou ação, como solicitado.
- Todo o design (cores, tipografia, espaçamentos, animações) foi mantido
  idêntico à versão original em HTML.
