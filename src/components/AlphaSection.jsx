import Reveal from './Reveal.jsx'
import AlphaChecklist from './AlphaChecklist.jsx'
import PricingTiers from './PricingTiers.jsx'
import alphaChecklist from '../data/alphaChecklist.js'
import pricingTiers from '../data/pricingTiers.js'

export default function AlphaSection() {
  return (
    <section className="alpha" id="alpha">
      <div className="wrap">
        <Reveal as="span" className="eyebrow">
          Grupo Alpha
        </Reveal>
        <Reveal as="h2" delay={1}>
          Entre antes do lançamento oficial.
        </Reveal>
        <Reveal as="p" className="lead" delay={2}>
          O Grupo Alpha é destinado aos primeiros usuários da{' '}
          <span className="brand">Nozil</span>. Além de garantir um
          desconto exclusivo durante o período Alpha, você acompanha a
          evolução do produto de perto e participa das discussões que
          ajudam a definir as próximas melhorias.
        </Reveal>

        <Reveal as="h3" className="alpha-subtitle">
          O que você recebe
        </Reveal>
        <AlphaChecklist items={alphaChecklist} />

        <Reveal as="h3" className="alpha-subtitle">
          Lotes
        </Reveal>
        <PricingTiers tiers={pricingTiers} />

        <Reveal as="h3" className="alpha-closing-title">
          Faça parte dos primeiros usuários.
        </Reveal>
        <Reveal as="p" className="lead" delay={1}>
          Entenda seu negócio com mais clareza e tenha mais segurança na
          hora de fechar o caixa no final do mês.
        </Reveal>

        {/* Leva para o checkout da Kiwify */}
        <Reveal
          as="a"
          className="buy-btn"
          delay={2}
          href="https://pay.kiwify.com.br/QMOtvgt"
          target="_blank"
          rel="noopener noreferrer"
        >
          Quero entrar para o Grupo Alpha
        </Reveal>
      </div>
    </section>
  )
}
