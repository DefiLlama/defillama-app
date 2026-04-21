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
	it('requests the lending exposures snapshot', async () => {
		const api = await import('./api')

		await api.getTokenRiskLendingExposures()

		expect(mocks.fetchJson).toHaveBeenCalledWith('https://risk.example.com/get-lending-exposures')
	})
})
