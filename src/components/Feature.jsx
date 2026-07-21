import Reveal from './Reveal.jsx'

export default function Feature({ tag, title, desc }) {
  return (
    <Reveal as="div" className="feature">
      <span className="feature-tag">{tag}</span>
      <h3>{title}</h3>
      <p>{desc}</p>
    </Reveal>
  )
}
