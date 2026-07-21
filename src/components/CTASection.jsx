import Reveal from './Reveal.jsx'

export default function CTASection() {
  return (
    <section className="cta-section" id="cta">
      <div className="wrap">
        <Reveal as="span" className="eyebrow">
          Comece agora
        </Reveal>
        <Reveal as="h2" delay={1}>
          Pronto pra ter clareza sobre o seu dinheiro?
        </Reveal>
        <Reveal as="p" className="lead" delay={2}>
          Organize sua empresa em um só lugar — sem planilha, sem caderno,
          sem bagunça.
        </Reveal>

        {/* Botão apenas visual — não leva a lugar nenhum */}
        <Reveal as="button" className="buy-btn" delay={3} type="button">
          Quero usar o Fluxy →
        </Reveal>

        <Reveal as="div" className="buy-note" delay={3}>
          Vagas limitadas para o Grupo Alpha
        </Reveal>
      </div>
    </section>
  )
}
