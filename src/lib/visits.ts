interface VisitResponse {
  total?: unknown
}

export async function registerVisit(): Promise<number | undefined> {
  try {
    const response = await fetch('/api/visits', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { Accept: 'application/json' },
    })
    if (!response.ok) return undefined
    const payload = await response.json() as VisitResponse
    return Number.isSafeInteger(payload.total) && Number(payload.total) >= 0
      ? Number(payload.total)
      : undefined
  } catch {
    // The counter is progressive enhancement; it must never block public reading.
    return undefined
  }
}
