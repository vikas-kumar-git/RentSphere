import type { SummaryMetric } from '../types'

interface SummaryCardsProps {
  metrics: SummaryMetric[]
}

function SummaryCards({ metrics }: SummaryCardsProps) {
  return (
    <section className="summary" aria-label="Rent summary">
      {metrics.map((metric) => (
        <article className="item" key={metric.label}>
          <h3>{metric.label}</h3>
          <p className={metric.tone ? `summary-value summary-value--${metric.tone}` : 'summary-value'}>
            {metric.value}
          </p>
        </article>
      ))}
    </section>
  )
}

export default SummaryCards
