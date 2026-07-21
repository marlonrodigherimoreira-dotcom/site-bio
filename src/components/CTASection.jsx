import Reveal from './Reveal.jsx'

export default function CTASection() {
  return (
    <section className="cta-section" id="cta">
      <div className="wrap">
        <Reveal as="h2">
          Pare de adivinhar se vai sobrar dinheiro no fim do mês.
        </Reveal>
        <Reveal as="p" className="lead" delay={1}>
          Pense. Analise. Entenda.
        </Reveal>
        <Reveal as="p" className="lead" delay={2}>
          Tudo em um só app.
        </Reveal>

        {/* Botão apenas visual — não leva a lugar nenhum */}
        <Reveal as="button" className="buy-btn" delay={3} type="button">
          Quero entrar para o Grupo Alpha
        </Reveal>
      </div>
    </section>
  )
}
