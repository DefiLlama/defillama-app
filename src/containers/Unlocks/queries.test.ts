import { afterEach, describe, expect, it, vi } from 'vitest'

const fetchProtocolEmissionMock = vi.fn()
const fetchAllProtocolEmissionsMock = vi.fn(() => Promise.resolve([]))
const fetchCoinPricesMock = vi.fn(() => Promise.resolve({}))

vi.mock('~/api', () => ({
	fetchCoinPrices: (...args: unknown[]) => fetchCoinPricesMock(...args)
}))

vi.mock('~/utils', () => ({
	batchFetchHistoricalPrices: vi.fn(),
	capitalizeFirstLetter: (value: string) => value.charAt(0).toUpperCase() + value.slice(1),
	getNDistinctColors: (count: number) => Array.from({ length: count }, (_, index) => `#${index}`),
	roundToNearestHalfHour: (timestamp: number) => timestamp
}))

vi.mock('./api', () => ({
	fetchProtocolEmission: (...args: unknown[]) => fetchProtocolEmissionMock(...args),
	fetchAllProtocolEmissions: (...args: unknown[]) => fetchAllProtocolEmissionsMock(...args)
}))

import { getProtocolEmissons, isEmptyProtocolEmissionResult } from './queries'

describe('getProtocolEmissons', () => {
	afterEach(() => {
		fetchProtocolEmissionMock.mockReset()
		fetchAllProtocolEmissionsMock.mockClear()
		fetchCoinPricesMock.mockClear()
	})

	it('returns the empty result without fetching protocol data when the cached emissions list misses', async () => {
		const result = await getProtocolEmissons('chainlink', {
			emissionsProtocolsList: ['aave']
		})

		expect(isEmptyProtocolEmissionResult(result)).toBe(true)
		expect(fetchProtocolEmissionMock).not.toHaveBeenCalled()
		expect(fetchAllProtocolEmissionsMock).not.toHaveBeenCalled()
	})

	it('skips the availability check when explicitly told the slug is already valid', async () => {
		fetchProtocolEmissionMock.mockResolvedValue({
			name: 'Chainlink',
			metadata: {
				events: [],
				token: 'coingecko:chainlink',
				sources: [],
				notes: []
			},
			documentedData: {
				data: [
					{
						label: 'team',
						data: [{ timestamp: 1, unlocked: 10 }]
					}
				],
				tokenAllocation: {
					Team: 10
				}
			},
			realTimeData: {
				data: [],
				tokenAllocation: {}
			}
		})

		const result = await getProtocolEmissons('chainlink', {
			skipAvailabilityCheck: true
		})

		expect(fetchProtocolEmissionMock).toHaveBeenCalledWith('chainlink')
		expect(isEmptyProtocolEmissionResult(result)).toBe(false)
		expect(result.categories.documented).toEqual(['Team'])
	})
})
