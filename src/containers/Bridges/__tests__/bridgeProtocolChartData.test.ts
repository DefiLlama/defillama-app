import { describe, expect, it } from 'vitest'
import { getBucketTimestampSec } from '~/components/ECharts/utils'
import {
	buildBridgeProtocolAllChainsVolumeData,
	buildBridgeProtocolAllChainsVolumePairs,
	buildBridgeProtocolInflowsData,
	getBridgeProtocolPrevDayVolumeValue
} from '../bridgeProtocolChartData'

describe('bridge protocol chart data helpers', () => {
	it('builds grouped all-chain average volume datasets', () => {
		const day1 = 1_704_067_200
		const day2 = 1_704_153_600
		const bucket = getBucketTimestampSec(day1, 'weekly')

		const allChainsVolumePairs = buildBridgeProtocolAllChainsVolumePairs({
			isAllChains: true,
			volumeChartDataByChain: [
				{ date: day2, Deposited: 20, Withdrawn: -6 },
				{ date: day1, Deposited: 10, Withdrawn: -4 }
			]
		})
		const result = buildBridgeProtocolAllChainsVolumeData({
			groupBy: 'weekly',
			allChainsVolumePairs
		})

		expect(allChainsVolumePairs).toEqual([
			[day2, 13],
			[day1, 7]
		])
		expect(result.groupedAllChainsVolumePairs).toEqual([[bucket, 20]])
		expect(result.volumeDataset).toEqual({
			dimensions: ['timestamp', 'Volume'],
			source: [{ timestamp: bucket * 1e3, Volume: 20 }]
		})
	})

	it('calculates all-chain current volume from totals or previous chart rows', () => {
		expect(
			getBridgeProtocolPrevDayVolumeValue({
				isAllChains: true,
				allChainsVolumePairs: [
					[1, 10],
					[2, 20]
				],
				totalDepositedUSD: 50,
				totalWithdrawnUSD: 10
			})
		).toBe(30)

		expect(
			getBridgeProtocolPrevDayVolumeValue({
				isAllChains: true,
				allChainsVolumePairs: [
					[1, 10],
					[2, 20]
				],
				totalDepositedUSD: undefined,
				totalWithdrawnUSD: undefined
			})
		).toBe(10)
	})

	it('builds non-all-chain inflow datasets without leaking all-chain volume data', () => {
		const result = buildBridgeProtocolInflowsData({
			isAllChains: false,
			groupBy: 'daily',
			volumeChartDataByChain: [{ date: 1, Deposited: 10, Withdrawn: -4 }]
		})

		expect(result.groupedInflowsData).toEqual([{ date: 1, Deposited: 10, Withdrawn: -4 }])
		expect(result.inflowsDataset).toEqual({
			dimensions: ['timestamp', 'Deposited', 'Withdrawn'],
			source: [{ timestamp: 1_000, Deposited: 10, Withdrawn: 4 }]
		})

		expect(
			buildBridgeProtocolInflowsData({
				isAllChains: true,
				groupBy: 'daily',
				volumeChartDataByChain: [{ date: 1, Deposited: 10, Withdrawn: -4 }]
			}).inflowsDataset.source
		).toEqual([])
	})
})
