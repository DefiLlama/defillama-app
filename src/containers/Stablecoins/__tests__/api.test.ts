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

	it('normalizes total volume rows at the fetch boundary', async () => {
		fetchJsonMock.mockResolvedValueOnce([
			[1609459200, '100'],
			['bad-date', 50],
			[1609545600, { Ethereum: 10 }],
			[1609632000, 0]
		])

		await expect(fetchStablecoinVolumeChartApi('total')).resolves.toEqual([
			[1609459200, 100],
			[1609632000, 0]
		])
	})

	it('normalizes breakdown volume rows at the fetch boundary', async () => {
		fetchJsonMock.mockResolvedValueOnce([
			[1609459200, { Ethereum: '100', Base: 0, Bad: 'nope', Missing: null }],
			['bad-date', { Ethereum: 50 }],
			[1609545600, 125],
			[1609632000, { Tron: 25 }]
		])

		await expect(fetchStablecoinVolumeChartApi('chain')).resolves.toEqual([
			[1609459200, { Ethereum: 100, Base: 0 }],
			[1609632000, { Tron: 25 }]
		])
	})

	it('preserves token symbols for scoped token routes', async () => {
		await fetchStablecoinTokenVolumeChartApi('USDT', 'chain')

		expect(fetchJsonMock).toHaveBeenCalledWith(expect.stringContaining('/chart/volume/token/USDT/chain-breakdown'))
	})
})
