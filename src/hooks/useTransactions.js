import { useCallback, useMemo } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { useLocalStorage } from './useLocalStorage'
import { LS_TRANSACTIONS, LS_DISPLAY_CURRENCY, CURRENCIES } from '../constants'
import { toUsd } from '../utils/calculations'

/**
 * Modelo de una transacción:
 * {
 *   id: string,
 *   operation: 'buy' | 'sell',
 *   type: 'stock' | 'etf' | 'crypto',
 *   symbol: string,
 *   name: string,
 *   units: number,
 *   priceUsd: number,       // precio normalizado a USD
 *   priceRaw: number,       // precio tal como lo introdujo el usuario
 *   currency: 'EUR'|'USD',
 *   date: string,           // 'YYYY-MM-DD'
 *   notes: string,
 * }
 */
export function useTransactions() {
  const [transactions, setTransactions] = useLocalStorage(LS_TRANSACTIONS, [])
  const [displayCurrency, setDisplayCurrency] = useLocalStorage(
    LS_DISPLAY_CURRENCY,
    CURRENCIES.EUR,
  )

  const addTransaction = useCallback(
    (formData, eurUsdRate = 1.08) => {
      const commissionRaw = parseFloat(formData.commission) || 0
      const tx = {
        id: uuidv4(),
        operation: formData.operation,
        type: formData.type,
        symbol: formData.symbol.toUpperCase().trim(),
        name: formData.name.trim(),
        units: parseFloat(formData.units),
        priceRaw: parseFloat(formData.price),
        currency: formData.currency,
        priceUsd: toUsd(parseFloat(formData.price), formData.currency, eurUsdRate),
        commissionRaw,
        commissionUsd: toUsd(commissionRaw, formData.currency, eurUsdRate),
        date: formData.date,
        notes: formData.notes ?? '',
      }
      setTransactions((prev) => [...prev, tx])
      return tx
    },
    [setTransactions],
  )

  const updateTransaction = useCallback(
    (id, formData, eurUsdRate = 1.08) => {
      const commissionRaw = parseFloat(formData.commission) || 0
    setTransactions((prev) =>
        prev.map((t) =>
          t.id !== id
            ? t
            : {
                ...t,
                operation: formData.operation,
                type: formData.type,
                symbol: formData.symbol.toUpperCase().trim(),
                name: formData.name.trim(),
                units: parseFloat(formData.units),
                priceRaw: parseFloat(formData.price),
                currency: formData.currency,
                priceUsd: toUsd(parseFloat(formData.price), formData.currency, eurUsdRate),
                commissionRaw,
                commissionUsd: toUsd(commissionRaw, formData.currency, eurUsdRate),
                date: formData.date,
                notes: formData.notes ?? '',
              },
        ),
      )
    },
    [setTransactions],
  )

  const removeTransaction = useCallback(
    (id) => setTransactions((prev) => prev.filter((t) => t.id !== id)),
    [setTransactions],
  )

  // Cambia el símbolo de TODAS las transacciones de un activo a la vez
  const renameSymbol = useCallback(
    (oldSymbol, newSymbol) => {
      const clean = newSymbol.toUpperCase().trim()
      if (!clean || clean === oldSymbol) return
      setTransactions((prev) =>
        prev.map((t) => t.symbol === oldSymbol ? { ...t, symbol: clean } : t),
      )
    },
    [setTransactions],
  )

  // Lista de símbolos únicos con su tipo para el servicio de precios
  // Solo pedir precios de posiciones con unidades abiertas — ahorra cuota de API
  const priceableSymbols = useMemo(() => {
    const meta = new Map()   // symbol → { symbol, type }
    const units = new Map()  // symbol → openUnits

    for (const tx of transactions) {
      if (!meta.has(tx.symbol)) meta.set(tx.symbol, { symbol: tx.symbol, type: tx.type })
      const prev = units.get(tx.symbol) ?? 0
      units.set(tx.symbol, tx.operation === 'buy' ? prev + tx.units : prev - tx.units)
    }

    return [...meta.values()].filter((s) => (units.get(s.symbol) ?? 0) > 0.000001)
  }, [transactions])

  return {
    transactions,
    displayCurrency,
    setDisplayCurrency,
    addTransaction,
    updateTransaction,
    removeTransaction,
    renameSymbol,
    priceableSymbols,
  }
}
