import { describe, expect, it } from 'vitest'
import { formatLineChart } from '~/components/ECharts/utils'
import { buildBridgedTvlChart, buildDenominationPriceHistory } from '../useFetchChainChartData'

describe('ChainOverview chart data transforms', () => {
	it('keeps Coingecko price chart rows alongside the denomination lookup', () => {
		const prices: Array<[number, number]> = [
			[2_000, 2],
			[1_000, 1]
		]
		const mcaps: Array<[number, number]> = [[1_000, 10]]
		const volumes: Array<[number, number]> = [[1_000, 20]]

		const result = buildDenominationPriceHistory({ prices, mcaps, volumes })

		expect(result.priceChart).toBe(prices)
		expect(result.prices).toEqual({
			1000: 1,
			2000: 2
		})
		expect(result.mcaps).toBe(mcaps)
		expect(result.volumes).toBe(volumes)
	})

	it('builds bridged TVL chart timestamps from UTC day arithmetic', () => {
		const timestampSec = Date.UTC(2026, 0, 3, 12) / 1e3
		const dayStartSec = Date.UTC(2026, 0, 3) / 1e3

		expect(buildBridgedTvlChart([{ timestamp: timestampSec, data: { total: '100' } }, null], false)).toEqual([
			[dayStartSec * 1e3, 100]
		])
	})

	it('preserves the existing gov-token bridged TVL point shape', () => {
		const timestampSec = Date.UTC(2026, 0, 3, 12) / 1e3
		const dayStartSec = Date.UTC(2026, 0, 3) / 1e3

		expect(buildBridgedTvlChart([{ timestamp: timestampSec, data: { total: '100', ownTokens: '10' } }], true)).toEqual([
			[dayStartSec, 110],
			[dayStartSec * 1e3, 100]
		])
	})

	it('keeps denomination conversion for normal bridged TVL points', () => {
		const timestampSec = Date.UTC(2026, 0, 3, 12) / 1e3
		const dayStartSec = Date.UTC(2026, 0, 3) / 1e3

		expect(
			formatLineChart({
				data: buildBridgedTvlChart([{ timestamp: timestampSec, data: { total: '100' } }], false),
				groupBy: 'daily',
				denominationPriceHistory: {
					[String(dayStartSec * 1e3)]: 2
				},
				dateInMs: true
			})
		).toEqual([[dayStartSec * 1e3, 50]])
	})
})
