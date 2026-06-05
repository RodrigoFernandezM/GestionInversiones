export async function searchNews(ticker, apiKey) {
  if (!apiKey) throw new Error('NewsAPI key no configurada')

  const query = `${ticker} stock`
  const url = new URL('https://newsapi.org/v2/everything')
  url.searchParams.set('q', query)
  url.searchParams.set('sortBy', 'publishedAt')
  url.searchParams.set('language', 'en')
  url.searchParams.set('pageSize', '5')
  url.searchParams.set('apiKey', apiKey)

  const res = await fetch(url.toString())
  if (!res.ok) throw new Error(`NewsAPI error: ${res.status}`)

  const data = await res.json()
  return data.articles || []
}
