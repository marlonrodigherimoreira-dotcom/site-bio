import { useState, useRef, useEffect } from 'react'

const videos = ['/videos/1bio.mp4', '/videos/2bio.mp4', '/videos/3bio.mp4']
const TOTAL_VIDEOS = videos.length

/**
 * Segundo espaço de VSL: carrossel com 3 vídeos, na proporção
 * 1920x1080 / 16:9, pensado para celular — o vídeo não ocupa a tela
 * inteira, só a altura que a proporção 16:9 permite. O texto fica
 * sobreposto ao vídeo e some assim que o play é acionado. Ao tocar
 * no play, abre em tela cheia com setas de navegação dentro do
 * próprio vídeo, um X para fechar e um link pequeno "ver o próximo".
 */
export default function VslCarousel() {
  const [index, setIndex] = useState(0)
  const [fullscreen, setFullscreen] = useState(false)
  const [showFsArrows, setShowFsArrows] = useState(false)
  const fsVideoRef = useRef(null)

  const next = () => setIndex((i) => (i + 1) % TOTAL_VIDEOS)
  const prev = () => setIndex((i) => (i - 1 + TOTAL_VIDEOS) % TOTAL_VIDEOS)

  // esconde as setas sempre que abrir um vídeo novo em tela cheia
  useEffect(() => {
    setShowFsArrows(false)
  }, [fullscreen, index])

  const handleVideoEnded = () => {
    fsVideoRef.current && fsVideoRef.current.pause()
    setShowFsArrows(true)
  }

  return (
    <>
      <div className="vsl-carousel">
        <div className="vsl-slide">
          <button
            className="vsl-video-placeholder"
            onClick={() => setFullscreen(true)}
            aria-label={`Assistir vídeo ${index + 1} de ${TOTAL_VIDEOS}`}
          >
            <video
              key={videos[index]}
              className="vsl-video-el"
              src={videos[index]}
              muted
              playsInline
              preload="metadata"
            />
            <div className="vsl-shade"></div>
            <div className="play-btn"></div>

            {!fullscreen && (
              <div className="vsl-caption-overlay">
                <p className="vsl-caption">
                  Isso é a base da Nozil, tudo isso em 1 única aba e com uma
                  praticidade absurda.
                </p>
              </div>
            )}
          </button>
        </div>

        <div className="vsl-nav">
          <button
            className="vsl-arrow"
            onClick={prev}
            aria-label="Vídeo anterior"
          >
            ‹
          </button>
          <span className="vsl-dots">
            {Array.from({ length: TOTAL_VIDEOS }).map((_, i) => (
              <span
                key={i}
                className={`vsl-dot ${i === index ? 'is-active' : ''}`}
              />
            ))}
          </span>
          <button
            className="vsl-arrow vsl-arrow-next"
            onClick={next}
            aria-label="Próximo vídeo"
          >
            ›
          </button>
        </div>
      </div>

      {fullscreen && (
        <div className="vsl-fullscreen" role="dialog" aria-modal="true">
          <button
            className="vsl-close"
            onClick={() => setFullscreen(false)}
            aria-label="Fechar vídeo"
          >
            ×
          </button>

          <div
            className="vsl-fullscreen-video"
            onClick={() => setShowFsArrows(true)}
          >
            <video
              key={videos[index]}
              ref={fsVideoRef}
              className="vsl-fs-video-el"
              src={videos[index]}
              controls
              autoPlay
              playsInline
              onEnded={handleVideoEnded}
            />
            {showFsArrows && (
              <>
                <button
                  className="vsl-arrow vsl-fs-arrow vsl-fs-arrow-prev"
                  onClick={(e) => {
                    e.stopPropagation()
                    prev()
                  }}
                  aria-label="Vídeo anterior"
                >
                  ‹
                </button>
                <button
                  className="vsl-arrow vsl-arrow-next vsl-fs-arrow vsl-fs-arrow-next"
                  onClick={(e) => {
                    e.stopPropagation()
                    next()
                  }}
                  aria-label="Próximo vídeo"
                >
                  ›
                </button>
              </>
            )}
          </div>

          <button className="vsl-next-hint" onClick={next}>
            ver o próximo
          </button>
        </div>
      )}
    </>
  )
}
