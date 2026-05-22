import { lazy, useState } from 'react'
import type { IMultiSeriesChartProps } from '~/components/ECharts/types'
import { useYieldsData, seriesPairs } from './api'
import { KpiCard, ChartCard, SectionHeader, SimpleTable, fmtUsd } from './ui'

const MultiSeriesChart = lazy(() => import('~/components/ECharts/MultiSeriesChart')) as React.FC<IMultiSeriesChartProps>

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
	{ id: 'curve', label: 'Curve' }
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

export default function Yields() {
	const { data } = useYieldsData()
	const k = data?.kpis ?? ({} as Partial<NonNullable<typeof data>['kpis']>)
	const [venue, setVenue] = useState('aerodrome')

	const apyVenue = data?.lpApyHistory?.[venue]
	const lpSeries = (apyVenue?.pools || []).map((p: any, i: number) => ({
		name: p.pool,
		type: 'line' as const,
		color: PALETTE[i % PALETTE.length],
		data: seriesPairs(p.dates, p.apys)
	}))

	const vesperPools = data?.vesperApy?.pools || []
	// Sort by netApyPct desc and render APY history for top 8 pools that have data
	const vesperWithSeries = vesperPools
		.filter((p: any) => p.apySeries?.some((x: number | null) => x != null))
		.sort((a: any, b: any) => (b.netApyPct ?? 0) - (a.netApyPct ?? 0))
	const vesperSeries = vesperWithSeries.slice(0, 8).map((p: any, i: number) => ({
		name: p.pool,
		type: 'line' as const,
		color: PALETTE[i % PALETTE.length],
		data: seriesPairs(p.dates, p.apySeries)
	}))

	return (
		<div className="flex flex-col gap-6">
			<div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
				<KpiCard label="Top Looper APY" value={k.topLooperApy?.formatted} />
				<KpiCard label="Top Odyssey APY" value={k.topOdysseyApy?.formatted} />
				<KpiCard label="Top Vesper APY" value={k.topVesperApy?.formatted} />
				<KpiCard label="Active Odyssey Strategies" value={k.odysseyStrategyCount?.formatted} />
			</div>

			<SectionHeader>Odyssey Loopr · Net APY by Chain</SectionHeader>
			<ChartCard title="Aggregated APY per chain" subtitle="Across all live Looper strategies">
				<SimpleTable
					rows={data?.odysseyApy?.rows}
					cols={[
						{ key: 'chain', label: 'Chain' },
						{ key: 'strategies', label: 'Strategies', right: true },
						{ key: 'netApyPct', label: 'Net APY', right: true, render: (r) => `${(r.netApyPct ?? 0).toFixed(2)}%` },
						{ key: 'totalNetEquityUsd', label: 'Net Equity', right: true, render: (r) => fmtUsd(r.totalNetEquityUsd) }
					]}
				/>
			</ChartCard>

			<SectionHeader>Metronome Looper · Per-Strategy APY</SectionHeader>
			<ChartCard title="Live strategies" subtitle="Collateral / borrow breakdown per pool">
				<SimpleTable
					rows={data?.looperApy?.rows}
					cols={[
						{ key: 'name', label: 'Strategy' },
						{ key: 'chain', label: 'Chain' },
						{ key: 'openPositions', label: 'Positions', right: true },
						{
							key: 'collateralApyPct',
							label: 'Coll APY',
							right: true,
							render: (r) => `${(r.collateralApyPct ?? 0).toFixed(2)}%`
						},
						{
							key: 'borrowApyPct',
							label: 'Borrow APY',
							right: true,
							render: (r) => `${(r.borrowApyPct ?? 0).toFixed(2)}%`
						},
						{ key: 'netApyPct', label: 'Net APY', right: true, render: (r) => `${(r.netApyPct ?? 0).toFixed(2)}%` },
						{ key: 'totalDepositedUsd', label: 'Deposited', right: true, render: (r) => fmtUsd(r.totalDepositedUsd) },
						{ key: 'totalNetEquityUsd', label: 'Net Equity', right: true, render: (r) => fmtUsd(r.totalNetEquityUsd) }
					]}
				/>
			</ChartCard>

			<SectionHeader>Vesper Pools · Net APY</SectionHeader>
			{vesperSeries.length > 0 && (
				<ChartCard title="Vesper pool APY history" subtitle="Top 8 pools by current net APY (derived from PPS deltas)">
					<MultiSeriesChart series={vesperSeries as any} valueSymbol="%" height="360px" />
				</ChartCard>
			)}
			<ChartCard title="All Vesper pools" subtitle={`${vesperPools.length} pools across Ethereum, Optimism and Base`}>
				<SimpleTable
					rows={vesperPools}
					cols={[
						{ key: 'pool', label: 'Pool' },
						{ key: 'chain', label: 'Chain' },
						{ key: 'asset', label: 'Asset' },
						{ key: 'tvl', label: 'TVL', right: true },
						{ key: 'netApyPct', label: 'Net APY', right: true, render: (r) => `${(r.netApyPct ?? 0).toFixed(2)}%` },
						{ key: 'observationDays', label: 'Obs Days', right: true }
					]}
				/>
			</ChartCard>

			<SectionHeader>Synth LP APY History</SectionHeader>
			<ChartCard title={`${venue} pool APY history`} subtitle="Per-pool APY tracked daily">
				<TabBtns active={venue} onChange={setVenue} options={VENUES} />
				{lpSeries.length ? (
					<MultiSeriesChart key={venue} series={lpSeries as any} valueSymbol="%" height="360px" />
				) : (
					<div className="px-2 py-6 text-xs text-(--text-secondary)">No data</div>
				)}
			</ChartCard>

			<SectionHeader>Current LP Pools</SectionHeader>
			<ChartCard title="All synth LP pools" subtitle="Live across Aerodrome, Velodrome, Curve, Lithos">
				<SimpleTable
					rows={data?.lpPools?.rows}
					cols={[
						{ key: 'venue', label: 'Venue' },
						{ key: 'chain', label: 'Chain' },
						{ key: 'pool', label: 'Pool' },
						{ key: 'tvl', label: 'TVL', right: true },
						{ key: 'apy', label: 'APY', right: true }
					]}
				/>
			</ChartCard>
		</div>
	)
}
