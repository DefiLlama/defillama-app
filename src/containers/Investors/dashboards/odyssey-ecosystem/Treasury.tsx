import { useTreasuryData } from './api'
import { KpiCard, ChartCard, SectionHeader, SimpleTable, fmtUsd } from './ui'

export default function Treasury() {
	const { data } = useTreasuryData()
	const tlp = data?.treasuryLps
	const plasma = data?.plasmaUniv3
	const cvx = data?.vlCvx
	const aero = data?.veAero
	const met = data?.metronomeAllocation
	const ves = data?.vesperAllocation

	return (
		<div className="flex flex-col gap-6">
			<div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
				<KpiCard
					label="Treasury LP Total"
					value={tlp?.totalFormatted}
					sub={`Unclaimed ${tlp?.unclaimedRewardsFormatted || ''}`}
				/>
				<KpiCard label="Plasma UniV3 Total" value={plasma?.totalFormatted} />
				<KpiCard label="veAERO Locks" value={aero?.rows?.length != null ? String(aero.rows.length) : undefined} />
			</div>

			<SectionHeader>Treasury LP Positions</SectionHeader>
			<ChartCard
				title="LP Positions (all chains)"
				subtitle={`${tlp?.rows?.length ?? 0} positions across Base, Optimism, Plasma`}
			>
				<SimpleTable
					rows={tlp?.rows}
					cols={[
						{ key: 'pool', label: 'Pool' },
						{ key: 'stakedLp', label: 'Staked LP' },
						{ key: 'rewards', label: 'Pending Rewards' },
						{ key: 'rewardsUsd', label: 'Rewards USD', right: true, render: (r) => fmtUsd(r.rewardsUsd) },
						{ key: 'valueUsd', label: 'Position Value', right: true, render: (r) => fmtUsd(r.valueUsd) }
					]}
				/>
			</ChartCard>

			<SectionHeader>Plasma UniV3 Unclaimed Fees</SectionHeader>
			<ChartCard title="Plasma positions (per token)" subtitle="One row per NFT × token">
				<SimpleTable
					rows={plasma?.rows}
					cols={[
						{ key: 'pool', label: 'Position' },
						{ key: 'token', label: 'Token' },
						{ key: 'amount', label: 'Amount', right: true, render: (r) => r.amount?.toFixed(4) },
						{ key: 'usd', label: 'USD', right: true, render: (r) => fmtUsd(r.usd) }
					]}
				/>
			</ChartCard>

			<SectionHeader>Convex vlCVX Locks</SectionHeader>
			<ChartCard title="vlCVX">
				<SimpleTable
					rows={cvx?.rows}
					cols={[
						{ key: 'type', label: 'Lock' },
						{ key: 'balance', label: 'Balance' },
						{ key: 'status', label: 'Status' },
						{ key: 'unlock', label: 'Unlock', right: true, render: (r) => r.unlock || '—' }
					]}
				/>
			</ChartCard>

			<SectionHeader>veAERO NFTs</SectionHeader>
			<ChartCard title="veAERO holdings">
				<SimpleTable
					rows={aero?.rows}
					cols={[
						{ key: 'nft', label: 'NFT' },
						{ key: 'locked', label: 'Locked AERO' },
						{ key: 'rewards', label: 'Pending Rewards' },
						{ key: 'unlock', label: 'Unlock', right: true, render: (r) => r.unlock || '—' }
					]}
				/>
			</ChartCard>

			<SectionHeader>Treasury Allocation · ETH / USD / BTC / Other</SectionHeader>
			<div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
				<ChartCard title="Metronome Allocation" subtitle="Pre-categorised buckets">
					<SimpleTable
						rows={met?.rows}
						cols={[
							{ key: 'bucket', label: 'Bucket' },
							{ key: 'share', label: 'Share', right: true },
							{ key: 'value', label: 'Value', right: true }
						]}
					/>
				</ChartCard>
				<ChartCard title="Vesper Allocation" subtitle="Pre-categorised buckets">
					<SimpleTable
						rows={ves?.rows}
						cols={[
							{ key: 'bucket', label: 'Bucket' },
							{ key: 'share', label: 'Share', right: true },
							{ key: 'value', label: 'Value', right: true }
						]}
					/>
				</ChartCard>
			</div>
		</div>
	)
}
