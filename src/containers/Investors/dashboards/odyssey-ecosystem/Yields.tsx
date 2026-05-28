import { useYieldsData } from './api'
import { KpiCard, ChartCard, SectionHeader, SimpleTable } from './ui'

export default function Yields() {
	const { data } = useYieldsData()
	const k = data?.kpis ?? ({} as Partial<NonNullable<typeof data>['kpis']>)

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
						{ key: 'netApyPct', label: 'Net APY', right: true, render: (r) => `${(r.netApyPct ?? 0).toFixed(2)}%` }
					]}
				/>
			</ChartCard>

			<SectionHeader>Metronome Looper · Per-Strategy APY</SectionHeader>
			<ChartCard title="Live strategies" subtitle="Collateral / borrow APY per pool (snapshot)">
				<SimpleTable
					rows={data?.looperApy?.rows}
					cols={[
						{ key: 'name', label: 'Strategy' },
						{ key: 'chain', label: 'Chain' },
						{ key: 'collateral', label: 'Collateral' },
						{ key: 'borrow', label: 'Borrow' },
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
						{ key: 'netApyPct', label: 'Net APY', right: true, render: (r) => `${(r.netApyPct ?? 0).toFixed(2)}%` }
					]}
				/>
			</ChartCard>

			<SectionHeader>Vesper Pools · Net APY</SectionHeader>
			<ChartCard title="All Vesper pools" subtitle="Current snapshot across Ethereum, Optimism and Base">
				<SimpleTable
					rows={data?.vesperApy?.pools}
					cols={[
						{ key: 'pool', label: 'Pool' },
						{ key: 'chain', label: 'Chain' },
						{ key: 'asset', label: 'Asset' },
						{ key: 'tvl', label: 'TVL', right: true },
						{ key: 'netApyPct', label: 'Net APY', right: true, render: (r) => `${(r.netApyPct ?? 0).toFixed(2)}%` }
					]}
				/>
			</ChartCard>

			<SectionHeader>Synth LP Pools · Current APY</SectionHeader>
			<div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
				{Object.entries(data?.lpApyHistory || {}).map(([key, venue]) => (
					<ChartCard key={key} title={venue.venue} subtitle="Latest APY per pool">
						<SimpleTable
							rows={venue.pools}
							cols={[
								{ key: 'pool', label: 'Pool' },
								{ key: 'latestApy', label: 'APY', right: true, render: (r) => `${(r.latestApy ?? 0).toFixed(2)}%` }
							]}
						/>
					</ChartCard>
				))}
			</div>

			<SectionHeader>All Synth LP Pools</SectionHeader>
			<ChartCard title="LP pools snapshot" subtitle="Live across Aerodrome, Velodrome, Curve, Lithos">
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
