import AnimatedBackground from './components/AnimatedBackground.jsx'
import GrowthLine from './components/GrowthLine.jsx'
import Header from './components/Header.jsx'
import Reveal from './components/Reveal.jsx'
import Footer from './components/Footer.jsx'

/**
 * Página dedicada ao teste grátis. Reutiliza os componentes e as
 * classes CSS já existentes no site (mesma tipografia, cores,
 * espaçamentos e padrões de botão), sem criar nenhum estilo novo.
 */
export default function TrialApp() {
  return (
    <>
      <AnimatedBackground />

      <div className="site-content">
        <GrowthLine />

        <Header />

        <main>
          <section className="cta-section">
            <div className="wrap">
              <Reveal as="h1">Teste grátis por 10 dias</Reveal>
              <Reveal as="p" className="lead" delay={1}>
                Conheça a Nozil gratuitamente e veja como é organizar o
                financeiro da sua empresa em um só lugar.
              </Reveal>
            </div>
          </section>

          <section className="copy">
            <div className="wrap">
              <Reveal as="h3">Solicitar pelo Telegram</Reveal>
              <Reveal as="p" className="lead" delay={1}>
                Fale conosco pelo Telegram para solicitar seu teste grátis.
              </Reveal>
              <Reveal
                as="a"
                className="buy-btn"
                delay={2}
                href="https://t.me/+5554984079478?text=Ol%C3%A1%21%20Vim%20pelo%20site%20e%20quero%20solicitar%20meu%20teste%20gr%C3%A1tis%20de%2010%20dias%20da%20Nozil."
                target="_blank"
                rel="noopener noreferrer"
              >
                Solicitar pelo Telegram →
              </Reveal>
            </div>
          </section>

          <section className="copy">
            <div className="wrap">
              <Reveal as="h3">Solicitar pelo Instagram</Reveal>
              <Reveal as="p" className="lead" delay={1}>
                Prefere o Instagram? Solicite seu teste grátis pelo nosso
                chat.
              </Reveal>
              <Reveal
                as="a"
                className="nav-cta"
                delay={2}
                href="https://ig.me/m/nozil.ads"
                target="_blank"
                rel="noopener noreferrer"
              >
                Solicitar pelo Instagram →
              </Reveal>
            </div>
          </section>
        </main>

        <Footer />
      </div>
    </>
  )
}
