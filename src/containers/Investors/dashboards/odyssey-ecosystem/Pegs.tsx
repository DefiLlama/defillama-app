import { usePegsData, type PegRow } from './api'
import { KpiCard, ChartCard, SectionHeader, SimpleTable, fmtUsd } from './ui'

const SIZES = [10_000, 50_000, 100_000, 500_000, 1_000_000]

function fmtSize(s: number) {
	if (s >= 1_000_000) return '$' + s / 1_000_000 + 'M'
	if (s >= 1_000) return '$' + s / 1_000 + 'K'
	return '$' + s
}

function PegPill({ ratio, bps }: { ratio: number; bps?: number }) {
	const dev = bps != null ? bps : Math.abs(ratio - 1) * 10_000
	const color = dev <= 30 ? 'text-green-400' : dev <= 100 ? 'text-amber-400' : 'text-red-400'
	return (
		<span className={`tabular-nums ${color}`}>
			{ratio.toFixed(4)} <span className="text-[10px] text-(--text-secondary)">({dev.toFixed(0)} bps)</span>
		</span>
	)
}

function SynthTable({ rows }: { rows: PegRow[] }) {
	if (!rows?.length) return <div className="px-2 py-4 text-xs text-(--text-secondary)">No data</div>
	return (
		<div className="overflow-x-auto">
			<table className="w-full text-sm">
				<thead>
					<tr className="border-b border-(--cards-border) bg-(--app-bg)/40">
						<th className="px-3 py-2.5 text-left text-[11px] font-semibold tracking-wider text-(--text-label) uppercase">
							Chain
						</th>
						<th className="px-3 py-2.5 text-left text-[11px] font-semibold tracking-wider text-(--text-label) uppercase">
							Counter
						</th>
						<th className="px-3 py-2.5 text-right text-[11px] font-semibold tracking-wider text-(--text-label) uppercase">
							Spot Peg
						</th>
						{SIZES.map((s) => (
							<th
								key={s}
								className="px-3 py-2.5 text-right text-[11px] font-semibold tracking-wider text-(--text-label) uppercase"
							>
								{fmtSize(s)}
							</th>
						))}
						<th className="px-3 py-2.5 text-right text-[11px] font-semibold tracking-wider text-(--text-label) uppercase">
							Kyber
						</th>
					</tr>
				</thead>
				<tbody>
					{rows.map((r) => (
						<tr
							key={r.chain + r.counter}
							className="border-b border-(--cards-border)/60 last:border-0 hover:bg-(--sl-hover-bg)"
						>
							<td className="px-3 py-2.5 text-(--text-primary) capitalize">{r.chain}</td>
							<td className="px-3 py-2.5 text-(--text-secondary)">{r.counter}</td>
							<td className="px-3 py-2.5 text-right">
								<PegPill ratio={r.pegRatio} />
							</td>
							{SIZES.map((s) => {
								const d = r.depth.find((x) => x.sizeUsd === s)
								return (
									<td key={s} className="px-3 py-2.5 text-right tabular-nums">
										{d ? <PegPill ratio={d.pegRatio} bps={Math.abs(d.pegRatio - 1) * 10_000} /> : '—'}
									</td>
								)
							})}
							<td className="px-3 py-2.5 text-right">
								<span
									className={`rounded px-2 py-0.5 text-[11px] font-semibold ${
										r.kyberSupported
											? 'bg-emerald-500/15 text-emerald-400'
											: 'bg-(--cards-border) text-(--text-secondary)'
									}`}
								>
									{r.kyberSupported ? 'yes' : 'no'}
								</span>
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	)
}

export default function Pegs() {
	const { data } = usePegsData()
	const msUSD = (data?.rows || []).filter((r) => r.synth === 'msUSD')
	const msETH = (data?.rows || []).filter((r) => r.synth === 'msETH')
	const k = data?.kpis

	return (
		<div className="flex flex-col gap-6">
			{data?.asOf && (
				<p className="text-[11px] text-(--text-secondary)">
					As of {new Date(data.asOf).toLocaleString()} — {data.methodology}
				</p>
			)}

			<SectionHeader>Spot Peg · Headline</SectionHeader>
			<div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
				<KpiCard
					label="msUSD spot peg"
					value={k?.msUSD ? `${k.msUSD.spotPegRatio.toFixed(4)} (${k.msUSD.spotDeviationBps} bps)` : undefined}
					sub={
						k?.msUSD
							? `Worst: ${k.msUSD.worstChain} @ ${fmtSize(k.msUSD.worstSizeUsd)} → ${k.msUSD.worstPegRatio.toFixed(4)} (${k.msUSD.worstDeviationBps} bps)`
							: undefined
					}
				/>
				<KpiCard
					label="msETH spot peg"
					value={k?.msETH ? `${k.msETH.spotPegRatio.toFixed(4)} (${k.msETH.spotDeviationBps} bps)` : undefined}
					sub={
						k?.msETH
							? `Worst: ${k.msETH.worstChain} @ ${fmtSize(k.msETH.worstSizeUsd)} → ${k.msETH.worstPegRatio.toFixed(4)} (${k.msETH.worstDeviationBps} bps)`
							: undefined
					}
				/>
			</div>

			<SectionHeader>msUSD · Peg Depth</SectionHeader>
			<ChartCard
				title="msUSD across chains"
				subtitle="Effective peg at 5 trade sizes (DefiLlama coins · KyberSwap on supported chains)"
			>
				<SynthTable rows={msUSD} />
			</ChartCard>

			<SectionHeader>msETH · Peg Depth</SectionHeader>
			<ChartCard title="msETH across chains" subtitle="Effective peg at 5 trade sizes">
				<SynthTable rows={msETH} />
			</ChartCard>

			<SectionHeader>Supply Caps · On-chain + Bridges</SectionHeader>
			{(() => {
				const capCols = [
					{ key: 'chain', label: 'Chain' },
					{ key: 'synth', label: 'Synth' },
					{
						key: 'supply',
						label: 'Supply',
						right: true,
						render: (r: any) => r.supply?.toLocaleString(undefined, { maximumFractionDigits: 2 })
					},
					{
						key: 'maxSupply',
						label: 'Max Supply',
						right: true,
						render: (r: any) => r.maxSupply?.toLocaleString(undefined, { maximumFractionDigits: 2 })
					},
					{ key: 'usagePct', label: 'Usage', right: true, render: (r: any) => `${(r.usagePct ?? 0).toFixed(1)}%` }
				]
				return (
					<>
						<ChartCard title="Mint Caps" subtitle="totalSupply / maxTotalSupply">
							<SimpleTable rows={data?.supplyCaps} cols={capCols as any} />
						</ChartCard>
						{data?.bridgeInCaps?.length ? (
							<ChartCard title="Bridge-In Caps" subtitle="Per-chain bridged-in supply vs cap">
								<SimpleTable rows={data.bridgeInCaps} cols={capCols as any} />
							</ChartCard>
						) : null}
						{data?.bridgeOutCaps?.length ? (
							<ChartCard title="Bridge-Out Caps" subtitle="Per-chain bridged-out supply vs cap">
								<SimpleTable rows={data.bridgeOutCaps} cols={capCols as any} />
							</ChartCard>
						) : null}
					</>
				)
			})()}
		</div>
	)
}
