import Reveal from './Reveal.jsx'

export default function Hero() {
  return (
    <section className="hero">
      <div className="wrap">
        <Reveal as="span" className="eyebrow" initiallyVisible>
          Fluxy // gestão financeira
        </Reveal>

        <Reveal as="h1" delay={1} initiallyVisible>
          CHEGA DE
          <br />
          ADIVINHAR
          <br />
          O SEU <span>DINHEIRO.</span>
        </Reveal>

        <Reveal as="p" className="lead" delay={2} initiallyVisible>
          O Fluxy organiza receitas, despesas e decisões do seu negócio em um
          só lugar — simples o suficiente pra abrir de manhã e usar o dia
          inteiro.
        </Reveal>

        <Reveal as="div" className="scroll-cue" delay={3} initiallyVisible>
          <span className="arrow">↓</span> role a tela
        </Reveal>
      </div>
    </section>
  )
}
