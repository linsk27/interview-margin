const INVITE_HASH_PREFIX = '#invite/'
const INVITE_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/

/**
 * Pull an invitation token out of the URL fragment and immediately remove it
 * from the address bar/history entry. Fragments are not sent in HTTP requests,
 * and all later invitation API calls use a fixed URL with the token in JSON.
 */
export function consumeInvitationToken(location: Location = window.location, history: History = window.history): string | null {
  if (!location.hash.startsWith(INVITE_HASH_PREFIX)) return null

  const encodedToken = location.hash.slice(INVITE_HASH_PREFIX.length)
  let token = ''
  try {
    token = decodeURIComponent(encodedToken)
  } catch {
    token = ''
  }

  history.replaceState(null, '', `${location.pathname}${location.search}`)
  return INVITE_TOKEN_PATTERN.test(token) ? token : null
}

export function invitationLink(token: string, origin: string = window.location.origin): string {
  return `${origin}/#invite/${encodeURIComponent(token)}`
}
