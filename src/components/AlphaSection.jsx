import Reveal from './Reveal.jsx'
import AlphaItem from './AlphaItem.jsx'
import alphaBenefits from '../data/alphaBenefits.js'

export default function AlphaSection() {
  return (
    <section className="alpha">
      <div className="wrap">
        <Reveal as="span" className="eyebrow">
          Grupo Alpha
        </Reveal>
        <Reveal as="h2" delay={1}>
          Ajude a construir o <span className="brand">NOZIL</span> antes de
          todo mundo.
        </Reveal>
        <Reveal as="p" className="lead" delay={2}>
          O Grupo Alpha é um grupo fechado formado pelos primeiros usuários
          do <span className="brand">NOZIL</span>. Antes do lançamento
          oficial, cada novidade chega primeiro para eles — e a experiência
          de quem usa ajuda a decidir os próximos passos da plataforma.
        </Reveal>

        <div className="alpha-list">
          {alphaBenefits.map((b) => (
            <AlphaItem key={b.title} {...b} />
          ))}
        </div>
      </div>
    </section>
  )
}
