import { Fragment } from 'react'

/**
 * Faixa horizontal com frases em loop contínuo.
 * `items` é a lista de frases; o conteúdo é duplicado em dois
 * blocos de texto para o efeito de rolagem infinita sem "salto".
 * Reproduz a estrutura original: cada bloco é UM único <span> de
 * texto corrido (sem spans aninhados), com <em>•</em> como separador.
 */
function TickerBlock({ items }) {
  return (
    <span>
      {items.map((item, i) => (
        <Fragment key={i}>
          {item} <em>•</em>{' '}
        </Fragment>
      ))}
    </span>
  )
}

export default function Ticker({ items }) {
  return (
    <div className="ticker" aria-hidden="true">
      <div className="ticker-track">
        <TickerBlock items={items} />
        <TickerBlock items={items} />
      </div>
    </div>
  )
}
