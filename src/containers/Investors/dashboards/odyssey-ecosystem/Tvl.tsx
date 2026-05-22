import { lazy } from 'react'
import type { IMultiSeriesChartProps } from '~/components/ECharts/types'
import { useTvlData, chartToTs, seriesPairs, zoomStartPct, defaultZoomOptions } from './api'
import { KpiCard, ChartCard, SectionHeader, ChartSkeleton, SimpleTable, UtilBar, fmtUsd } from './ui'

const MultiSeriesChart = lazy(() => import('~/components/ECharts/MultiSeriesChart')) as React.FC<IMultiSeriesChartProps>

const PROTO_COLORS: Record<string, string> = {
	Metronome: '#fb923c',
	Vesper: '#a78bfa',
	Odyssey: '#60a5fa',
	'Morpho (Metronome Markets)': '#34d399'
}
const CHAIN_COLORS: Record<string, string> = {
	Ethereum: '#627eea',
	Base: '#0052ff',
	Optimism: '#ff0420',
	Plasma: '#10b981'
}

export default function Tvl() {
	const { data, isLoading } = useTvlData()
	const k = data?.kpis ?? ({} as Partial<NonNullable<typeof data>['kpis']>)
	const fromDate = data?.defaultFrom || '2025-01-01'

	const ecoSeries = data?.ecosystemChart
		? chartToTs(data.ecosystemChart).map((s) => ({
				name: s.name,
				type: 'line' as const,
				color: PROTO_COLORS[s.name] || s.color || '#6366f1',
				data: s.data
			}))
		: undefined
	const ecoZoom = defaultZoomOptions(zoomStartPct(data?.ecosystemChart?.dates, fromDate))

	const ethOverlay = data?.marketOverlay
		? [
				{
					name: 'Total TVL',
					type: 'line' as const,
					color: '#6366f1',
					data: seriesPairs(data.marketOverlay.dates, data.marketOverlay.series[0]?.data),
					yAxisIndex: 0
				},
				{
					name: 'ETH Price',
					type: 'line' as const,
					color: '#f59e0b',
					data: seriesPairs(data.marketOverlay.dates, data.marketOverlay.series[1]?.data),
					yAxisIndex: 1
				}
			]
		: undefined
	const ethZoom = defaultZoomOptions(zoomStartPct(data?.marketOverlay?.dates, fromDate))

	const u = data?.utilization
	const uk = u?.kpis ?? ({} as Partial<NonNullable<typeof u>['kpis']>)

	return (
		<div className="flex flex-col gap-6">
			<div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
				<KpiCard label="Total Ecosystem" value={k.total?.formatted} sub="Metronome + Vesper + Odyssey" />
				<KpiCard label="Metronome" value={k.metronome?.formatted} />
				<KpiCard label="Vesper" value={k.vesper?.formatted} />
				<KpiCard label="Odyssey" value={k.odyssey?.formatted} />
				<KpiCard label="Morpho (Metronome Markets)" value={k.morpho?.formatted} />
			</div>

			<SectionHeader>Total Ecosystem TVL</SectionHeader>
			{isLoading || !ecoSeries ? (
				<ChartSkeleton title="Ecosystem TVL" />
			) : (
				<ChartCard
					title="Ecosystem TVL"
					subtitle="Metronome, Vesper, Odyssey and Morpho markets — drag the slider for full history"
				>
					<MultiSeriesChart series={ecoSeries as any} valueSymbol="$" height="400px" chartOptions={ecoZoom} />
				</ChartCard>
			)}

			<SectionHeader>TVL vs ETH Price</SectionHeader>
			{isLoading || !ethOverlay ? (
				<ChartSkeleton title="TVL vs ETH" />
			) : (
				<ChartCard title="Ecosystem TVL vs ETH/USD" subtitle="Correlation overlay">
					<MultiSeriesChart
						series={ethOverlay as any}
						valueSymbol="$"
						yAxisSymbols={['$', '$']}
						height="350px"
						chartOptions={ethZoom}
					/>
				</ChartCard>
			)}

			<SectionHeader>TVL by Chain</SectionHeader>
			<div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
				{(data?.protocolByChain || []).map((p: any) => {
					const series = chartToTs(p).map((s) => ({
						name: s.name,
						type: 'bar' as const,
						stack: 'chain',
						color: CHAIN_COLORS[s.name] || '#6366f1',
						data: s.data
					}))
					const z = defaultZoomOptions(zoomStartPct(p.dates, fromDate))
					return (
						<ChartCard key={p.protocol} title={p.protocol} subtitle="Stacked by chain">
							<MultiSeriesChart series={series as any} valueSymbol="$" height="280px" chartOptions={z} />
						</ChartCard>
					)
				})}
			</div>

			{u && (
				<>
					<SectionHeader>Morpho Borrow Markets · Utilization</SectionHeader>
					<div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
						<KpiCard label="Total Supply" value={uk.supply?.formatted} />
						<KpiCard label="Total Borrows" value={uk.borrows?.formatted} />
						<KpiCard label="Avg Utilization" value={uk.avgUtilization?.formatted} />
						<KpiCard label="Idle Liquidity" value={uk.idleLiquidity?.formatted} />
					</div>
					<ChartCard title="Vaults Overview">
						<SimpleTable
							rows={u.vaults}
							cols={[
								{ key: 'vault', label: 'Vault' },
								{ key: 'chain', label: 'Chain' },
								{ key: 'totalAssetsUsd', label: 'Total Assets', right: true, render: (r) => fmtUsd(r.totalAssetsUsd) },
								{ key: 'idleLiquidityUsd', label: 'Idle', right: true, render: (r) => fmtUsd(r.idleLiquidityUsd) },
								{ key: 'netApyPct', label: 'Net APY', right: true, render: (r) => `${(r.netApyPct ?? 0).toFixed(2)}%` }
							]}
						/>
					</ChartCard>
					{(u.marketsByChain || []).map((g: any) => (
						<ChartCard key={g.chain} title={`${g.chain} — Markets`}>
							<SimpleTable
								rows={g.markets}
								cols={[
									{ key: 'market', label: 'Market' },
									{ key: 'supplyUsd', label: 'Supply', right: true, render: (r) => fmtUsd(r.supplyUsd) },
									{ key: 'borrowUsd', label: 'Borrow', right: true, render: (r) => fmtUsd(r.borrowUsd) },
									{ key: 'borrowableUsd', label: 'Borrowable', right: true, render: (r) => fmtUsd(r.borrowableUsd) },
									{ key: 'utilizationPct', label: 'Utilization', right: true, render: (r) => <UtilBar pct={r.utilizationPct} /> },
									{ key: 'lltvPct', label: 'LLTV', right: true, render: (r) => `${(r.lltvPct ?? 0).toFixed(1)}%` },
									{ key: 'supplyApyPct', label: 'Supply APY', right: true, render: (r) => `${(r.supplyApyPct ?? 0).toFixed(2)}%` },
									{ key: 'borrowApyPct', label: 'Borrow APY', right: true, render: (r) => `${(r.borrowApyPct ?? 0).toFixed(2)}%` }
								]}
							/>
						</ChartCard>
					))}
				</>
			)}

			<SectionHeader>Synth DEX LP TVL</SectionHeader>
			<ChartCard title="Synth Liquidity Pools" subtitle={data?.synthLpTvl?.subtitle}>
				<SimpleTable
					rows={data?.synthLpTvl?.pools}
					cols={[
						{ key: 'venue', label: 'Venue' },
						{ key: 'chain', label: 'Chain' },
						{ key: 'pool', label: 'Pool' },
						{ key: 'tvl', label: 'TVL', right: true },
						{ key: 'apy', label: 'APY', right: true }
					]}
				/>
			</ChartCard>

			<SectionHeader>MetBasis LP TVL</SectionHeader>
			<ChartCard title="MetBasis Pools" subtitle={data?.metbasis?.subtitle}>
				<SimpleTable
					rows={data?.metbasis?.pools}
					cols={[
						{ key: 'chain', label: 'Chain' },
						{ key: 'venue', label: 'Venue' },
						{ key: 'pool', label: 'Pool' },
						{ key: 'tvl', label: 'TVL', right: true },
						{ key: 'apy', label: 'APY', right: true }
					]}
				/>
			</ChartCard>
		</div>
	)
}
