import Reveal from './Reveal.jsx'

/**
 * Espaço reservado para um texto curto que acompanha o subVSL —
 * não é um vídeo, é um pequeno bloco de texto (placeholder).
 */
export default function SubVslNote() {
  return (
    <section className="copy subvsl-section">
      <div className="wrap">
        <Reveal as="div" className="subvsl-box">
          <span className="subvsl-tag">Texto temporário — subVSL</span>
          <p>
            Espaço para um texto curto complementando o vídeo acima,
            reforçando a mensagem principal antes de seguir para a próxima
            parte.
          </p>
        </Reveal>
      </div>
    </section>
  )
}
