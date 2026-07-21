import Reveal from './Reveal.jsx'

export default function Hero() {
  return (
    <section className="hero">
      <div className="wrap">
        <Reveal as="h1" initiallyVisible>
          Desorganização <span>custa caro.</span>
        </Reveal>

        <Reveal as="p" className="lead" delay={1} initiallyVisible>
          Quanto mais você demora para entender o seu financeiro, maiores
          são as chances de tomar decisões erradas.
        </Reveal>

        <Reveal as="p" className="lead" delay={2} initiallyVisible>
          Foi por isso que eu e minha equipe criamos a{' '}
          <span className="brand">Nozil</span>: um app que organiza o seu
          financeiro e transforma gastos, receitas e lucro em informações
          simples, para que você entenda sua situação em poucos minutos.
        </Reveal>

        <Reveal as="div" className="scroll-cue" delay={3} initiallyVisible>
          <span className="arrow">↓</span> role a tela
        </Reveal>
      </div>
    </section>
  )
}
