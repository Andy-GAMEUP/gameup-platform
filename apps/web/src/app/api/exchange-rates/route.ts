export async function GET() {
  const res = await fetch('https://api.frankfurter.app/latest?from=USD&to=KRW,JPY,CNY,EUR', {
    next: { revalidate: 0 },
  })
  if (!res.ok) return Response.json({ error: 'fetch failed' }, { status: 502 })
  const data = await res.json()
  return Response.json(data)
}
