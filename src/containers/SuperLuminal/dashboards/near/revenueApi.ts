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
	address: string
	link: string | null
	total: number
	totalFormatted: string
	shareFormatted: string
}

interface WalletBreakdownData {
	title: string
	wallets: WalletEntry[]
	total: number
	totalFormatted: string
}

interface SupplyChartData {
	title: string
	dates: string[]
	series: ChartSeries[]
}

interface RevenueAPIResponse {
	metadata: Metadata
	fees: {
		feesChart: ChartData
		kpis: {
			allTimeFees?: FormattedValue
			ytdFees?: FormattedValue
			thirtyDayFees?: FormattedValue
			allTimeIntent?: FormattedValue
			allTimeProtocol?: FormattedValue
			latestCumulative?: FormattedValue
		}
	}
	revenue: {
		revenueChart: ChartData
		walletBreakdown?: WalletBreakdownData
		kpis: {
			allTimeRevenue?: FormattedValue
			ytdRevenue?: FormattedValue
			thirtyDayRevenue?: FormattedValue
			twelveMonthRevenue?: FormattedValue
			allTimeIntent?: FormattedValue
			allTimeProtocol?: FormattedValue
			latestCumulative?: FormattedValue
		}
	}
	emissions: {
		revenueVsEmissionsChart: ChartData
		revenueBreakdownChart?: ChartData
		percentageChart: ChartData
		supplyChart?: SupplyChartData
		kpis: {
			latestRevenue: FormattedValue
			latestEmissions: FormattedValue
			latestPercentage: FormattedValue
			netPosition?: FormattedValue
			circulatingSupply?: FormattedValue
		}
	}
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

export function getValidTimeframeForAggregation(timeframe: string, aggregation: string): string {
	// If monthly aggregation, minimum timeframe is 1y
	if (aggregation === 'monthly') {
		if (timeframe === '7d' || timeframe === '30d') {
			return '1y'
		}
	}
	// If weekly aggregation, minimum is 30d
	if (aggregation === 'weekly') {
		if (timeframe === '7d') {
			return '30d'
		}
	}
	return timeframe
}

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

		const { metadata, fees, revenue, emissions } = query.data

		// Extract fees series from fees endpoint
		const intentFeesSeries = fees.feesChart.series.find((s) => s.name === 'Intent Fees')?.data || []
		const protocolFeesSeries = fees.feesChart.series.find((s) => s.name === 'Protocol Fees')?.data || []
		const cumulativeFeesSeries = fees.feesChart.series.find((s) => s.name === 'Cumulative Total')?.data || []
		const totalFeesSeries = intentFeesSeries.map((intent, i) => intent + (protocolFeesSeries[i] || 0))

		// Extract revenue series from revenue endpoint
		const intentRevenueSeries = revenue.revenueChart.series.find((s) => s.name === 'Intent Revenue')?.data || []
		const protocolRevenueSeries =
			revenue.revenueChart.series.find((s) => s.name === 'Protocol Revenue (70% Burned)')?.data || []
		const cumulativeRevenueSeries = revenue.revenueChart.series.find((s) => s.name === 'Cumulative Total')?.data || []
		const totalRevenueSeries = intentRevenueSeries.map((intent, i) => intent + (protocolRevenueSeries[i] || 0))

		// Extract emissions data
		const emissionsSeriesData =
			emissions.revenueVsEmissionsChart.series.find((s) => s.name === 'Daily Emissions')?.data || []

		// Calculate cumulative data
		const cumulativeFees = cumulativeFeesSeries.length > 0 ? cumulativeFeesSeries : getCumulativeData(totalFeesSeries)
		const cumulativeRevenue =
			cumulativeRevenueSeries.length > 0 ? cumulativeRevenueSeries : getCumulativeData(totalRevenueSeries)
		const cumulativeProtocolRevenue = getCumulativeData(protocolRevenueSeries)
		const cumulativeIntentsRevenue = getCumulativeData(intentRevenueSeries)
		const cumulativeEmissions = getCumulativeData(emissionsSeriesData)

		// Calculate KPIs for different periods
		const fees7d = totalFeesSeries.length > 0 ? sumLastNDays(totalFeesSeries, 7) : 0
		const fees1y = totalFeesSeries.length > 0 ? sumLastNDays(totalFeesSeries, 365) : 0
		const revenue7d = sumLastNDays(totalRevenueSeries, 7)
		const revenue1y = sumLastNDays(totalRevenueSeries, 365)

		// Use dates from revenue chart (primary source)
		const chartDates = revenue.revenueChart.dates
		const feeChartDates = fees.feesChart.dates
		const emissionsDates = emissions.revenueVsEmissionsChart.dates

		// Wallet breakdown
		const walletBreakdown: WalletEntry[] = revenue.walletBreakdown?.wallets || []

		// Calculate actual percentage from cumulative data
		const percentageFromCumulative = cumulativeRevenue.map((rev, i) => {
			const em = cumulativeEmissions[i] || 1
			return em > 0 ? (rev / em) * 100 : 0
		})

		return {
			data: {
				kpis: {
					fees: {
						allTime: {
							value: fees.kpis.allTimeFees?.value || 0,
							formatted: fees.kpis.allTimeFees?.formatted || formatNear(0)
						},
						ytd: {
							value: fees.kpis.ytdFees?.value || 0,
							formatted: fees.kpis.ytdFees?.formatted || formatNear(0)
						},
						d30: {
							value: fees.kpis.thirtyDayFees?.value || 0,
							formatted: fees.kpis.thirtyDayFees?.formatted || formatNear(0)
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
							value: revenue.kpis.allTimeRevenue?.value || 0,
							formatted: revenue.kpis.allTimeRevenue?.formatted || formatNear(0)
						},
						ytd: {
							value: revenue.kpis.ytdRevenue?.value || 0,
							formatted: revenue.kpis.ytdRevenue?.formatted || formatNear(0)
						},
						d30: {
							value: revenue.kpis.thirtyDayRevenue?.value || 0,
							formatted: revenue.kpis.thirtyDayRevenue?.formatted || formatNear(0)
						},
						d7: {
							value: revenue7d,
							formatted: formatNear(revenue7d)
						},
						y1: {
							value: revenue.kpis.twelveMonthRevenue?.value || revenue1y,
							formatted: revenue.kpis.twelveMonthRevenue?.formatted || formatNear(revenue1y)
						}
					}
				},
				feesChartData: {
					dates: feeChartDates,
					cumulative: cumulativeFees,
					protocolFees: protocolFeesSeries,
					intentFees: intentFeesSeries
				},
				revenueChartData: {
					dates: chartDates,
					cumulative: cumulativeRevenue,
					burn: protocolRevenueSeries,
					intents: intentRevenueSeries
				},
				emissionsChartData: {
					dates: emissionsDates,
					cumulativeRevenue,
					cumulativeEmissions,
					percentage: percentageFromCumulative
				},
				walletBreakdown,
				metadata,
				rawData: {
					feesDates: feeChartDates,
					totalFeesSeries,
					protocolFeesSeries,
					intentFeesSeries,
					cumulativeFees,
					revenueDates: chartDates,
					burnRevenueSeries: protocolRevenueSeries,
					intentsRevenueSeries: intentRevenueSeries,
					cumulativeRevenue,
					cumulativeBurnRevenue: cumulativeProtocolRevenue,
					cumulativeIntentsRevenue,
					emissionsDates,
					cumulativeEmissions,
					percentageFromCumulative
				}
			},
			isLoading: false
		}
	}, [query.data, query.isLoading, query.isPending])
}
