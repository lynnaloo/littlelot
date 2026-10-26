interface LogoMarkProps {
  size?: number
  /** 'color' = green on light bg | 'reversed' = light on dark bg */
  variant?: 'color' | 'reversed'
  className?: string
}

export function LogoMark({
  size = 40,
  variant = 'color',
  className,
}: LogoMarkProps) {
  const stroke   = variant === 'reversed' ? '#A8D5B8' : '#4A7C59'
  const fill     = variant === 'reversed' ? 'rgba(234,242,236,.12)' : '#EAF2EC'
  const body     = variant === 'reversed' ? '#EAF2EC' : '#4A7C59'
  const door     = variant === 'reversed' ? 'rgba(74,124,89,.45)' : '#EAF2EC'
  const window_  = variant === 'reversed' ? '#E8C97A' : '#EAF2EC'
  const ground   = variant === 'reversed' ? '#A8D5B8' : '#C8B89A'
  const tree     = variant === 'reversed' ? 'rgba(168,213,184,.65)' : '#6B9E78'

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 88 88"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="The Little Lot"
      className={className}
    >
      {/* lot boundary */}
      <path d="M14 68 L10 22 L52 8 L78 16 L80 72 L14 68Z"
            fill={fill} stroke={stroke} strokeWidth="2" strokeLinejoin="round"/>
      {/* survey corner dots */}
      <circle cx="10" cy="22" r="2.5" fill={stroke}/>
      <circle cx="52" cy="8"  r="2.5" fill={stroke}/>
      <circle cx="78" cy="16" r="2.5" fill={stroke}/>
      <circle cx="80" cy="72" r="2.5" fill={stroke}/>
      <circle cx="14" cy="68" r="2.5" fill={stroke}/>
      {/* roof */}
      <path d="M36 48 L44 38 L52 48Z" fill={body}/>
      {/* walls */}
      <rect x="37" y="47" width="14" height="12" rx="1" fill={body}/>
      {/* door */}
      <rect x="42" y="52" width="4" height="7" rx=".5" fill={door}/>
      {/* window — warm yellow always */}
      <rect x="38.5" y="49.5" width="3.5" height="3.5" rx=".5" fill={window_}/>
      {/* chimney */}
      <rect x="49" y="42" width="2.5" height="6" rx=".5" fill={body}/>
      {/* ground line */}
      <line x1="30" y1="59.5" x2="58" y2="59.5"
            stroke={ground} strokeWidth="1.5" strokeLinecap="round"/>
      {/* tree */}
      <circle cx="26" cy="51" r="5" fill={tree}/>
      <rect x="25" y="55" width="2" height="5" rx=".5" fill={body}/>
    </svg>
  )
}
