import AnimatedBackground from './components/AnimatedBackground.jsx'
import GrowthLine from './components/GrowthLine.jsx'
import Header from './components/Header.jsx'
import PromoBanner from './components/PromoBanner.jsx'
import Hero from './components/Hero.jsx'
import Ticker from './components/Ticker.jsx'
import VslCarousel from './components/VslCarousel.jsx'
import FreeTrialSection from './components/FreeTrialSection.jsx'
import AboutFluxy from './components/AboutFluxy.jsx'
import CTASection from './components/CTASection.jsx'
import AlphaSection from './components/AlphaSection.jsx'
import Footer from './components/Footer.jsx'

const tickerPhrases1 = [
  'SEM PLANILHA',
  'SEM CADERNO',
  'SEM BAGUNÇA',
  'SEM ADIVINHAÇÃO',
  'CLAREZA TODOS OS DIAS',
]

const tickerPhrases2 = [
  'UM PAINEL',
  'TODAS AS DECISÕES',
  'CLAREZA FINANCEIRA',
  'TODO DIA',
]

export default function App() {
  return (
    <>
      <AnimatedBackground />

      <div className="site-content">
        <GrowthLine />

        <Header />
        <PromoBanner />

        <main>
          <Hero />

          <Ticker items={tickerPhrases1} />

          <AboutFluxy />

          {/* VSL secundária — carrossel de 3 vídeos */}
          <VslCarousel />

          <Ticker items={tickerPhrases2} />

          {/* Seção do teste grátis */}
          <FreeTrialSection />

          <CTASection />

          <AlphaSection />
        </main>

        <Footer />
      </div>
    </>
  )
}
