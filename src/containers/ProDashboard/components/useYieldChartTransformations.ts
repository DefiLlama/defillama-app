import { useMemo } from 'react'
import { CustomTimePeriod, TimePeriod } from '../ProDashboardAPIContext'
import { filterDataByTimePeriod } from '../queries'

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

export function useYieldChartTransformations({
	chartData,
	borrowData,
	timePeriod,
	customTimePeriod
}: UseYieldChartTransformationsOptions) {
	const chartDataArray = chartData?.data
	const borrowDataArray = borrowData?.data

	const tvlApyData = useMemo(() => {
		if (!chartDataArray) return []
		const data = chartDataArray.map((el) => ({
			date: Math.floor(new Date(el.timestamp.split('T')[0]).getTime() / 1000),
			TVL: el.tvlUsd,
			APY: el.apy ?? null
		}))

		if (timePeriod && timePeriod !== 'all' && data.length > 0) {
			const tvlPoints: [number, number][] = data.map((el) => [el.date, el.TVL])
			const filtered = filterDataByTimePeriod(tvlPoints, timePeriod, customTimePeriod)
			const filteredTimestamps = new Set(filtered.map(([ts]) => ts))
			return data.filter((el) => filteredTimestamps.has(el.date))
		}
		return data
	}, [chartDataArray, timePeriod, customTimePeriod])

	const supplyApyBarData = useMemo(() => {
		if (!chartDataArray) return []
		const dataWithComponents = chartDataArray.filter((el) => el.apyBase !== null || el.apyReward !== null)
		const data = dataWithComponents.map((el) => ({
			date: Math.floor(new Date(el.timestamp.split('T')[0]).getTime() / 1000),
			Base: el.apyBase?.toFixed(2) ?? null,
			Reward: el.apyReward?.toFixed(2) ?? null
		}))

		if (timePeriod && timePeriod !== 'all' && data.length > 0) {
			const points: [number, number][] = data.map((el) => [el.date, 0])
			const filtered = filterDataByTimePeriod(points, timePeriod, customTimePeriod)
			const filteredTimestamps = new Set(filtered.map(([ts]) => ts))
			return data.filter((el) => filteredTimestamps.has(el.date))
		}
		return data
	}, [chartDataArray, timePeriod, customTimePeriod])

	const supplyApy7dData = useMemo(() => {
		if (!chartData?.data) return []
		const windowSize = 7
		const apyValues = chartData.data.map((m) => m.apy)
		const result: Array<[number, number]> = []

		for (let i = 0; i < apyValues.length; i++) {
			if (i + 1 >= windowSize) {
				const window = apyValues.slice(i + 1 - windowSize, i + 1)
				const validValues = window.filter((v): v is number => v != null && !isNaN(v))
				if (validValues.length > 0) {
					const avg = validValues.reduce((a, b) => a + b, 0) / validValues.length
					const timestamp = Math.floor(new Date(chartData.data[i].timestamp.split('T')[0]).getTime() / 1000)
					result.push([timestamp, Number(avg.toFixed(2))])
				}
			}
		}

		if (timePeriod && timePeriod !== 'all' && result.length > 0) {
			return filterDataByTimePeriod(result, timePeriod, customTimePeriod)
		}
		return result
	}, [chartData, timePeriod, customTimePeriod])

	const borrowApyBarData = useMemo(() => {
		if (!borrowData?.data) return []
		const dataWithBorrow = borrowData.data.filter((el) => el.apyBaseBorrow !== null || el.apyRewardBorrow !== null)
		const data = dataWithBorrow.map((el) => ({
			date: Math.floor(new Date(el.timestamp.split('T')[0]).getTime() / 1000),
			Base: el.apyBaseBorrow ? (-el.apyBaseBorrow).toFixed(2) : null,
			Reward: el.apyRewardBorrow?.toFixed(2) ?? null
		}))

		if (timePeriod && timePeriod !== 'all' && data.length > 0) {
			const points: [number, number][] = data.map((el) => [el.date, 0])
			const filtered = filterDataByTimePeriod(points, timePeriod, customTimePeriod)
			const filteredTimestamps = new Set(filtered.map(([ts]) => ts))
			return data.filter((el) => filteredTimestamps.has(el.date))
		}
		return data
	}, [borrowData, timePeriod, customTimePeriod])

	const netBorrowApyData = useMemo(() => {
		if (!borrowData?.data) return []
		const data = borrowData.data
			.filter((el) => el.apyBaseBorrow !== null || el.apyRewardBorrow !== null)
			.map((el) => {
				const netApy = (-(el.apyBaseBorrow || 0) + (el.apyRewardBorrow || 0)).toFixed(2)
				return [Math.floor(new Date(el.timestamp.split('T')[0]).getTime() / 1000), Number(netApy)] as [number, number]
			})

		if (timePeriod && timePeriod !== 'all' && data.length > 0) {
			return filterDataByTimePeriod(data, timePeriod, customTimePeriod)
		}
		return data
	}, [borrowData, timePeriod, customTimePeriod])

	// Pool Liquidity area chart data
	// CDP protocols use debtCeilingUsd for Available calculation instead of totalSupplyUsd
	const poolLiquidityData = useMemo(() => {
		if (!borrowData?.data) return []
		const data = borrowData.data
			.filter((el) => {
				if (el.debtCeilingUsd != null) {
					return el.totalBorrowUsd !== null
				}
				return el.totalSupplyUsd !== null && el.totalBorrowUsd !== null
			})
			.map((el) => {
				const isCDP = el.debtCeilingUsd != null
				// CDP: Available = debtCeiling - borrowed
				// Standard: Available = supplied - borrowed
				const available = isCDP ? el.debtCeilingUsd! - el.totalBorrowUsd! : el.totalSupplyUsd! - el.totalBorrowUsd!

				return {
					date: Math.floor(new Date(el.timestamp.split('T')[0]).getTime() / 1000),
					Supplied: isCDP ? el.debtCeilingUsd! : el.totalSupplyUsd!,
					Borrowed: el.totalBorrowUsd!,
					Available: available
				}
			})

		if (timePeriod && timePeriod !== 'all' && data.length > 0) {
			const points: [number, number][] = data.map((el) => [el.date, el.Supplied])
			const filtered = filterDataByTimePeriod(points, timePeriod, customTimePeriod)
			const filteredTimestamps = new Set(filtered.map(([ts]) => ts))
			return data.filter((el) => filteredTimestamps.has(el.date))
		}
		return data
	}, [borrowData, timePeriod, customTimePeriod])

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
		supplyApyBarData,
		supplyApy7dData,
		borrowApyBarData,
		netBorrowApyData,
		poolLiquidityData,
		latestData
	}
}
