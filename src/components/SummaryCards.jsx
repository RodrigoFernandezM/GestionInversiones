import { TrendingUp, TrendingDown, Wallet, CheckCircle } from 'lucide-react'
import { formatCurrency, formatPercent } from '../utils/formatters'

function Card({ label, value, sub, subPositive, icon: Icon, iconColor }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl px-5 py-4 flex items-start gap-4">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${iconColor}`}>
        <Icon size={16} />
      </div>
      <div className="min-w-0">
        <p className="text-zinc-500 text-xs mb-0.5">{label}</p>
        <p className="text-white font-semibold text-base truncate">{value}</p>
        {sub != null && (
          <p
            className={`text-xs mt-0.5 ${
              subPositive === true
                ? 'text-emerald-400'
                : subPositive === false
                ? 'text-red-400'
                : 'text-zinc-500'
            }`}
          >
            {sub}
          </p>
        )}
      </div>
    </div>
  )
}

export default function SummaryCards({ totals, best, displayCurrency }) {
  const { totalCurrentValue, totalRealizedPnl, totalUnrealizedPnl, totalPnl, totalPnlPct } = totals
  const pnlPos = totalPnl >= 0
  const realPos = totalRealizedPnl >= 0
  const unrPos = totalUnrealizedPnl >= 0

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
      <Card
        label="Valor cartera abierta"
        value={formatCurrency(totalCurrentValue, displayCurrency)}
        icon={Wallet}
        iconColor="text-indigo-400 bg-indigo-400/10"
      />
      <Card
        label="P&L realizado"
        value={formatCurrency(totalRealizedPnl, displayCurrency)}
        sub={totalRealizedPnl !== 0 ? (realPos ? 'ganancias cerradas' : 'pérdidas cerradas') : null}
        subPositive={realPos}
        icon={CheckCircle}
        iconColor={realPos ? 'text-emerald-400 bg-emerald-400/10' : 'text-red-400 bg-red-400/10'}
      />
      <Card
        label="P&L no realizado"
        value={formatCurrency(totalUnrealizedPnl, displayCurrency)}
        sub={totalUnrealizedPnl != null ? (unrPos ? 'en posiciones abiertas' : 'en posiciones abiertas') : null}
        subPositive={unrPos}
        icon={unrPos ? TrendingUp : TrendingDown}
        iconColor={unrPos ? 'text-blue-400 bg-blue-400/10' : 'text-orange-400 bg-orange-400/10'}
      />
      <Card
        label="P&L total"
        value={formatCurrency(totalPnl, displayCurrency)}
        sub={totalPnlPct != null ? formatPercent(totalPnlPct) : null}
        subPositive={pnlPos}
        icon={pnlPos ? TrendingUp : TrendingDown}
        iconColor={pnlPos ? 'text-emerald-400 bg-emerald-400/10' : 'text-red-400 bg-red-400/10'}
      />
    </div>
  )
}
