import Reveal from './Reveal.jsx'

/**
 * Seção do teste gratuito — ocupa o lugar onde antes ficavam a
 * primeira "Área do vídeo — VSL" e o texto temporário do subVSL.
 * Segue o mesmo padrão visual da seção de CTA (título, parágrafos,
 * botão e nota abaixo).
 */
export default function FreeTrialSection() {
  return (
    <section className="cta-section">
      <div className="wrap">
        <Reveal as="h2">Quer conhecer a Nozil antes de assinar?</Reveal>

        <Reveal as="p" className="lead" delay={1}>
          Teste a plataforma gratuitamente por 10 dias e veja como é
          organizar o financeiro da sua empresa em um só lugar.
        </Reveal>

        <Reveal as="p" className="lead" delay={2}>
          Você não precisa cadastrar nenhum cartão.{' '}
          <span className="text-pink">
            O teste é gratuito e não está vinculado a cobranças.
          </span>
        </Reveal>

        {/* Leva para a página do teste grátis */}
        <Reveal
          as="a"
          className="buy-btn"
          delay={3}
          href="/teste-gratis.html"
        >
          Começar teste grátis →
        </Reveal>

        <Reveal as="div" className="trial-note" delay={3}>
          Acesso gratuito por 10 dias.
        </Reveal>
      </div>
    </section>
  )
}
