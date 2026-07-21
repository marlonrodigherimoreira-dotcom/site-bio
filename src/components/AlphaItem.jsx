import Reveal from './Reveal.jsx'

export default function AlphaItem({ title, desc }) {
  return (
    <Reveal as="div" className="alpha-item">
      <span className="dot"></span>
      <div>
        <h3>{title}</h3>
        <p>{desc}</p>
      </div>
    </Reveal>
  )
}
