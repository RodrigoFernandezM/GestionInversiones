import { useState, useEffect, useCallback, useRef } from 'react'
import { refreshPrices, getLastKnownPrices, fetchEurUsdRate } from '../services/priceService'
import { PRICE_REFRESH_INTERVAL } from '../constants'

export function usePrices(priceableSymbols) {
  const [prices, setPrices] = useState(() => getLastKnownPrices())
  const [eurUsdRate, setEurUsdRate] = useState(1.08)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [lastRefresh, setLastRefresh] = useState(null)
  const timerRef = useRef(null)
  const inFlightRef = useRef(false) // mutex: evita llamadas simultáneas

  const refresh = useCallback(async () => {
    if (priceableSymbols.length === 0) return
    if (inFlightRef.current) return // ya hay una petición en curso
    inFlightRef.current = true
    setLoading(true)
    setError(null)
    try {
      const updated = await refreshPrices(priceableSymbols)
      setPrices(updated)
      setLastRefresh(new Date())
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
      inFlightRef.current = false
    }
  }, [priceableSymbols])

  useEffect(() => {
    fetchEurUsdRate().then(setEurUsdRate)
  }, [])

  useEffect(() => {
    // Pequeño retraso al montar/cambiar símbolos para dejar que
    // peticiones anteriores (del import) terminen antes de pedir precios
    const delay = setTimeout(refresh, 1500)
    timerRef.current = setInterval(refresh, PRICE_REFRESH_INTERVAL)
    return () => {
      clearTimeout(delay)
      clearInterval(timerRef.current)
    }
  }, [refresh])

  return { prices, eurUsdRate, loading, error, lastRefresh, refresh }
}
