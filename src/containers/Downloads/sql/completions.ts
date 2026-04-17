// Monaco completion provider for the SQL workspace.
//
// Monaco's built-in SQL language only ships keyword completions. To make
// DefiLlama datasets discoverable, we register a custom provider that:
//
// 1) Suggests all loaded tables with their row counts and column list.
// 2) Suggests every known dataset as a table — flagged as "auto-load" so users
//    know it will be fetched on run if referenced but not yet loaded.
// 3) Suggests every time-series (chart) dataset as a hint that a param picker
//    is needed; typing the suggestion opens the load-table modal for that slug.
// 4) Column completion after `<tableName>.` — only for loaded tables (we don't
//    have the column list for unloaded datasets without parsing their CSVs).
//
// The provider reads context via a ref so it stays in sync with the live table
// registry without re-registering on every state change.

import { chartDatasets, type ChartDatasetDefinition } from '../chart-datasets'
import { datasets, type DatasetDefinition } from '../datasets'
import { identifierize, type RegisteredTable } from './useTableRegistry'

export interface CompletionContext {
	tables: RegisteredTable[]
}

export function registerSqlCompletions(
	monaco: typeof import('monaco-editor'),
	contextRef: { current: CompletionContext }
): { dispose: () => void } {
	return monaco.languages.registerCompletionItemProvider('sql', {
		triggerCharacters: ['.', ' ', '\n', '\t'],
		provideCompletionItems: (model, position) => {
			const ctx = contextRef.current
			const wordInfo = model.getWordUntilPosition(position)
			const range = {
				startLineNumber: position.lineNumber,
				endLineNumber: position.lineNumber,
				startColumn: wordInfo.startColumn,
				endColumn: wordInfo.endColumn
			}

			// Detect "<identifier>." context → column completion for the named table.
			const linePrefix = model.getLineContent(position.lineNumber).slice(0, wordInfo.startColumn - 1)
			const dotMatch = linePrefix.match(/([\w"]+)\.\s*$/)

			if (dotMatch) {
				const tableName = dotMatch[1].replace(/"/g, '')
				const table = ctx.tables.find((t) => t.name === tableName)
				if (table) {
					return {
						suggestions: table.columns.map((c) => ({
							label: c.name,
							kind: monaco.languages.CompletionItemKind.Field,
							insertText: needsQuoting(c.name) ? `"${c.name}"` : c.name,
							detail: 'column',
							range
						}))
					}
				}
				// No matching table → no suggestions rather than suggest everything.
				return { suggestions: [] }
			}

			const suggestions: import('monaco-editor').languages.CompletionItem[] = []
			const loadedDatasetSlugs = new Set(
				ctx.tables.filter((t) => t.source.kind === 'dataset').map((t) => t.source.kind === 'dataset' && t.source.slug)
			)

			// 1) Loaded tables (highest priority).
			for (const t of ctx.tables) {
				suggestions.push({
					label: t.name,
					kind: monaco.languages.CompletionItemKind.Module,
					insertText: t.name,
					detail: `${t.rowCount.toLocaleString()} rows · loaded`,
					documentation: {
						value: [`**${labelForSource(t.source)}**`, '', 'Columns:', ...t.columns.map((c) => `- \`${c.name}\``)].join(
							'\n'
						)
					},
					sortText: `0_${t.name}`,
					range
				})
			}

			// 2) Flat datasets not yet loaded — will be auto-loaded on run if referenced.
			for (const d of datasets) {
				if (loadedDatasetSlugs.has(d.slug)) continue
				const identifier = identifierize(d.slug)
				suggestions.push({
					label: identifier,
					kind: monaco.languages.CompletionItemKind.Class,
					insertText: identifier,
					detail: `${d.category} · auto-loads on run`,
					documentation: {
						value: [
							`**${d.name}**`,
							'',
							d.description,
							'',
							d.fields ? `Columns: ${d.fields.map((f) => `\`${f}\``).join(', ')}` : ''
						].join('\n')
					},
					sortText: `1_${identifier}`,
					range
				})
			}

			// 3) Time-series datasets — hint only. The user has to pick a param via the modal.
			for (const d of chartDatasets) {
				const baseIdentifier = `ts_${identifierize(d.slug)}_`
				suggestions.push({
					label: `${baseIdentifier}<${d.paramLabel.toLowerCase()}>`,
					kind: monaco.languages.CompletionItemKind.Reference,
					insertText: baseIdentifier,
					detail: `Time series · pick ${d.paramLabel.toLowerCase()} in Tables tab`,
					documentation: {
						value: [
							`**${d.name}**`,
							'',
							d.description,
							'',
							`Load via "Add table" and pick a ${d.paramLabel.toLowerCase()}.`
						].join('\n')
					},
					sortText: `2_${d.slug}`,
					range
				})
			}

			return { suggestions }
		}
	})
}

function needsQuoting(identifier: string): boolean {
	return !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(identifier)
}

function labelForSource(source: RegisteredTable['source']): string {
	if (source.kind === 'dataset') {
		const def = datasets.find((d) => d.slug === source.slug)
		return def?.name ?? source.slug
	}
	const def: ChartDatasetDefinition | undefined = chartDatasets.find((d) => d.slug === source.slug)
	const paramLabel = source.paramLabel ?? source.param
	return def ? `${def.name} · ${paramLabel}` : `${source.slug} · ${paramLabel}`
}

// Re-export a tiny helper to check what a known identifier would resolve to.
// Used by the SQL workspace to auto-load missing tables referenced in a query
// before running it.
export interface MatchedDatasetRef {
	kind: 'dataset'
	slug: string
	tableName: string
	definition: DatasetDefinition
}

export interface MatchedChartRef {
	kind: 'chart'
	tableName: string
	definition: ChartDatasetDefinition
	paramIdentifier: string
}

export type TableRefMatch = MatchedDatasetRef | MatchedChartRef

/**
 * Given a table identifier that appears in user SQL (e.g. `protocols` or `ts_protocol_tvl_chart_aave`),
 * resolve it to one of our known datasets so we can auto-load it.
 *
 * - Flat datasets: match the identifier directly to `identifierize(slug)`.
 * - Time-series: strip the `ts_` prefix, then longest-prefix match against chart dataset slugs
 *   (slugs can contain underscores, so we can't just split on `_`).
 */
export function matchTableRef(tableName: string): TableRefMatch | null {
	const normalized = tableName.toLowerCase()

	// Flat dataset lookup.
	for (const d of datasets) {
		if (identifierize(d.slug) === normalized) {
			return { kind: 'dataset', slug: d.slug, tableName: normalized, definition: d }
		}
	}

	// Time-series lookup: `ts_<slug>_<param>`, where slug itself contains underscores.
	if (normalized.startsWith('ts_')) {
		const rest = normalized.slice(3)
		// Longest-prefix match against `identifierize(chart.slug)`.
		let best: { def: ChartDatasetDefinition; paramIdentifier: string } | null = null
		for (const c of chartDatasets) {
			const slugId = identifierize(c.slug)
			if (rest.startsWith(slugId + '_')) {
				const paramIdentifier = rest.slice(slugId.length + 1)
				if (paramIdentifier && (!best || slugId.length > identifierize(best.def.slug).length)) {
					best = { def: c, paramIdentifier }
				}
			}
		}
		if (best) {
			return {
				kind: 'chart',
				tableName: normalized,
				definition: best.def,
				paramIdentifier: best.paramIdentifier
			}
		}
	}

	return null
}

/**
 * Best-effort extraction of table references from a SQL string. Covers `FROM x`, `JOIN x`,
 * and quoted forms. Doesn't handle subqueries or CTE name resolution — good enough to find
 * which known datasets the user is referencing.
 */
export function extractTableRefs(sql: string): string[] {
	const refs = new Set<string>()
	// Strip single-line comments to avoid matching inside them.
	const stripped = sql.replace(/--[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '')
	const regex = /\b(?:FROM|JOIN)\s+("?)([\w-]+)\1/gi
	let m: RegExpExecArray | null
	while ((m = regex.exec(stripped)) !== null) {
		refs.add(m[2].toLowerCase())
	}
	return [...refs]
}
