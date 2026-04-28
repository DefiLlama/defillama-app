import { useQuery } from '@tanstack/react-query'
import { lazy, useEffect, useMemo } from 'react'
import type { IBarChartProps, IChartProps } from '~/components/ECharts/types'
import { useContentReady } from '~/containers/Investors/index'
import { FLARE_BLUE, FLARE_GREEN, FLARE_ORANGE, FLARE_PINK, lastNDaysZoom } from './chartDefaults'
import { chartToData, type UpstreamChart } from './transform'
import { ChartCard, KpiCard, SectionHeader } from './ui'

const AreaChart = lazy(() => import('~/components/ECharts/AreaChart')) as React.FC<IChartProps>
const BarChart = lazy(() => import('~/components/ECharts/BarChart')) as React.FC<IBarChartProps>

interface FormattedValue {
	value: number
	formatted: string
}

interface NetworkAPIResponse {
	transactionsChart: UpstreamChart
	cumulativeTxnsChart: UpstreamChart
	activeAccountsChart: UpstreamChart
	accountsGrowthChart: UpstreamChart
	newContractsChart: UpstreamChart
	gasPriceChart: UpstreamChart
	utilizationChart: UpstreamChart
	gasUsedChart: UpstreamChart
	kpis: {
		totalTransactions: FormattedValue
		transactions24h: FormattedValue
		avgDailyTxs7d: FormattedValue
		avgDailyTxs30d: FormattedValue
		totalAddresses: FormattedValue
		totalBlocks: FormattedValue
		avgBlockTimeSec: FormattedValue
		networkUtilization: FormattedValue
		currentGasSlow: FormattedValue
		currentGasAverage: FormattedValue
		currentGasFast: FormattedValue
		gasUsedToday: FormattedValue
	}
}

function buildChart(c: UpstreamChart, fallbackName: string) {
	return { data: chartToData(c), title: c.title, seriesName: c.series[0]?.name ?? fallbackName }
}

export default function Network() {
	const query = useQuery<NetworkAPIResponse>({
		queryKey: ['flare-network'],
		queryFn: async () => {
			const res = await fetch('/api/flare/network')
			if (!res.ok) throw new Error(`Flare network API error: ${res.status}`)
			return res.json()
		},
		staleTime: 5 * 60 * 1000,
		refetchOnWindowFocus: false
	})

	const onContentReady = useContentReady()

	useEffect(() => {
		if (query.data) onContentReady()
	}, [query.data, onContentReady])

	const charts = useMemo(() => {
		if (!query.data) return null
		const d = query.data
		return {
			transactions: buildChart(d.transactionsChart, 'Transactions'),
			cumulativeTxns: buildChart(d.cumulativeTxnsChart, 'Total Txns'),
			activeAccounts: buildChart(d.activeAccountsChart, 'Active Accounts'),
			accountsGrowth: buildChart(d.accountsGrowthChart, 'Cumulative Accounts'),
			newContracts: buildChart(d.newContractsChart, 'Contracts'),
			gasPrice: buildChart(d.gasPriceChart, 'Gas Price (Gwei)'),
			utilization: buildChart(d.utilizationChart, 'Utilization %'),
			gasUsed: buildChart(d.gasUsedChart, 'Gas Used')
		}
	}, [query.data])

	if (!query.data || !charts) return null

	const k = query.data.kpis
	const c = charts

	return (
		<div className="flex flex-col gap-6">
			<SectionHeader>Network Stats</SectionHeader>
			<div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
				<KpiCard label="Total Txns" value={k.totalTransactions.formatted} />
				<KpiCard label="24h Txns" value={k.transactions24h.formatted} />
				<KpiCard label="Avg Daily 7d" value={k.avgDailyTxs7d.formatted} />
				<KpiCard label="Avg Daily 30d" value={k.avgDailyTxs30d.formatted} />
				<KpiCard label="Total Addresses" value={k.totalAddresses.formatted} />
				<KpiCard label="Total Blocks" value={k.totalBlocks.formatted} />
			</div>

			<div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
				<KpiCard label="Avg Block Time" value={k.avgBlockTimeSec.formatted} />
				<KpiCard label="Network Utilization" value={k.networkUtilization.formatted} />
				<KpiCard label="Gas Slow" value={k.currentGasSlow.formatted} />
				<KpiCard label="Gas Average" value={k.currentGasAverage.formatted} />
				<KpiCard label="Gas Fast" value={k.currentGasFast.formatted} />
			</div>

			{c.transactions.data.length > 0 && (
				<ChartCard title={c.transactions.title ?? 'Daily Transactions'}>
					<BarChart
						chartData={c.transactions.data}
						stacks={{ [c.transactions.seriesName]: 'a' }}
						stackColors={{ [c.transactions.seriesName]: FLARE_BLUE }}
						title=""
						height="320px"
						chartOptions={lastNDaysZoom(c.transactions.data.length)}
					/>
				</ChartCard>
			)}

			{c.cumulativeTxns.data.length > 0 && (
				<ChartCard title={c.cumulativeTxns.title ?? 'Cumulative Transactions'}>
					<AreaChart
						chartData={c.cumulativeTxns.data}
						stacks={[c.cumulativeTxns.seriesName]}
						stackColors={{ [c.cumulativeTxns.seriesName]: FLARE_BLUE }}
						title=""
						height="320px"
						chartOptions={lastNDaysZoom(c.cumulativeTxns.data.length)}
					/>
				</ChartCard>
			)}

			{c.activeAccounts.data.length > 0 && (
				<ChartCard title={c.activeAccounts.title ?? 'Active Accounts'}>
					<BarChart
						chartData={c.activeAccounts.data}
						stacks={{ [c.activeAccounts.seriesName]: 'a' }}
						stackColors={{ [c.activeAccounts.seriesName]: FLARE_GREEN }}
						title=""
						height="320px"
						chartOptions={lastNDaysZoom(c.activeAccounts.data.length)}
					/>
				</ChartCard>
			)}

			{c.accountsGrowth.data.length > 0 && (
				<ChartCard title={c.accountsGrowth.title ?? 'Cumulative Accounts'}>
					<AreaChart
						chartData={c.accountsGrowth.data}
						stacks={[c.accountsGrowth.seriesName]}
						stackColors={{ [c.accountsGrowth.seriesName]: FLARE_GREEN }}
						title=""
						height="320px"
						chartOptions={lastNDaysZoom(c.accountsGrowth.data.length)}
					/>
				</ChartCard>
			)}

			{c.newContracts.data.length > 0 && (
				<ChartCard title={c.newContracts.title ?? 'New Contracts Deployed'}>
					<BarChart
						chartData={c.newContracts.data}
						stacks={{ [c.newContracts.seriesName]: 'a' }}
						stackColors={{ [c.newContracts.seriesName]: FLARE_PINK }}
						title=""
						height="320px"
						chartOptions={lastNDaysZoom(c.newContracts.data.length)}
					/>
				</ChartCard>
			)}

			{c.gasPrice.data.length > 0 && (
				<ChartCard title={c.gasPrice.title ?? 'Average Gas Price'}>
					<AreaChart
						chartData={c.gasPrice.data}
						stacks={[c.gasPrice.seriesName]}
						stackColors={{ [c.gasPrice.seriesName]: FLARE_ORANGE }}
						title=""
						height="320px"
						chartOptions={lastNDaysZoom(c.gasPrice.data.length)}
					/>
				</ChartCard>
			)}

			{c.gasUsed.data.length > 0 && (
				<ChartCard title={c.gasUsed.title ?? 'Average Gas Used'}>
					<AreaChart
						chartData={c.gasUsed.data}
						stacks={[c.gasUsed.seriesName]}
						stackColors={{ [c.gasUsed.seriesName]: FLARE_ORANGE }}
						title=""
						height="320px"
						chartOptions={lastNDaysZoom(c.gasUsed.data.length)}
					/>
				</ChartCard>
			)}

			{c.utilization.data.length > 0 && (
				<ChartCard title={c.utilization.title ?? 'Network Utilization (%)'}>
					<AreaChart
						chartData={c.utilization.data}
						stacks={[c.utilization.seriesName]}
						stackColors={{ [c.utilization.seriesName]: FLARE_PINK }}
						title=""
						height="320px"
						chartOptions={lastNDaysZoom(c.utilization.data.length)}
					/>
				</ChartCard>
			)}
		</div>
	)
}
