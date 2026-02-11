import dayjs from 'dayjs'
import { useMemo } from 'react'
import type { CustomTimePeriod, TimePeriod } from '../ProDashboardAPIContext'

interface YieldChartData {
	data?: Array<{
		timestamp: string
		tvlUsd: number
		apy: number | null
		apyBase: number | null
		apyReward: number | null
	}>
}

interface BorrowChartData {
	data?: Array<{
		timestamp: string
		apyBaseBorrow: number | null
		apyRewardBorrow: number | null
		totalSupplyUsd: number | null
		totalBorrowUsd: number | null
		debtCeilingUsd?: number | null
	}>
}

interface UseYieldChartTransformationsOptions {
	chartData: YieldChartData | null | undefined
	borrowData?: BorrowChartData | null | undefined
	timePeriod?: TimePeriod | null
	customTimePeriod?: CustomTimePeriod | null
}

/** Parse "2024-01-15T00:00:00.000Z" → unix seconds */
function parseTimestamp(ts: string): number {
	return Math.floor(new Date(ts.split('T')[0]).getTime() / 1000)
}

/** Compute the [start, end] unix-second bounds for a time period. Returns null if no filtering needed. */
function getTimeBounds(
	timePeriod: TimePeriod | null | undefined,
	customTimePeriod: CustomTimePeriod | null | undefined
): { start: number; end: number } | null {
	if (!timePeriod || timePeriod === 'all') return null

	if (timePeriod === 'custom' && customTimePeriod) {
		if (customTimePeriod.type === 'relative' && customTimePeriod.relativeDays) {
			return { start: dayjs().subtract(customTimePeriod.relativeDays, 'day').unix(), end: Infinity }
		}
		if (customTimePeriod.type === 'absolute' && customTimePeriod.startDate && customTimePeriod.endDate) {
			return { start: customTimePeriod.startDate, end: customTimePeriod.endDate }
		}
		return null
	}

	const now = dayjs()
	let cutoff: dayjs.Dayjs
	switch (timePeriod) {
		case '30d':
			cutoff = now.subtract(30, 'day')
			break
		case '90d':
			cutoff = now.subtract(90, 'day')
			break
		case '365d':
			cutoff = now.subtract(365, 'day')
			break
		case 'ytd':
			cutoff = now.startOf('year')
			break
		case '3y':
			cutoff = now.subtract(3, 'year')
			break
		default:
			return null
	}
	return { start: cutoff.unix(), end: Infinity }
}

/** Check if a unix-seconds timestamp is within bounds */
function inBounds(date: number, bounds: { start: number; end: number } | null): boolean {
	return !bounds || (date >= bounds.start && date <= bounds.end)
}

export function useYieldChartTransformations({
	chartData,
	borrowData,
	timePeriod,
	customTimePeriod
}: UseYieldChartTransformationsOptions) {
	const chartDataArray = chartData?.data
	const borrowDataArray = borrowData?.data

	const bounds = useMemo(() => getTimeBounds(timePeriod, customTimePeriod), [timePeriod, customTimePeriod])

	const tvlApyData = useMemo(() => {
		if (!chartDataArray) return []
		const data: Array<{ date: number; TVL: number; APY: number | null }> = []
		for (const el of chartDataArray) {
			const date = parseTimestamp(el.timestamp)
			if (!inBounds(date, bounds)) continue
			data.push({ date, TVL: el.tvlUsd, APY: el.apy ?? null })
		}
		return data
	}, [chartDataArray, bounds])

	const supplyApyBarData = useMemo(() => {
		if (!chartDataArray) return []
		const data: Array<{ date: number; Base: string | null; Reward: string | null }> = []
		for (const el of chartDataArray) {
			if (el.apyBase === null && el.apyReward === null) continue
			const date = parseTimestamp(el.timestamp)
			if (!inBounds(date, bounds)) continue
			data.push({ date, Base: el.apyBase?.toFixed(2) ?? null, Reward: el.apyReward?.toFixed(2) ?? null })
		}
		return data
	}, [chartDataArray, bounds])

	const supplyApy7dData = useMemo(() => {
		if (!chartDataArray) return []
		const windowSize = 7
		const result: Array<[number, number]> = []

		let sum = 0
		let count = 0

		for (let i = 0; i < chartDataArray.length; i++) {
			const val = chartDataArray[i].apy
			if (val != null && !Number.isNaN(val)) {
				sum += val
				count++
			}
			if (i >= windowSize) {
				const old = chartDataArray[i - windowSize].apy
				if (old != null && !Number.isNaN(old)) {
					sum -= old
					count--
				}
			}
			if (i + 1 >= windowSize && count > 0) {
				const date = parseTimestamp(chartDataArray[i].timestamp)
				if (!inBounds(date, bounds)) continue
				result.push([date, Number((sum / count).toFixed(2))])
			}
		}
		return result
	}, [chartDataArray, bounds])

	const borrowApyBarData = useMemo(() => {
		if (!borrowDataArray) return []
		const data: Array<{ date: number; Base: string | null; Reward: string | null }> = []
		for (const el of borrowDataArray) {
			if (el.apyBaseBorrow === null && el.apyRewardBorrow === null) continue
			const date = parseTimestamp(el.timestamp)
			if (!inBounds(date, bounds)) continue
			data.push({
				date,
				Base: el.apyBaseBorrow != null ? (-el.apyBaseBorrow).toFixed(2) : null,
				Reward: el.apyRewardBorrow?.toFixed(2) ?? null
			})
		}
		return data
	}, [borrowDataArray, bounds])

	const netBorrowApyData = useMemo(() => {
		if (!borrowDataArray) return []
		const data: Array<[number, number]> = []
		for (const el of borrowDataArray) {
			if (el.apyBaseBorrow === null && el.apyRewardBorrow === null) continue
			const date = parseTimestamp(el.timestamp)
			if (!inBounds(date, bounds)) continue
			data.push([date, Number((-(el.apyBaseBorrow || 0) + (el.apyRewardBorrow || 0)).toFixed(2))])
		}
		return data
	}, [borrowDataArray, bounds])

	// Pool Liquidity area chart data
	// CDP protocols use debtCeilingUsd for Available calculation instead of totalSupplyUsd
	const poolLiquidityData = useMemo(() => {
		if (!borrowDataArray) return []
		const data: Array<{ date: number; Supplied: number; Borrowed: number; Available: number }> = []
		for (const el of borrowDataArray) {
			const isCDP = el.debtCeilingUsd != null
			if (isCDP ? el.totalBorrowUsd === null : el.totalSupplyUsd === null || el.totalBorrowUsd === null) continue
			const date = parseTimestamp(el.timestamp)
			if (!inBounds(date, bounds)) continue
			const supplied = isCDP ? el.debtCeilingUsd! : el.totalSupplyUsd!
			const borrowed = el.totalBorrowUsd!
			data.push({ date, Supplied: supplied, Borrowed: borrowed, Available: supplied - borrowed })
		}
		return data
	}, [borrowDataArray, bounds])

	const tvlApyDataset = useMemo(
		() => ({
			source: tvlApyData.map((item) => ({ timestamp: item.date * 1000, APY: item.APY, TVL: item.TVL })),
			dimensions: ['timestamp', 'APY', 'TVL']
		}),
		[tvlApyData]
	)

	const latestData = useMemo(() => {
		if (!tvlApyData || tvlApyData.length === 0) {
			return { apy: null, tvl: null }
		}
		const latest = tvlApyData[tvlApyData.length - 1]
		return {
			apy: latest.APY?.toFixed(2) ?? null,
			tvl: latest.TVL ?? null
		}
	}, [tvlApyData])

	return {
		tvlApyData,
		tvlApyDataset,
		supplyApyBarData,
		supplyApy7dData,
		borrowApyBarData,
		netBorrowApyData,
		poolLiquidityData,
		latestData
	}
}
