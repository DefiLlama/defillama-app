import { describe, expect, it } from 'vitest'
import {
	CHAIN_NATIVE_BREAKDOWN_METRICS,
	getProtocolChainBreakdownRoute,
	NON_ADAPTER_BY_CHAIN_BREAKDOWN_METRICS
} from '~/server/breakdowns'

describe('breakdown route partitioning', () => {
	it('routes by-chain metrics to their owning domains', () => {
		expect(getProtocolChainBreakdownRoute('tvl')).toBe('/api/public/protocols/breakdowns/by-chain/tvl')
		expect(getProtocolChainBreakdownRoute('stablecoins')).toBe('/api/public/stablecoins/breakdowns/by-chain')
		expect(getProtocolChainBreakdownRoute('chain-fees')).toBe('/api/public/chains/breakdowns/by-chain/chain-fees')
		expect(getProtocolChainBreakdownRoute('chain-revenue')).toBe('/api/public/chains/breakdowns/by-chain/chain-revenue')
		expect(getProtocolChainBreakdownRoute('fees')).toBe('/api/public/adapter-metrics/breakdowns/by-chain/fees')
		expect(getProtocolChainBreakdownRoute('dex-aggregators')).toBe(
			'/api/public/adapter-metrics/breakdowns/by-chain/dex-aggregators'
		)
	})

	it('keeps non-adapter metrics explicit', () => {
		expect(Array.from(CHAIN_NATIVE_BREAKDOWN_METRICS).toSorted()).toEqual(['chain-fees', 'chain-revenue'])
		expect(Array.from(NON_ADAPTER_BY_CHAIN_BREAKDOWN_METRICS).toSorted()).toEqual([
			'chain-fees',
			'chain-revenue',
			'stablecoins',
			'tvl'
		])
	})
})
