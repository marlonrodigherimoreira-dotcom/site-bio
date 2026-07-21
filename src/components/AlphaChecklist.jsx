import Reveal from './Reveal.jsx'

export default function AlphaChecklist({ items }) {
  return (
    <div className="alpha-check">
      {items.map((item, i) => (
        <Reveal as="div" className="alpha-check-item" key={item}>
          <span className="mark" aria-hidden="true">
            ✅
          </span>
          <span>{item}</span>
        </Reveal>
      ))}
    </div>
  )
}
