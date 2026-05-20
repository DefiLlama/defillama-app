import { afterEach, describe, expect, it, vi } from 'vitest'

const fetchProtocolEmissionMock = vi.fn<(...args: unknown[]) => Promise<any>>()
const fetchAllProtocolEmissionsMock = vi.fn<(...args: unknown[]) => Promise<any[]>>(() => Promise.resolve([]))
const fetchCoinPricesMock = vi.fn<(...args: unknown[]) => Promise<Record<string, unknown>>>(() => Promise.resolve({}))
const fetchJsonMock = vi.fn<(...args: unknown[]) => Promise<unknown>>(() => Promise.resolve([]))
const batchFetchHistoricalPricesMock = vi.fn<(...args: unknown[]) => Promise<{ results: Record<string, unknown> }>>(
	() => Promise.resolve({ results: {} })
)

vi.mock('~/api', () => ({
	fetchCoinPrices: (...args: unknown[]) => fetchCoinPricesMock(...args)
}))

vi.mock('~/utils', () => ({
	batchFetchHistoricalPrices: (...args: unknown[]) => batchFetchHistoricalPricesMock(...args),
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

import { buildUnlocksHistoricalPriceRequests } from '~/utils/unlocks/historicalPriceRequests'
import { getAllProtocolEmissions, getProtocolEmissons, isEmptyProtocolEmissionResult } from '../queries'

describe('getProtocolEmissons', () => {
	afterEach(() => {
		vi.restoreAllMocks()
		fetchProtocolEmissionMock.mockReset()
		fetchAllProtocolEmissionsMock.mockClear()
		fetchCoinPricesMock.mockClear()
		fetchJsonMock.mockClear()
		batchFetchHistoricalPricesMock.mockClear()
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
		vi.restoreAllMocks()
		fetchAllProtocolEmissionsMock.mockReset()
		fetchProtocolEmissionMock.mockClear()
		fetchCoinPricesMock.mockClear()
		fetchJsonMock.mockClear()
		batchFetchHistoricalPricesMock.mockClear()
	})

	it('builds historical price requests around the latest eligible past unlock', () => {
		const day = 86_400
		const nowSec = 1_700_000_000
		const lastPastEvent = Math.floor((nowSec - 8 * day) / 1800) * 1800
		const anchor = Math.floor(lastPastEvent / day) * day

		const result = buildUnlocksHistoricalPriceRequests(
			[
				{
					name: 'Chainlink',
					token: 'coingecko:chainlink',
					gecko_id: 'chainlink',
					events: [
						{ timestamp: nowSec - 60 * day, noOfTokens: [1] },
						{ timestamp: lastPastEvent, noOfTokens: [2], category: 'team' },
						{ timestamp: nowSec - 8 * day + 3600, noOfTokens: [3], category: 'farming' },
						{ timestamp: nowSec + day, noOfTokens: [4] }
					]
				}
			],
			nowSec
		)

		expect(result.lastPastTimestampByCoinKey.get('coingecko:chainlink')).toBe(lastPastEvent)
		expect(result.priceReqs['coingecko:chainlink']).toEqual([
			anchor - 7 * day,
			anchor - 6 * day,
			anchor - 5 * day,
			anchor - 4 * day,
			anchor - 3 * day,
			anchor - 2 * day,
			anchor - day,
			anchor,
			anchor + day,
			anchor + 2 * day,
			anchor + 3 * day,
			anchor + 4 * day,
			anchor + 5 * day,
			anchor + 6 * day,
			anchor + 7 * day
		])
	})

	it('uses tokenlist prices without fetching current coin prices', async () => {
		const nowSec = Date.now() / 1000
		fetchAllProtocolEmissionsMock.mockResolvedValue([
			{
				name: 'Chainlink',
				token: 'coingecko:chainlink',
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

	it('uses artifact historical prices without fetching historical coin prices', async () => {
		const day = 86_400
		const nowSec = 1_700_000_000
		const lastPastEvent = Math.floor((nowSec - 8 * day) / 1800) * 1800
		const dateNow = vi.spyOn(Date, 'now').mockReturnValue(nowSec * 1000)

		fetchAllProtocolEmissionsMock.mockResolvedValue([
			{
				name: 'Chainlink',
				token: 'coingecko:chainlink',
				gecko_id: 'chainlink',
				events: [
					{ timestamp: nowSec - 60 * day, noOfTokens: [1], category: 'team' },
					{ timestamp: lastPastEvent, noOfTokens: [10], category: 'team' },
					{ timestamp: nowSec + day, noOfTokens: [20], category: 'team' }
				]
			}
		])

		const emissionsHistoricalPrices = {
			'coingecko:chainlink': {
				prices: [
					{ timestamp: lastPastEvent + day, price: 10 },
					{ timestamp: lastPastEvent - day, price: 5 }
				]
			}
		}
		const result = await getAllProtocolEmissions({
			tokenlist: {
				chainlink: {
					current_price: 7.89,
					symbol: 'link'
				}
			},
			emissionsHistoricalPrices
		})

		dateNow.mockRestore()

		expect(batchFetchHistoricalPricesMock).not.toHaveBeenCalled()
		expect(result[0].lastEvent).toEqual([{ timestamp: lastPastEvent, noOfTokens: [10], category: 'team' }])
		expect(result[0].historicalPrice).toEqual([
			[(lastPastEvent - day) * 1000, 5],
			[(lastPastEvent + day) * 1000, 10]
		])
		expect(emissionsHistoricalPrices['coingecko:chainlink'].prices).toEqual([
			{ timestamp: lastPastEvent + day, price: 10 },
			{ timestamp: lastPastEvent - day, price: 5 }
		])
	})

	it('falls back to network historical prices when the artifact cache is empty', async () => {
		const day = 86_400
		const nowSec = 1_700_000_000
		const lastPastEvent = Math.floor((nowSec - 8 * day) / 1800) * 1800
		const dateNow = vi.spyOn(Date, 'now').mockReturnValue(nowSec * 1000)

		batchFetchHistoricalPricesMock.mockResolvedValueOnce({
			results: {
				'coingecko:chainlink': {
					prices: [{ timestamp: lastPastEvent, price: 2 }]
				}
			}
		})
		fetchAllProtocolEmissionsMock.mockResolvedValue([
			{
				name: 'Chainlink',
				token: 'coingecko:chainlink',
				gecko_id: 'chainlink',
				events: [
					{ timestamp: nowSec - 60 * day, noOfTokens: [1], category: 'team' },
					{ timestamp: lastPastEvent, noOfTokens: [10], category: 'team' }
				]
			}
		])

		const result = await getAllProtocolEmissions({
			tokenlist: {
				chainlink: {
					current_price: 7.89,
					symbol: 'link'
				}
			},
			emissionsHistoricalPrices: {}
		})

		dateNow.mockRestore()

		expect(batchFetchHistoricalPricesMock).toHaveBeenCalledWith({
			'coingecko:chainlink': expect.any(Array)
		})
		expect(result[0].historicalPrice).toEqual([[lastPastEvent * 1000, 2]])
	})

	it('falls back to network current and historical prices when cache options are omitted', async () => {
		const day = 86_400
		const nowSec = 1_700_000_000
		const lastPastEvent = Math.floor((nowSec - 8 * day) / 1800) * 1800
		const dateNow = vi.spyOn(Date, 'now').mockReturnValue(nowSec * 1000)

		fetchJsonMock.mockResolvedValueOnce([])
		fetchCoinPricesMock.mockResolvedValueOnce({
			'coingecko:chainlink': {
				price: 3,
				symbol: 'LINK'
			}
		})
		batchFetchHistoricalPricesMock.mockResolvedValueOnce({
			results: {
				'coingecko:chainlink': {
					prices: [{ timestamp: lastPastEvent, price: 2 }]
				}
			}
		})
		fetchAllProtocolEmissionsMock.mockResolvedValue([
			{
				name: 'Chainlink',
				token: 'coingecko:chainlink',
				gecko_id: 'chainlink',
				events: [
					{ timestamp: nowSec - 60 * day, noOfTokens: [1], category: 'team' },
					{ timestamp: lastPastEvent, noOfTokens: [10], category: 'team' },
					{ timestamp: nowSec + day, noOfTokens: [20], category: 'team' }
				]
			}
		])

		const result = await getAllProtocolEmissions()

		dateNow.mockRestore()

		expect(fetchCoinPricesMock).toHaveBeenCalledWith(['coingecko:chainlink'])
		expect(batchFetchHistoricalPricesMock).toHaveBeenCalledWith(
			expect.objectContaining({
				'coingecko:chainlink': expect.any(Array)
			})
		)
		expect(result[0]).toMatchObject({
			tPrice: 3,
			tSymbol: 'LINK',
			historicalPrice: [[lastPastEvent * 1000, 2]]
		})
	})
})
