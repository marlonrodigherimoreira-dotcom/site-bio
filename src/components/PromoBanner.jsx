/**
 * Faixa promocional em vermelho, de ponta a ponta, logo abaixo do
 * logo no topo. Ao clicar, leva direto para a parte do Grupo Alpha
 * onde os lotes aparecem.
 */
export default function PromoBanner() {
  return (
    <a href="#alpha" className="promo-banner">
      <span className="promo-line1">LOTE 1: 70% OFF</span>
      <span className="promo-line2">
        <span className="promo-old">R$ 39,99</span> por{' '}
        <span className="promo-new">R$ 11,97</span>
      </span>
    </a>
  )
}
