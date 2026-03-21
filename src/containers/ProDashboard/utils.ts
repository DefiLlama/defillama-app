import type { ChartTimeGrouping } from '~/components/ECharts/types'
import { getBucketTimestampSec } from '~/components/ECharts/utils'
import type { DashboardGrouping } from './types'
import { generateConsistentChartColor } from './utils/colorManager'

export const convertToNumberFormat = (data: any[], convertToSeconds: boolean = false): [number, number][] => {
	if (!Array.isArray(data)) return []

	return data.map(([date, value]) => [
		typeof date === 'string'
			? convertToSeconds
				? parseInt(date, 10) / 1000
				: parseInt(date, 10) / 1
			: date / (convertToSeconds ? 1000 : 1),
		typeof value === 'string' ? parseFloat(value) : value
	])
}

export const normalizeHourlyToDaily = (
	data: [number, number][],
	aggregationType: 'last' | 'sum' = 'last'
): [number, number][] => {
	if (!data || data.length === 0) return []
	if (data.length === 1) return data

	const sortedData = [...data].sort((a, b) => a[0] - b[0])

	const avgTimeDiff =
		sortedData.slice(0, Math.min(10, sortedData.length - 1)).reduce((sum, point, idx, arr) => {
			if (idx === arr.length - 1) return sum
			return sum + (arr[idx + 1][0] - point[0])
		}, 0) / Math.min(9, sortedData.length - 1)

	const isHourlyData = avgTimeDiff < 24 * 60 * 60 && avgTimeDiff > 30 * 60

	if (!isHourlyData) {
		return data
	}

	const dailyData: { [dayKey: string]: { values: number[]; lastTimestamp: number; lastValue: number } } = {}

	for (const [timestamp, value] of sortedData) {
		const date = new Date(timestamp * 1000)
		date.setUTCHours(0, 0, 0, 0)
		const dayKey = (date.getTime() / 1000).toString()

		if (!dailyData[dayKey]) {
			dailyData[dayKey] = { values: [], lastTimestamp: timestamp, lastValue: value }
		}

		dailyData[dayKey].values.push(value)
		if (timestamp >= dailyData[dayKey].lastTimestamp) {
			dailyData[dayKey].lastTimestamp = timestamp
			dailyData[dayKey].lastValue = value
		}
	}

	const result: [number, number][] = []
	for (const dayTimestamp in dailyData) {
		const { values, lastValue } = dailyData[dayTimestamp]
		const aggregatedValue = aggregationType === 'sum' ? values.reduce((sum, v) => sum + v, 0) : lastValue
		result.push([parseInt(dayTimestamp), aggregatedValue])
	}
	return result.sort((a, b) => a[0] - b[0])
}

const GROUPING_TO_CHART_GROUP_BY: Record<Exclude<DashboardGrouping, 'day'>, Exclude<ChartTimeGrouping, 'daily'>> = {
	week: 'weekly',
	month: 'monthly',
	quarter: 'quarterly',
	year: 'yearly'
}

export const getGroupedTimestampSec = (timestampSec: number, grouping: DashboardGrouping): number => {
	if (grouping === 'day') return timestampSec

	const groupedTimestampSec = getBucketTimestampSec(timestampSec, GROUPING_TO_CHART_GROUP_BY[grouping])
	const groupKeyDate = new Date(groupedTimestampSec * 1000)

	if (grouping === 'week') {
		groupKeyDate.setUTCDate(groupKeyDate.getUTCDate() - 6)
	}

	groupKeyDate.setUTCHours(0, 0, 0, 0)
	return Math.floor(groupKeyDate.getTime() / 1000)
}

export const groupData = (
	data: [string, number][] | undefined,
	grouping: DashboardGrouping = 'day'
): [string, number][] => {
	if (!data || data.length === 0) return []

	if (grouping === 'day') {
		return data
	}

	const groupedData: { [key: string]: number } = {}

	for (const [timestampStr, value] of data) {
		const groupKey = getGroupedTimestampSec(parseInt(timestampStr), grouping).toString()

		if (groupedData[groupKey]) {
			groupedData[groupKey] += +value
		} else {
			groupedData[groupKey] = +value
		}
	}

	const entries: [string, number][] = []
	for (const key in groupedData) {
		entries.push([key, groupedData[key]])
	}
	return entries.sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
}

export const convertToCumulative = <T extends string | number>(data: [T, number][] | undefined): [T, number][] => {
	if (!data || data.length === 0) return []

	const sorted = [...data].sort((a, b) => {
		const aVal = typeof a[0] === 'string' ? parseInt(a[0]) : (a[0] as number)
		const bVal = typeof b[0] === 'string' ? parseInt(b[0]) : (b[0] as number)
		return aVal - bVal
	})
	let cumulative = 0

	return sorted.map(([timestamp, value]) => {
		cumulative += value
		return [timestamp, cumulative]
	})
}

// Icon URL helper functions
export const getItemIconUrl = (itemType: 'chain' | 'protocol', itemInfo: any, itemIdentifier: string): string => {
	if (itemType === 'chain') {
		// Replicate chainIconUrl logic from main utils
		return `https://icons.llamao.fi/icons/chains/rsz_${itemIdentifier?.toLowerCase()}?w=48&h=48`
	} else {
		if (itemInfo?.logo) return itemInfo.logo
		const key = (itemInfo?.id || itemIdentifier)?.toString()
		return `https://icons.llamao.fi/icons/protocols/${key}?w=48&h=48`
	}
}

export const generateChartColor = (itemName: string, fallbackColor: string): string => {
	const itemType = itemName?.includes('_') ? 'protocol' : 'chain'

	return generateConsistentChartColor(itemName, fallbackColor, itemType)
}
