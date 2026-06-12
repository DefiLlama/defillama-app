import * as React from 'react'
import { type Segment, segmentHasOi } from './segments'
import { CategoryLink, ChangeCell, TokenName, type KnownTokenSlugs } from './shared'
import type { CategoryStat, SymbolStat } from './types'
import { type MoverMetricKey, MOVER_METRICS, moverValue, selectMovers, UNTAGGED_CATEGORY } from './utils'

interface MoverRow {
	name: React.ReactNode
	value: number | null
}

function MoverColumn({ rows, empty }: { rows: MoverRow[]; empty: string }) {
	if (rows.length === 0) {
		return <div className="px-3 py-2 text-xs text-(--text-disabled)">{empty}</div>
	}
	return (
		<table className="w-full">
			<tbody>
				{rows.map((row, i) => (
					<tr key={i} className="border-t border-(--cards-border) first:border-t-0">
						<td className="px-3 py-1.5 text-xs">{row.name}</td>
						<td className="px-3 py-1.5 text-right text-xs">
							<ChangeCell fraction={row.value} />
						</td>
					</tr>
				))}
			</tbody>
		</table>
	)
}

function MoverCard<T extends Parameters<typeof moverValue>[0]>({
	label,
	rows,
	metricKey,
	nameOf
}: {
	label: string
	rows: T[]
	metricKey: MoverMetricKey
	nameOf: (row: T) => React.ReactNode
}) {
	const { gainers, losers } = selectMovers(rows, metricKey)
	const toRows = (list: T[]): MoverRow[] => list.map((r) => ({ name: nameOf(r), value: moverValue(r, metricKey) }))
	return (
		<div className="rounded-md border border-(--cards-border) bg-(--cards-bg)">
			<div className="border-b border-(--cards-border) px-3 py-2 text-sm font-semibold">{label}</div>
			<div className="grid grid-cols-2 border-b border-(--cards-border)">
				<span className="border-r border-(--cards-border) px-3 py-1 text-[10px] tracking-wider text-(--success) uppercase">
					Gainers
				</span>
				<span className="px-3 py-1 text-[10px] tracking-wider text-(--error) uppercase">Losers</span>
			</div>
			<div className="grid grid-cols-2">
				<div className="border-r border-(--cards-border)">
					<MoverColumn rows={toRows(gainers)} empty="— none —" />
				</div>
				<MoverColumn rows={toRows(losers)} empty="— none —" />
			</div>
		</div>
	)
}

function MoverRowSet<T extends Parameters<typeof moverValue>[0]>({
	title,
	rows,
	metricKeys,
	nameOf
}: {
	title: string
	rows: T[]
	metricKeys: ReadonlyArray<{ key: MoverMetricKey; label: string }>
	nameOf: (row: T) => React.ReactNode
}) {
	// Match the column count to the number of metrics so spot (2 metrics) doesn't leave a gap.
	const gridCols = metricKeys.length >= 3 ? 'md:grid-cols-2 xl:grid-cols-3' : 'md:grid-cols-2'
	return (
		<div className="flex flex-col gap-2">
			<div className="text-[10px] tracking-wider text-(--text-label) uppercase">{title}</div>
			<div className={`grid grid-cols-1 gap-2 ${gridCols}`}>
				{metricKeys.map((metric) => (
					<MoverCard key={metric.key} label={metric.label} rows={rows} metricKey={metric.key} nameOf={nameOf} />
				))}
			</div>
		</div>
	)
}

export function MomentumCards({
	categories,
	tokens,
	segment,
	knownTokenSlugs
}: {
	categories: CategoryStat[]
	tokens: SymbolStat[]
	segment: Segment
	knownTokenSlugs: KnownTokenSlugs
}) {
	const hasOi = segmentHasOi(segment)
	const metricKeys = React.useMemo(() => MOVER_METRICS.filter((m) => !m.perpOnly || hasOi), [hasOi])
	// The untagged bucket is a catch-all, not a real category — keep it out of the momentum panels.
	const categoryRows = React.useMemo(() => {
		const rows: CategoryStat[] = []
		for (const category of categories) {
			if (category.category !== UNTAGGED_CATEGORY) rows.push(category)
		}
		return rows
	}, [categories])

	return (
		<div className="flex flex-col gap-2">
			<MoverRowSet
				title="momentum · categories"
				rows={categoryRows}
				metricKeys={metricKeys}
				nameOf={(row) => <CategoryLink tag={row.category} />}
			/>
			<MoverRowSet
				title="momentum · tokens"
				rows={tokens}
				metricKeys={metricKeys}
				nameOf={(row) => <TokenName base={row.symbol} knownTokenSlugs={knownTokenSlugs} />}
			/>
		</div>
	)
}
