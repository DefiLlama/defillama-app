import { useQuery } from '@tanstack/react-query'

interface FormattedValue {
	value: number
	formatted: string
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

interface ChannelEntry {
	referral: string
	fees: number
	feesFormatted: string
	sharePct: number
	shareFormatted: string
}

interface ChannelBreakdown {
	title: string
	total: number
	totalFormatted: string
	channels: ChannelEntry[]
}

interface BreakdownChart extends ChartData {
	total?: number
	totalFormatted?: string
}

interface EcosystemResponse {
	intents: {
		kpis: {
			allTimeVolume: FormattedValue
			totalSwaps: FormattedValue
			uniqueUsers1d: FormattedValue
			uniqueUsers7d: FormattedValue
			uniqueUsers30d: FormattedValue
			volume7d: FormattedValue
			volume30d: FormattedValue
			avgTradeSize: FormattedValue
			totalIntentFees: FormattedValue
			cumulativeSwaps: FormattedValue
			dailySwaps: FormattedValue
			swaps7d: FormattedValue
			swaps30d: FormattedValue
		}
		volumeChart: ChartData
		feesChart: ChartData
		activityChart: ChartData
		tokenBreakdown: BreakdownChart
		blockchainBreakdown: BreakdownChart
		channelBreakdown: ChannelBreakdown
	}
	ecosystem: {
		kpis: {
			dailyTxns: FormattedValue
			avgDailyTxns7d: FormattedValue
			avgDailyTxns30d: FormattedValue
			dailyActiveAccounts: FormattedValue
			monthlyActiveAccounts: FormattedValue
			newAccounts30d: FormattedValue
			dailyGasFeeNear: FormattedValue
		}
		txnsChart: ChartData
		activeAccountsChart: ChartData
		newAccountsChart: ChartData
		gasChart: ChartData
	}
	tokenEconomics: {
		kpis: {
			nearPrice: FormattedValue
			marketCap: FormattedValue
			circulatingSupply: FormattedValue
			totalSupply: FormattedValue
			lockedSupply: FormattedValue
		}
		priceChart: ChartData
		supplyChart: ChartData
	}
}

export type { FormattedValue, ChartData, EcosystemResponse, ChannelBreakdown, ChannelEntry, BreakdownChart }

function chartToTimeSeries(chart: ChartData): Array<{ name: string; data: Array<[number, number]> }> {
	return chart.series.map((s) => ({
		name: s.name,
		data: chart.dates.map(
			(d, i) => [Math.floor(new Date(d + 'T00:00:00Z').getTime() / 1000), s.data[i]] as [number, number]
		)
	}))
}

export { chartToTimeSeries }

export function useEcosystemData() {
	return useQuery<EcosystemResponse>({
		queryKey: ['near-ecosystem'],
		queryFn: async () => {
			const res = await fetch('/api/near/ecosystem')
			if (!res.ok) throw new Error(`NEAR Ecosystem API error: ${res.status}`)
			return res.json()
		},
		staleTime: 10 * 60 * 1000,
		refetchOnWindowFocus: false
	})
}
