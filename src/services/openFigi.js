/**
 * OpenFIGI — mapeo gratuito de ISIN a ticker.
 * https://www.openfigi.com/api
 * Sin clave API: 10 ISINs por petición, 25 req/min
 */

const OPENFIGI_URL = 'https://api.openfigi.com/v3/mapping'
const BATCH_SIZE = 10

// Códigos de exchange preferidos (principales bolsas USA)
const US_EXCHANGES = new Set(['US', 'UA', 'UN', 'UW', 'UQ', 'UR'])

function pickBestMatch(matches) {
  if (!matches?.length) return null
  // Priorizar listings en bolsas americanas para mayor compatibilidad con Twelve Data
  return (
    matches.find(m => US_EXCHANGES.has(m.exchCode)) ??
    matches.find(m => m.marketSector === 'Equity') ??
    matches[0]
  )
}

function inferType(match) {
  const s1 = (match.securityType ?? '').toLowerCase()
  const s2 = (match.securityType2 ?? '').toLowerCase()
  const name = (match.name ?? '').toLowerCase()
  if (s1.includes('etf') || s2.includes('etf') || s1.includes('etp') ||
      name.includes('etf') || name.includes('etc') || name.includes('ishares') ||
      name.includes('xtrackers') || name.includes('vanguard') || name.includes('amundi')) {
    return 'etf'
  }
  return 'stock'
}

/**
 * Resuelve un array de ISINs a tickers.
 * Devuelve Map<isin, { symbol, type }>.
 */
export async function lookupIsins(isins) {
  const unique = [...new Set(isins.filter(Boolean))]
  const results = new Map()
  if (!unique.length) return results

  const batches = []
  for (let i = 0; i < unique.length; i += BATCH_SIZE) {
    batches.push(unique.slice(i, i + BATCH_SIZE))
  }

  for (let b = 0; b < batches.length; b++) {
    const batch = batches[b]
    const body = batch.map(isin => ({ idType: 'ID_ISIN', idValue: isin }))

    try {
      const res = await fetch(OPENFIGI_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        console.warn('OpenFIGI error:', res.status)
        continue
      }
      const data = await res.json()

      for (let i = 0; i < batch.length; i++) {
        const match = pickBestMatch(data[i]?.data)
        if (!match?.ticker) continue
        results.set(batch[i], {
          symbol: match.ticker.trim().toUpperCase(),
          type: inferType(match),
          name: match.name,
          exchange: match.exchCode,
        })
      }
    } catch (err) {
      console.warn('OpenFIGI fallo en batch:', err.message)
    }

    // Pausa entre lotes para respetar el rate limit
    if (b < batches.length - 1) await new Promise(r => setTimeout(r, 1200))
  }

  return results
}
