import Reveal from './Reveal.jsx'

export default function LeadIn({ eyebrow, title, text, style }) {
  return (
    <section className="copy" style={style}>
      <div className="wrap">
        <Reveal as="span" className="eyebrow">
          {eyebrow}
        </Reveal>
        <Reveal as="h2" delay={1}>
          {title}
        </Reveal>
        <Reveal as="p" className="lead" delay={2}>
          {text}
        </Reveal>
      </div>
    </section>
  )
}
