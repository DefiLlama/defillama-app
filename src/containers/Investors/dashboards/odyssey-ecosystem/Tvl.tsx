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
				<KpiCard
					label="Total Ecosystem TVL"
					value={k.total?.formatted}
					info="Includes third-party TVL — the Metronome AMO supply in external Morpho markets — so it is broader than the sum of each protocol's own DefiLlama TVL (which by convention excludes AMO-supplied Morpho liquidity)."
				/>
				<KpiCard label="Metronome" value={k.metronome?.formatted} />
				<KpiCard label="Vesper" value={k.vesper?.formatted} />
				<KpiCard label="Odyssey" value={k.odyssey?.formatted} />
				<KpiCard
					label="Morpho (Metronome Markets)"
					value={k.morpho?.formatted}
					info="Third-party TVL: the Metronome AMO's supply into external Morpho markets. Not part of Metronome's own DefiLlama TVL."
				/>
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
									{
										key: 'utilizationPct',
										label: 'Utilization',
										right: true,
										render: (r) => <UtilBar pct={r.utilizationPct} />
									},
									{
										key: 'targetPct',
										label: 'Target',
										right: true,
										render: (r) => (r.targetPct != null ? `${r.targetPct.toFixed(0)}%` : '—')
									},
									{
										key: 'mintNeededUsd',
										label: 'Mint Needed',
										right: true,
										render: (r) => fmtUsd(r.mintNeededUsd)
									},
									{ key: 'lltvPct', label: 'LLTV', right: true, render: (r) => `${(r.lltvPct ?? 0).toFixed(1)}%` },
									{
										key: 'supplyApyPct',
										label: 'Supply APY',
										right: true,
										render: (r) => `${(r.supplyApyPct ?? 0).toFixed(2)}%`
									},
									{
										key: 'borrowApyPct',
										label: 'Borrow APY',
										right: true,
										render: (r) => `${(r.borrowApyPct ?? 0).toFixed(2)}%`
									}
								]}
							/>
						</ChartCard>
					))}
				</>
			)}

			{data?.morphoMarketHistory?.markets?.length ? (
				<>
					<SectionHeader>
						{data.morphoMarketHistory.title || 'Morpho Market · Supply / Borrow / Utilization'}
					</SectionHeader>
					<div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
						{data.morphoMarketHistory.markets.map((m) => {
							const series = [
								{
									name: 'Supply',
									type: 'line' as const,
									color: '#6366f1',
									data: m.series.map(
										(p) =>
											[Math.floor(new Date(p.date + 'T00:00:00Z').getTime() / 1000), p.supplyUsd] as [number, number]
									),
									yAxisIndex: 0
								},
								{
									name: 'Borrow',
									type: 'line' as const,
									color: '#fb923c',
									data: m.series.map(
										(p) =>
											[Math.floor(new Date(p.date + 'T00:00:00Z').getTime() / 1000), p.borrowUsd] as [number, number]
									),
									yAxisIndex: 0
								},
								{
									name: 'Utilization %',
									type: 'line' as const,
									color: '#34d399',
									data: m.series.map(
										(p) =>
											[Math.floor(new Date(p.date + 'T00:00:00Z').getTime() / 1000), p.utilization] as [number, number]
									),
									yAxisIndex: 1
								}
							]
							return (
								<ChartCard
									key={m.marketId}
									title={m.name || m.marketId}
									subtitle={`${m.chain}${m.source ? ` · ${m.source}` : ''}`}
								>
									<MultiSeriesChart series={series as any} valueSymbol="$" yAxisSymbols={['$', '%']} height="300px" />
								</ChartCard>
							)
						})}
					</div>
				</>
			) : null}

			<SectionHeader>Ecosystem DEX LP TVL</SectionHeader>
			<ChartCard title={data?.synthLpTvl?.title || 'Ecosystem Liquidity Pools'} subtitle={data?.synthLpTvl?.subtitle}>
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
			<ChartCard
				title={data?.metbasis?.title || 'MetBasis LP TVL'}
				subtitle={data?.metbasis?.totalFormatted ? `Total ${data.metbasis.totalFormatted}` : undefined}
			>
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
