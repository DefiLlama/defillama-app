import { describe, expect, it } from 'vitest'
import { shouldConsumeSlackLoginToken } from '~/containers/LlamaAI/hooks/useSettingsRouteIntent'

describe('shouldConsumeSlackLoginToken', () => {
	it('allows the first Slack login token and suppresses duplicate consumption', () => {
		expect(shouldConsumeSlackLoginToken(null, 'slack-token')).toBe(true)
		expect(shouldConsumeSlackLoginToken('slack-token', 'slack-token')).toBe(false)
	})

	it('allows a different Slack login token after one was consumed', () => {
		expect(shouldConsumeSlackLoginToken('old-token', 'new-token')).toBe(true)
		expect(shouldConsumeSlackLoginToken('old-token', null)).toBe(false)
	})
})
