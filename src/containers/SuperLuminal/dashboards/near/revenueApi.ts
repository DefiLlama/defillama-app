import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'

interface FormattedValue {
	value: number
	formatted: string
}

interface Metadata {
	projectName: string
	updatedAt: string
	links?: Record<string, string>
	feeWallets?: Record<string, string>
	faq?: Array<{
		question: string
		answer: string
	}>
}

interface ChartSeries {
	name: string
	data: number[]
}

interface ChartData {
	title: string
	dates: string[]
	series: ChartSeries[]
}

interface WalletEntry {
	wallet: string
	totalNear: number
	totalNearFormatted: string
	share: number
	shareFormatted: string
}

interface RevenueAPIResponse {
	metadata: Metadata
	highlights: {
		updatedAt: string
		data: Array<{
			burn_30d?: number
			burn_all_time?: number
			burn_ytd?: number
			fees_30d?: number
			fees_all_time?: number
			fees_ytd?: number
			revenue_pct_of_emissions_ytd?: number
		}>
	}
	revenue: {
		revenueChart: ChartData
		feesChart: ChartData
		kpis: {
			latestBurnRevenue: FormattedValue
			latestIntentsRevenue: FormattedValue
			latestTotalRevenue: FormattedValue
			latestFees: FormattedValue
			cumulativeRevenue: FormattedValue
			cumulativeFees: FormattedValue
		}
	}
	emissions: {
		revenueVsEmissionsChart: ChartData
		percentageChart: ChartData
		kpis: {
			latestRevenue: FormattedValue
			latestEmissions: FormattedValue
			latestPercentage: FormattedValue
		}
	}
}

function parseDateToUnix(dateStr: string): number {
	return Math.floor(new Date(dateStr + 'T00:00:00Z').getTime() / 1000)
}

function formatNear(value: number): string {
	if (value >= 1e9) return `${(value / 1e9).toFixed(2)}B NEAR`
	if (value >= 1e6) return `${(value / 1e6).toFixed(2)}M NEAR`
	if (value >= 1e3) return `${(value / 1e3).toFixed(1)}K NEAR`
	return `${value.toFixed(2)} NEAR`
}

function sumLastNDays(series: number[], n: number): number {
	const start = Math.max(0, series.length - n)
	return series.slice(start).reduce((sum, val) => sum + val, 0)
}

function getLastNDays(dates: string[], series: number[], n: number): Array<[number, number]> {
	const start = Math.max(0, dates.length - n)
	return dates.slice(start).map((date, i) => [parseDateToUnix(date), series[start + i] || 0])
}

function getLastNDaysForTimeframe(dates: string[], series: number[], timeframe: string): Array<[number, number]> {
	let n: number
	switch (timeframe) {
		case '7d': n = 7; break
		case '30d': n = 30; break
		case '1y': n = 365; break
		case 'all': n = dates.length; break
		case 'ytd': {
			const now = new Date()
			const startOfYear = new Date(now.getFullYear(), 0, 1)
			const daysSinceYearStart = Math.floor((now.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24))
			n = Math.min(daysSinceYearStart, dates.length)
			break
		}
		default: n = 365
	}
	return getLastNDays(dates, series, n)
}

function getCumulativeData(data: number[]): number[] {
	const cumulative: number[] = []
	let sum = 0
	for (const val of data) {
		sum += val
		cumulative.push(sum)
	}
	return cumulative
}

export type { FormattedValue, WalletEntry, Metadata }

export function useRevenueData() {
	const query = useQuery<RevenueAPIResponse>({
		queryKey: ['near-revenue'],
		queryFn: async () => {
			const res = await fetch('/api/near/revenue')
			if (!res.ok) throw new Error(`NEAR Revenue API error: ${res.status}`)
			return res.json()
		},
		staleTime: 10 * 60 * 1000,
		refetchOnWindowFocus: false
	})

	return useMemo(() => {
		if (!query.data) {
			return { data: null, isLoading: query.isLoading || query.isPending }
		}

		const { metadata, highlights, revenue, emissions } = query.data
		const highlightsData = highlights.data[0] || {}

		// Extract series data
		const totalFeesSeries = revenue.feesChart.series.find(s => s.name === 'Total Fees')?.data || []
		const protocolFeesSeries = revenue.feesChart.series.find(s => s.name === 'Protocol Fees')?.data || []
		const burnRevenueSeries = revenue.revenueChart.series.find(s => s.name === 'Burn Revenue')?.data || []
		const intentsRevenueSeries = revenue.revenueChart.series.find(s => s.name === 'Intents Revenue')?.data || []
		const revenueSeriesData = emissions.revenueVsEmissionsChart.series.find(s => s.name === 'Daily Revenue')?.data || []
		const emissionsSeriesData = emissions.revenueVsEmissionsChart.series.find(s => s.name === 'Daily Emissions')?.data || []
		const percentageSeriesData = emissions.percentageChart.series.find(s => s.name === 'Coverage %')?.data || []

		// Calculate cumulative data
		const cumulativeFees = getCumulativeData(totalFeesSeries)
		const cumulativeProtocolFees = getCumulativeData(protocolFeesSeries)
		const totalRevenueSeries = burnRevenueSeries.map((burn, i) => burn + (intentsRevenueSeries[i] || 0))
		const cumulativeRevenue = getCumulativeData(totalRevenueSeries)
		const cumulativeBurnRevenue = getCumulativeData(burnRevenueSeries)
		const cumulativeIntentsRevenue = getCumulativeData(intentsRevenueSeries)
		const cumulativeEmissions = getCumulativeData(emissionsSeriesData)

		// Intent fees = Total fees - Protocol fees
		const intentFeesSeries = totalFeesSeries.map((total, i) => total - (protocolFeesSeries[i] || 0))

		// Calculate KPIs for different periods
		const fees7d = sumLastNDays(totalFeesSeries, 7)
		const fees1y = sumLastNDays(totalFeesSeries, 365)
		const revenue7d = sumLastNDays(totalRevenueSeries, 7)
		const revenue1y = sumLastNDays(totalRevenueSeries, 365)

		// Prepare chart data - Last 12 months (365 days)
		const last12MonthsDates = revenue.feesChart.dates.slice(-365)
		const last12MonthsStart = Math.max(0, revenue.feesChart.dates.length - 365)

		const feesChartData = {
			dates: last12MonthsDates,
			cumulative: getLastNDays(revenue.feesChart.dates, cumulativeFees, 365),
			protocolFees: getLastNDays(revenue.feesChart.dates, protocolFeesSeries, 365),
			intentFees: getLastNDays(revenue.feesChart.dates, intentFeesSeries, 365)
		}

		const revenueChartData = {
			dates: last12MonthsDates,
			cumulative: getLastNDays(revenue.revenueChart.dates, cumulativeRevenue, 365),
			burn: getLastNDays(revenue.revenueChart.dates, burnRevenueSeries, 365),
			intents: getLastNDays(revenue.revenueChart.dates, intentsRevenueSeries, 365)
		}

		// Calculate actual percentage from cumulative data
		const percentageFromCumulative = cumulativeRevenue.map((rev, i) => {
			const em = cumulativeEmissions[i] || 1
			return em > 0 ? (rev / em) * 100 : 0
		})

		const emissionsChartData = {
			dates: last12MonthsDates,
			cumulativeRevenue: getLastNDays(emissions.revenueVsEmissionsChart.dates, cumulativeRevenue, 365),
			cumulativeEmissions: getLastNDays(emissions.revenueVsEmissionsChart.dates, cumulativeEmissions, 365),
			percentage: getLastNDays(emissions.revenueVsEmissionsChart.dates, percentageFromCumulative, 365)
		}

		const walletBreakdown: WalletEntry[] = []
		if (metadata.feeWallets) {
			Object.entries(metadata.feeWallets).forEach(([key, address]) => {
				walletBreakdown.push({
					wallet: address,
					totalNear: 0,
					totalNearFormatted: '—',
					share: 0,
					shareFormatted: '—'
				})
			})
		}

		return {
			data: {
				kpis: {
					fees: {
						allTime: { 
							value: highlightsData.fees_all_time || 0, 
							formatted: formatNear(highlightsData.fees_all_time || 0) 
						},
						ytd: { 
							value: highlightsData.fees_ytd || 0, 
							formatted: formatNear(highlightsData.fees_ytd || 0) 
						},
						d30: { 
							value: highlightsData.fees_30d || 0, 
							formatted: formatNear(highlightsData.fees_30d || 0) 
						},
						d7: { 
							value: fees7d, 
							formatted: formatNear(fees7d) 
						},
						y1: { 
							value: fees1y, 
							formatted: formatNear(fees1y) 
						}
					},
					revenue: {
						allTime: { 
							value: highlightsData.burn_all_time || 0, 
							formatted: formatNear(highlightsData.burn_all_time || 0) 
						},
						ytd: { 
							value: highlightsData.burn_ytd || 0, 
							formatted: formatNear(highlightsData.burn_ytd || 0) 
						},
						d30: { 
							value: highlightsData.burn_30d || 0, 
							formatted: formatNear(highlightsData.burn_30d || 0) 
						},
						d7: { 
							value: revenue7d, 
							formatted: formatNear(revenue7d) 
						},
						y1: { 
							value: revenue1y, 
							formatted: formatNear(revenue1y) 
						}
					}
				},
				feesChartData,
				revenueChartData,
				emissionsChartData,
				walletBreakdown,
				metadata,
				rawData: {
					feesDates: revenue.feesChart.dates,
					totalFeesSeries,
					protocolFeesSeries,
					intentFeesSeries,
					cumulativeFees,
					revenueDates: revenue.revenueChart.dates,
					burnRevenueSeries,
					intentsRevenueSeries,
					cumulativeRevenue,
					cumulativeBurnRevenue,
					cumulativeIntentsRevenue,
					emissionsDates: emissions.revenueVsEmissionsChart.dates,
					cumulativeEmissions: cumulativeEmissions,
					percentageFromCumulative
				}
			},
			isLoading: false
		}
	}, [query.data, query.isLoading, query.isPending])
}
