import { useVirtualizer } from '@tanstack/react-virtual'
import { useMemo, useRef } from 'react'
import type { QueryResult } from './exportResults'
import { inferColumnKind, TypeBadge } from './primitives'

const ROW_HEIGHT = 28
const HEADER_HEIGHT = 42

interface ResultsGridProps {
	result: QueryResult
}

type ColumnKind = ReturnType<typeof inferColumnKind>

export function ResultsGrid({ result }: ResultsGridProps) {
	const parentRef = useRef<HTMLDivElement>(null)

	const rowVirtualizer = useVirtualizer({
		count: result.rows.length,
		getScrollElement: () => parentRef.current,
		estimateSize: () => ROW_HEIGHT,
		overscan: 12
	})

	const columnMeta = useMemo(
		() =>
			result.columns.map((c) => {
				const kind = inferColumnKind(c.type)
				const width = estimateColumnWidth(c.name, result.rows, kind)
				return { ...c, kind, width }
			}),
		[result]
	)

	const gridTemplate = useMemo(() => columnMeta.map((c) => `${c.width}px`).join(' '), [columnMeta])
	const totalWidth = useMemo(() => columnMeta.reduce((sum, c) => sum + c.width, 0), [columnMeta])

	return (
		<div
			ref={parentRef}
			className="relative max-h-[420px] overflow-auto rounded-[4px] border border-(--divider) bg-(--cards-bg) thin-scrollbar"
		>
			<div style={{ width: Math.max(totalWidth, 0), minWidth: '100%' }}>
				<div
					role="row"
					className="sticky top-0 z-20 grid border-b border-(--divider) font-mono text-[11px] text-(--text-secondary)"
					style={{
						gridTemplateColumns: gridTemplate,
						height: HEADER_HEIGHT,
						background: 'var(--cards-bg)'
					}}
				>
					{columnMeta.map((col, i) => {
						const isNumeric = col.kind === 'int' || col.kind === 'float'
						return (
							<div
								role="columnheader"
								key={col.name + i}
								className={`flex flex-col justify-center gap-0.5 truncate border-l border-(--divider)/60 px-2.5 first:border-l-0 ${
									isNumeric ? 'items-end text-right' : 'items-start text-left'
								}`}
							>
								<div className="flex items-center gap-1.5">
									<TypeBadge kind={col.kind} />
									<span className="truncate font-mono font-semibold text-(--text-primary)">{col.name}</span>
								</div>
								<span className="truncate font-mono text-[10px] font-normal tracking-tight text-(--text-tertiary)/80">
									{col.type}
								</span>
							</div>
						)
					})}
				</div>
				<div style={{ height: rowVirtualizer.getTotalSize(), position: 'relative' }}>
					{rowVirtualizer.getVirtualItems().map((v) => {
						const row = result.rows[v.index]
						const zebra = v.index % 2 === 1
						return (
							<div
								role="row"
								key={v.index}
								className={`absolute inset-x-0 grid font-mono text-[11.5px] tabular-nums transition-colors hover:bg-(--primary)/5 ${
									zebra ? 'bg-(--app-bg)/25' : ''
								}`}
								style={{
									transform: `translateY(${v.start}px)`,
									height: ROW_HEIGHT,
									gridTemplateColumns: gridTemplate
								}}
							>
								{columnMeta.map((col, i) => {
									const value = row[col.name]
									const isNull = value === null || value === undefined || value === ''
									const isNumeric = col.kind === 'int' || col.kind === 'float'
									return (
										<div
											role="cell"
											key={col.name + i}
											className={`flex items-center truncate border-l border-(--divider)/30 px-2.5 first:border-l-0 ${
												isNumeric ? 'justify-end text-(--text-primary)' : 'text-(--text-primary)'
											} ${isNull ? 'text-(--text-tertiary)/50' : ''}`}
											title={isNull ? '' : cellToTitle(value)}
										>
											<span className="truncate">
												{isNull ? <span aria-hidden>·</span> : formatCell(value, col.kind)}
											</span>
										</div>
									)
								})}
							</div>
						)
					})}
					{result.rows.length === 0 ? (
						<div className="flex items-center justify-center py-8 font-mono text-[11px] text-(--text-tertiary)">
							0 rows
						</div>
					) : null}
				</div>
			</div>
		</div>
	)
}

function formatCell(value: unknown, kind: ColumnKind): string {
	if (value === null || value === undefined) return ''
	if (typeof value === 'bigint') return value.toLocaleString()
	if (typeof value === 'number') {
		if (!Number.isFinite(value)) return String(value)
		if (kind === 'date') {
			const date = new Date(value > 1e12 ? value : value * 1000)
			if (Number.isFinite(date.getTime())) return date.toISOString().slice(0, 10)
		}
		if (Number.isInteger(value)) return value.toLocaleString()
		return value.toLocaleString(undefined, { maximumFractionDigits: 6 })
	}
	if (value instanceof Date) return value.toISOString().slice(0, 10)
	if (typeof value === 'object') {
		try {
			return JSON.stringify(value)
		} catch {
			return String(value)
		}
	}
	return String(value)
}

function cellToTitle(value: unknown): string {
	const formatted = formatCell(value, 'other')
	return formatted.length > 60 ? formatted : ''
}

function estimateColumnWidth(header: string, rows: Record<string, unknown>[], kind: ColumnKind): number {
	const sample = rows.slice(0, 40)
	let max = header.length + 3
	for (const row of sample) {
		const rendered = formatCell(row[header], kind)
		if (rendered.length > max) max = rendered.length
	}
	const charWidth = kind === 'int' || kind === 'float' ? 7.2 : 7
	return Math.max(96, Math.min(max * charWidth + 28, 320))
}
