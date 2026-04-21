import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
	fetchJson: vi.fn(),
	riskServerUrl: 'https://risk.example.com' as string | undefined
}))

vi.mock('~/constants', () => ({
	get RISK_SERVER_URL() {
		return mocks.riskServerUrl
	}
}))

vi.mock('~/utils/async', () => ({
	fetchJson: mocks.fetchJson
}))

beforeEach(() => {
	mocks.fetchJson.mockReset()
	mocks.fetchJson.mockResolvedValue(null)
	mocks.riskServerUrl = 'https://risk.example.com'
})

describe('token risk api', () => {
	it('encodes tokenChainAndAddress in lending risk requests', async () => {
		const api = await import('./api')

		await api.getTokenRiskLendingRisks('ethereum:0xabc/def?foo bar#baz')

		expect(mocks.fetchJson).toHaveBeenCalledWith(
			'https://risk.example.com/get-lending-risks/ethereum%3A0xabc%2Fdef%3Ffoo%20bar%23baz'
		)
	})
})
