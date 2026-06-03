import { useState, useEffect } from 'react'
import { formatCurrency, formatPercent } from '../utils/formatters'

const TYPE_LABELS = { stock: 'Acciones', etf: 'ETFs', crypto: 'Cripto' }

const COLORS_BY_TYPE = {
  stock: '#60a5fa',
  etf: '#a78bfa',
  crypto: '#fbbf24',
}

const PALETTE = [
  '#6366f1', '#22d3ee', '#f97316', '#10b981',
  '#f43f5e', '#84cc16', '#8b5cf6', '#ec4899',
  '#14b8a6', '#f59e0b',
]

function getColor(segment, index) {
  if (COLORS_BY_TYPE[segment.id]) return COLORS_BY_TYPE[segment.id]
  if (COLORS_BY_TYPE[segment.type]) return COLORS_BY_TYPE[segment.type]
  return PALETTE[index % PALETTE.length]
}

const SIZE = 180
const CX = SIZE / 2
const CY = SIZE / 2
const R = 58
const SW = 22
const C = 2 * Math.PI * R
const GAP = 3 // gap entre segmentos en unidades de arco

function buildArcs(segments, animated) {
  const totalGap = GAP * segments.length
  const available = C - totalGap

  let cumulative = 0
  return segments.map((seg, i) => {
    const color = getColor(seg, i)
    const arcLen = animated ? (seg.pct / 100) * available : 0
    const dashOffset = C - cumulative
    cumulative += arcLen + GAP
    return { ...seg, color, arcLen, dashOffset }
  })
}

function DonutSVG({ arcs }) {
  return (
    <svg viewBox={`0 0 ${SIZE} ${SIZE}`} width={SIZE} height={SIZE} style={{ overflow: 'visible' }}>
      {/* Track */}
      <circle cx={CX} cy={CY} r={R} fill="none" stroke="#27272a" strokeWidth={SW} />
      <g style={{ transform: `rotate(-90deg)`, transformOrigin: `${CX}px ${CY}px` }}>
        {arcs.map((arc, i) => (
          <circle
            key={arc.id ?? i}
            cx={CX} cy={CY} r={R}
            fill="none"
            stroke={arc.color}
            strokeWidth={SW}
            strokeLinecap="butt"
            strokeDasharray={`${arc.arcLen} ${C}`}
            strokeDashoffset={arc.dashOffset}
            style={{ transition: 'stroke-dasharray 0.7s ease, stroke-dashoffset 0.7s ease' }}
          />
        ))}
      </g>
      {/* Total label en el centro */}
      <text x={CX} y={CY - 4} textAnchor="middle" fill="#a1a1aa" fontSize="9" fontFamily="inherit">
        distribución
      </text>
    </svg>
  )
}

export default function AllocationChart({ segments, displayCurrency, view, onToggleView }) {
  const [animated, setAnimated] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 60)
    return () => clearTimeout(t)
  }, [segments.length])

  // Re-animar al cambiar de vista
  useEffect(() => {
    setAnimated(false)
    const t = setTimeout(() => setAnimated(true), 60)
    return () => clearTimeout(t)
  }, [view])

  if (segments.length === 0) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 flex items-center justify-center min-h-[220px]">
        <p className="text-zinc-600 text-sm">Sin datos</p>
      </div>
    )
  }

  const arcs = buildArcs(segments, animated)

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
      {/* Header + toggle */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Distribución</p>
        <div className="flex rounded-lg overflow-hidden border border-zinc-700 text-xs">
          <button
            onClick={() => onToggleView('type')}
            className={`px-3 py-1 transition-all ${view === 'type' ? 'bg-zinc-700 text-white' : 'bg-zinc-800 text-zinc-500 hover:text-zinc-300'}`}
          >
            Tipo
          </button>
          <button
            onClick={() => onToggleView('position')}
            className={`px-3 py-1 transition-all ${view === 'position' ? 'bg-zinc-700 text-white' : 'bg-zinc-800 text-zinc-500 hover:text-zinc-300'}`}
          >
            Activo
          </button>
        </div>
      </div>

      {/* Donut */}
      <div className="flex justify-center mb-4">
        <DonutSVG arcs={arcs} />
      </div>

      {/* Leyenda */}
      <ul className="space-y-2">
        {arcs.map((arc) => (
          <li key={arc.id} className="flex items-center gap-2.5">
            <span
              className="w-2.5 h-2.5 rounded-sm shrink-0"
              style={{ backgroundColor: arc.color }}
            />
            <span className="text-zinc-300 text-xs truncate flex-1">
              {TYPE_LABELS[arc.label] ?? arc.label.split(':')[0]}
              {arc.sublabel && (
                <span className="text-zinc-600 ml-1">· {arc.sublabel}</span>
              )}
            </span>
            <span className="text-zinc-400 text-xs shrink-0">
              {formatCurrency(arc.value, displayCurrency, { decimals: 0 })}
            </span>
            <span className="text-zinc-600 text-xs w-12 text-right shrink-0">
              {formatPercent(arc.pct).replace('+', '')}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
