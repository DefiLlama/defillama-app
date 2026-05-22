import { lazy, useState } from 'react'
import type { IMultiSeriesChartProps } from '~/components/ECharts/types'
import { useIncentivesData, chartToTs } from './api'
import { KpiCard, ChartCard, SectionHeader, ChartSkeleton, SimpleTable, fmtUsd } from './ui'

const MultiSeriesChart = lazy(() => import('~/components/ECharts/MultiSeriesChart')) as React.FC<IMultiSeriesChartProps>

const VENUE_COLORS: Record<string, string> = {
	Aerodrome: '#0052ff',
	Velodrome: '#ff0420',
	VoteMarket: '#627eea',
	Merkl: '#10b981',
	Lithos: '#34d399'
}
const PALETTE = [
	'#6366f1',
	'#3fb950',
	'#fb923c',
	'#a78bfa',
	'#38bdf8',
	'#fbbf24',
	'#f87171',
	'#34d399',
	'#60a5fa',
	'#e879f9'
]
const VENUES = [
	{ id: 'aerodrome', label: 'Aerodrome' },
	{ id: 'velodrome', label: 'Velodrome' },
	{ id: 'votemarket', label: 'VoteMarket' },
	{ id: 'merkl', label: 'Merkl' },
	{ id: 'lithos', label: 'Lithos' }
]

function TabBtns({
	active,
	onChange,
	options
}: {
	active: string
	onChange: (v: string) => void
	options: { id: string; label: string }[]
}) {
	return (
		<div className="mb-3 flex flex-wrap gap-1">
			{options.map((o) => (
				<button
					key={o.id}
					onClick={() => onChange(o.id)}
					className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
						active === o.id
							? 'bg-(--sl-accent) text-white'
							: 'border border-(--cards-border) bg-(--cards-bg) text-(--text-secondary) hover:text-(--text-primary)'
					}`}
				>
					{o.label}
				</button>
			))}
		</div>
	)
}

function epochCols(id: string) {
	if (id === 'aerodrome' || id === 'velodrome')
		return [
			{ key: 'pool', label: 'Pool' },
			{ key: 'period', label: 'Period' },
			{ key: 'emissions', label: 'Emissions' },
			{ key: 'incentiveSpend', label: 'Incentive Spend', right: true },
			{ key: 'currentEpochUsd', label: 'Current Epoch', right: true, render: (r: any) => fmtUsd(r.currentEpochUsd) },
			{ key: 'monthSoFarUsd', label: 'MTD', right: true, render: (r: any) => fmtUsd(r.monthSoFarUsd) },
			{ key: 'previousMonthUsd', label: 'Prev Month', right: true, render: (r: any) => fmtUsd(r.previousMonthUsd) }
		]
	if (id === 'votemarket')
		return [
			{ key: 'pool', label: 'Pool / Gauge' },
			{ key: 'period', label: 'Period' },
			{ key: 'latestCycle', label: 'Latest Cycle', right: true },
			{ key: 'currentEpochUsd', label: 'Current', right: true, render: (r: any) => fmtUsd(r.currentEpochUsd) },
			{ key: 'monthSoFarUsd', label: 'MTD', right: true, render: (r: any) => fmtUsd(r.monthSoFarUsd) },
			{ key: 'previousMonthUsd', label: 'Prev Month', right: true, render: (r: any) => fmtUsd(r.previousMonthUsd) }
		]
	if (id === 'merkl')
		return [
			{ key: 'period', label: 'Period' },
			{ key: 'spend', label: 'Spend (USD)', right: true }
		]
	return [
		{ key: 'period', label: 'Period' },
		{ key: 'spend', label: 'Spend (USDT0)', right: true }
	]
}

export default function Incentives() {
	const { data, isLoading } = useIncentivesData()
	const k = data?.kpis ?? ({} as Partial<NonNullable<typeof data>['kpis']>)
	const [poolTab, setPoolTab] = useState('aerodrome')
	const [epochTab, setEpochTab] = useState('aerodrome')

	const weeklySeries = data?.weeklyHistoryChart
		? chartToTs(data.weeklyHistoryChart).map((s) => ({
				name: s.name,
				type: 'bar' as const,
				stack: 'venue',
				color: VENUE_COLORS[s.name] || '#6366f1',
				data: s.data
			}))
		: undefined

	const poolChart = data?.weeklyPoolCharts?.[poolTab]
	const poolSeries = poolChart
		? chartToTs(poolChart).map((s, i) => {
				const isAggregate = s.name === '__historical_aggregate__'
				return {
					name: isAggregate ? 'Historical Aggregate (pre-breakdown)' : s.name,
					type: 'bar' as const,
					stack: 'pool',
					color: isAggregate ? '#71717a' : PALETTE[i % PALETTE.length],
					data: s.data
				}
			})
		: []

	return (
		<div className="flex flex-col gap-6">
			<div className="grid grid-cols-2 gap-3">
				<KpiCard label="30d Total Spend" value={k.thirtyDayTotal?.formatted} />
				<KpiCard label="All-time Total Spend" value={k.allTimeTotal?.formatted} />
			</div>
			<ChartCard title="30d Spend by Venue">
				<SimpleTable
					rows={k.thirtyDayByVenue}
					cols={[
						{ key: 'venue', label: 'Venue' },
						{ key: 'chain', label: 'Chain' },
						{ key: 'amountUsd', label: 'Spend', right: true, render: (r) => r.amountFormatted || fmtUsd(r.amountUsd) }
					]}
				/>
			</ChartCard>

			<SectionHeader>Weekly Spend by Venue</SectionHeader>
			{isLoading || !weeklySeries ? (
				<ChartSkeleton title="Weekly spend" />
			) : (
				<ChartCard title="Weekly spend (stacked)">
					<MultiSeriesChart series={weeklySeries as any} valueSymbol="$" height="380px" />
				</ChartCard>
			)}

			<SectionHeader>Weekly Spend per Pool</SectionHeader>
			<ChartCard
				title="Per-pool weekly spend"
				subtitle="Per-pool breakdown starts when bribe contracts were indexed; earlier weeks are shown as 'Historical Aggregate'."
			>
				<TabBtns active={poolTab} onChange={setPoolTab} options={VENUES} />
				{poolSeries.length ? (
					<MultiSeriesChart key={poolTab} series={poolSeries as any} valueSymbol="$" height="360px" />
				) : (
					<div className="px-2 py-6 text-xs text-(--text-secondary)">No weekly pool data</div>
				)}
			</ChartCard>

			<SectionHeader>Epochs & Spend</SectionHeader>
			<ChartCard title="Epoch breakdown">
				<TabBtns active={epochTab} onChange={setEpochTab} options={VENUES} />
				<div key={epochTab}>
					<SimpleTable rows={data?.epochTables?.[epochTab]} cols={epochCols(epochTab) as any} />
				</div>
			</ChartCard>

			<SectionHeader>Gauges</SectionHeader>
			<div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
				<ChartCard title="Aerodrome (Base)">
					<SimpleTable
						rows={data?.gauges?.aerodrome}
						cols={[
							{ key: 'pool', label: 'Pool' },
							{ key: 'tvl', label: 'TVL' },
							{ key: 'apy', label: 'APY', right: true }
						]}
					/>
				</ChartCard>
				<ChartCard title="Velodrome (Optimism)">
					<SimpleTable
						rows={data?.gauges?.velodrome}
						cols={[
							{ key: 'pool', label: 'Pool' },
							{ key: 'tvl', label: 'TVL' },
							{ key: 'apy', label: 'APY', right: true }
						]}
					/>
				</ChartCard>
			</div>
			<ChartCard title="Lithos (Plasma)">
				<SimpleTable
					rows={data?.gauges?.lithos}
					cols={[
						{ key: 'pool', label: 'Pool' },
						{ key: 'tvl', label: 'TVL' },
						{ key: 'apy', label: 'APY', right: true }
					]}
				/>
			</ChartCard>

			<SectionHeader>Curve Pools</SectionHeader>
			<ChartCard title="Curve Pools">
				<SimpleTable
					rows={data?.curvePools}
					cols={[
						{ key: 'pool', label: 'Pool' },
						{ key: 'apy', label: 'APY', right: true },
						{ key: 'balances', label: 'Balances' },
						{ key: 'tvlUsd', label: 'USD TVL', right: true }
					]}
				/>
			</ChartCard>
		</div>
	)
}
