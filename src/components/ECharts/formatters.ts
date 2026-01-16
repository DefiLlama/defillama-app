/**
 * Chart formatting utilities.
 * These functions don't depend on echarts and can be safely imported
 * without pulling echarts into the bundle.
 */
import { formattedNum } from '~/utils'

export const formatTooltipValue = (value: number, symbol: string) => {
	switch (symbol) {
		case '$':
			return formattedNum(value, true)
		case '%':
			return `${Math.round(value * 100) / 100} %`
		default:
			return `${formattedNum(value)} ${symbol}`
	}
}

const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// timestamps in monthly chart date is 1st of every month
// timestamps in weekly chart date is last day of week i.e., sunday
export function formatTooltipChartDate(
	value: number,
	groupBy: 'daily' | 'weekly' | 'monthly' | 'quarterly',
	hideTime?: boolean
) {
	const date = new Date(value)

	return groupBy === 'monthly'
		? `${monthNames[date.getUTCMonth()]} 1 - ${lastDayOfMonth(value)}, ${date.getUTCFullYear()}`
		: groupBy === 'quarterly'
			? getQuarterDateRange(value)
			: groupBy === 'weekly'
				? getStartAndEndDayOfTheWeek(value)
				: date.getUTCHours() !== 0 && !hideTime
					? `${date.toLocaleDateString(undefined, {
							year: 'numeric',
							month: '2-digit',
							day: '2-digit',
							hour: '2-digit',
							minute: '2-digit',
							timeZone: 'UTC'
						})}`
					: `${date.getUTCDate().toString().padStart(2, '0')} ${monthNames[date.getUTCMonth()]} ${date.getUTCFullYear()}`
}

export function formatChartEmphasisDate(value: number) {
	const date = new Date(value)
	return date.toLocaleDateString(undefined, {
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		timeZone: 'UTC'
	})
}

function getStartAndEndDayOfTheWeek(value: number) {
	const current = new Date(value)
	const past = new Date(value - 6 * 24 * 60 * 60 * 1000)

	const currentMonth = monthNames[current.getUTCMonth()]
	const pastMonth = monthNames[past.getUTCMonth()]
	const currentYear = current.getUTCFullYear()
	const pastYear = past.getUTCFullYear()

	return `${past.getUTCDate().toString().padStart(2, '0')}${pastMonth !== currentMonth ? ` ${pastMonth}` : ''}${
		pastYear !== currentYear ? ` ${pastYear}` : ''
	} - ${current.getUTCDate().toString().padStart(2, '0')} ${currentMonth} ${currentYear}`
}

function lastDayOfMonth(dateString: number) {
	let date = new Date(dateString)

	return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
}

function getQuarterDateRange(value: number) {
	const date = new Date(value)
	const month = date.getUTCMonth()
	const year = date.getUTCFullYear()
	const quarterStartMonth = Math.floor(month / 3) * 3
	const quarterEndMonth = quarterStartMonth + 2

	const quarterEndDate = new Date(year, quarterEndMonth + 1, 0).getUTCDate()

	return `${monthNames[quarterStartMonth]} 1 - ${monthNames[quarterEndMonth]} ${quarterEndDate}, ${year}`
}

interface PieChartDataInput {
	data: Record<string, number> | Array<Record<string, any>>
	sliceIdentifier?: string
	sliceValue?: string
	limit?: number
}

export const preparePieChartData = ({
	data,
	sliceIdentifier = 'name',
	sliceValue = 'value',
	limit
}: PieChartDataInput) => {
	let pieData: Array<{ name: string; value: number }> = []

	if (Array.isArray(data)) {
		pieData = data.map((entry) => {
			return {
				name: entry[sliceIdentifier],
				value: Number(entry[sliceValue])
			}
		})
	} else {
		pieData = Object.entries(data).map(([name, value]) => {
			return {
				name: name,
				value: Number(value)
			}
		})
	}

	pieData = pieData.toSorted((a, b) => b.value - a.value)

	if (!limit) {
		return pieData
	}

	const mainSlices = pieData.slice(0, limit)
	const otherSlices = pieData.slice(limit)

	// Check if "Others" already exists in mainSlices
	const othersIndex = mainSlices.findIndex((slice) => slice.name === 'Others')
	let othersValueFromMain = 0
	let filteredMainSlices = mainSlices

	if (othersIndex !== -1) {
		// Remove existing "Others" from mainSlices and store its value
		othersValueFromMain = mainSlices[othersIndex].value
		filteredMainSlices = mainSlices.filter((_, index) => index !== othersIndex)
	}

	const otherSlicesValue =
		otherSlices.reduce((acc, curr) => {
			// Also include any "Others" entries from otherSlices
			return acc + curr.value
		}, 0) + othersValueFromMain

	if (otherSlicesValue > 0) {
		return [...filteredMainSlices, { name: 'Others', value: otherSlicesValue }]
	}

	return filteredMainSlices
}
