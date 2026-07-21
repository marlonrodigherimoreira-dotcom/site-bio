import Reveal from './Reveal.jsx'

export default function AboutFluxy() {
  return (
    <section className="copy">
      <div className="wrap">
        <Reveal as="h2">
          Um app simples para resolver uma tarefa complicada.
        </Reveal>
        <Reveal as="p" className="lead" delay={1}>
          A <span className="brand">Nozil</span> pega a sua dor de cabeça
          com números e faz o trabalho pesado por você.
        </Reveal>
        <Reveal as="p" className="lead" delay={2}>
          Veja quanto entrou, quanto saiu, quanto realmente sobrou e como
          está a saúde do seu negócio — tudo em um único lugar.
        </Reveal>
      </div>
    </section>
  )
}
