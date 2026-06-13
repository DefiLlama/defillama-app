import { describe, expect, it } from 'vitest'
import {
	CHAIN_NATIVE_BREAKDOWN_METRICS,
	getProtocolChainBreakdownRoute,
	NON_ADAPTER_BY_CHAIN_BREAKDOWN_METRICS,
	PROTOCOL_UNSUPPORTED_BY_CHAIN_METRICS,
	STREAM_PROTOCOL_SERIES_SKIP_METRICS
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

	it('keeps by-chain metric sets explicit by purpose', () => {
		expect(Array.from(CHAIN_NATIVE_BREAKDOWN_METRICS).toSorted()).toEqual(['chain-fees', 'chain-revenue'])
		expect(Array.from(PROTOCOL_UNSUPPORTED_BY_CHAIN_METRICS).toSorted()).toEqual([
			'chain-fees',
			'chain-revenue',
			'stablecoins'
		])
		expect(Array.from(NON_ADAPTER_BY_CHAIN_BREAKDOWN_METRICS).toSorted()).toEqual([
			'chain-fees',
			'chain-revenue',
			'stablecoins',
			'tvl'
		])
		expect(Array.from(STREAM_PROTOCOL_SERIES_SKIP_METRICS).toSorted()).toEqual([
			'chain-fees',
			'chain-revenue',
			'stablecoins',
			'tvl'
		])
	})

	it('rejects concrete protocols for chain-native by-chain breakdowns', async () => {
		const { chainNativeByChainBreakdown } = await import('~/containers/ChainOverview/server/breakdowns')

		await expect(
			chainNativeByChainBreakdown.handle({
				method: 'GET',
				url: '',
				headers: {},
				query: { metric: 'chain-fees', protocol: 'aave' }
			})
		).resolves.toEqual({
			status: 400,
			body: { error: 'chain-fees metric is only available when protocol=All' }
		})
	})

	it('rejects concrete protocols for stablecoin by-chain breakdowns', async () => {
		const { stablecoinByChainBreakdown } = await import('~/containers/Stablecoins/server/breakdowns')

		await expect(
			stablecoinByChainBreakdown.handle({
				method: 'GET',
				url: '',
				headers: {},
				query: { protocol: 'aave' }
			})
		).resolves.toEqual({
			status: 400,
			body: { error: 'stablecoins metric is only available when protocol=All' }
		})
	})
})
