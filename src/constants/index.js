export const ASSET_TYPES = {
  STOCK: 'stock',
  ETF: 'etf',
  CRYPTO: 'crypto',
}

export const CURRENCIES = {
  EUR: 'EUR',
  USD: 'USD',
}

export const CURRENCY_SYMBOLS = {
  EUR: '€',
  USD: '$',
}

// Doce Data free tier: 8 req/min, 800 req/día
export const TWELVE_DATA_BASE_URL = 'https://api.twelvedata.com'
export const COINGECKO_BASE_URL = 'https://api.coingecko.com/api/v3'

export const OPERATIONS = {
  BUY: 'buy',
  SELL: 'sell',
}

// localStorage keys
export const LS_POSITIONS = 'gestion_inv_positions'
export const LS_TRANSACTIONS = 'gestion_inv_transactions'
export const LS_LAST_PRICES = 'gestion_inv_last_prices'
export const LS_DISPLAY_CURRENCY = 'gestion_inv_display_currency'
export const LS_EUR_USD_RATE = 'gestion_inv_eur_usd_rate'
export const LS_API_KEY = 'gestion_inv_twelve_data_key'
export const LS_MANUAL_PRICES = 'gestion_inv_manual_prices'
export const LS_NEWS_API_KEY = 'gestion_inv_news_api_key'

// Tiempo mínimo entre actualizaciones de precio (ms) — respeta el rate limit gratuito
export const PRICE_REFRESH_INTERVAL = 60_000
