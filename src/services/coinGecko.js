import { COINGECKO_BASE_URL } from '../constants'

// Mapeo símbolo → id de CoinGecko (ampliable)
const COIN_IDS = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  SOL: 'solana',
  BNB: 'binancecoin',
  XRP: 'ripple',
  ADA: 'cardano',
  AVAX: 'avalanche-2',
  DOT: 'polkadot',
  MATIC: 'matic-network',
  LINK: 'chainlink',
  UNI: 'uniswap',
  LTC: 'litecoin',
  ATOM: 'cosmos',
  NEAR: 'near',
  FTM: 'fantom',
  DOGE: 'dogecoin',
  SHIB: 'shiba-inu',
  TRX: 'tron',
  TON: 'the-open-network',
  SUI: 'sui',
}

export function getCoinId(symbol) {
  return COIN_IDS[symbol.toUpperCase()] ?? symbol.toLowerCase()
}

/**
 * Obtiene precios en USD para una lista de símbolos cripto.
 * Devuelve { [symbol]: priceUsd } o lanza si falla.
 */
export async function fetchCryptoPrices(symbols) {
  const ids = symbols.map(getCoinId).join(',')
  const url = `${COINGECKO_BASE_URL}/simple/price?ids=${ids}&vs_currencies=usd`

  const res = await fetch(url)
  if (!res.ok) throw new Error(`CoinGecko error ${res.status}`)
  const data = await res.json()

  const result = {}
  for (const symbol of symbols) {
    const id = getCoinId(symbol)
    if (data[id]?.usd != null) {
      result[symbol.toUpperCase()] = data[id].usd
    }
  }
  return result
}

/**
 * Busca monedas por nombre/símbolo para el autocompletado.
 */
export async function searchCoins(query) {
  const url = `${COINGECKO_BASE_URL}/search?query=${encodeURIComponent(query)}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`CoinGecko search error ${res.status}`)
  const data = await res.json()
  return (data.coins ?? []).slice(0, 10).map((c) => ({
    symbol: c.symbol.toUpperCase(),
    name: c.name,
    id: c.id,
    thumb: c.thumb,
  }))
}
