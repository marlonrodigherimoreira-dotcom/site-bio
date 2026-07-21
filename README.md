# Nozil — Landing Page (React + Vite)

Landing page da Nozil convertida de HTML puro para React, componentizada,
com a copy de vendas (VSL, subVSL, explicação do produto, Grupo Alpha e
lotes de preço).

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
    Reveal.jsx          # wrapper do efeito de fade/slide ao rolar a tela
    GrowthLine.jsx       # linha vermelha animada que "desenha" com o scroll
    Header.jsx
    Hero.jsx             # "Desorganização custa caro." + texto de abertura
    Ticker.jsx           # faixa de frases rolando (marquee)
    VideoBlock.jsx       # placeholder de vídeo em tela cheia (sem vídeo real)
    AboutFluxy.jsx       # "Um app simples para resolver uma tarefa complicada."
    CTASection.jsx       # bloco de fechamento + botão "Quero entrar para o Grupo Alpha"
    AlphaSection.jsx     # Grupo Alpha: benefícios, lotes e fechamento
    AlphaChecklist.jsx   # lista "O que você recebe" (✅)
    PricingTiers.jsx     # cards dos lotes (1º, 2º, 3º)
    Footer.jsx
  hooks/
    useReveal.js         # IntersectionObserver do efeito de scroll reveal
    useGrowthLine.js      # progresso de scroll aplicado ao SVG da linha
  data/
    alphaChecklist.js     # itens do checklist do Grupo Alpha
    pricingTiers.js        # dados dos 3 lotes (preço, vagas, desconto, cupom)
  App.jsx                # monta a página inteira, na ordem da copy atual
  index.css               # todo o CSS do site
  main.jsx                # entry point
```

## Observações

- Os blocos marcados como "Área do vídeo" (VSL, subVSL e VSL secundária)
  são apenas placeholders visuais em tela cheia (100vw x 100vh) — nenhum
  vídeo real foi inserido.
- O botão "Quero entrar para o Grupo Alpha" não possui link ou ação.
- O card do 1º lote mostra um campo de cupom vazio (`CUPOM: ____`), pronto
  pra ser preenchido quando o cupom real existir.
- A marca é exibida como **Nozil**, na fonte Rubik Spray Paint e na cor
  vermelha da marca (`#E60023`).
