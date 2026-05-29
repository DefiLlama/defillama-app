import { lazy, useState } from 'react'
import type { IChartProps, IMultiSeriesChartProps } from '~/components/ECharts/types'
import { useGrowthData, chartToTs, type LooprDailyRow } from './api'
import { KpiCard, ChartCard, SectionHeader, ChartSkeleton, SimpleTable, fmtUsd } from './ui'

const AreaChart = lazy(() => import('~/components/ECharts/AreaChart')) as React.FC<IChartProps>
const MultiSeriesChart = lazy(() => import('~/components/ECharts/MultiSeriesChart')) as React.FC<IMultiSeriesChartProps>

const CHAIN_COLORS: Record<string, string> = {
	Base: '#0052ff',
	Ethereum: '#627eea',
	Optimism: '#ff0420',
	Plasma: '#10b981',
	Combined: '#6366f1'
}

const SPEND_VENUES = [
	{ id: 'aerodrome', label: 'Aerodrome' },
	{ id: 'velodrome', label: 'Velodrome' },
	{ id: 'votemarket', label: 'VoteMarket' }
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

function dailyToPairs(rows: LooprDailyRow[] | undefined, metric: keyof LooprDailyRow): Array<[number, number | null]> {
	if (!rows) return []
	return rows.map(
		(r) =>
			[Math.floor(new Date(r.day + 'T00:00:00Z').getTime() / 1000), Number(r[metric] ?? 0)] as [number, number | null]
	)
}

function capitalize(s: string) {
	return s.charAt(0).toUpperCase() + s.slice(1)
}

export default function Growth() {
	const { data, isLoading } = useGrowthData()
	const k = data?.kpis ?? ({} as Partial<NonNullable<typeof data>['kpis']>)
	const loopr = data?.loopr
	const cs = data?.caseStudies ?? ({} as Partial<NonNullable<typeof data>['caseStudies']>)
	const csk = cs.kpis ?? ({} as Partial<NonNullable<typeof cs.kpis>>)

	const [spendVenue, setSpendVenue] = useState('aerodrome')

	const activeAccounts = dailyToPairs(loopr?.total, 'active_users')
	const activePositions = dailyToPairs(loopr?.total, 'active_positions')
	const cumulativeAccounts = dailyToPairs(loopr?.total, 'cumulative_users')
	const cumulativePositions = dailyToPairs(loopr?.total, 'cumulative_positions')

	const perChainActiveUsers = loopr?.chains
		? Object.entries(loopr.chains).map(([chain, rows]) => ({
				name: capitalize(chain),
				type: 'line' as const,
				color: CHAIN_COLORS[capitalize(chain)] || '#6366f1',
				data: dailyToPairs(rows, 'active_users')
			}))
		: undefined

	const perChainActivePositions = loopr?.chains
		? Object.entries(loopr.chains).map(([chain, rows]) => ({
				name: capitalize(chain),
				type: 'line' as const,
				color: CHAIN_COLORS[capitalize(chain)] || '#6366f1',
				data: dailyToPairs(rows, 'active_positions')
			}))
		: undefined

	const deposits = data?.depositsByChain
		? chartToTs(data.depositsByChain).map((s) => ({
				name: s.name,
				type: 'line' as const,
				color: CHAIN_COLORS[s.name] || '#6366f1',
				data: s.data
			}))
		: undefined

	const metHistory = (data?.tokenPrices?.MET?.history || []).map((p) => [p.timestamp, p.price] as [number, number])
	const vspHistory = (data?.tokenPrices?.VSP?.history || []).map((p) => [p.timestamp, p.price] as [number, number])

	const marketComboSeries = data?.marketComparison?.combined
		? chartToTs(data.marketComparison.combined).map((s, i) => ({
				name: s.name,
				type: 'line' as const,
				color: i === 0 ? '#6366f1' : '#f59e0b',
				data: s.data
			}))
		: undefined

	const siusdVsIusd = cs.siusdVsIusd
		? chartToTs(cs.siusdVsIusd).map((s, i) => ({
				name: s.name,
				type: 'line' as const,
				color: i === 0 ? '#6366f1' : '#fb923c',
				data: s.data
			}))
		: undefined

	const siusdShare = cs.siusdMarketShare
		? chartToTs(cs.siusdMarketShare).map((s) => ({
				name: s.name,
				type: 'line' as const,
				color: '#34d399',
				data: s.data
			}))
		: undefined

	const morphoMarket = cs.morphoMarket
		? chartToTs(cs.morphoMarket).map((s, i) => ({
				name: s.name,
				type: 'line' as const,
				color: ['#6366f1', '#fb923c', '#34d399'][i] || '#6366f1',
				data: s.data,
				yAxisIndex: s.name.includes('%') ? 1 : 0
			}))
		: undefined

	const morphoMarkets = (cs.morphoMarkets || []) as any[]
	const spendVsTvlBlock = (cs.spendVsTvl || []).find((s) => s.venue === spendVenue)
	const spendVsTvlSeries = spendVsTvlBlock
		? chartToTs(spendVsTvlBlock).map((s, i) => ({
				name: s.name,
				type: i === 0 ? ('line' as const) : ('bar' as const),
				color: i === 0 ? '#6366f1' : '#fb923c',
				data: s.data,
				yAxisIndex: i
			}))
		: undefined

	return (
		<div className="flex flex-col gap-6">
			<div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
				<KpiCard label="Active Accounts" value={k.activeAccounts?.formatted} sub="Loopr — current" />
				<KpiCard label="Active Positions" value={k.activePositions?.formatted} sub="Loopr — current" />
				<KpiCard label="Total Users" value={k.totalUsers?.formatted} sub="Loopr — cumulative" />
				<KpiCard label="siUSD TVL" value={k.siusdTvl?.formatted} sub="vs iUSD" />
				<KpiCard label="siUSD Share" value={k.siusdSharePct?.formatted} sub="Of siUSD+iUSD" />
				<KpiCard label="Morpho Utilization" value={k.morphoUtilization?.formatted} sub="Featured market" />
			</div>

			<SectionHeader>Loopr · Daily Activity (Combined)</SectionHeader>
			<div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
				{isLoading || !activeAccounts.length ? (
					<ChartSkeleton title="Active Accounts" />
				) : (
					<ChartCard title="Active Accounts" subtitle="Owner-deduped across chains">
						<AreaChart chartData={activeAccounts as any} title="" height="280px" color="#6366f1" />
					</ChartCard>
				)}
				{isLoading || !activePositions.length ? (
					<ChartSkeleton title="Active Positions" />
				) : (
					<ChartCard title="Active Positions" subtitle="Combined open positions">
						<AreaChart chartData={activePositions as any} title="" height="280px" color="#34d399" />
					</ChartCard>
				)}
			</div>

			<SectionHeader>Loopr · Cumulative Onboarding</SectionHeader>
			<div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
				<ChartCard title="Cumulative Accounts" subtitle="Owner-deduped across chains">
					<AreaChart chartData={cumulativeAccounts as any} title="" height="280px" color="#fb923c" />
				</ChartCard>
				<ChartCard title="Cumulative Positions" subtitle="Across all chains">
					<AreaChart chartData={cumulativePositions as any} title="" height="280px" color="#a78bfa" />
				</ChartCard>
			</div>

			<SectionHeader>Loopr · Per-Chain Activity</SectionHeader>
			<div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
				{perChainActiveUsers && (
					<ChartCard title="Active Users by Chain">
						<MultiSeriesChart series={perChainActiveUsers as any} height="280px" />
					</ChartCard>
				)}
				{perChainActivePositions && (
					<ChartCard title="Active Positions by Chain">
						<MultiSeriesChart series={perChainActivePositions as any} height="280px" />
					</ChartCard>
				)}
			</div>

			{deposits && (
				<>
					<SectionHeader>Loopr · Deposits by Chain</SectionHeader>
					<ChartCard title="Total deposits over time" subtitle="USD deposits per chain">
						<MultiSeriesChart series={deposits as any} valueSymbol="$" height="320px" />
					</ChartCard>
				</>
			)}

			{loopr?.byStrategy?.length ? (
				<>
					<SectionHeader>Loopr · By Strategy</SectionHeader>
					<ChartCard title="Active strategies" subtitle="Deposits, users and performance fee per strategy">
						<SimpleTable
							rows={loopr.byStrategy}
							cols={[
								{ key: 'strategyId', label: 'ID' },
								{ key: 'asset', label: 'Asset' },
								{ key: 'users', label: 'Users', right: true },
								{
									key: 'totalDepositedUsd',
									label: 'Deposited',
									right: true,
									render: (r) => r.totalDepositedFormatted || fmtUsd(r.totalDepositedUsd)
								},
								{ key: 'performanceFeePct', label: 'Perf Fee', right: true, render: (r) => `${r.performanceFeePct}%` },
								{
									key: 'chains',
									label: 'Chains',
									render: (r) =>
										Object.entries(r.chains)
											.map(([c, v]: any) => `${capitalize(c)}: ${v.users}u · ${fmtUsd(v.usd)}`)
											.join(' · ')
								}
							]}
						/>
					</ChartCard>
				</>
			) : null}

			<SectionHeader>Token Prices</SectionHeader>
			<div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
				{metHistory.length > 0 && (
					<ChartCard title="MET Price" subtitle="Metronome governance token">
						<AreaChart chartData={metHistory as any} title="" valueSymbol="$" height="280px" color="#fb923c" />
					</ChartCard>
				)}
				{vspHistory.length > 0 && (
					<ChartCard title="VSP Price" subtitle="Vesper governance token">
						<AreaChart chartData={vspHistory as any} title="" valueSymbol="$" height="280px" color="#a78bfa" />
					</ChartCard>
				)}
			</div>

			{marketComboSeries && (
				<>
					<SectionHeader>Ecosystem TVL Change vs ETH (cumulative)</SectionHeader>
					<ChartCard
						title="Cumulative % change since baseline"
						subtitle="Combined ecosystem TVL change vs ETH/USD change — 2y window"
					>
						<MultiSeriesChart series={marketComboSeries as any} valueSymbol="%" height="320px" />
					</ChartCard>
				</>
			)}

			<SectionHeader>{cs.title || 'siUSD Market Growth'}</SectionHeader>
			<div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
				<KpiCard label="siUSD TVL" value={csk.siusdTvl != null ? fmtUsd(csk.siusdTvl) : undefined} />
				<KpiCard label="iUSD TVL" value={csk.iusdTvl != null ? fmtUsd(csk.iusdTvl) : undefined} />
			</div>
			<div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
				{siusdVsIusd && (
					<ChartCard
						title="siUSD vs iUSD TVL"
						subtitle={cs.kelpExploitDate ? `Reference: Kelp exploit ${cs.kelpExploitDate}` : undefined}
					>
						<MultiSeriesChart series={siusdVsIusd as any} valueSymbol="$" height="320px" />
					</ChartCard>
				)}
				{siusdShare && (
					<ChartCard title="siUSD Market Share" subtitle="Share of siUSD+iUSD combined supply">
						<MultiSeriesChart series={siusdShare as any} valueSymbol="%" height="320px" />
					</ChartCard>
				)}
			</div>

			{morphoMarket && (
				<>
					<SectionHeader>Morpho Market · Supply / Borrow / Utilization</SectionHeader>
					<ChartCard
						title="Featured Morpho market"
						subtitle={`Latest borrow ${fmtUsd(csk.morphoBorrowLatest)} · utilization ${csk.morphoUtilization?.toFixed?.(1) ?? '—'}%`}
					>
						<MultiSeriesChart series={morphoMarket as any} valueSymbol="$" yAxisSymbols={['$', '%']} height="340px" />
					</ChartCard>
				</>
			)}

			{morphoMarkets.length > 0 && (
				<>
					<SectionHeader>Metronome Morpho Markets</SectionHeader>
					<div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
						{morphoMarkets.map((m: any) => {
							const series = chartToTs(m).map((s, i) => ({
								name: s.name,
								type: 'line' as const,
								color: ['#6366f1', '#fb923c', '#34d399'][i] || '#6366f1',
								data: s.data,
								yAxisIndex: s.name.includes('%') ? 1 : 0
							}))
							return (
								<ChartCard key={m.id} title={m.title || m.label} subtitle="Daily supply / borrow / utilization">
									<MultiSeriesChart series={series as any} valueSymbol="$" yAxisSymbols={['$', '%']} height="300px" />
								</ChartCard>
							)
						})}
					</div>
				</>
			)}

			{spendVsTvlBlock && (
				<>
					<SectionHeader>Incentive Spend vs Pool TVL · Efficiency</SectionHeader>
					<ChartCard
						title={`${spendVenue} — weekly spend vs pool TVL`}
						subtitle="Compare incentive outlay against the TVL it attracted"
					>
						<TabBtns active={spendVenue} onChange={setSpendVenue} options={SPEND_VENUES} />
						<MultiSeriesChart
							key={spendVenue}
							series={spendVsTvlSeries as any}
							valueSymbol="$"
							yAxisSymbols={['$', '$']}
							height="340px"
						/>
					</ChartCard>
				</>
			)}
		</div>
	)
}
