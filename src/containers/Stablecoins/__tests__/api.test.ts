import { beforeEach, describe, expect, it, vi } from 'vitest'

const { fetchJsonMock } = vi.hoisted(() => ({ fetchJsonMock: vi.fn() }))

vi.mock('~/utils/async', () => ({ fetchJson: fetchJsonMock }))

import {
	fetchStablecoinChainVolumeChartApi,
	fetchStablecoinTokenVolumeChartApi,
	fetchStablecoinVolumeChartApi
} from '../api'

const chainMetadata = {
	'zksync-era': { id: 'era', name: 'ZKsync Era' }
}

beforeEach(() => {
	vi.clearAllMocks()
	fetchJsonMock.mockResolvedValue([])
})

describe('stablecoin volume api fetchers', () => {
	it('resolves chain display names to metadata ids for scoped volume routes', async () => {
		await fetchStablecoinChainVolumeChartApi('zkSync Era', 'token', chainMetadata)

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
