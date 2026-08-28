export function isMarketingEntry(location: Pick<Location, 'pathname' | 'hash'>): boolean {
  if (location.pathname !== '/') return false
  return ['', '#product', '#workflow', '#questions'].includes(location.hash)
}
