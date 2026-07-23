import Reveal from './Reveal.jsx'

export default function PricingTiers({ tiers }) {
  return (
    <div className="lotes">
      {tiers.map((tier) => (
        <Reveal as="div" className="lote-card" key={tier.label}>
          <span className="lote-medal" aria-hidden="true">
            {tier.medal}
          </span>
          <div className="lote-info">
            <span className="lote-label">{tier.label}</span>
            <div className="lote-price">{tier.price}</div>
            <div className="lote-meta">{tier.vagas}</div>
            {tier.coupon !== undefined && (
              <div className="lote-coupon">CUPOM: {tier.coupon || '____'}</div>
            )}
          </div>
          <a
            className="lote-off"
            href="https://pay.kiwify.com.br/QMOtvgt"
            target="_blank"
            rel="noopener noreferrer"
          >
            {tier.off}
          </a>
        </Reveal>
      ))}
    </div>
  )
}
