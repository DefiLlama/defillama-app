import { afterEach, describe, expect, it, vi } from 'vitest'

const fetchProtocolEmissionMock = vi.fn<(...args: unknown[]) => Promise<any>>()
const fetchAllProtocolEmissionsMock = vi.fn<(...args: unknown[]) => Promise<any[]>>(() => Promise.resolve([]))
const fetchCoinPricesMock = vi.fn<(...args: unknown[]) => Promise<Record<string, unknown>>>(() => Promise.resolve({}))
const fetchJsonMock = vi.fn<(...args: unknown[]) => Promise<unknown>>(() => Promise.resolve([]))

vi.mock('~/api', () => ({
	fetchCoinPrices: (...args: unknown[]) => fetchCoinPricesMock(...args)
}))

vi.mock('~/utils', () => ({
	batchFetchHistoricalPrices: vi.fn(),
	capitalizeFirstLetter: (value: string) => value.charAt(0).toUpperCase() + value.slice(1),
	getNDistinctColors: (count: number) => Array.from({ length: count }, (_, index) => `#${index}`),
	roundToNearestHalfHour: (timestamp: number) => timestamp
}))

vi.mock('~/utils/async', () => ({
	fetchJson: (...args: unknown[]) => fetchJsonMock(...args),
	getSlowJsonTimeoutMs: () => 1000
}))

vi.mock('../api', () => ({
	fetchProtocolEmission: (...args: unknown[]) => fetchProtocolEmissionMock(...args),
	fetchAllProtocolEmissions: (...args: unknown[]) => fetchAllProtocolEmissionsMock(...args)
}))

import { getAllProtocolEmissions, getProtocolEmissons, isEmptyProtocolEmissionResult } from '../queries'

describe('getProtocolEmissons', () => {
	afterEach(() => {
		fetchProtocolEmissionMock.mockReset()
		fetchAllProtocolEmissionsMock.mockClear()
		fetchCoinPricesMock.mockClear()
		fetchJsonMock.mockClear()
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
			gecko_id: 'chainlink',
			metadata: {
				events: [],
				token: 'coingecko:chainlink',
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

	it('uses tokenlist prices for protocol emissions without fetching current coin prices', async () => {
		fetchProtocolEmissionMock.mockResolvedValue({
			name: 'Chainlink',
			gecko_id: 'chainlink',
			metadata: {
				events: [],
				token: 'coingecko:chainlink',
				notes: []
			},
			documentedData: {
				data: [
					{
						label: 'team',
						data: [{ timestamp: 1, unlocked: 10 }]
					}
				],
				tokenAllocation: {}
			},
			realTimeData: {
				data: [],
				tokenAllocation: {}
			}
		})

		const result = await getProtocolEmissons('chainlink', {
			skipAvailabilityCheck: true,
			tokenlist: {
				chainlink: {
					current_price: 12.34,
					symbol: 'link'
				}
			}
		})

		expect(fetchCoinPricesMock).not.toHaveBeenCalled()
		expect(result.tokenPrice).toEqual({ price: 12.34, symbol: 'LINK' })
	})

	it('reuses colors across chained colorFrom remaps', async () => {
		fetchProtocolEmissionMock.mockResolvedValue({
			name: 'Chainlink',
			metadata: {
				events: [],
				token: 'coingecko:chainlink',
				notes: []
			},
			documentedData: {
				data: [
					{
						label: 'alpha',
						data: [{ timestamp: 1, unlocked: 10 }]
					},
					{
						label: 'charlie',
						data: [{ timestamp: 1, unlocked: 20 }]
					},
					{
						label: 'bravo',
						data: [{ timestamp: 1, unlocked: 30 }]
					}
				],
				tokenAllocation: {
					Alpha: 10,
					Bravo: 30,
					Charlie: 20
				}
			},
			realTimeData: {
				data: [],
				tokenAllocation: {}
			},
			componentData: {
				sections: {
					Alpha: {},
					Bravo: { colorFrom: 'Alpha' },
					Charlie: { colorFrom: 'Bravo' }
				}
			}
		})

		const result = await getProtocolEmissons('chainlink', {
			skipAvailabilityCheck: true
		})

		expect(result.stackColors.documented).toMatchObject({
			Alpha: '#0',
			Bravo: '#0',
			Charlie: '#0'
		})
	})
})

describe('getAllProtocolEmissions', () => {
	afterEach(() => {
		fetchAllProtocolEmissionsMock.mockReset()
		fetchProtocolEmissionMock.mockClear()
		fetchCoinPricesMock.mockClear()
		fetchJsonMock.mockClear()
	})

	it('uses tokenlist prices without fetching current coin prices', async () => {
		const nowSec = Date.now() / 1000
		fetchAllProtocolEmissionsMock.mockResolvedValue([
			{
				name: 'Chainlink',
				gecko_id: 'chainlink',
				events: [{ timestamp: nowSec + 3600, noOfTokens: [10] }]
			}
		])

		const result = await getAllProtocolEmissions({
			getHistoricalPrices: false,
			tokenlist: {
				chainlink: {
					current_price: 7.89,
					symbol: 'link'
				}
			}
		})

		expect(fetchCoinPricesMock).not.toHaveBeenCalled()
		expect(result).toHaveLength(1)
		expect(result[0]).toMatchObject({
			tPrice: 7.89,
			tSymbol: 'LINK'
		})
	})
})
