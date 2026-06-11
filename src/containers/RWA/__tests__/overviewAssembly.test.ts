import { describe, expect, it } from 'vitest'
import { aggregateRwaMetrics, type ChainMetricBreakdown } from '../overviewAssembly'

describe('aggregateRwaMetrics', () => {
	it('preserves exact numeric metric totals and selected-chain breakdowns', () => {
		const result = aggregateRwaMetrics({
			onChainMcapBreakdown: { Ethereum: 100.25, Solana: 50.5 },
			activeMcapBreakdown: { Ethereum: 80.125, Solana: 20.375 },
			defiActiveTvlBreakdown: {
				Ethereum: { Aave: 10.25, Morpho: 5.5 },
				Solana: { Kamino: 2.75 }
			},
			selectedChain: 'ethereum'
		})

		expect(result.totals).toEqual({
			onChainMcap: 150.75,
			activeMcap: 100.5,
			defiActiveTvl: 18.5
		})
		expect(result.filteredTotals).toEqual({
			onChainMcap: 100.25,
			activeMcap: 80.125,
			defiActiveTvl: 15.75
		})
		expect(result.hasSelectedChainData).toEqual({
			onChainMcap: true,
			activeMcap: true,
			defiActiveTvl: true
		})
		expect(result.breakdowns).toMatchObject({
			onChainMcapByChain: { Ethereum: 100.25, Solana: 50.5 },
			activeMcapByChain: { Ethereum: 80.125, Solana: 20.375 },
			defiActiveTvlByProtocol: { Aave: 10.25, Morpho: 5.5, Kamino: 2.75 },
			defiActiveTvlByProtocolFiltered: { Aave: 10.25, Morpho: 5.5 },
			defiActiveTvlByChain: { Ethereum: 15.75, Solana: 2.75 },
			defiActiveTvlByChainFiltered: { Ethereum: 15.75 }
		})
	})

	it('keeps null and missing selected-chain values at zero without marking selected-chain data', () => {
		const result = aggregateRwaMetrics({
			onChainMcapBreakdown: null,
			activeMcapBreakdown: { Solana: 20 },
			defiActiveTvlBreakdown: { Solana: { Kamino: 2 } },
			selectedChain: 'ethereum'
		})

		expect(result.totals).toEqual({
			onChainMcap: 0,
			activeMcap: 20,
			defiActiveTvl: 2
		})
		expect(result.filteredTotals).toEqual({
			onChainMcap: 0,
			activeMcap: 0,
			defiActiveTvl: 0
		})
		expect(result.hasSelectedChainData).toEqual({
			onChainMcap: false,
			activeMcap: false,
			defiActiveTvl: false
		})
	})

	it('rejects string metric maps at the typed transform boundary', () => {
		const stringMetricMap = { Ethereum: '100' }

		// @ts-expect-error RWA /current schemas guarantee finite number maps; string metrics are not a frontend contract.
		const rejected: ChainMetricBreakdown = stringMetricMap

		void rejected
		expect(stringMetricMap.Ethereum).toBe('100')
	})
})
