import { matchSorter } from 'match-sorter'
import { useMemo, useState } from 'react'
import { Icon } from '~/components/Icon'
import { datasets } from '../datasets'
import { identifierize, type RegisteredTable } from './useTableRegistry'

export type ErrorFamily = 'table' | 'column' | 'group_by' | 'parse' | 'type' | 'load' | 'other'

const FAMILY_LABEL: Record<ErrorFamily, string> = {
	table: 'Table not found',
	column: 'Column not found',
	group_by: 'GROUP BY required',
	parse: 'Parse error',
	type: 'Type mismatch',
	load: 'Load failed',
	other: 'Query error'
}

const FAMILY_HINTS: Record<ErrorFamily, string[]> = {
	table: [
		'Identifiers must match a known dataset exactly — auto-load only kicks in for recognized slugs.',
		'Browse the Schema tab for the right name, or pick a time-series param there (ts_<slug>_<param>).'
	],
	column: [
		'Unquoted column names are case-insensitive. Wrap camelCase identifiers in double quotes: "totalRevenue24h".',
		'Hover a table name in the editor to see its exact column list.'
	],
	group_by: [
		'Non-aggregated columns must appear in GROUP BY — or wrap them with any_value() / arg_max().',
		'LlamaSQL also allows GROUP BY positions: GROUP BY 1, 2.'
	],
	parse: [
		'Check trailing commas, missing parentheses, and unterminated strings around the reported line.',
		'⌘/ toggles a line comment — bisecting the query helps isolate parse errors.'
	],
	type: [
		'CSV inference can land numeric-looking columns as VARCHAR. Use TRY_CAST(x AS DOUBLE) to coerce safely.',
		'Unix-epoch date columns (raises, hacks) need to_timestamp(date) before date functions work.'
	],
	load: [
		'The CSV endpoint rejected the fetch. Confirm your subscription is active and retry.',
		'Check the network panel — a 401 means the session expired; a 5xx means retry after a moment.'
	],
	other: [
		'Scan the message below — LlamaSQL errors usually quote the offending identifier.',
		'For dialect specifics (QUALIFY, ASOF JOIN, PIVOT), the Shortcuts tab links the full reference.'
	]
}

interface ErrorAnalysis {
	family: ErrorFamily
	offendingIdentifier?: string
	suggestions: string[]
}

const KNOWN_DATASET_IDENTIFIERS = datasets.map((d) => identifierize(d.slug))

export function ErrorBanner({
	error,
	loadedTables,
	onJump,
	onApplyFix,
	density = 'comfortable'
}: {
	error: string
	loadedTables: RegisteredTable[]
	onJump: (line: number, col?: number) => void
	onApplyFix: (oldIdentifier: string, newIdentifier: string) => void
	density?: 'comfortable' | 'compact'
}) {
	const location = parseErrorLocation(error)
	const [expanded, setExpanded] = useState(false)
	const analysis = useMemo(() => analyzeError(error, loadedTables), [error, loadedTables])
	const hints = FAMILY_HINTS[analysis.family]
	const familyLabel = FAMILY_LABEL[analysis.family]
	const padCls = density === 'compact' ? 'px-2.5 py-2' : 'px-3 py-2.5'

	return (
		<div
			className={`flex flex-col gap-2 rounded-md border border-red-500/30 bg-red-500/5 ${padCls} text-red-700 dark:text-red-300`}
		>
			<div className="flex flex-wrap items-center gap-2 text-xs">
				<span className="inline-flex items-center gap-1.5 font-semibold">
					<Icon name="alert-triangle" className="h-3.5 w-3.5" />
					{familyLabel}
				</span>
				{location ? (
					<>
						<span className="text-red-500/50">·</span>
						<button
							type="button"
							onClick={() => onJump(location.line, location.column)}
							className="font-medium underline-offset-2 hover:underline"
						>
							Jump to line {location.line}
							{location.column != null ? `:${location.column}` : ''}
						</button>
					</>
				) : null}
				{analysis.offendingIdentifier ? (
					<>
						<span className="text-red-500/50">·</span>
						<code className="rounded-sm bg-red-500/10 px-1.5 py-px font-mono text-[11px] text-red-700 dark:text-red-300">
							{analysis.offendingIdentifier}
						</code>
					</>
				) : null}
			</div>

			{analysis.suggestions.length > 0 && analysis.offendingIdentifier ? (
				<div className="flex flex-wrap items-center gap-1.5 text-[11.5px]">
					<span className="text-red-600/90 dark:text-red-300/80">Did you mean</span>
					{analysis.suggestions.map((s) => (
						<button
							key={s}
							type="button"
							onClick={() => onApplyFix(analysis.offendingIdentifier!, s)}
							className="inline-flex items-center gap-1 rounded-sm border border-red-500/30 bg-red-500/5 px-1.5 py-0.5 font-mono text-[11px] text-red-700 transition-colors hover:border-red-500/60 hover:bg-red-500/10 dark:text-red-200"
						>
							<Icon name="arrow-right" className="h-2.5 w-2.5" />
							{s}
						</button>
					))}
					<span className="text-red-600/70 dark:text-red-300/60">?</span>
				</div>
			) : null}

			<pre className="thin-scrollbar overflow-x-auto font-mono text-[11.5px] leading-snug whitespace-pre-wrap">
				{error}
			</pre>

			{hints.length > 0 ? (
				<div className="flex flex-col gap-1.5 border-t border-red-500/20 pt-2">
					<button
						type="button"
						onClick={() => setExpanded((v) => !v)}
						aria-expanded={expanded}
						className="inline-flex items-center gap-1.5 self-start text-[11px] font-medium text-red-700/80 transition-colors hover:text-red-700 dark:text-red-300/80 dark:hover:text-red-200"
					>
						<Icon
							name="chevron-right"
							className={`h-3 w-3 transition-transform duration-150 ${expanded ? 'rotate-90' : ''}`}
						/>
						Common causes
					</button>
					{expanded ? (
						<ul className="flex flex-col gap-1 pl-4 text-[11.5px] leading-relaxed text-red-700/90 dark:text-red-200/90">
							{hints.map((h, i) => (
								<li key={i} className="list-disc">
									{h}
								</li>
							))}
						</ul>
					) : null}
				</div>
			) : null}
		</div>
	)
}

export function analyzeError(error: string, loadedTables: RegisteredTable[]): ErrorAnalysis {
	if (/^Could not auto-load table|^Could not load /i.test(error)) {
		return { family: 'load', suggestions: [] }
	}

	const tableMatch =
		error.match(/(?:Catalog Error|Binder Error)[^\n]*?(?:Table with name|Referenced table)\s+"?([A-Za-z_][\w]*)"?/i) ??
		error.match(/Table with name\s+"?([A-Za-z_][\w]*)"?\s+does not exist/i) ??
		error.match(/Table\s+"([A-Za-z_][\w]*)"\s+does not exist/i)
	if (tableMatch) {
		const offending = tableMatch[1]!
		const pool = [...loadedTables.map((t) => t.name), ...KNOWN_DATASET_IDENTIFIERS]
		const unique = [...new Set(pool)]
		const suggestions = matchSorter(unique, offending)
			.filter((s) => s.toLowerCase() !== offending.toLowerCase())
			.slice(0, 3)
		return { family: 'table', offendingIdentifier: offending, suggestions }
	}

	const columnMatch =
		error.match(/Referenced column\s+"?([A-Za-z_][\w]*)"?\s+not found/i) ??
		error.match(/column\s+"?([A-Za-z_][\w]*)"?\s+not found/i)
	if (columnMatch) {
		const offending = columnMatch[1]!
		const cols = [...new Set(loadedTables.flatMap((t) => t.columns.map((c) => c.name)))]
		const suggestions = matchSorter(cols, offending)
			.filter((s) => s.toLowerCase() !== offending.toLowerCase())
			.slice(0, 3)
		return { family: 'column', offendingIdentifier: offending, suggestions }
	}

	if (/must appear in the GROUP BY/i.test(error)) {
		return { family: 'group_by', suggestions: [] }
	}

	if (/Parser Error/i.test(error)) {
		return { family: 'parse', suggestions: [] }
	}

	if (/Conversion Error|Invalid Input Error|Could not convert/i.test(error)) {
		return { family: 'type', suggestions: [] }
	}

	return { family: 'other', suggestions: [] }
}

export function replaceIdentifier(sql: string, oldIdentifier: string, newIdentifier: string): string {
	const escaped = oldIdentifier.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
	return sql.replace(new RegExp(`\\b${escaped}\\b`, 'g'), newIdentifier)
}

function parseErrorLocation(error: string): { line: number; column?: number } | null {
	const match = error.match(/line\s+(\d+)(?:[^0-9]+(\d+))?/i)
	if (!match) return null
	const line = Number.parseInt(match[1]!, 10)
	const column = match[2] ? Number.parseInt(match[2], 10) : undefined
	if (!Number.isFinite(line) || line <= 0) return null
	return { line, column }
}
