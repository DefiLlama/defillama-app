import { createColumnHelper } from '@tanstack/react-table'
import * as React from 'react'
import { BasicLink } from '~/components/Link'
import { PercentChange } from '~/components/PercentChange'
import { SelectWithCombobox } from '~/components/Select/SelectWithCombobox'
import { TableWithSearch } from '~/components/Table/TableWithSearch'
import { TagGroup } from '~/components/TagGroup'
import { TokenLogo } from '~/components/TokenLogo'
import { Tooltip } from '~/components/Tooltip'
import { formattedNum } from '~/utils'
import { DEFAULT_WEIGHTS, getScoreLabel, rescoreRows } from './scoring'
import type { ISignalWeights } from './scoring'
import type { IHealthRow, ISignalScores, LlamaHealthProps } from './types'

const columnHelper = createColumnHelper<IHealthRow>()

function ScoreBreakdownTooltip({ signals, score }: { signals: ISignalScores; score: number }) {
	const rows: Array<{ label: string; value: number | null; description: string }> = [
		{ label: 'TVL Momentum', value: signals.tvlMomentum, description: '7d TVL change vs peers' },
		{ label: 'TVL Consistency', value: signals.tvlConsistency, description: '1d vs 7d volatility penalty' },
		{ label: 'Fee Generation', value: signals.feeGeneration, description: '30d fees vs peers in category' },
		{ label: 'Fee Trend', value: signals.feeTrend, description: '30d-over-30d fee growth' },
		{ label: 'Chain Diversification', value: signals.chainDiversification, description: 'Multi-chain coverage' },
		{ label: 'Audit Status', value: signals.auditStatus, description: 'Has security audits' },
		{ label: 'Maturity', value: signals.maturity, description: 'Protocol age (log-scaled)' }
	]

	return (
		<div className="flex min-w-[200px] flex-col gap-2 text-xs">
			<div className="flex items-center justify-between border-b border-black/10 pb-1.5 dark:border-white/10">
				<span className="font-semibold">Health Score Breakdown</span>
				<span className="font-bold">{score}/100</span>
			</div>
			<div className="mt-2 flex flex-col gap-2">
				{rows.map(({ label, value, description }) => (
					<div key={label} className="flex items-center justify-between gap-3">
						<span className="flex flex-col">
							<span className="font-medium">{label}</span>
							<span className="text-[10px] opacity-60">{description}</span>
						</span>
						{value != null ? (
							<span
								className="shrink-0 font-mono font-semibold"
								style={{ color: value >= 0.6 ? '#22c55e' : value >= 0.35 ? '#eab308' : '#ef4444' }}
							>
								{Math.round(value * 100)}
							</span>
						) : (
							<span className="shrink-0 opacity-40">—</span>
						)}
					</div>
				))}
			</div>
			<p className="border-t border-black/10 pt-1.5 text-[10px] opacity-50 dark:border-white/10">
				Scores are category-relative percentile ranks. Confidence-weighted by TVL.
			</p>
		</div>
	)
}

function ScoreBadge({ row }: { row: IHealthRow }) {
	const { label, className } = getScoreLabel(row.score)
	return (
		<Tooltip content={<ScoreBreakdownTooltip signals={row.signals} score={row.score} />} placement="right">
			<span
				className={`inline-flex cursor-help items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${className}`}
			>
				<span>{row.score}</span>
				<span className="opacity-70">{label}</span>
			</span>
		</Tooltip>
	)
}

const DEFAULT_SORTING = [{ id: 'score', desc: true }]

const columns = [
	columnHelper.accessor('name', {
		header: 'Protocol',
		cell: (info) => {
			const row = info.row.original
			return (
				<BasicLink href={`/protocol/${row.slug}`} className="flex items-center gap-2 hover:underline">
					<TokenLogo src={row.logo} size={20} alt={`Logo of ${row.name}`} />
					<span className="min-w-0 truncate font-medium">{row.name}</span>
				</BasicLink>
			)
		},
		meta: { headerClassName: 'w-[200px]' }
	}),
	columnHelper.accessor('score', {
		header: 'Health Score',
		cell: (info) => <ScoreBadge row={info.row.original} />,
		meta: { headerClassName: 'w-[160px]', align: 'start' }
	}),
	columnHelper.accessor('category', {
		header: 'Category',
		cell: (info) => <span className="text-sm text-(--text-secondary)">{info.getValue()}</span>,
		meta: { headerClassName: 'w-[140px]' }
	}),
	columnHelper.accessor('tvl', {
		header: 'TVL',
		cell: (info) => <span>{formattedNum(info.getValue(), true)}</span>,
		meta: { headerClassName: 'w-[110px]', align: 'end' }
	}),
	columnHelper.accessor('change7d', {
		header: '7d Change',
		cell: (info) => {
			const v = info.getValue()
			return v != null ? <PercentChange percent={v} /> : <span className="opacity-40">—</span>
		},
		meta: { headerClassName: 'w-[100px]', align: 'end' }
	}),
	columnHelper.accessor('fees30d', {
		header: 'Fees 30d',
		cell: (info) => {
			const v = info.getValue()
			return v != null ? <span>{formattedNum(v, true)}</span> : <span className="opacity-40">—</span>
		},
		meta: { headerClassName: 'w-[110px]', align: 'end' }
	}),
	columnHelper.accessor('revenue30d', {
		header: 'Revenue 30d',
		cell: (info) => {
			const v = info.getValue()
			return v != null ? <span>{formattedNum(v, true)}</span> : <span className="opacity-40">—</span>
		},
		meta: { headerClassName: 'w-[120px]', align: 'end' }
	}),
	columnHelper.accessor('chains', {
		header: 'Chains',
		cell: (info) => <span>{info.getValue()}</span>,
		meta: { headerClassName: 'w-[80px]', align: 'end' }
	}),
	columnHelper.accessor('audited', {
		header: 'Audited',
		cell: (info) =>
			info.getValue() ? (
				<span className="text-green-500 dark:text-green-400">✓</span>
			) : (
				<span className="opacity-30">—</span>
			),
		meta: { headerClassName: 'w-[80px]', align: 'end' }
	})
]

const CATEGORIES = ['All', 'Dexs', 'Lending', 'Derivatives', 'Liquid Staking', 'Yield', 'Bridge', 'CDP', 'RWA']

const SIGNAL_DOCS = [
	{
		label: 'TVL Momentum',
		weight: '1.5×',
		formula: 'Percentile rank of 7d TVL % change within the same category',
		note: 'Higher = growing faster than peers'
	},
	{
		label: 'TVL Consistency',
		weight: '1.0×',
		formula: 'e^(−0.15 × |change_1d − change_7d/7|)',
		note: 'Penalizes wild swings between daily and weekly growth; score decays exponentially with divergence'
	},
	{
		label: 'Fee Generation',
		weight: '2.0×',
		formula: 'Percentile rank of 30d fees within the same category',
		note: 'Highest weight — real fee revenue is the strongest sustainability signal'
	},
	{
		label: 'Fee Trend',
		weight: '1.5×',
		formula: 'Percentile rank of 30d-over-30d fee growth within the same category',
		note: 'Rewards protocols with accelerating fee revenue'
	},
	{
		label: 'Chain Diversification',
		weight: '1.0×',
		formula: 'log₂(chains + 1) / log₂(maxChains + 1)',
		note: 'Log-scaled so each additional chain matters less at the margin'
	},
	{
		label: 'Audit Status',
		weight: '1.0×',
		formula: '1 if audited, 0 if not',
		note: 'Binary signal based on the audits field in DefiLlama metadata'
	},
	{
		label: 'Maturity',
		weight: '0.5×',
		formula: 'log(age_days + 1) / log(4×365 + 1)',
		note: "Log-scaled age capped at 4 years; lowest weight since age alone doesn't guarantee quality"
	}
]

const WEIGHT_LABELS: { key: keyof ISignalWeights; label: string }[] = [
	{ key: 'feeGeneration', label: 'Fee Generation' },
	{ key: 'feeTrend', label: 'Fee Trend' },
	{ key: 'tvlMomentum', label: 'TVL Momentum' },
	{ key: 'tvlConsistency', label: 'TVL Consistency' },
	{ key: 'chainDiversification', label: 'Chain Diversification' },
	{ key: 'auditStatus', label: 'Audit Status' },
	{ key: 'maturity', label: 'Maturity' }
]

function WeightsPanel({
	weights,
	onChange,
	onReset
}: {
	weights: ISignalWeights
	onChange: (key: keyof ISignalWeights, value: number) => void
	onReset: () => void
}) {
	const isDirty = WEIGHT_LABELS.some(({ key }) => weights[key] !== DEFAULT_WEIGHTS[key])
	return (
		<div className="rounded-md border border-(--cards-border) bg-(--cards-bg) p-4">
			<div className="mb-3 flex items-center justify-between gap-4">
				<div>
					<span className="text-sm font-semibold">Customize Weights</span>
					<span className="ml-2 text-xs text-(--text-tertiary)">Drag to adjust how each signal affects the score</span>
				</div>
				{isDirty && (
					<button
						onClick={onReset}
						className="shrink-0 rounded-md border border-(--cards-border) px-3 py-1 text-xs text-(--text-secondary) transition-colors hover:bg-(--bg-input)"
					>
						Reset to defaults
					</button>
				)}
			</div>
			<div className="grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
				{WEIGHT_LABELS.map(({ key, label }) => {
					const val = weights[key]
					const isChanged = val !== DEFAULT_WEIGHTS[key]
					return (
						<div key={key} className="flex flex-col gap-1">
							<div className="flex items-center justify-between gap-2 text-xs">
								<span className={isChanged ? 'font-semibold' : 'text-(--text-secondary)'}>{label}</span>
								<span
									className={`font-mono ${isChanged ? 'text-blue-500 dark:text-blue-400' : 'text-(--text-tertiary)'}`}
								>
									{val.toFixed(1)}×
								</span>
							</div>
							<input
								type="range"
								min={0}
								max={3}
								step={0.1}
								value={val}
								onChange={(e) => onChange(key, parseFloat(e.target.value))}
								className="h-1.5 w-full cursor-pointer accent-blue-500"
							/>
						</div>
					)
				})}
			</div>
		</div>
	)
}

function HowScoredModal({ onClose }: { onClose: () => void }) {
	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
			<div className="absolute inset-0 bg-black/50" onClick={onClose} />
			<div className="relative z-10 flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-(--cards-border) bg-(--cards-bg) shadow-2xl">
				<div className="flex items-center justify-between border-b border-(--cards-border) px-5 py-4">
					<h2 className="text-base font-semibold">How the Health Score is Calculated</h2>
					<button
						onClick={onClose}
						className="rounded-md p-1 text-(--text-secondary) hover:bg-(--bg-input)"
						aria-label="Close"
					>
						✕
					</button>
				</div>

				<div className="no-scrollbar overflow-y-auto px-5 py-4">
					<p className="mb-4 text-sm text-(--text-secondary)">
						Each protocol is scored on up to 7 signals. Signals are <strong>category-relative percentile ranks</strong>{' '}
						— a DEX is only compared to other DEXs, a lending protocol to other lending protocols. The final score is a
						weighted average of available signals, scaled 0–100.
					</p>

					<p className="mb-4 text-sm text-(--text-secondary)">
						A <strong>confidence weight</strong> of{' '}
						<code className="rounded bg-(--bg-input) px-1 py-0.5 text-xs">min(1, log₁₀(TVL) / log₁₀(1B))</code> blends
						small protocols toward 50 to prevent a $50k protocol from scoring 97/100 on sparse data.
					</p>

					<div className="flex flex-col gap-3">
						{SIGNAL_DOCS.map((s) => (
							<div key={s.label} className="rounded-lg border border-(--cards-border) p-3">
								<div className="mb-1 flex items-center justify-between gap-2">
									<span className="font-medium">{s.label}</span>
									<span className="rounded bg-(--bg-input) px-2 py-0.5 font-mono text-xs text-(--text-secondary)">
										weight {s.weight}
									</span>
								</div>
								<code className="mb-1 block text-xs text-(--text-secondary)">{s.formula}</code>
								<p className="text-xs text-(--text-tertiary)">{s.note}</p>
							</div>
						))}
					</div>

					<p className="mt-4 text-xs text-(--text-tertiary)">
						Only protocols with TVL &gt; $1M and listed for over 90 days are scored. Signals with missing data are
						excluded from the denominator rather than treated as zero.
					</p>
				</div>
			</div>
		</div>
	)
}

const PILL_LIMIT = 8

export function LlamaHealth({ rows }: LlamaHealthProps) {
	const [category, setCategory] = React.useState('All')
	const [showMethodology, setShowMethodology] = React.useState(false)
	const [showWeights, setShowWeights] = React.useState(false)
	const [weights, setWeights] = React.useState<ISignalWeights>(DEFAULT_WEIGHTS)

	const scoredRows = React.useMemo(() => rescoreRows(rows, weights), [rows, weights])

	const handleWeightChange = React.useCallback((key: keyof ISignalWeights, value: number) => {
		setWeights((prev) => ({ ...prev, [key]: value }))
	}, [])

	const handleWeightReset = React.useCallback(() => setWeights(DEFAULT_WEIGHTS), [])

	const filtered = React.useMemo(
		() => (category === 'All' ? scoredRows : scoredRows.filter((r) => r.category === category)),
		[scoredRows, category]
	)

	const { pillCategories, overflowCategories } = React.useMemo(() => {
		const cats = new Set(rows.map((r) => r.category))
		const all = [
			'All',
			...CATEGORIES.filter((c) => c !== 'All' && cats.has(c)),
			...Array.from(cats)
				.filter((c) => !CATEGORIES.includes(c))
				.sort()
		]
		return {
			pillCategories: all.slice(0, PILL_LIMIT),
			overflowCategories: all.slice(PILL_LIMIT)
		}
	}, [rows])

	return (
		<div className="flex flex-col gap-4">
			{showMethodology && <HowScoredModal onClose={() => setShowMethodology(false)} />}

			<div className="flex flex-col gap-1 rounded-md border border-(--cards-border) bg-(--cards-bg) p-4">
				<div className="flex items-start justify-between gap-4">
					<div>
						<h1 className="text-xl font-semibold">Llama Health</h1>
						<p className="mt-1 text-sm text-(--text-secondary)">
							Protocol sustainability scores based on fee generation, TVL stability, chain diversification, and audit
							status.
							<br />
							Scores are category-relative, each protocol is ranked against peers in the same sector. Hover a score to
							see the full breakdown.
						</p>
					</div>
					<div className="flex shrink-0 gap-2">
						<button
							onClick={() => setShowWeights((v) => !v)}
							className="rounded-md border border-(--cards-border) px-3 py-1.5 text-xs text-(--text-secondary) transition-colors hover:bg-(--bg-input)"
						>
							{showWeights ? 'Hide weights' : 'Customize weights'}
						</button>
						<button
							onClick={() => setShowMethodology(true)}
							className="rounded-md border border-(--cards-border) px-3 py-1.5 text-xs text-(--text-secondary) transition-colors hover:bg-(--bg-input)"
						>
							How is score calculated?
						</button>
					</div>
				</div>
			</div>

			{showWeights && <WeightsPanel weights={weights} onChange={handleWeightChange} onReset={handleWeightReset} />}

			<TableWithSearch
				data={filtered}
				columns={columns}
				columnToSearch="name"
				placeholder="Search protocols..."
				header={null}
				sortingState={DEFAULT_SORTING}
				csvFileName="llama-health"
				customFilters={
					<div className="flex items-center gap-2">
						<TagGroup
							values={pillCategories as unknown as readonly string[]}
							selectedValue={pillCategories.includes(category) ? category : null}
							setValue={setCategory}
							variant="responsive"
						/>
						{overflowCategories.length > 0 && (
							<SelectWithCombobox
								allValues={overflowCategories}
								selectedValues={overflowCategories.includes(category) ? [category] : []}
								setSelectedValues={(vals) => setCategory(vals[0] ?? 'All')}
								label="Others"
								labelType="smol"
								variant="filter"
								singleSelect
							/>
						)}
					</div>
				}
			/>

			<p className="px-1 text-xs text-(--text-tertiary)">
				Only protocols with TVL &gt; $1M and listed for over 90 days are scored. Missing signals are excluded from the
				average rather than penalized.
			</p>
		</div>
	)
}
