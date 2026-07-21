import GrowthLine from './components/GrowthLine.jsx'
import Header from './components/Header.jsx'
import Hero from './components/Hero.jsx'
import Ticker from './components/Ticker.jsx'
import LeadIn from './components/LeadIn.jsx'
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

        <LeadIn
          eyebrow="Antes de começar"
          title="Assista aos próximos minutos."
          text="Separamos um vídeo rápido pra te mostrar exatamente o problema que o Fluxy resolve — e por que ele é diferente de qualquer planilha que você já tentou usar."
        />

        <VideoBlock
          label="Área do vídeo — VSL principal"
          title="Como o Fluxy elimina a bagunça financeira do seu negócio"
          tag="Texto temporário"
          caption='"Em menos de 3 minutos você entende por que sua planilha nunca foi o problema real."'
        />

        <AboutFluxy />

        <LeadIn
          eyebrow="Por dentro"
          title="Veja o Fluxy funcionando de verdade."
          text="Chega de imaginar como seria. Este é um tour real pela plataforma — do primeiro lançamento até o relatório final."
          style={{ paddingBottom: 0 }}
        />

        <VideoBlock
          label="Área do vídeo — Fluxy por dentro"
          title="Um tour completo pelo painel do Fluxy"
          tag="Texto temporário"
          caption='"Do dashboard ao relatório: veja o Fluxy sendo usado no dia a dia real de um negócio."'
          style={{ marginTop: 56 }}
        />

        <Ticker items={tickerPhrases2} />

        <CTASection />

        <AlphaSection />
      </main>

      <Footer />
    </>
  )
}
