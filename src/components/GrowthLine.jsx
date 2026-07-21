import { useGrowthLine } from '../hooks/useGrowthLine.js'

export default function GrowthLine() {
  const pathRef = useGrowthLine()

  return (
    <div className="growth-line" aria-hidden="true">
      <svg viewBox="0 0 34 1000" preserveAspectRatio="none">
        <path
          ref={pathRef}
          d="M17,1000 C10,940 24,900 17,850 C10,800 24,760 17,710 C9,650 25,610 17,560 C8,500 26,460 17,410 C6,350 28,300 17,250 C9,190 25,150 17,100 C11,60 20,30 17,0"
        />
      </svg>
    </div>
  )
}
