import { useReveal } from '../hooks/useReveal.js'

/**
 * Envolve qualquer conteúdo com o efeito de fade + slide-up
 * usado em todo o site. `as` define a tag renderizada,
 * `delay` aplica os atrasos escalonados (1, 2 ou 3),
 * `initiallyVisible` pula a animação (usado no hero).
 */
export default function Reveal({
  children,
  as: Tag = 'div',
  delay,
  initiallyVisible = false,
  className = '',
  ...props
}) {
  const [ref, inView] = useReveal(initiallyVisible)
  const delayClass = delay ? `d${delay}` : ''
  const classes = ['reveal', inView ? 'in' : '', delayClass, className]
    .filter(Boolean)
    .join(' ')

  return (
    <Tag ref={ref} className={classes} {...props}>
      {children}
    </Tag>
  )
}
