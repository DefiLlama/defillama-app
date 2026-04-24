import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
	fetchJson: vi.fn(),
	datasetsServerUrl: 'https://datasets.example.com',
	serverUrl: 'https://api.example.com'
}))

vi.mock('~/constants', () => ({
	get DATASETS_SERVER_URL() {
		return mocks.datasetsServerUrl
	},
	get SERVER_URL() {
		return mocks.serverUrl
	}
}))

vi.mock('~/utils/async', () => ({
	fetchJson: mocks.fetchJson
}))

beforeEach(() => {
	vi.resetModules()
	mocks.fetchJson.mockReset()
	mocks.datasetsServerUrl = 'https://datasets.example.com'
	mocks.serverUrl = 'https://api.example.com'
})

describe('unlocks api', () => {
	it('fetches protocol emission details from the datasets endpoint', async () => {
		mocks.fetchJson.mockResolvedValue({
			name: 'Chainlink',
			metadata: {},
			documentedData: { data: [] }
		})

		const api = await import('./api')
		const result = await api.fetchProtocolEmission('chain/link')

		expect(mocks.fetchJson).toHaveBeenCalledWith('https://datasets.example.com/emissions/chain%2Flink')
		expect(mocks.fetchJson).toHaveBeenCalledTimes(1)
		expect(result?.name).toBe('Chainlink')
	})

	it('returns null for invalid datasets emission payloads', async () => {
		mocks.fetchJson.mockResolvedValue({
			body: JSON.stringify({
				name: 'Chainlink',
				metadata: {},
				documentedData: { data: [] }
			})
		})

		const api = await import('./api')
		const result = await api.fetchProtocolEmission('chainlink')

		expect(result).toBeNull()
		expect(mocks.fetchJson).toHaveBeenCalledTimes(1)
	})
})
