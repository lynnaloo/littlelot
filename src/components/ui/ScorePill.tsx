import clsx from 'clsx'
import tailwindConfig from '../../../tailwind.config'

interface ScorePillProps {
  score: number
  label?: string
  size?: 'sm' | 'md' | 'lg'
}

function scoreColor(score: number) {
  if (score >= 75) return { dot: 'bg-accent', text: 'text-accent', bg: 'bg-accent-lt border-accent/25' }
  if (score >= 55) return { dot: 'bg-amber',  text: 'text-amber',  bg: 'bg-amber-lt border-amber/25' }
  return              { dot: 'bg-danger', text: 'text-danger', bg: 'bg-danger-lt border-danger/25' }
}

// Same thresholds as scoreColor, as raw colors for canvas drawing (the map)
const colors = tailwindConfig.theme?.extend?.colors as Record<string, string>
export const SCORE_HEX = { good: colors.accent, fair: colors.amber, poor: colors.danger }
export const SCORE_THRESHOLDS = { good: 75, fair: 55 }

export function ScorePill({ score, label, size = 'md' }: ScorePillProps) {
  const c = scoreColor(score)

  if (size === 'lg') {
    return (
      <div className={clsx(
        'w-14 h-14 rounded-full flex items-center justify-center',
        'text-xl font-bold flex-shrink-0',
        score >= 75 ? 'bg-accent-lt text-accent'
          : score >= 55 ? 'bg-amber-lt text-amber'
          : 'bg-danger-lt text-danger'
      )}>
        {score}
      </div>
    )
  }

  return (
    <div className={clsx(
      'inline-flex items-center gap-1.5 rounded-full border px-3 py-1',
      'text-xs font-semibold bg-white',
      c.text
    )}>
      <span className={clsx('w-2 h-2 rounded-full flex-shrink-0', c.dot)} />
      {score}
      {label && <span className="font-normal opacity-75">· {label}</span>}
    </div>
  )
}
