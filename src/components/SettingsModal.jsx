import { useState } from 'react'
import { X, Key, Eye, EyeOff, Trash2, AlertTriangle } from 'lucide-react'
import { LS_API_KEY, LS_NEWS_API_KEY, LS_TRANSACTIONS, LS_LAST_PRICES, LS_MANUAL_PRICES } from '../constants'

export default function SettingsModal({ onClose, onClearAll }) {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem(LS_API_KEY) ?? '')
  const [newsApiKey, setNewsApiKey] = useState(() => localStorage.getItem(LS_NEWS_API_KEY) ?? '')
  const [show, setShow] = useState(false)
  const [showNews, setShowNews] = useState(false)
  const [saved, setSaved] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)

  function handleSave() {
    localStorage.setItem(LS_API_KEY, apiKey.trim())
    localStorage.setItem(LS_NEWS_API_KEY, newsApiKey.trim())
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  function handleClearAll() {
    localStorage.removeItem(LS_TRANSACTIONS)
    localStorage.removeItem(LS_LAST_PRICES)
    localStorage.removeItem(LS_MANUAL_PRICES)
    onClearAll?.()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-700">
          <h2 className="text-lg font-semibold text-white">Configuración</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-white transition-colors rounded-lg p-1 hover:bg-zinc-800">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* API Key */}
          <div>
            <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2 flex items-center gap-2">
              <Key size={13} />
              API Key — Twelve Data
            </label>
            <p className="text-zinc-500 text-xs mb-3">
              Necesaria para precios de acciones y ETFs. Obtén una clave gratuita en{' '}
              <a href="https://twelvedata.com" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">
                twelvedata.com
              </a>. Las criptos (CoinGecko) no requieren clave.
            </p>
            <div className="relative">
              <input
                type={show ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Introduce tu API key…"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 pr-10 text-sm text-white placeholder-zinc-500 outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all"
              />
              <button type="button" onClick={() => setShow(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300">
                {show ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {/* NewsAPI Key */}
          <div>
            <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2 flex items-center gap-2">
              <Key size={13} />
              API Key — NewsAPI
            </label>
            <p className="text-zinc-500 text-xs mb-3">
              Opcional. Para obtener noticias en el analizador de acciones. Obtén una clave gratuita en{' '}
              <a href="https://newsapi.org" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">
                newsapi.org
              </a>.
            </p>
            <div className="relative">
              <input
                type={showNews ? 'text' : 'password'}
                value={newsApiKey}
                onChange={(e) => setNewsApiKey(e.target.value)}
                placeholder="Introduce tu NewsAPI key…"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 pr-10 text-sm text-white placeholder-zinc-500 outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all"
              />
              <button type="button" onClick={() => setShowNews(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300">
                {showNews ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          <button
            onClick={handleSave}
            className={`w-full py-2.5 rounded-xl text-sm font-medium transition-all ${
              saved ? 'bg-emerald-600 text-white' : 'bg-indigo-600 hover:bg-indigo-500 text-white'
            }`}
          >
            {saved ? '¡Guardado!' : 'Guardar'}
          </button>

          {/* Zona de peligro */}
          <div className="border-t border-zinc-800 pt-5">
            <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-3">Zona de peligro</p>

            {!confirmClear ? (
              <button
                onClick={() => setConfirmClear(true)}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-red-800/60 text-red-400 hover:bg-red-900/20 text-sm font-medium transition-all"
              >
                <Trash2 size={14} />
                Borrar todas las transacciones
              </button>
            ) : (
              <div className="bg-red-900/20 border border-red-700/50 rounded-xl p-4 space-y-3">
                <div className="flex items-start gap-2 text-red-300 text-sm">
                  <AlertTriangle size={15} className="shrink-0 mt-0.5" />
                  <p>Esto eliminará <strong>todas las transacciones</strong> de forma permanente. No se puede deshacer.</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setConfirmClear(false)}
                    className="flex-1 py-2 rounded-lg border border-zinc-700 text-zinc-400 hover:text-white text-sm transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleClearAll}
                    className="flex-1 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-medium transition-all"
                  >
                    Sí, borrar todo
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
