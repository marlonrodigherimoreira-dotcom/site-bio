import GrowthLine from './components/GrowthLine.jsx'
import Header from './components/Header.jsx'
import Hero from './components/Hero.jsx'
import Ticker from './components/Ticker.jsx'
import VideoBlock from './components/VideoBlock.jsx'
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
          title="Veja como a Nozzil resolve isso"
          tag="Texto temporário"
          caption='"Assista para entender como a Nozzil transforma sua bagunça financeira em clareza."'
        />

        {/* subVSL */}
        <VideoBlock
          label="Área do vídeo — subVSL"
          title="Um complemento rápido antes de continuar"
          tag="Texto temporário"
          caption='"Um vídeo curto pra reforçar o que você acabou de ver."'
        />

        <AboutFluxy />

        {/* VSL secundária */}
        <VideoBlock
          label="Área do vídeo — VSL"
          title="Veja a Nozzil funcionando de verdade"
          tag="Texto temporário"
          caption='"Do dashboard ao relatório: veja a Nozzil sendo usada no dia a dia real de um negócio."'
        />

        <Ticker items={tickerPhrases2} />

        <CTASection />

        <AlphaSection />
      </main>

      <Footer />
    </>
  )
}
