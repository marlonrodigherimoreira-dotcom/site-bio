import GrowthLine from './components/GrowthLine.jsx'
import Header from './components/Header.jsx'
import Hero from './components/Hero.jsx'
import Ticker from './components/Ticker.jsx'
import VideoBlock from './components/VideoBlock.jsx'
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
      <GrowthLine />

      <Header />

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

        {/* VSL secundária */}
        <VideoBlock
          label="Área do vídeo — VSL"
          title="Veja a Nozil funcionando de verdade"
          tag="Texto temporário"
          caption='"Do dashboard ao relatório: veja a Nozil sendo usada no dia a dia real de um negócio."'
        />

        <Ticker items={tickerPhrases2} />

        <CTASection />

        <AlphaSection />
      </main>

      <Footer />
    </>
  )
}
