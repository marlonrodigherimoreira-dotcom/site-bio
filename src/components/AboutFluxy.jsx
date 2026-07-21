import Reveal from './Reveal.jsx'
import Feature from './Feature.jsx'
import features from '../data/features.js'

export default function AboutFluxy() {
  return (
    <section className="copy">
      <div className="wrap">
        <Reveal as="span" className="eyebrow">
          O que é o <span className="brand">NOZIL</span>
        </Reveal>
        <Reveal as="h2" delay={1}>
          Sua gestão financeira, finalmente num lugar só.
        </Reveal>
        <Reveal as="p" className="lead" delay={2}>
          O <span className="brand">NOZIL</span> é um sistema de gestão
          financeira feito para microempresas, pequenos negócios,
          freelancers, prestadores de serviço e pequenas agências. Ele não
          tenta ser um ERP complicado — a missão é acabar com a bagunça de
          planilhas, cadernos e aplicativos soltos, reunindo tudo num painel
          simples de usar, mesmo sem experiência em finanças.
        </Reveal>
      </div>

      <div className="wrap">
        <div className="features">
          {features.map((f) => (
            <Feature key={f.title} {...f} />
          ))}
        </div>
      </div>
    </section>
  )
}
