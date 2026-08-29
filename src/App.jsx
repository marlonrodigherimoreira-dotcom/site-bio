import AnimatedBackground from './components/AnimatedBackground.jsx'
import GrowthLine from './components/GrowthLine.jsx'
import Header from './components/Header.jsx'
import PromoBanner from './components/PromoBanner.jsx'
import Hero from './components/Hero.jsx'
import Ticker from './components/Ticker.jsx'
import VideoBlock from './components/VideoBlock.jsx'
import VslCarousel from './components/VslCarousel.jsx'
import SubVslNote from './components/SubVslNote.jsx'
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

          {/* VSL principal */}
          <VideoBlock
            label="Área do vídeo — VSL"
            title="Veja como a Nozil resolve isso"
            tag="Texto temporário"
            caption='"Assista para entender como a Nozil transforma sua bagunça financeira em clareza."'
          />

          {/* subVSL — texto pequeno, não é vídeo */}
          <SubVslNote />

          <AboutFluxy />

          {/* VSL secundária — carrossel de 3 vídeos */}
          <VslCarousel />

          <Ticker items={tickerPhrases2} />

          <CTASection />

          <AlphaSection />
        </main>

        <Footer />
      </div>
    </>
  )
}
