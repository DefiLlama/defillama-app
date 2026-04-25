import { beforeEach, describe, expect, it, vi } from 'vitest'

const { fetchJsonMock } = vi.hoisted(() => ({ fetchJsonMock: vi.fn() }))

vi.mock('~/utils/async', () => ({ fetchJson: fetchJsonMock }))

import {
	fetchStablecoinChainVolumeChartApi,
	fetchStablecoinTokenVolumeChartApi,
	fetchStablecoinVolumeChartApi,
	normalizeStablecoinVolumeChain
} from './api'

beforeEach(() => {
	vi.clearAllMocks()
	fetchJsonMock.mockResolvedValue([])
})

describe('stablecoin volume api fetchers', () => {
	it('normalizes chain path params for scoped volume routes', async () => {
		expect(normalizeStablecoinVolumeChain('zkSync Era')).toBe('era')

		await fetchStablecoinChainVolumeChartApi('zkSync Era', 'token')

		expect(fetchJsonMock).toHaveBeenCalledWith(expect.stringContaining('/chart/volume/chain/era/token-breakdown'))
	})

	it('uses global volume routes', async () => {
		await fetchStablecoinVolumeChartApi('currency')

		expect(fetchJsonMock).toHaveBeenCalledWith(expect.stringContaining('/chart/volume/currency-breakdown'))
	})

	it('preserves token symbols for scoped token routes', async () => {
		await fetchStablecoinTokenVolumeChartApi('USDT', 'chain')

		expect(fetchJsonMock).toHaveBeenCalledWith(expect.stringContaining('/chart/volume/token/USDT/chain-breakdown'))
	})
})
