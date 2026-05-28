import { flexRender, type RowData, type Table } from '@tanstack/react-table'
import { SortIcon } from '~/components/Table/SortIcon'

export function InvestorsTable<T extends RowData>({
	instance,
	overrideRows
}: {
	instance: Table<T>
	overrideRows?: import('@tanstack/react-table').Row<T>[]
}) {
	const columns = instance.getVisibleLeafColumns()
	const gridTemplateColumns = columns.map((col) => `${col.getSize() ?? 100}fr`).join(' ')
	const rows = overrideRows ?? instance.getRowModel().rows

	return (
		<div className="thin-scrollbar w-full overflow-auto">
			<div style={{ display: 'grid', gridTemplateColumns, minWidth: `${instance.getTotalSize()}px` }}>
				{instance.getHeaderGroups().map((headerGroup) =>
					headerGroup.headers.map((header) => {
						const align = header.column.columnDef.meta?.align ?? 'start'
						return (
							<div
								key={header.id}
								className="overflow-hidden border-b border-(--divider) px-3 py-2.5 text-ellipsis whitespace-nowrap"
								style={{ textAlign: align }}
							>
								<span
									className="relative inline-flex cursor-pointer flex-nowrap items-center gap-1 text-[11px] font-semibold tracking-wider text-(--text-tertiary) uppercase"
									onClick={header.column.getCanSort() ? () => header.column.toggleSorting() : undefined}
								>
									{flexRender(header.column.columnDef.header, header.getContext())}
									{header.column.getCanSort() ? <SortIcon dir={header.column.getIsSorted()} /> : null}
								</span>
							</div>
						)
					})
				)}
				{rows.map((row, rowIdx) =>
					row.getVisibleCells().map((cell) => {
						const align = cell.column.columnDef.meta?.align ?? 'start'
						return (
							<div
								key={cell.id}
								className={`overflow-hidden border-b border-(--divider) px-3 py-2.5 text-[13px] text-ellipsis whitespace-nowrap text-(--text-primary) transition-colors ${
									rowIdx % 2 === 1 ? 'bg-(--cards-bg)' : ''
								}`}
								style={{ textAlign: align }}
							>
								{flexRender(cell.column.columnDef.cell, cell.getContext())}
							</div>
						)
					})
				)}
			</div>
		</div>
	)
}

export function PageLoader() {
	return (
		<div className="flex min-h-[60vh] items-center justify-center">
			<div className="h-5 w-5 animate-spin rounded-full border-2 border-(--text-disabled) border-t-transparent" />
		</div>
	)
}

export function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
	return (
		<div className="rounded-lg border border-(--cards-border) bg-(--cards-bg) p-5">
			<h3 className="mb-4 text-[11px] font-semibold tracking-wider text-(--text-tertiary) uppercase">{title}</h3>
			{children}
		</div>
	)
}

export function CardSkeleton({ title }: { title: string }) {
	return (
		<div className="rounded-lg border border-(--cards-border) bg-(--cards-bg) p-5">
			<h3 className="mb-4 text-[11px] font-semibold tracking-wider text-(--text-tertiary) uppercase">{title}</h3>
			<div className="flex h-[400px] items-center justify-center">
				<div className="h-5 w-5 animate-spin rounded-full border-2 border-(--text-disabled) border-t-transparent" />
			</div>
		</div>
	)
}

export function KpiCard({ label, value }: { label: string; value: string | number | null }) {
	return (
		<div className="flex min-w-0 flex-1 flex-col gap-1 py-1">
			<span className="text-[11px] font-medium tracking-wide text-(--text-tertiary)">{label}</span>
			<span className="font-jetbrains text-xl font-semibold text-(--text-primary) tabular-nums">{value ?? '—'}</span>
		</div>
	)
}

export function KpiSkeleton({ label }: { label: string }) {
	return (
		<div className="flex min-w-0 flex-1 flex-col gap-1 py-1">
			<span className="text-[11px] font-medium tracking-wide text-(--text-tertiary)">{label}</span>
			<div className="h-7 w-20 animate-pulse rounded bg-(--text-disabled) opacity-20" />
		</div>
	)
}

/** Full-width metric strip — items stretch evenly, separated by vertical dividers */
export function MetricStrip({ children }: { children: React.ReactNode }) {
	return (
		<div className="flex gap-0 overflow-x-auto rounded-lg border border-(--cards-border) bg-(--cards-bg)">
			{Array.isArray(children) ? (
				children.map((child, i) => (
					<div
						key={i}
						className={`flex-1 px-5 py-3 ${i > 0 ? 'border-l border-(--divider)' : ''}`}
						style={{ minWidth: '120px' }}
					>
						{child}
					</div>
				))
			) : (
				<div className="flex-1 px-5 py-3">{children}</div>
			)}
		</div>
	)
}

/** Section wrapper with uppercase label and optional right-side actions */
export function SectionHeader({ title, actions }: { title: string; actions?: React.ReactNode }) {
	return (
		<div className="flex items-center justify-between">
			<h3 className="text-[11px] font-semibold tracking-wider text-(--text-tertiary) uppercase">{title}</h3>
			{actions}
		</div>
	)
}

/** Time window toggle buttons — matches select height (py-1.5 + text-sm line-height) */
export function WindowToggle({
	options,
	value,
	onChange
}: {
	options: { value: string; label: string }[]
	value: string
	onChange: (v: string) => void
}) {
	return (
		<div className="flex">
			{options.map((w, i) => (
				<button
					key={w.value}
					onClick={() => onChange(w.value)}
					className={`px-3 py-1.5 text-sm leading-tight font-medium transition-colors ${
						i === 0 ? 'rounded-l-md' : ''
					}${i === options.length - 1 ? 'rounded-r-md' : ''} ${
						value === w.value
							? 'bg-(--sl-accent) text-white'
							: 'bg-(--cards-bg) text-(--text-tertiary) hover:text-(--text-primary)'
					} ${value !== w.value ? 'border border-(--cards-border)' : ''}`}
					style={i > 0 && value !== w.value ? { marginLeft: '-1px' } : undefined}
				>
					{w.label}
				</button>
			))}
		</div>
	)
}

export function Pagination<T>({ table }: { table: Table<T> }) {
	const { pageIndex, pageSize } = table.getState().pagination
	const total = table.getPrePaginationRowModel().rows.length

	return (
		<div className="mt-3 flex items-center justify-between border-t border-(--divider) pt-3 text-[11px] text-(--text-tertiary)">
			<span className="tabular-nums">
				{pageIndex * pageSize + 1}–{Math.min((pageIndex + 1) * pageSize, total)} of {total}
			</span>
			<div className="flex gap-1">
				<button
					onClick={() => table.previousPage()}
					disabled={!table.getCanPreviousPage()}
					className="rounded px-2 py-1 transition-colors hover:bg-(--sl-hover-bg) disabled:opacity-30"
				>
					Prev
				</button>
				<button
					onClick={() => table.nextPage()}
					disabled={!table.getCanNextPage()}
					className="rounded px-2 py-1 transition-colors hover:bg-(--sl-hover-bg) disabled:opacity-30"
				>
					Next
				</button>
			</div>
		</div>
	)
}

export const formatPct = (v: number | null) => (v != null ? `${v.toFixed(2)}%` : '—')
