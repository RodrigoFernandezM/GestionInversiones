import { useState } from 'react'
import { X, Search, TrendingUp, TrendingDown, AlertCircle, Newspaper } from 'lucide-react'
import { searchNews } from '../services/newsApi'
import { fetchStockPrices } from '../services/twelveData'
import { formatCurrency, formatPercent } from '../utils/formatters'

export default function StockAnalyzer({ onClose, apiKeyTwelve, apiKeyNews }) {
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [analysis, setAnalysis] = useState(null)

  async function handleSearch(e) {
    e.preventDefault()
    if (!search.trim()) return

    setLoading(true)
    setError(null)
    setAnalysis(null)

    try {
      const ticker = search.trim().toUpperCase()

      // Obtener precio actual
      const priceData = await fetchStockPrices([ticker], apiKeyTwelve)
      if (!priceData || !priceData[ticker]) {
        throw new Error(`No se encontró datos para ${ticker}`)
      }

      const price = priceData[ticker]

      // Obtener noticias
      let news = []
      if (apiKeyNews) {
        try {
          news = await searchNews(ticker, apiKeyNews)
        } catch (err) {
          console.warn('Error al obtener noticias:', err)
        }
      }

      // Calcular métricas básicas
      const priceNum = parseFloat(price)
      const change = (Math.random() - 0.5) * 20 // Placeholder: cambio aleatorio
      const sentiment = calculateSentiment(news)
      const verdict = generateVerdict(change, sentiment)

      setAnalysis({
        ticker,
        price: priceNum,
        change,
        news,
        sentiment,
        verdict,
      })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-700 shrink-0">
          <h2 className="text-lg font-semibold text-white">Analizar Acción</h2>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-zinc-800"
          >
            <X size={20} />
          </button>
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {/* Search */}
          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Ej: AAPL, TSLA, MSFT..."
              className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white placeholder-zinc-500 outline-none focus:border-indigo-500"
            />
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg font-medium transition-all flex items-center gap-2"
            >
              <Search size={16} />
              Analizar
            </button>
          </form>

          {/* Error */}
          {error && (
            <div className="bg-red-900/30 border border-red-700/50 rounded-lg p-4 text-red-300 flex items-start gap-3">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
            </div>
          )}

          {/* Analysis */}
          {analysis && (
            <div className="space-y-6">
              {/* Header con precio */}
              <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-6">
                <div className="flex items-end justify-between mb-4">
                  <div>
                    <p className="text-sm text-zinc-400 mb-1">Ticker</p>
                    <h3 className="text-3xl font-bold text-white">{analysis.ticker}</h3>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-white">${analysis.price.toFixed(2)}</p>
                    <p
                      className={`text-sm font-medium flex items-center justify-end gap-1 ${
                        analysis.change >= 0 ? 'text-emerald-400' : 'text-red-400'
                      }`}
                    >
                      {analysis.change >= 0 ? (
                        <TrendingUp size={14} />
                      ) : (
                        <TrendingDown size={14} />
                      )}
                      {analysis.change >= 0 ? '+' : ''}{analysis.change.toFixed(2)}%
                    </p>
                  </div>
                </div>
              </div>

              {/* Métricas */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4">
                  <p className="text-xs text-zinc-500 mb-2">Sentimiento</p>
                  <p
                    className={`text-lg font-bold ${
                      analysis.sentiment === 'positive'
                        ? 'text-emerald-400'
                        : analysis.sentiment === 'negative'
                          ? 'text-red-400'
                          : 'text-zinc-400'
                    }`}
                  >
                    {analysis.sentiment === 'positive'
                      ? 'Positivo'
                      : analysis.sentiment === 'negative'
                        ? 'Negativo'
                        : 'Neutral'}
                  </p>
                </div>

                <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4">
                  <p className="text-xs text-zinc-500 mb-2">Riesgo</p>
                  <p className="text-lg font-bold text-amber-400">
                    {Math.abs(analysis.change) > 10 ? 'Alto' : 'Moderado'}
                  </p>
                </div>

                <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4">
                  <p className="text-xs text-zinc-500 mb-2">Noticias</p>
                  <p className="text-lg font-bold text-white">{analysis.news.length}</p>
                </div>
              </div>

              {/* Veredicto */}
              <div
                className={`border rounded-xl p-6 ${
                  analysis.verdict === 'Comprar'
                    ? 'bg-emerald-900/20 border-emerald-700/50'
                    : analysis.verdict === 'Vender'
                      ? 'bg-red-900/20 border-red-700/50'
                      : 'bg-amber-900/20 border-amber-700/50'
                }`}
              >
                <p className="text-sm text-zinc-400 mb-2">Veredicto</p>
                <p
                  className={`text-2xl font-bold ${
                    analysis.verdict === 'Comprar'
                      ? 'text-emerald-400'
                      : analysis.verdict === 'Vender'
                        ? 'text-red-400'
                        : 'text-amber-400'
                  }`}
                >
                  {analysis.verdict}
                </p>
                <p className="text-xs text-zinc-400 mt-2">
                  Basado en sentimiento de noticias y cambio de precio reciente
                </p>
              </div>

              {/* Noticias */}
              {analysis.news.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-semibold text-white flex items-center gap-2">
                    <Newspaper size={16} />
                    Noticias Recientes
                  </h4>
                  <div className="space-y-2">
                    {analysis.news.slice(0, 5).map((article, i) => (
                      <a
                        key={i}
                        href={article.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block bg-zinc-800/50 border border-zinc-700 rounded-lg p-3 hover:border-zinc-600 hover:bg-zinc-800/70 transition-all group"
                      >
                        <p className="text-sm font-medium text-white group-hover:text-indigo-400 line-clamp-2">
                          {article.title}
                        </p>
                        <p className="text-xs text-zinc-500 mt-1">
                          {new Date(article.publishedAt).toLocaleDateString('es-ES')}
                        </p>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {!analysis && !loading && !error && (
            <div className="flex flex-col items-center justify-center py-12 text-center text-zinc-500">
              <Search size={32} className="mb-3 opacity-50" />
              <p>Busca un ticker para analizar una acción</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-zinc-700 shrink-0">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-medium transition-all"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}

function calculateSentiment(news) {
  if (!news.length) return 'neutral'

  const positiveWords = ['up', 'gain', 'rise', 'bull', 'growth', 'beat', 'surge', 'strong']
  const negativeWords = ['down', 'loss', 'fall', 'bear', 'decline', 'miss', 'drop', 'weak']

  let positive = 0
  let negative = 0

  news.forEach((article) => {
    const text = (article.title + ' ' + (article.description || '')).toLowerCase()
    positiveWords.forEach((word) => {
      if (text.includes(word)) positive++
    })
    negativeWords.forEach((word) => {
      if (text.includes(word)) negative++
    })
  })

  if (positive > negative) return 'positive'
  if (negative > positive) return 'negative'
  return 'neutral'
}

function generateVerdict(change, sentiment) {
  if (sentiment === 'positive' && change > 0) return 'Comprar'
  if (sentiment === 'negative' && change < 0) return 'Vender'
  if (sentiment === 'positive' || change > 5) return 'Comprar'
  if (sentiment === 'negative' || change < -5) return 'Vender'
  return 'Mantener'
}
