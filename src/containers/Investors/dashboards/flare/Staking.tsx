import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useContentReady } from '~/containers/Investors/index'
import { formatNumber, formatPct, KpiCard, SectionHeader } from './ui'

interface FormattedValue {
	value: number
	formatted: string
}

interface ValidatorEntry {
	name: string
	address: string
	totalStake: number
	totalStakeFormatted: string
	totalSelfBond: number
	totalDelegated: number
	totalDelegators: number
	validatorCount: number
	averageUptime: number
}

interface StakingAPIResponse {
	kpis: {
		totalSupply: FormattedValue
		totalStake: FormattedValue
		pctStaked: FormattedValue
		totalSelfBond: FormattedValue
		totalDelegated: FormattedValue
		validatorCount: FormattedValue
		totalDelegators: FormattedValue
		averageUptime: FormattedValue
		averageFee: FormattedValue
	}
	topValidators: ValidatorEntry[]
}

function ValidatorTable({ validators }: { validators: ValidatorEntry[] }) {
	return (
		<div className="overflow-x-auto rounded-lg border border-(--cards-border) bg-(--cards-bg)">
			<table className="w-full">
				<thead>
					<tr className="border-b border-(--cards-border)">
						<th className="px-4 py-3 text-left text-xs font-semibold tracking-wide text-(--text-label) uppercase">#</th>
						<th className="px-4 py-3 text-left text-xs font-semibold tracking-wide text-(--text-label) uppercase">
							Validator
						</th>
						<th className="px-4 py-3 text-right text-xs font-semibold tracking-wide text-(--text-label) uppercase">
							Total Stake
						</th>
						<th className="px-4 py-3 text-right text-xs font-semibold tracking-wide text-(--text-label) uppercase">
							Self-Bond
						</th>
						<th className="px-4 py-3 text-right text-xs font-semibold tracking-wide text-(--text-label) uppercase">
							Delegated
						</th>
						<th className="px-4 py-3 text-right text-xs font-semibold tracking-wide text-(--text-label) uppercase">
							Delegators
						</th>
						<th className="px-4 py-3 text-right text-xs font-semibold tracking-wide text-(--text-label) uppercase">
							Avg Uptime
						</th>
					</tr>
				</thead>
				<tbody>
					{validators.map((v, i) => {
						const uptime = Math.abs(v.averageUptime) <= 1 ? v.averageUptime * 100 : v.averageUptime
						return (
							<tr
								key={`${v.address}-${i}`}
								className="border-b border-(--cards-border) last:border-b-0 hover:bg-(--sl-hover-bg)"
							>
								<td className="px-4 py-2.5 text-sm text-(--text-label)">{i + 1}</td>
								<td className="px-4 py-2.5 text-sm font-medium text-(--text-primary)">
									{v.name && v.name !== v.address ? v.name : `${v.address.slice(0, 6)}…${v.address.slice(-4)}`}
								</td>
								<td className="px-4 py-2.5 text-right text-sm tabular-nums text-(--text-primary)">
									{v.totalStakeFormatted ?? formatNumber(v.totalStake)}
								</td>
								<td className="px-4 py-2.5 text-right text-sm tabular-nums text-(--text-label)">
									{`${formatNumber(v.totalSelfBond)} FLR`}
								</td>
								<td className="px-4 py-2.5 text-right text-sm tabular-nums text-(--text-label)">
									{`${formatNumber(v.totalDelegated)} FLR`}
								</td>
								<td className="px-4 py-2.5 text-right text-sm tabular-nums text-(--text-label)">
									{formatNumber(v.totalDelegators, 0)}
								</td>
								<td className="px-4 py-2.5 text-right text-sm tabular-nums text-(--text-label)">
									{formatPct(uptime, 2)}
								</td>
							</tr>
						)
					})}
				</tbody>
			</table>
		</div>
	)
}

export default function Staking() {
	const query = useQuery<StakingAPIResponse>({
		queryKey: ['flare-staking'],
		queryFn: async () => {
			const res = await fetch('/api/flare/staking')
			if (!res.ok) throw new Error(`Flare staking API error: ${res.status}`)
			return res.json()
		},
		staleTime: 10 * 60 * 1000,
		refetchOnWindowFocus: false
	})

	const onContentReady = useContentReady()

	useEffect(() => {
		if (query.data) onContentReady()
	}, [query.data, onContentReady])

	if (!query.data) return null

	const k = query.data.kpis

	return (
		<div className="flex flex-col gap-6">
			<SectionHeader>Staking Overview</SectionHeader>
			<div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
				<KpiCard label="% of FLR Staked" value={k.pctStaked.formatted} />
				<KpiCard label="Total Stake" value={k.totalStake.formatted} />
				<KpiCard label="Total Self-Bond" value={k.totalSelfBond.formatted} />
				<KpiCard label="Total Delegated" value={k.totalDelegated.formatted} />
			</div>

			<div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
				<KpiCard label="Total Supply" value={k.totalSupply.formatted} />
				<KpiCard label="Validators" value={k.validatorCount.formatted} />
				<KpiCard label="Total Delegators" value={k.totalDelegators.formatted} />
				<KpiCard label="Avg Uptime" value={k.averageUptime.formatted} />
				<KpiCard label="Avg Fee" value={k.averageFee.formatted} />
			</div>

			{query.data.topValidators.length > 0 && (
				<>
					<SectionHeader>Top Validators by Stake</SectionHeader>
					<ValidatorTable validators={query.data.topValidators} />
				</>
			)}
		</div>
	)
}
