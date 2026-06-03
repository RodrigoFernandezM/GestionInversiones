import { useState, useRef } from 'react'
import { X, Upload, AlertTriangle, CheckCircle, ChevronDown, ChevronUp, Loader } from 'lucide-react'
import { parseCSV } from '../utils/csvParser'
import { searchSymbol } from '../services/twelveData'
import { searchCoins } from '../services/coinGecko'
import { ASSET_TYPES, CURRENCIES } from '../constants'

const TYPE_OPTIONS = [
  { value: ASSET_TYPES.STOCK,  label: 'Acción' },
  { value: ASSET_TYPES.ETF,    label: 'ETF' },
  { value: ASSET_TYPES.CRYPTO, label: 'Cripto' },
]

function looksLikeTicker(sym) {
  return sym && sym.length <= 8 && !sym.includes(' ')
}

function isDuplicate(importRow, existingTxs) {
  // Detectar duplicado: misma fecha, símbolo, operación, unidades y precio
  return existingTxs.some(
    (tx) =>
      tx.date === importRow.date &&
      tx.symbol === importRow.symbol.toUpperCase() &&
      tx.operation === importRow.operation &&
      Math.abs(tx.units - importRow.units) < 0.000001 &&
      Math.abs(tx.priceRaw - importRow.price) < 0.000001
  )
}

export default function ImportModal({ onImport, onClose, existingTransactions = [] }) {
  const [step, setStep] = useState('upload') // upload | loading | preview | done
  const [rows, setRows] = useState([])
  const [errors, setErrors] = useState([])
  const [dragging, setDragging] = useState(false)
  const [showErrors, setShowErrors] = useState(false)
  const [loadingMsg, setLoadingMsg] = useState('')
  const [skipped, setSkipped] = useState(new Set()) // IDs de filas a saltar
  const fileRef = useRef()

  function toggleSkip(id) {
    const next = new Set(skipped)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSkipped(next)
  }

  async function processFile(file) {
    if (!file) return

    const text = await file.text()
    const { transactions, errors: errs } = parseCSV(text)
    setErrors(errs)

    if (!transactions.length) {
      setErrors(e => [...e, 'No se encontraron transacciones de compra/venta en el archivo.'])
      setStep('preview')
      setRows([])
      return
    }

    setStep('loading')

    // Agrupar por nombre único para no buscar el mismo activo dos veces
    const nameToResult = new Map() // cleanedName → { symbol, type }

    // 1. Resolver acciones/ETFs con Twelve Data (por nombre limpio)
    const stockTxs = transactions.filter(t => t.type !== ASSET_TYPES.CRYPTO)
    const uniqueNames = [...new Set(stockTxs.map(t => cleanName(t.name)))]

    for (let i = 0; i < uniqueNames.length; i++) {
      const name = uniqueNames[i]
      setLoadingMsg(`Buscando ticker ${i + 1}/${uniqueNames.length}: ${name}`)
      try {
        const results = await searchSymbol(name)
        const best = pickBestResult(results, name)
        if (best) {
          const type = best.type?.toLowerCase().includes('etf') ? ASSET_TYPES.ETF : ASSET_TYPES.STOCK
          nameToResult.set(name, { symbol: best.symbol, type })
        }
      } catch {}
      if (i < uniqueNames.length - 1) await new Promise(r => setTimeout(r, 350))
    }

    // 2. Resolver criptos con CoinGecko
    const cryptoTxs = transactions.filter(t => t.type === ASSET_TYPES.CRYPTO)
    const uniqueCryptoNames = [...new Set(cryptoTxs.map(t => t.name.toLowerCase()))]

    for (let i = 0; i < uniqueCryptoNames.length; i++) {
      const name = uniqueCryptoNames[i]
      setLoadingMsg(`Buscando cripto ${i + 1}/${uniqueCryptoNames.length}: ${name}`)
      try {
        const coins = await searchCoins(name)
        if (coins[0]) nameToResult.set(name, { symbol: coins[0].symbol.toUpperCase(), type: ASSET_TYPES.CRYPTO })
      } catch {}
      if (i < uniqueCryptoNames.length - 1) await new Promise(r => setTimeout(r, 200))
    }

    // 3. Aplicar resultados y detectar duplicados
    const enriched = transactions.map(tx => {
      const key = tx.type === ASSET_TYPES.CRYPTO
        ? tx.name.toLowerCase()
        : cleanName(tx.name)
      const found = nameToResult.get(key)
      const updated = { ...tx, symbol: found?.symbol ?? tx.symbol, type: found?.type ?? tx.type }
      // Marcar si es duplicado
      return { ...updated, _isDuplicate: isDuplicate(updated, existingTransactions) }
    })

    setRows(enriched)
    setStep('preview')
  }

  /** Limpia el nombre de la empresa eliminando sufijos de Trade Republic */
  function cleanName(name) {
    return name
      .replace(/\s*\([A-Za-z0-9]\)\s*$/, '')     // "(A)", "(B)", "(1)"
      .replace(/\bADR\b/gi, '')                     // "ADR"
      .replace(/\b(Inc|Corp|Ltd|PLC|AG|SE|NV|SA|GmbH|S\.A|S\.p\.A)\b\.?/gi, '')
      .replace(/\bGroup\b/gi, '')
      .replace(/\s+/g, ' ')
      .trim()
  }

  /** Escoge el mejor resultado de búsqueda priorizando coincidencia de nombre */
  function pickBestResult(results, cleanedName) {
    if (!results?.length) return null
    const q = cleanedName.toLowerCase()
    // 1. Coincidencia exacta de nombre
    const exact = results.find(r => r.name?.toLowerCase() === q)
    if (exact) return exact
    // 2. El nombre del resultado contiene el término buscado
    const partial = results.find(r => r.name?.toLowerCase().includes(q) || q.includes(r.name?.toLowerCase()))
    if (partial) return partial
    // 3. Primer resultado (Twelve Data ordena por relevancia)
    return results[0]
  }

  function handleDrop(e) {
    e.preventDefault()
    setDragging(false)
    processFile(e.dataTransfer.files[0])
  }

  function handleFile(e) {
    processFile(e.target.files[0])
  }

  function updateRow(id, field, value) {
    setRows(prev => prev.map(r => r._id === id ? { ...r, [field]: value } : r))
  }

  function removeRow(id) {
    setRows(prev => prev.filter(r => r._id !== id))
  }

  function handleImport() {
    const valid = rows.filter(
      r => !skipped.has(r._id) && r.symbol?.trim() && r.units > 0 && r.price > 0
    )
    for (const row of valid) {
      onImport({
        operation: row.operation,
        type: row.type,
        symbol: row.symbol.toUpperCase().trim(),
        name: row.name,
        units: String(row.units),
        price: String(row.price),
        currency: row.currency,
        date: row.date,
        commission: String(row.commission || 0),
        notes: '',
      })
    }
    setStep('done')
  }

  const duplicateCount = rows.filter(r => r._isDuplicate).length
  const validCount = rows.filter(
    r => !skipped.has(r._id) && r.symbol?.trim() && r.units > 0 && r.price > 0
  ).length
  const pendingCount = rows.filter(r => !skipped.has(r._id) && !looksLikeTicker(r.symbol)).length

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-700 shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-white">Importar desde CSV</h2>
            <p className="text-zinc-500 text-xs mt-0.5">Trade Republic · Los tickers se resuelven automáticamente por ISIN</p>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-zinc-800">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* STEP: Upload */}
          {step === 'upload' && (
            <div className="p-6 space-y-4">
              <div
                onDragOver={e => { e.preventDefault(); setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileRef.current.click()}
                className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all ${
                  dragging ? 'border-indigo-500 bg-indigo-500/10' : 'border-zinc-700 hover:border-zinc-500 hover:bg-zinc-800/30'
                }`}
              >
                <Upload size={32} className="mx-auto mb-3 text-zinc-500" />
                <p className="text-zinc-300 font-medium mb-1">Arrastra tu CSV aquí o haz clic para seleccionar</p>
                <p className="text-zinc-600 text-sm">Los tickers se resuelven solos mediante el ISIN de cada activo</p>
                <input ref={fileRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleFile} />
              </div>

              <div className="bg-zinc-800/50 rounded-xl p-4 text-sm text-zinc-400 space-y-1">
                <p className="text-zinc-300 font-medium mb-2">Cómo exportar desde Trade Republic:</p>
                <p>1. App → Perfil (icono arriba a la derecha)</p>
                <p>2. Documentos → selecciona el período</p>
                <p>3. Pulsa "Exportar" → formato CSV</p>
                <p className="text-zinc-600 mt-2">Los pagos con tarjeta, transferencias y dividendos se filtran automáticamente.</p>
              </div>
            </div>
          )}

          {/* STEP: Loading */}
          {step === 'loading' && (
            <div className="flex flex-col items-center justify-center py-20 gap-5">
              <Loader size={36} className="animate-spin text-indigo-400" />
              <div className="text-center">
                <p className="text-white font-medium">{loadingMsg}</p>
                <p className="text-zinc-500 text-sm mt-1">Consultando la base de datos de instrumentos financieros…</p>
              </div>
            </div>
          )}

          {/* STEP: Preview */}
          {step === 'preview' && (
            <div className="p-4 space-y-3">
              <div className="flex items-center gap-4 px-1 flex-wrap">
                <div className="flex items-center gap-2 text-emerald-400 text-sm">
                  <CheckCircle size={14} />
                  <span><strong>{validCount}</strong> transacciones listas</span>
                </div>
                {duplicateCount > 0 && (
                  <div className="flex items-center gap-1.5 text-red-400 text-sm">
                    <AlertTriangle size={14} />
                    <span>{duplicateCount} duplicadas — haz clic para saltarlas</span>
                  </div>
                )}
                {pendingCount > 0 && (
                  <div className="flex items-center gap-1.5 text-amber-400 text-sm">
                    <AlertTriangle size={14} />
                    <span>{pendingCount} sin ticker — edítalos antes de importar</span>
                  </div>
                )}
                {errors.length > 0 && (
                  <button onClick={() => setShowErrors(s => !s)} className="flex items-center gap-1.5 text-zinc-500 hover:text-zinc-300 text-sm">
                    {errors.length} ignoradas {showErrors ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  </button>
                )}
              </div>

              {showErrors && (
                <div className="bg-zinc-800/50 rounded-xl p-3 space-y-1">
                  {errors.map((e, i) => <p key={i} className="text-zinc-500 text-xs">{e}</p>)}
                  <p className="text-zinc-600 text-xs mt-1">Pagos con tarjeta, transferencias y dividendos se ignoran automáticamente.</p>
                </div>
              )}

              {rows.length === 0 ? (
                <div className="text-center py-12 text-zinc-500">
                  <p>No se encontraron transacciones de compra/venta.</p>
                  <p className="text-xs mt-1">Comprueba que el archivo es el correcto.</p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-zinc-800">
                  <table className="w-full text-xs min-w-[780px]">
                    <thead>
                      <tr className="border-b border-zinc-800 text-zinc-500 uppercase tracking-wider">
                        <th className="px-3 py-2 text-left">Tipo</th>
                        <th className="px-3 py-2 text-left">Fecha</th>
                        <th className="px-3 py-2 text-left">Nombre</th>
                        <th className="px-3 py-2 text-left">Símbolo</th>
                        <th className="px-3 py-2 text-left">Activo</th>
                        <th className="px-3 py-2 text-right">Unidades</th>
                        <th className="px-3 py-2 text-right">Precio</th>
                        <th className="px-3 py-2 text-right">Comis.</th>
                        <th className="px-3 py-2 text-center">Mon.</th>
                        <th className="px-3 py-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map(row => {
                        const ok = looksLikeTicker(row.symbol)
                        const isSkipped = skipped.has(row._id)
                        return (
                          <tr
                            key={row._id}
                            className={`border-b border-zinc-800/50 transition-all ${
                              isSkipped
                                ? 'opacity-40 bg-zinc-800/20'
                                : row._isDuplicate
                                  ? 'hover:bg-red-900/20 bg-red-900/5'
                                  : 'hover:bg-zinc-800/20'
                            }`}
                          >
                            <td className="px-3 py-2">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                row.operation === 'buy' ? 'bg-emerald-900/40 text-emerald-400' : 'bg-red-900/40 text-red-400'
                              }`}>
                                {row.operation === 'buy' ? 'Compra' : 'Venta'}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-zinc-400">{row.date}</td>
                            <td className="px-3 py-2 text-zinc-300 max-w-[140px] truncate" title={row.name}>{row.name}</td>
                            <td className="px-3 py-2">
                              <div className="relative inline-block">
                                <input
                                  value={row.symbol}
                                  onChange={e => updateRow(row._id, 'symbol', e.target.value)}
                                  className={`w-24 bg-zinc-800 border rounded px-2 py-1 text-white uppercase outline-none focus:border-indigo-500 text-xs ${
                                    ok ? 'border-zinc-700' : 'border-amber-600/70'
                                  }`}
                                  placeholder="AAPL"
                                />
                                {!ok && <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-500" />}
                              </div>
                            </td>
                            <td className="px-3 py-2">
                              <select
                                value={row.type}
                                onChange={e => updateRow(row._id, 'type', e.target.value)}
                                className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-zinc-300 outline-none text-xs"
                              >
                                {TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                              </select>
                            </td>
                            <td className="px-3 py-2 text-right text-zinc-300">{row.units}</td>
                            <td className="px-3 py-2 text-right text-zinc-300">{row.price}</td>
                            <td className="px-3 py-2 text-right text-zinc-500">{row.commission || '—'}</td>
                            <td className="px-3 py-2 text-center">
                              <select
                                value={row.currency}
                                onChange={e => updateRow(row._id, 'currency', e.target.value)}
                                className="bg-zinc-800 border border-zinc-700 rounded px-1 py-1 text-zinc-300 outline-none text-xs"
                              >
                                {Object.values(CURRENCIES).map(c => <option key={c}>{c}</option>)}
                              </select>
                            </td>
                            <td className="px-3 py-2">
                              {row._isDuplicate ? (
                                <button
                                  onClick={() => toggleSkip(row._id)}
                                  className={`transition-colors ${
                                    isSkipped ? 'text-zinc-600 hover:text-zinc-500' : 'text-red-600 hover:text-red-500'
                                  }`}
                                  title={isSkipped ? 'Importar de todos modos' : 'Saltar este duplicado'}
                                >
                                  {isSkipped ? '✓' : '⚠️'}
                                </button>
                              ) : (
                                <button onClick={() => removeRow(row._id)} className="text-zinc-700 hover:text-red-400 transition-colors">
                                  <X size={13} />
                                </button>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* STEP: Done */}
          {step === 'done' && (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <div className="w-16 h-16 rounded-2xl bg-emerald-900/30 flex items-center justify-center">
                <CheckCircle size={32} className="text-emerald-400" />
              </div>
              <p className="text-white font-semibold text-lg">¡Importación completada!</p>
              <p className="text-zinc-400 text-sm">{validCount} transacciones añadidas a tu cartera.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-zinc-700 flex justify-end gap-3 shrink-0">
          {step === 'upload' && (
            <button onClick={onClose} className="px-4 py-2 rounded-xl border border-zinc-700 text-zinc-400 hover:text-white text-sm transition-all">
              Cancelar
            </button>
          )}
          {step === 'loading' && (
            <button onClick={onClose} className="px-4 py-2 rounded-xl border border-zinc-700 text-zinc-400 hover:text-white text-sm transition-all">
              Cancelar
            </button>
          )}
          {step === 'preview' && (
            <>
              <button onClick={() => setStep('upload')} className="px-4 py-2 rounded-xl border border-zinc-700 text-zinc-400 hover:text-white text-sm transition-all">
                ← Volver
              </button>
              <button
                onClick={handleImport}
                disabled={validCount === 0}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-sm font-medium transition-all"
              >
                Importar {validCount} transacciones
              </button>
            </>
          )}
          {step === 'done' && (
            <button onClick={onClose} className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-all">
              Cerrar
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
