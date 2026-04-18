import { useState } from 'react'
import { Icon } from '~/components/Icon'
import { LoadingSpinner } from '~/components/Loaders'
import { inferColumnKind, SectionLabel, TypeBadge } from './primitives'
import { prettyLabelForSource, type RegisteredTable } from './useTableRegistry'

export type PendingTableStatus = 'pending' | 'loading' | 'failed'

export interface PendingTable {
	key: string
	name: string
	label: string
	status: PendingTableStatus
}

interface TableChipRailProps {
	tables: RegisteredTable[]
	onAddTable: () => void
	onRemove: (name: string) => void
	pending?: PendingTable[]
}

export function TableChipRail({ tables, onAddTable, onRemove, pending = [] }: TableChipRailProps) {
	const [openName, setOpenName] = useState<string | null>(null)
	const openTable = openName ? (tables.find((t) => t.name === openName) ?? null) : null
	const totalCount = tables.length + pending.length

	return (
		<section aria-label="Loaded tables" className="flex flex-col gap-2">
			<SectionLabel
				label="Tables"
				count={totalCount}
				action={
					<button
						type="button"
						onClick={onAddTable}
						className="inline-flex items-center gap-1 rounded-md border border-(--divider) bg-(--cards-bg) px-2 py-1 text-xs font-medium text-(--text-secondary) transition-colors hover:border-(--primary)/40 hover:text-(--text-primary)"
					>
						<Icon name="plus" className="h-3 w-3" />
						Add table
					</button>
				}
			/>

			{totalCount === 0 ? (
				<div className="rounded-md border border-dashed border-(--divider) bg-(--cards-bg)/40 px-3 py-2.5 text-xs text-(--text-secondary)">
					No tables loaded.{' '}
					<button
						type="button"
						onClick={onAddTable}
						className="font-medium text-(--primary) underline-offset-2 hover:underline"
					>
						Add one
					</button>{' '}
					to start querying.
				</div>
			) : (
				<div className="flex flex-wrap items-center gap-1.5" aria-live="polite">
					{tables.map((t) => {
						const isOpen = openName === t.name
						return (
							<TableChip
								key={t.name}
								table={t}
								open={isOpen}
								onToggle={() => setOpenName(isOpen ? null : t.name)}
								onRemove={() => {
									if (isOpen) setOpenName(null)
									onRemove(t.name)
								}}
							/>
						)
					})}
					{pending.map((p) => (
						<PendingChip key={p.key} table={p} />
					))}
				</div>
			)}

			{openTable ? <ColumnDrawer table={openTable} onClose={() => setOpenName(null)} /> : null}
		</section>
	)
}

function TableChip({
	table,
	open,
	onToggle,
	onRemove
}: {
	table: RegisteredTable
	open: boolean
	onToggle: () => void
	onRemove: () => void
}) {
	return (
		<div
			className={`group flex items-stretch overflow-hidden rounded-md border transition-colors ${
				open
					? 'border-(--primary)/60 bg-(--primary)/5'
					: 'border-(--divider) bg-(--cards-bg) hover:border-(--primary)/40'
			}`}
		>
			<button
				type="button"
				onClick={onToggle}
				aria-expanded={open}
				title={prettyLabelForSource(table.source)}
				className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-(--text-primary)"
			>
				<Icon
					name="chevron-right"
					className={`h-3 w-3 shrink-0 text-(--text-tertiary) transition-transform ${
						open ? 'rotate-90 text-(--primary)' : ''
					}`}
				/>
				<span className="max-w-[180px] truncate font-mono font-medium">{table.name}</span>
				<span className="text-(--text-tertiary) tabular-nums">· {formatCount(table.rowCount)}</span>
			</button>
			<button
				type="button"
				onClick={onRemove}
				aria-label={`Remove ${table.name}`}
				className="flex w-6 items-center justify-center border-l border-(--divider) text-(--text-tertiary) opacity-0 transition-all group-hover:opacity-100 hover:bg-red-500/10 hover:text-red-500"
			>
				<Icon name="x" className="h-3 w-3" />
			</button>
		</div>
	)
}

function PendingChip({ table }: { table: PendingTable }) {
	const { status } = table
	const failed = status === 'failed'
	const loading = status === 'loading'
	return (
		<div
			role="status"
			aria-label={
				failed
					? `Failed to load ${table.label}`
					: loading
						? `Loading ${table.label}`
						: `Queued ${table.label}`
			}
			title={table.label}
			className={`flex items-center gap-1.5 overflow-hidden rounded-md border border-dashed px-2.5 py-1 text-xs transition-colors ${
				failed
					? 'border-red-500/50 bg-red-500/5 text-red-600 dark:text-red-300'
					: loading
						? 'border-(--primary)/40 bg-(--primary)/5 text-(--text-primary)'
						: 'border-(--divider) bg-(--cards-bg)/40 text-(--text-secondary)'
			} ${loading ? 'animate-pulse' : ''}`}
		>
			<span className="flex h-3 w-3 shrink-0 items-center justify-center">
				{failed ? (
					<Icon name="alert-triangle" className="h-3 w-3 text-red-500" />
				) : loading ? (
					<LoadingSpinner size={10} />
				) : (
					<span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-(--text-tertiary)/60">
						<span className="absolute inset-0 animate-ping rounded-full bg-(--text-tertiary)/60 opacity-60" />
					</span>
				)}
			</span>
			<span className="max-w-[180px] truncate font-mono font-medium">{table.name}</span>
			<span
				className={`text-[10px] tracking-wide uppercase tabular-nums ${
					failed ? 'text-red-500/80' : 'text-(--text-tertiary)'
				}`}
			>
				{failed ? 'failed' : loading ? 'loading' : 'queued'}
			</span>
		</div>
	)
}

function ColumnDrawer({ table, onClose }: { table: RegisteredTable; onClose: () => void }) {
	return (
		<div className="rounded-md border border-(--divider) bg-(--cards-bg) px-3 py-2.5">
			<div className="flex items-baseline justify-between gap-3">
				<div className="flex flex-wrap items-baseline gap-2 text-xs">
					<span className="font-mono font-semibold text-(--text-primary)">{table.name}</span>
					<span className="text-(--text-tertiary)">
						{table.columns.length} cols · {prettyLabelForSource(table.source)}
					</span>
				</div>
				<button
					type="button"
					onClick={onClose}
					aria-label="Close column list"
					className="flex h-6 w-6 items-center justify-center rounded-md text-(--text-tertiary) transition-colors hover:bg-(--link-hover-bg) hover:text-(--text-primary)"
				>
					<Icon name="x" className="h-3 w-3" />
				</button>
			</div>
			<ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1.5">
				{table.columns.map((c) => (
					<li
						key={c.name}
						className="flex items-center gap-1.5 text-xs"
						title={c.type ? `${c.name} · ${c.type}` : c.name}
					>
						<TypeBadge kind={inferColumnKind(c.type)} />
						<span className="truncate font-mono text-(--text-primary)">{c.name}</span>
					</li>
				))}
			</ul>
		</div>
	)
}

function formatCount(n: number): string {
	if (n < 1000) return n.toLocaleString()
	if (n < 10_000) return `${(n / 1000).toFixed(1)}k`
	if (n < 1_000_000) return `${Math.round(n / 1000)}k`
	return `${(n / 1_000_000).toFixed(1)}m`
}
