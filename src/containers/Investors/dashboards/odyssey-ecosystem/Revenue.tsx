import { lazy } from 'react'
import type { IMultiSeriesChartProps, IPieChartProps } from '~/components/ECharts/types'
import { useRevenueData, chartToTs } from './api'
import { KpiCard, ChartCard, SectionHeader, ChartSkeleton, SimpleTable, fmtUsd } from './ui'

const MultiSeriesChart = lazy(() => import('~/components/ECharts/MultiSeriesChart')) as React.FC<IMultiSeriesChartProps>
const PieChart = lazy(() => import('~/components/ECharts/PieChart')) as React.FC<IPieChartProps>

const PROTO_COLORS: Record<string, string> = { Metronome: '#fb923c', Vesper: '#a78bfa', Odyssey: '#60a5fa' }
const PIE_COLORS = ['#6366f1', '#22d3ee', '#34d399', '#fbbf24', '#f472b6', '#fb923c', '#a78bfa']

function sumUsd(rows: any[] | undefined, key: string): number {
	if (!rows) return 0
	return rows.reduce((s, r) => s + (Number(r[key]) || 0), 0)
}

function SubSectionCard({
	title,
	subtitle,
	total,
	children
}: {
	title: string
	subtitle?: string
	total?: number | null
	children: React.ReactNode
}) {
	return (
		<div className="rounded-lg border border-(--cards-border) bg-(--cards-bg) p-4">
			<div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
				<div>
					<h3 className="text-sm font-semibold text-(--text-primary)">{title}</h3>
					{subtitle && <p className="mt-0.5 text-[12px] text-(--text-secondary)">{subtitle}</p>}
				</div>
				{total != null && (
					<div className="text-right">
						<div className="text-[10px] font-medium tracking-wider text-(--text-label) uppercase">Subtotal</div>
						<div className="text-lg font-semibold text-(--text-primary) tabular-nums">{fmtUsd(total)}</div>
					</div>
				)}
			</div>
			{children}
		</div>
	)
}

export default function Revenue() {
	const { data, isLoading } = useRevenueData()
	const k = data?.kpis ?? ({} as Partial<NonNullable<typeof data>['kpis']>)
	const ra = k.revenueAllTime ?? ({} as Partial<NonNullable<typeof k.revenueAllTime>>)
	const ha = k.holdersAllTime ?? ({} as Partial<NonNullable<typeof k.holdersAllTime>>)
	const cm = k.claimedMtd ?? ({} as Partial<NonNullable<typeof k.claimedMtd>>)
	const up = data?.unclaimedPipeline ?? ({} as Partial<NonNullable<typeof data>['unclaimedPipeline']>)
	const mc = data?.metronomeClaimed
	const mb = data?.metbasisDetail

	const dailySeries = data?.llamaDailyChart
		? chartToTs(data.llamaDailyChart).map((s) => ({
				name: s.name,
				type: 'bar' as const,
				stack: 'rev',
				color: PROTO_COLORS[s.name] || '#6366f1',
				data: s.data
			}))
		: undefined

	const holderSeries = data?.holderRevenueChart
		? chartToTs(data.holderRevenueChart).map((s) => ({
				name: s.name,
				type: 'bar' as const,
				stack: 'hr',
				color: PROTO_COLORS[s.name] || '#a78bfa',
				data: s.data
			}))
		: undefined

	const lpTotal = sumUsd(up.treasuryLps, 'rewardsUsd')
	const ethUniv3Total = sumUsd(up.ethUniv3, 'usd')
	const plasmaTotal = sumUsd(up.plasmaUniv3, 'usd')
	const lithosTotal = sumUsd(up.lithosGauge, 'usd')
	const amoTotal = sumUsd(up.amoPositions, 'pnlUsd')
	const veAeroTotal = sumUsd(up.aeroLocks, 'usd')
	const convexClaimable = (up.convex || [])
		.filter((r: any) => !/total/i.test(r.type || '') && r.isClaimable)
		.reduce((s: number, r: any) => s + (r.usd || 0), 0)
	const synthDaily = (data?.synthInterestDetail || []).reduce((s: number, r: any) => s + (r.estimatedDailyUsd || 0), 0)
	const synthMonthly = (data?.synthInterestDetail || []).reduce(
		(s: number, r: any) => s + (r.estimatedMonthlyUsd || 0),
		0
	)

	return (
		<div className="flex flex-col gap-6">
			{/* Headline KPIs */}
			<div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
				<KpiCard
					label="Ecosystem Revenue (All-time)"
					value={ra.ecosystem?.formatted}
					sub="Claimed + unclaimed pipeline"
				/>
				<KpiCard label="Metronome" value={ra.metronome?.formatted} sub="All-time" />
				<KpiCard label="Vesper" value={ra.vesper?.formatted} sub="All-time" />
				<KpiCard label="Odyssey" value={ra.odyssey?.formatted} sub="All-time" />
			</div>
			<div className="grid grid-cols-2 gap-3">
				<KpiCard label="MET Holder Buybacks" value={ha.metronome?.formatted} sub="All-time" />
				<KpiCard label="VSP Holder Buybacks" value={ha.vesper?.formatted} sub="All-time" />
			</div>

			{/* Claimed */}
			<SectionHeader>Claimed Revenue · Month-to-Date</SectionHeader>
			<div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
				<KpiCard label="Metronome MTD" value={cm.metronome?.formatted} />
				<KpiCard label="Vesper MTD" value={cm.vesper?.formatted} />
				<KpiCard label="Odyssey MTD" value={cm.odyssey?.formatted} />
			</div>
			{isLoading || !dailySeries ? (
				<ChartSkeleton title="Daily Revenue" />
			) : (
				<ChartCard title="Daily Claimed Revenue" subtitle="Stacked by protocol">
					<MultiSeriesChart series={dailySeries as any} valueSymbol="$" height="320px" />
				</ChartCard>
			)}
			{isLoading || !holderSeries ? (
				<ChartSkeleton title="Holder Buybacks" />
			) : (
				<ChartCard title="Holder Buybacks" subtitle="Revenue routed to token holders (MET / VSP)">
					<MultiSeriesChart series={holderSeries as any} valueSymbol="$" height="260px" />
				</ChartCard>
			)}

			<SectionHeader>Metronome Sources · Month-to-Date</SectionHeader>
			<ChartCard title="Revenue by source" subtitle={`Total ${fmtUsd(mc?.claimedTotalUsd)} this month`}>
				<SimpleTable
					rows={mc?.items}
					cols={[
						{ key: 'label', label: 'Source' },
						{ key: 'chain', label: 'Chain' },
						{ key: 'detail', label: 'Detail' },
						{ key: 'amountUsd', label: 'USD', right: true, render: (r) => r.amountFormatted || fmtUsd(r.amountUsd) }
					]}
				/>
			</ChartCard>

			{mb && (
				<ChartCard
					title={`MetBasis Rewards${mb.monthLabel ? ' · ' + mb.monthLabel : ''}`}
					subtitle={`Total ${mb.totalFormatted || fmtUsd(mb.totalUsd)} · LP gauge claims this month`}
				>
					<SimpleTable
						rows={mb.rows}
						cols={[
							{ key: 'chain', label: 'Chain' },
							{ key: 'token', label: 'Token' },
							{
								key: 'amount',
								label: 'Amount',
								right: true,
								render: (r) => r.amount?.toLocaleString(undefined, { maximumFractionDigits: 4 })
							},
							{ key: 'priceUsd', label: 'Price', right: true, render: (r) => fmtUsd(r.priceUsd) },
							{ key: 'usd', label: 'USD', right: true, render: (r) => fmtUsd(r.usd) },
							{ key: 'claims', label: 'Claims', right: true },
							{ key: 'lastClaim', label: 'Last Claim', right: true }
						]}
					/>
				</ChartCard>
			)}

			{/* Unclaimed pipeline — split into clearly labeled subsections */}
			<SectionHeader>Unclaimed Pipeline · Overview</SectionHeader>
			<div className="rounded-lg border border-(--cards-border) bg-(--cards-bg) p-5">
				<div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
					<div>
						<div className="text-xs font-medium tracking-wide text-(--text-label) uppercase">Pipeline Total</div>
						<div className="mt-1 text-3xl font-bold text-(--text-primary)">{k.unclaimedPipeline?.formatted || '—'}</div>
					</div>
					{up.asOf && <span className="text-[11px] text-(--text-secondary)">As of {up.asOf}</span>}
				</div>
				{up.note && <p className="mb-3 text-[12px] leading-relaxed text-(--text-secondary)">{up.note}</p>}
				{up.pie && (
					<PieChart
						chartData={up.pie}
						valueSymbol="$"
						height="320px"
						showLegend
						legendPosition={{ orient: 'vertical', left: 'right', top: 'middle' }}
						stackColors={Object.fromEntries(
							up.pie.map((p: any, i: number) => [p.name, PIE_COLORS[i % PIE_COLORS.length]])
						)}
					/>
				)}
			</div>

			<SectionHeader>Treasury LP Positions · Pending Rewards</SectionHeader>
			<SubSectionCard
				title="Staked LP gauge rewards"
				subtitle="Rewards accrued in Aerodrome / Velodrome / Lithos gauges. Becomes claimed on the next harvest cycle."
				total={lpTotal}
			>
				<SimpleTable
					rows={up.treasuryLps}
					cols={[
						{ key: 'pool', label: 'Pool' },
						{ key: 'stakedLp', label: 'Staked LP' },
						{ key: 'rewards', label: 'Pending Rewards' },
						{ key: 'rewardsUsd', label: 'Rewards USD', right: true, render: (r) => fmtUsd(r.rewardsUsd) },
						{ key: 'value', label: 'Position Value', right: true }
					]}
				/>
			</SubSectionCard>

			<SectionHeader>UniV3 Concentrated Liquidity · Unclaimed Fees</SectionHeader>
			<div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
				<SubSectionCard
					title="Ethereum UniV3"
					subtitle="Trading fees accrued on Ethereum concentrated-liquidity positions"
					total={ethUniv3Total}
				>
					<SimpleTable
						rows={up.ethUniv3}
						cols={[
							{ key: 'position', label: 'Position' },
							{
								key: 'rewards',
								label: 'Unclaimed',
								render: (r) => <span dangerouslySetInnerHTML={{ __html: r.rewards }} />
							},
							{ key: 'usd', label: 'USD', right: true, render: (r) => fmtUsd(r.usd) }
						]}
					/>
				</SubSectionCard>
				<SubSectionCard
					title="Plasma UniV3"
					subtitle="Trading fees accrued on Plasma concentrated-liquidity positions"
					total={plasmaTotal}
				>
					<SimpleTable
						rows={up.plasmaUniv3}
						cols={[
							{ key: 'pool', label: 'Position' },
							{ key: 'token', label: 'Token' },
							{ key: 'amount', label: 'Amount', right: true, render: (r) => r.amount?.toFixed(4) },
							{ key: 'usd', label: 'USD', right: true, render: (r) => fmtUsd(r.usd) }
						]}
					/>
				</SubSectionCard>
			</div>

			<SectionHeader>Gauge & Lock Rewards</SectionHeader>
			<div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
				<SubSectionCard
					title="Lithos Gauge (Plasma)"
					subtitle="Pending rewards on Lithos gauge for treasury LP"
					total={lithosTotal}
				>
					<SimpleTable
						rows={up.lithosGauge}
						cols={[
							{ key: 'gauge', label: 'Gauge' },
							{ key: 'rewards', label: 'Rewards' },
							{ key: 'usd', label: 'USD', right: true, render: (r) => fmtUsd(r.usd) }
						]}
					/>
				</SubSectionCard>
				<SubSectionCard
					title="veAERO Locks (Base)"
					subtitle="Bribe & emission rewards on locked AERO voting power"
					total={veAeroTotal}
				>
					<SimpleTable
						rows={up.aeroLocks}
						cols={[
							{ key: 'nft', label: 'NFT' },
							{ key: 'locked', label: 'Locked AERO' },
							{ key: 'rewards', label: 'Pending Rewards' },
							{ key: 'usd', label: 'USD', right: true, render: (r) => fmtUsd(r.usd) },
							{ key: 'unlock', label: 'Unlock', right: true }
						]}
					/>
				</SubSectionCard>
			</div>

			<SectionHeader>Morpho AMO · Unrealised PnL</SectionHeader>
			<SubSectionCard
				title="AMO vault positions"
				subtitle="Yield earned by AMO vaults via convertToAssets — moves to claimed on harvest"
				total={amoTotal}
			>
				<SimpleTable
					rows={up.amoPositions}
					cols={[
						{ key: 'vaultName', label: 'Vault' },
						{ key: 'asset', label: 'Asset' },
						{ key: 'assetsUsd', label: 'NAV', right: true, render: (r) => fmtUsd(r.assetsUsd) },
						{ key: 'pnlUsd', label: 'Unrealised PnL', right: true, render: (r) => fmtUsd(r.pnlUsd) },
						{
							key: 'allTimeHarvestedUsd',
							label: 'All-time Harvested',
							right: true,
							render: (r) => fmtUsd(r.allTimeHarvestedUsd)
						},
						{ key: 'lastHarvestDate', label: 'Last Harvest', right: true }
					]}
				/>
			</SubSectionCard>

			<SectionHeader>Convex vlCVX · Vote-locked Rewards</SectionHeader>
			<SubSectionCard
				title="vlCVX locks"
				subtitle={`Locked CVX positions used for VoteMarket bribes. Claimable rewards total ${fmtUsd(convexClaimable)}.`}
			>
				<SimpleTable
					rows={(up.convex || []).filter((r: any) => !/total/i.test(r.type || ''))}
					cols={[
						{ key: 'type', label: 'Lock' },
						{ key: 'balance', label: 'Balance' },
						{ key: 'status', label: 'Status' },
						{ key: 'usd', label: 'Rewards USD', right: true, render: (r) => (r.isClaimable ? fmtUsd(r.usd) : '—') },
						{ key: 'unlock', label: 'Unlock', right: true }
					]}
				/>
			</SubSectionCard>

			<SectionHeader>Synth Interest · Estimated Accrual</SectionHeader>
			<SubSectionCard
				title="Outstanding synth debt"
				subtitle={`Interest accrues on user borrows of msUSD / msETH / msBTC. Est. ${fmtUsd(synthDaily)} per day · ${fmtUsd(synthMonthly)} per month.`}
			>
				<div className="flex flex-col gap-4">
					{(data?.synthInterestDetail || []).map((r: any) => (
						<div key={r.asset} className="rounded-md border border-(--cards-border)/60 p-3">
							<div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
								<div>
									<span className="text-sm font-semibold text-(--text-primary)">{r.asset}</span>
									<span className="ml-2 text-xs text-(--text-secondary)">
										{r.annualRatePct}% APR · debt {fmtUsd(r.totalDebtUsd)}
									</span>
								</div>
								<div className="text-xs text-(--text-secondary)">
									<span className="mr-3">Daily {fmtUsd(r.estimatedDailyUsd)}</span>
									<span>Monthly {fmtUsd(r.estimatedMonthlyUsd)}</span>
								</div>
							</div>
							<SimpleTable
								rows={r.byChain}
								cols={[
									{ key: 'chain', label: 'Chain' },
									{
										key: 'amount_synth',
										label: 'Debt (synth)',
										right: true,
										render: (x) => x.amount_synth?.toLocaleString(undefined, { maximumFractionDigits: 2 })
									},
									{ key: 'amount_usd', label: 'Debt (USD)', right: true, render: (x) => fmtUsd(x.amount_usd) }
								]}
							/>
						</div>
					))}
				</div>
			</SubSectionCard>
		</div>
	)
}
