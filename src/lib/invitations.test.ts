import { afterEach, describe, expect, it } from 'vitest'
import { consumeInvitationToken, invitationLink } from './invitations'

describe('invitation URL handling', () => {
  const token = 'a'.repeat(43)

  afterEach(() => window.history.replaceState(null, '', '/'))

  it('consumes the token from a fragment and immediately removes it from the current history entry', () => {
    window.history.replaceState(null, '', `/learn?from=friend#invite/${token}`)

    expect(consumeInvitationToken()).toBe(token)
    expect(window.location.pathname).toBe('/learn')
    expect(window.location.search).toBe('?from=friend')
    expect(window.location.hash).toBe('')
  })

  it('builds a fragment-only invitation link', () => {
    expect(invitationLink(token, 'https://example.test')).toBe(`https://example.test/#invite/${token}`)
  })

  it('clears malformed fragments without returning a token', () => {
    window.history.replaceState(null, '', '/#invite/not%2Fa%2Fbase64url%2Ftoken')
    expect(consumeInvitationToken()).toBeNull()
    expect(window.location.hash).toBe('')
  })
})
