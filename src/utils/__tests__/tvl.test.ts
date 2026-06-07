import { describe, expect, it } from 'vitest'
import { processAdjustedProtocolTvl, processAdjustedTvl, type ProtocolChainTvls } from '../tvl'

const toUtcDay = (timestamp: number) => Math.floor(timestamp / 86400) * 86400

describe('TVL adjustment helpers', () => {
	it('subtracts doublecounted and liquid staking TVL while adding their overlap', () => {
		expect(
			processAdjustedTvl({
				tvl: [
					[1_700_000_000, 150.9],
					[1_700_086_400, 80]
				],
				doublecounted: [[1_700_000_000, 30.8]],
				liquidstaking: [[1_700_000_000, 60.2]],
				dcAndLsOverlap: [[1_700_000_000, 10.9]]
			})
		).toEqual([
			[1_700_000_000, 70],
			[1_700_086_400, 80]
		])
	})

	it('derives adjusted protocol TVL without adding normal extra TVL sections', () => {
		const timestamp = 1_700_000_000
		const adjusted = processAdjustedProtocolTvl({
			Ethereum: { tvl: [{ date: timestamp, totalLiquidityUSD: 100 }] },
			'Ethereum-doublecounted': { tvl: [{ date: timestamp, totalLiquidityUSD: 30 }] },
			'Ethereum-liquidstaking': { tvl: [{ date: timestamp, totalLiquidityUSD: 60 }] },
			'Ethereum-dcAndLsOverlap': { tvl: [{ date: timestamp, totalLiquidityUSD: 10 }] },
			'Ethereum-staking': { tvl: [{ date: timestamp, totalLiquidityUSD: 1_000 }] },
			'Ethereum-pool2': { tvl: [{ date: timestamp, totalLiquidityUSD: 2_000 }] },
			'Ethereum-borrowed': { tvl: [{ date: timestamp, totalLiquidityUSD: 3_000 }] },
			'Ethereum-vesting': { tvl: [{ date: timestamp, totalLiquidityUSD: 4_000 }] }
		})

		expect(adjusted).toEqual([[toUtcDay(timestamp), 20]])
	})

	it('keeps chain-scoped adjusted protocol TVL separate from unscoped adjustment keys', () => {
		const timestamp = 1_700_000_000
		const chainTvls: ProtocolChainTvls = {
			Ethereum: { tvl: [{ date: timestamp, totalLiquidityUSD: 100 }] },
			Polygon: { tvl: [{ date: timestamp, totalLiquidityUSD: 40 }] },
			'Ethereum-doublecounted': { tvl: [{ date: timestamp, totalLiquidityUSD: 30 }] },
			'Ethereum-liquidstaking': { tvl: [{ date: timestamp, totalLiquidityUSD: 60 }] },
			'Ethereum-dcAndLsOverlap': { tvl: [{ date: timestamp, totalLiquidityUSD: 10 }] },
			doublecounted: { tvl: [{ date: timestamp, totalLiquidityUSD: 1_000 }] },
			liquidstaking: { tvl: [{ date: timestamp, totalLiquidityUSD: 1_000 }] },
			dcAndLsOverlap: { tvl: [{ date: timestamp, totalLiquidityUSD: 1_000 }] }
		}

		expect(processAdjustedProtocolTvl(chainTvls, { includeChains: ['Ethereum'] })).toEqual([[toUtcDay(timestamp), 20]])
		expect(processAdjustedProtocolTvl(chainTvls, { excludeChains: ['Polygon'] })).toEqual([[toUtcDay(timestamp), 20]])
	})

	it('filters out current UTC day adjusted protocol TVL points', () => {
		const today = new Date()
		const todayTimestamp = Math.floor(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()) / 1000)
		const yesterdayTimestamp = todayTimestamp - 86400

		expect(
			processAdjustedProtocolTvl({
				Ethereum: {
					tvl: [
						{ date: yesterdayTimestamp, totalLiquidityUSD: 100 },
						{ date: todayTimestamp, totalLiquidityUSD: 200 }
					]
				}
			})
		).toEqual([[yesterdayTimestamp, 100]])
	})
})
