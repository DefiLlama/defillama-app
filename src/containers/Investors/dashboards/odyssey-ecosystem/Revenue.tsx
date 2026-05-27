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
						<div className="text-lg font-semibold tabular-nums text-(--text-primary)">{fmtUsd(total)}</div>
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
	const vc = data?.vesperClaimed
	const oc = data?.odysseyClaimed
	const hbm = data?.holdersByMonth

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

	const holdersByMonthSeries = hbm
		? [
				{
					name: 'Metronome',
					type: 'bar' as const,
					color: '#fb923c',
					data: (hbm.metronome || []).map(
						(r) => [Math.floor(new Date(r.month + '-01T00:00:00Z').getTime() / 1000), r.totalUsd] as [number, number]
					)
				},
				{
					name: 'Vesper',
					type: 'bar' as const,
					color: '#a78bfa',
					data: (hbm.vesper || []).map(
						(r) => [Math.floor(new Date(r.month + '-01T00:00:00Z').getTime() / 1000), r.totalUsd] as [number, number]
					)
				}
			]
		: undefined

	const lpTotal = sumUsd(up.treasuryLps as any[], 'rewardsUsd')
	const ethUniv3Total = sumUsd(up.ethUniv3 as any[], 'usd')
	const plasmaTotal = sumUsd(up.plasmaUniv3 as any[], 'usd')
	const amoTotal = sumUsd(up.amoPositions as any[], 'pnlUsd')
	const veAeroTotal = sumUsd(up.aeroLocks as any[], 'usd')
	const convexClaimable = (up.convex || []).filter((r) => r.isClaimable).reduce((s, r) => s + (r.usd || 0), 0)
	const synthDaily = (data?.synthInterestDetail || []).reduce((s, r) => s + (r.estimatedDailyUsd || 0), 0)
	const synthMonthly = (data?.synthInterestDetail || []).reduce((s, r) => s + (r.estimatedMonthlyUsd || 0), 0)

	return (
		<div className="flex flex-col gap-6">
			{/* Headline KPIs */}
			<div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
				<KpiCard label="Ecosystem Revenue (All-time)" value={ra.ecosystem?.formatted} sub="Claimed + unclaimed pipeline" />
				<KpiCard label="Metronome" value={ra.metronome?.formatted} sub="All-time" />
				<KpiCard label="Vesper" value={ra.vesper?.formatted} sub="All-time" />
				<KpiCard label="Odyssey" value={ra.odyssey?.formatted} sub="All-time" />
			</div>
			<div className="grid grid-cols-2 gap-3">
				<KpiCard label="MET Holder Buybacks" value={ha.metronome?.formatted} sub="All-time" />
				<KpiCard label="VSP Holder Buybacks" value={ha.vesper?.formatted} sub="All-time" />
			</div>

			{/* Claimed MTD */}
			<SectionHeader>Claimed Revenue · Month-to-Date</SectionHeader>
			<div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
				<KpiCard label="Metronome MTD" value={cm.metronome?.formatted} />
				<KpiCard label="Vesper MTD" value={cm.vesper?.formatted} sub={vc ? `${vc.windowDays}d window · ${vc.source}` : undefined} />
				<KpiCard label="Odyssey MTD" value={cm.odyssey?.formatted} sub={oc ? `${oc.windowDays}d window · ${oc.source}` : undefined} />
			</div>
			{isLoading || !dailySeries ? (
				<ChartSkeleton title="Daily Revenue" />
			) : (
				<ChartCard title="Daily Claimed Revenue" subtitle="Stacked by protocol">
					<MultiSeriesChart series={dailySeries as any} valueSymbol="$" height="320px" />
				</ChartCard>
			)}
			{isLoading || !holderSeries ? (
				<ChartSkeleton title="Holder Buybacks (daily)" />
			) : (
				<ChartCard title="Holder Buybacks (daily)" subtitle="Revenue routed to token holders (MET / VSP)">
					<MultiSeriesChart series={holderSeries as any} valueSymbol="$" height="260px" />
				</ChartCard>
			)}
			{holdersByMonthSeries && (
				<ChartCard title="Holder Buybacks by Month" subtitle="Monthly totals routed to MET / VSP holders">
					<MultiSeriesChart series={holdersByMonthSeries as any} valueSymbol="$" height="280px" />
				</ChartCard>
			)}

			{/* Metronome breakdown · canonical from financial-statement adapter */}
			{mc && (
				<>
					<SectionHeader>Metronome Revenue Breakdown · {mc.monthLabel}</SectionHeader>
					<ChartCard
						title="Revenue by source"
						subtitle={`Total ${mc.claimedFormatted} this month · source: ${mc.source}`}
					>
						{mc.hasBreakdown && mc.items?.length ? (
							<SimpleTable
								rows={mc.items}
								cols={[
									{ key: 'label', label: 'Source' },
									{ key: 'chain', label: 'Chain' },
									{ key: 'detail', label: 'Detail' },
									{ key: 'amountUsd', label: 'USD', right: true, render: (r) => r.amountFormatted || fmtUsd(r.amountUsd) }
								]}
							/>
						) : (
							<div className="px-2 py-3 text-xs text-(--text-secondary)">
								Per-source breakdown not yet available for this month — only the total is reported.
							</div>
						)}
					</ChartCard>
				</>
			)}

			{/* Unclaimed pipeline */}
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
						stackColors={Object.fromEntries(up.pie.map((p, i) => [p.name, PIE_COLORS[i % PIE_COLORS.length]]))}
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
							{ key: 'pool', label: 'Pool' },
							{ key: 'rewards', label: 'Unclaimed' },
							{ key: 'usd', label: 'USD', right: true, render: (r) => fmtUsd(r.usd) }
						]}
					/>
				</SubSectionCard>
				<SubSectionCard
					title="Plasma UniV3"
					subtitle="Trading fees on Plasma concentrated-liquidity positions (per token)"
					total={plasmaTotal}
				>
					<SimpleTable
						rows={up.plasmaUniv3}
						cols={[
							{ key: 'position', label: 'Position' },
							{ key: 'token', label: 'Token' },
							{ key: 'amount', label: 'Amount', right: true, render: (r) => r.amount?.toFixed(4) },
							{ key: 'usd', label: 'USD', right: true, render: (r) => fmtUsd(r.usd) }
						]}
					/>
				</SubSectionCard>
			</div>

			<SectionHeader>Gauge & Lock Rewards</SectionHeader>
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
						{ key: 'unlock', label: 'Unlock', right: true, render: (r) => r.unlock || '—' }
					]}
				/>
			</SubSectionCard>

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
						{ key: 'grossPnlUsd', label: 'Gross PnL', right: true, render: (r) => fmtUsd(r.grossPnlUsd) },
						{ key: 'feeRate', label: 'Fee', right: true, render: (r) => `${((r.feeRate ?? 0) * 100).toFixed(1)}%` },
						{ key: 'pnlUsd', label: 'Net PnL', right: true, render: (r) => fmtUsd(r.pnlUsd) },
						{ key: 'allTimeHarvestedUsd', label: 'All-time Harvested', right: true, render: (r) => fmtUsd(r.allTimeHarvestedUsd) },
						{ key: 'lastHarvestDate', label: 'Last Harvest', right: true, render: (r) => r.lastHarvestDate || '—' }
					]}
				/>
			</SubSectionCard>

			<SectionHeader>Convex vlCVX · Vote-locked Rewards</SectionHeader>
			<SubSectionCard
				title="vlCVX claimable"
				subtitle={`Claimable rewards total ${fmtUsd(convexClaimable)}.`}
			>
				<SimpleTable
					rows={up.convex}
					cols={[
						{ key: 'type', label: 'Type' },
						{ key: 'status', label: 'Status' },
						{ key: 'usd', label: 'USD', right: true, render: (r) => fmtUsd(r.usd) },
						{ key: 'unlock', label: 'Unlock', right: true, render: (r) => r.unlock || '—' }
					]}
				/>
			</SubSectionCard>

			{/* Synth interest — informational, not in pipeline total */}
			<SectionHeader>Synth Interest · Borrower-side Accrual (informational)</SectionHeader>
			<SubSectionCard
				title="Outstanding synth debt"
				subtitle={`Interest accrues on user borrows of msUSD / msETH. Est. ${fmtUsd(synthDaily)} per day · ${fmtUsd(synthMonthly)} per month. Not part of pipeline total.`}
			>
				<div className="flex flex-col gap-4">
					{(data?.synthInterestDetail || []).map((r) => (
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
