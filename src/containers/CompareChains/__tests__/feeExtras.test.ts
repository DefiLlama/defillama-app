import { describe, expect, it } from 'vitest'
import {
	applyCompareChainsFeeExtras,
	buildCompareChainsFeeExtraFetchConfigs,
	getCompareChainsFeeExtraFailedMetrics
} from '../feeExtras'

const BASE_CHAIN_DATA = {
	chain: 'Base',
	chainFeesChart: [
		[1, 100],
		[2, 200]
	] as Array<[number, number]>,
	chainRevenueChart: [
		[1, 50],
		[2, 60]
	] as Array<[number, number]>,
	dexVolumeChart: [[1, 1_000]] as Array<[number, number]>,
	tvlChart: [[1_000, 10_000]] as Array<[number, number]>
}

const FEE_EXTRA_CHARTS = {
	dailyBribesRevenue: [
		[1, 10],
		[3, 30]
	] as Array<[number, number]>,
	dailyTokenTaxes: [[2, 20]] as Array<[number, number]>
}

describe('CompareChains fee extras', () => {
	it('builds chain-native fetch configs only for enabled extras and selected fee charts', () => {
		expect(
			buildCompareChainsFeeExtraFetchConfigs({
				chainData: [
					BASE_CHAIN_DATA,
					{
						...BASE_CHAIN_DATA,
						chain: 'Ethereum'
					}
				],
				selectedCharts: ['chainFeesChart'],
				feesSettings: { bribes: true, tokentax: true }
			})
		).toEqual([
			{
				chain: 'Base',
				dataType: 'dailyBribesRevenue',
				label: 'Bribes Revenue',
				queryKey: ['compare-chains', 'chain-native-fee-extra', 'dailyBribesRevenue', 'Base'],
				url: '/api/public/chains/charts?kind=adapter-protocol&entity=chain&adapterType=fees&protocol=Base&dataType=dailyBribesRevenue'
			},
			{
				chain: 'Base',
				dataType: 'dailyTokenTaxes',
				label: 'Token Tax',
				queryKey: ['compare-chains', 'chain-native-fee-extra', 'dailyTokenTaxes', 'Base'],
				url: '/api/public/chains/charts?kind=adapter-protocol&entity=chain&adapterType=fees&protocol=Base&dataType=dailyTokenTaxes'
			},
			{
				chain: 'Ethereum',
				dataType: 'dailyBribesRevenue',
				label: 'Bribes Revenue',
				queryKey: ['compare-chains', 'chain-native-fee-extra', 'dailyBribesRevenue', 'Ethereum'],
				url: '/api/public/chains/charts?kind=adapter-protocol&entity=chain&adapterType=fees&protocol=Ethereum&dataType=dailyBribesRevenue'
			},
			{
				chain: 'Ethereum',
				dataType: 'dailyTokenTaxes',
				label: 'Token Tax',
				queryKey: ['compare-chains', 'chain-native-fee-extra', 'dailyTokenTaxes', 'Ethereum'],
				url: '/api/public/chains/charts?kind=adapter-protocol&entity=chain&adapterType=fees&protocol=Ethereum&dataType=dailyTokenTaxes'
			}
		])

		expect(
			buildCompareChainsFeeExtraFetchConfigs({
				chainData: [BASE_CHAIN_DATA],
				selectedCharts: ['dexVolumeChart'],
				feesSettings: { bribes: true, tokentax: true }
			})
		).toEqual([])
	})

	it('does not fetch fee extras when the selected fee chart has no base data', () => {
		expect(
			buildCompareChainsFeeExtraFetchConfigs({
				chainData: [{ ...BASE_CHAIN_DATA, chainFeesChart: null }],
				selectedCharts: ['chainFeesChart'],
				feesSettings: { bribes: true, tokentax: true }
			})
		).toEqual([])

		expect(
			buildCompareChainsFeeExtraFetchConfigs({
				chainData: [{ ...BASE_CHAIN_DATA, chainFeesChart: null }],
				selectedCharts: ['chainRevenueChart'],
				feesSettings: { bribes: true }
			})
		).toEqual([
			{
				chain: 'Base',
				dataType: 'dailyBribesRevenue',
				label: 'Bribes Revenue',
				queryKey: ['compare-chains', 'chain-native-fee-extra', 'dailyBribesRevenue', 'Base'],
				url: '/api/public/chains/charts?kind=adapter-protocol&entity=chain&adapterType=fees&protocol=Base&dataType=dailyBribesRevenue'
			}
		])
	})

	it('merges enabled bribes and token tax into Chain Fees', () => {
		const result = applyCompareChainsFeeExtras({
			chainData: BASE_CHAIN_DATA,
			selectedCharts: ['chainFeesChart'],
			feesSettings: { bribes: true, tokentax: true },
			feeExtraCharts: FEE_EXTRA_CHARTS
		})

		expect(result.chainFeesChart).toEqual([
			[1, 110],
			[2, 220],
			[3, 30]
		])
	})

	it('merges enabled bribes and token tax into Chain Revenue', () => {
		const result = applyCompareChainsFeeExtras({
			chainData: BASE_CHAIN_DATA,
			selectedCharts: ['chainRevenueChart'],
			feesSettings: { bribes: true, tokentax: true },
			feeExtraCharts: FEE_EXTRA_CHARTS
		})

		expect(result.chainRevenueChart).toEqual([
			[1, 60],
			[2, 80],
			[3, 30]
		])
	})

	it('does not merge or fetch fee extras for TVL and DEX Volume', () => {
		const result = applyCompareChainsFeeExtras({
			chainData: BASE_CHAIN_DATA,
			selectedCharts: ['tvlChart', 'dexVolumeChart'],
			feesSettings: { bribes: true, tokentax: true },
			feeExtraCharts: FEE_EXTRA_CHARTS
		})

		expect(result).toBe(BASE_CHAIN_DATA)
		expect(result.dexVolumeChart).toEqual([[1, 1_000]])
		expect(result.tvlChart).toEqual([[1_000, 10_000]])
	})

	it('does not fetch or merge disabled fee settings', () => {
		expect(
			buildCompareChainsFeeExtraFetchConfigs({
				chainData: [BASE_CHAIN_DATA],
				selectedCharts: ['chainFeesChart'],
				feesSettings: {}
			})
		).toEqual([])

		expect(
			applyCompareChainsFeeExtras({
				chainData: BASE_CHAIN_DATA,
				selectedCharts: ['chainFeesChart'],
				feesSettings: {},
				feeExtraCharts: FEE_EXTRA_CHARTS
			})
		).toBe(BASE_CHAIN_DATA)
	})

	it('does not create an extra-only fee chart when the base chart is missing', () => {
		const result = applyCompareChainsFeeExtras({
			chainData: { ...BASE_CHAIN_DATA, chainFeesChart: null },
			selectedCharts: ['chainFeesChart'],
			feesSettings: { bribes: true, tokentax: true },
			feeExtraCharts: FEE_EXTRA_CHARTS
		})

		expect(result.chainFeesChart).toBeNull()
		expect(result.chainRevenueChart).toEqual(BASE_CHAIN_DATA.chainRevenueChart)
	})

	it('keeps the base chart and surfaces fee-extra-specific failures', () => {
		const configs = buildCompareChainsFeeExtraFetchConfigs({
			chainData: [BASE_CHAIN_DATA],
			selectedCharts: ['chainFeesChart'],
			feesSettings: { bribes: true, tokentax: true }
		})
		const result = applyCompareChainsFeeExtras({
			chainData: BASE_CHAIN_DATA,
			selectedCharts: ['chainFeesChart'],
			feesSettings: { bribes: true, tokentax: true },
			feeExtraCharts: { dailyTokenTaxes: FEE_EXTRA_CHARTS.dailyTokenTaxes }
		})

		expect(result.chainFeesChart).toEqual([
			[1, 100],
			[2, 220]
		])
		expect(getCompareChainsFeeExtraFailedMetrics({ configs, results: [{ error: new Error('failed') }, {}] })).toEqual([
			'Base - Bribes Revenue'
		])
	})
})
