import { createColumnHelper } from '@tanstack/react-table'
import * as React from 'react'
import { BasicLink } from '~/components/Link'
import { PercentChange } from '~/components/PercentChange'
import { TableWithSearch } from '~/components/Table/TableWithSearch'
import { TagGroup } from '~/components/TagGroup'
import { TokenLogo } from '~/components/TokenLogo'
import { Tooltip } from '~/components/Tooltip'
import { formattedNum } from '~/utils'
import type { AnomalyDetectionProps, IAnomalyRow, IAnomaly } from './types'

const columnHelper = createColumnHelper<IAnomalyRow>()

const TYPE_COLORS: Record<string, string> = {
	'tvl-spike': 'bg-green-500/15 text-green-600 dark:text-green-400',
	'tvl-drop': 'bg-red-500/15 text-red-600 dark:text-red-400',
	'fee-spike': 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
	'fee-drop': 'bg-orange-500/15 text-orange-600 dark:text-orange-400'
}

const SEVERITY_DOT: Record<string, string> = {
	warning: 'bg-yellow-400',
	critical: 'bg-red-500'
}

function AnomalyBadge({ anomaly }: { anomaly: IAnomaly }) {
	return (
		<Tooltip
			content={
				<div className="flex min-w-[160px] flex-col gap-1 text-xs">
					<div className="flex items-center justify-between gap-3 font-semibold">
						<span>{anomaly.label}</span>
						<span className="text-(--text-tertiary) capitalize">{anomaly.severity}</span>
					</div>
					<div className="flex items-center justify-between gap-3">
						<span className="text-(--text-tertiary)">Z-score</span>
						<span className="font-mono font-semibold">{anomaly.zScore.toFixed(2)}σ</span>
					</div>
					<div className="flex items-center justify-between gap-3">
						<span className="text-(--text-tertiary)">Change</span>
						<span className="font-mono font-semibold">
							{anomaly.change > 0 ? '+' : ''}
							{anomaly.change.toFixed(2)}%
						</span>
					</div>
				</div>
			}
			placement="top"
		>
			<span
				className={`inline-flex cursor-help items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_COLORS[anomaly.type]}`}
			>
				<span className={`h-1.5 w-1.5 rounded-full ${SEVERITY_DOT[anomaly.severity]}`} />
				{anomaly.label}
			</span>
		</Tooltip>
	)
}

const DEFAULT_SORTING = [{ id: 'maxZScore', desc: true }]

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
		meta: { headerClassName: 'w-[180px]' }
	}),
	columnHelper.accessor('anomalies', {
		header: 'Anomalies',
		cell: (info) => (
			<div className="flex flex-wrap gap-1">
				{info.getValue().map((a) => (
					<AnomalyBadge key={a.type} anomaly={a} />
				))}
			</div>
		),
		meta: { headerClassName: 'w-[220px]' },
		enableSorting: false
	}),
	columnHelper.accessor('maxZScore', {
		header: 'Severity',
		cell: (info) => {
			const z = info.getValue()
			const color = z >= 3 ? 'text-red-500 dark:text-red-400' : 'text-yellow-600 dark:text-yellow-400'
			return <span className={`font-mono text-sm font-semibold ${color}`}>{z.toFixed(2)}σ</span>
		},
		meta: { headerClassName: 'w-[100px]', align: 'end' }
	}),
	columnHelper.accessor('category', {
		header: 'Category',
		cell: (info) => <span className="text-sm text-(--text-secondary)">{info.getValue()}</span>,
		meta: { headerClassName: 'w-[130px]' }
	}),
	columnHelper.accessor('tvl', {
		header: 'TVL',
		cell: (info) => <span>{formattedNum(info.getValue(), true)}</span>,
		meta: { headerClassName: 'w-[110px]', align: 'end' }
	}),
	columnHelper.accessor('change1d', {
		header: '1d Change',
		cell: (info) => {
			const v = info.getValue()
			return v != null ? <PercentChange percent={v} /> : <span className="opacity-40">—</span>
		},
		meta: { headerClassName: 'w-[100px]', align: 'end' }
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
	})
]

const FILTER_OPTIONS = ['All', 'TVL Spike', 'TVL Drop', 'Fee Spike', 'Fee Drop', 'Critical Only'] as const
type FilterOption = (typeof FILTER_OPTIONS)[number]

const TYPE_MAP: Record<string, string> = {
	'TVL Spike': 'tvl-spike',
	'TVL Drop': 'tvl-drop',
	'Fee Spike': 'fee-spike',
	'Fee Drop': 'fee-drop'
}

export function AnomalyDetection({ rows, lastUpdated }: AnomalyDetectionProps) {
	const [filter, setFilter] = React.useState<FilterOption>('All')

	const filtered = React.useMemo(() => {
		if (filter === 'All') return rows
		if (filter === 'Critical Only') return rows.filter((r) => r.anomalies.some((a) => a.severity === 'critical'))
		const type = TYPE_MAP[filter]
		return rows.filter((r) => r.anomalies.some((a) => a.type === type))
	}, [rows, filter])

	const counts = React.useMemo(
		() => ({
			total: rows.length,
			critical: rows.filter((r) => r.anomalies.some((a) => a.severity === 'critical')).length,
			tvlSpike: rows.filter((r) => r.anomalies.some((a) => a.type === 'tvl-spike')).length,
			tvlDrop: rows.filter((r) => r.anomalies.some((a) => a.type === 'tvl-drop')).length,
			feeSpike: rows.filter((r) => r.anomalies.some((a) => a.type === 'fee-spike')).length,
			feeDrop: rows.filter((r) => r.anomalies.some((a) => a.type === 'fee-drop')).length
		}),
		[rows]
	)

	const updatedAt = React.useMemo(() => {
		try {
			return new Date(lastUpdated).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
		} catch {
			return lastUpdated
		}
	}, [lastUpdated])

	return (
		<div className="flex flex-col gap-4">
			<div className="flex flex-col gap-3 rounded-md border border-(--cards-border) bg-(--cards-bg) p-4">
				<div className="flex items-start justify-between gap-4">
					<div>
						<h1 className="text-xl font-semibold">Anomaly Detection</h1>
						<p className="mt-1 text-sm text-(--text-secondary)">
							Protocols with unusual TVL or fee activity flagged using z-score analysis.
							<br />
							Warnings are 2σ+ deviations, Critical are 3σ+, compared across all protocols with TVL &gt; $1M. Hover a
							badge to see the z-score and exact change.
						</p>
					</div>
					<span className="shrink-0 text-xs text-(--text-tertiary)">Updated {updatedAt}</span>
				</div>

				<div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
					{[
						{ label: 'Total Flagged', value: counts.total, color: 'text-(--text-primary)' },
						{ label: 'Critical', value: counts.critical, color: 'text-red-500 dark:text-red-400' },
						{ label: 'TVL Spikes', value: counts.tvlSpike, color: 'text-green-600 dark:text-green-400' },
						{ label: 'TVL Drops', value: counts.tvlDrop, color: 'text-red-600 dark:text-red-400' },
						{ label: 'Fee Spikes', value: counts.feeSpike, color: 'text-blue-600 dark:text-blue-400' },
						{ label: 'Fee Drops', value: counts.feeDrop, color: 'text-orange-600 dark:text-orange-400' }
					].map(({ label, value, color }) => (
						<div key={label} className="rounded-md border border-(--cards-border) px-3 py-2">
							<div className={`text-xl font-bold ${color}`}>{value}</div>
							<div className="text-xs text-(--text-tertiary)">{label}</div>
						</div>
					))}
				</div>
			</div>

			<TableWithSearch
				data={filtered}
				columns={columns}
				columnToSearch="name"
				placeholder="Search protocols..."
				header={null}
				sortingState={DEFAULT_SORTING}
				csvFileName="anomaly-detection"
				customFilters={
					<TagGroup
						values={FILTER_OPTIONS as unknown as readonly string[]}
						selectedValue={filter}
						setValue={(v) => setFilter(v as FilterOption)}
						variant="responsive"
					/>
				}
			/>

			<p className="px-1 text-xs text-(--text-tertiary)">
				Anomalies are detected using z-score analysis on 1d and 7d TVL changes and 30d fee changes. Only protocols with
				TVL &gt; $1M are included.
			</p>
		</div>
	)
}
