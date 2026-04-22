import { matchSorter } from 'match-sorter'
import { Fragment, useDeferredValue, useMemo, useState } from 'react'
import { toast } from 'react-hot-toast'
import { Icon } from '~/components/Icon'
import {
	COOKBOOK_SNIPPETS,
	COOKBOOK_TAGS,
	DIALECT_TIPS,
	DUCKDB_DOCS_URL,
	SHORTCUTS,
	TECHNIQUE_DOCS,
	type CookbookSnippet,
	type CookbookTag,
	type TechniqueName
} from './dialectDocs'
import { Keycap } from './primitives'

// ─── Cookbook tab ───────────────────────────────────────────────────────────

interface CookbookProps {
	onApplyAndRun: (sql: string) => void
}

export function CookbookTab({ onApplyAndRun }: CookbookProps) {
	const [search, setSearch] = useState('')
	const deferred = useDeferredValue(search)

	const filtered = useMemo(() => {
		if (!deferred) return COOKBOOK_SNIPPETS
		return matchSorter(COOKBOOK_SNIPPETS, deferred, {
			keys: ['title', 'blurb', 'tag', 'sql', (s: CookbookSnippet) => s.techniques.join(' ')],
			threshold: matchSorter.rankings.CONTAINS
		})
	}, [deferred])

	const grouped = useMemo(() => {
		const by = new Map<CookbookTag, CookbookSnippet[]>()
		for (const s of filtered) {
			const arr = by.get(s.tag) ?? []
			arr.push(s)
			by.set(s.tag, arr)
		}
		return COOKBOOK_TAGS.filter((g) => by.has(g)).map((g) => ({ tag: g, items: by.get(g)! }))
	}, [filtered])

	return (
		<div className="flex flex-col gap-6">
			<header className="flex flex-col gap-1">
				<h3 className="text-sm font-semibold tracking-tight text-(--text-primary)">Cookbook</h3>
				<p className="text-[11.5px] leading-snug text-(--text-tertiary)">
					Pragmatic idioms against DefiLlama tables — hover a technique to see what it does. Try it: swaps the editor
					and runs the query.
				</p>
			</header>

			<SearchBar
				value={search}
				onChange={setSearch}
				placeholder="Search title, technique, tag, or SQL…"
				resultCount={filtered.length}
				totalCount={COOKBOOK_SNIPPETS.length}
			/>

			{grouped.length === 0 ? (
				<EmptyResults label={`No snippets match "${deferred}".`} />
			) : (
				<div className="flex flex-col gap-7">
					{grouped.map(({ tag, items }) => (
						<section key={tag} className="flex flex-col gap-4">
							<TagHeader tag={tag} count={items.length} />
							<ul className="flex flex-col divide-y divide-(--divider)/60">
								{items.map((s) => (
									<li key={s.title} className="flex flex-col gap-3 py-4 first:pt-0">
										<Snippet snippet={s} onApplyAndRun={onApplyAndRun} />
									</li>
								))}
							</ul>
						</section>
					))}
				</div>
			)}
		</div>
	)
}

function TagHeader({ tag, count }: { tag: CookbookTag; count: number }) {
	return (
		<div className="flex items-baseline gap-2.5">
			<span aria-hidden className="h-px flex-1 bg-(--divider)" />
			<span className="text-[10px] font-semibold tracking-[0.16em] text-(--text-tertiary) uppercase">{tag}</span>
			<span className="text-[10px] text-(--text-tertiary) tabular-nums">{count}</span>
			<span aria-hidden className="h-px flex-1 bg-(--divider)" />
		</div>
	)
}

function Snippet({ snippet, onApplyAndRun }: { snippet: CookbookSnippet; onApplyAndRun: (sql: string) => void }) {
	return (
		<div className="flex flex-col gap-2.5">
			<div className="flex flex-wrap items-start justify-between gap-3">
				<div className="flex min-w-0 flex-1 flex-col gap-1">
					<h4 className="text-[13.5px] font-semibold text-(--text-primary)">{snippet.title}</h4>
					<p className="text-xs leading-snug text-(--text-secondary)">{snippet.blurb}</p>
				</div>
				<div className="flex shrink-0 items-center gap-1.5">
					<button
						type="button"
						onClick={() => copy(snippet.sql)}
						aria-label="Copy SQL"
						title="Copy SQL"
						className="flex h-7 w-7 items-center justify-center rounded-md text-(--text-tertiary) transition-colors hover:bg-(--link-hover-bg) hover:text-(--text-primary)"
					>
						<Icon name="copy" className="h-3.5 w-3.5" />
					</button>
					<button
						type="button"
						onClick={() => onApplyAndRun(`${snippet.sql}\n`)}
						title="Replace editor and run"
						className="group inline-flex items-center gap-1.5 rounded-md bg-(--primary) px-2.5 py-1 text-xs font-medium text-white shadow-sm transition-opacity hover:opacity-90"
					>
						<svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
							<path d="M8 5v14l11-7z" />
						</svg>
						Try it
					</button>
				</div>
			</div>

			<TechniqueChips techniques={snippet.techniques} />

			<CodeBlock sql={snippet.sql} />
		</div>
	)
}

function TechniqueChips({ techniques }: { techniques: TechniqueName[] }) {
	if (techniques.length === 0) return null
	return (
		<ul className="flex flex-wrap gap-1.5">
			{techniques.map((t) => (
				<li key={t}>
					<span
						tabIndex={0}
						title={TECHNIQUE_DOCS[t]}
						className="inline-flex cursor-help items-center gap-1 rounded-sm border border-(--divider) bg-(--app-bg)/60 px-1.5 py-0.5 font-mono text-[10.5px] tracking-tight text-(--text-secondary) transition-colors hover:border-(--primary)/50 hover:text-(--primary) focus:border-(--primary)/60 focus:outline-none"
					>
						{t}
					</span>
				</li>
			))}
		</ul>
	)
}

// ─── Syntax-highlighted SQL ─────────────────────────────────────────────────

// Matches the Monaco llamaSqlDark/Light theme color families — keeps the drawer
// and editor visually consistent so users don't mentally context-switch.
const KEYWORDS = new Set([
	'ALL',
	'AND',
	'AS',
	'ASC',
	'ASOF',
	'BETWEEN',
	'BY',
	'CASE',
	'CROSS',
	'CURRENT',
	'DELETE',
	'DESC',
	'DISTINCT',
	'ELSE',
	'END',
	'EXCEPT',
	'EXISTS',
	'FALSE',
	'FILTER',
	'FOLLOWING',
	'FROM',
	'FULL',
	'GROUP',
	'HAVING',
	'IN',
	'INNER',
	'INSERT',
	'INTERSECT',
	'INTO',
	'IS',
	'JOIN',
	'LEFT',
	'LIKE',
	'LIMIT',
	'NOT',
	'NULL',
	'OFFSET',
	'ON',
	'OR',
	'ORDER',
	'OUTER',
	'OVER',
	'PARTITION',
	'PIVOT',
	'PRECEDING',
	'QUALIFY',
	'RIGHT',
	'ROW',
	'ROWS',
	'SELECT',
	'SET',
	'THEN',
	'TRUE',
	'UNBOUNDED',
	'UNION',
	'UNPIVOT',
	'UPDATE',
	'USING',
	'VALUES',
	'WHEN',
	'WHERE',
	'WINDOW',
	'WITH',
	'ILIKE',
	'RANGE',
	'TABLE',
	'CAST',
	'TRY_CAST'
])

const TYPES = new Set([
	'BIGINT',
	'BOOLEAN',
	'DATE',
	'DECIMAL',
	'DOUBLE',
	'FLOAT',
	'INT',
	'INTEGER',
	'SMALLINT',
	'TEXT',
	'TIMESTAMP',
	'VARCHAR',
	'REAL',
	'NUMERIC'
])

// Kept manageable: the functions actually seen in our cookbook snippets plus
// a handful of common DuckDB analytical helpers.
const FUNCTIONS = new Set([
	'abs',
	'any_value',
	'approx_count_distinct',
	'approx_quantile',
	'arg_max',
	'arg_min',
	'array_agg',
	'avg',
	'coalesce',
	'count',
	'date_diff',
	'date_part',
	'date_trunc',
	'epoch',
	'epoch_ms',
	'first',
	'first_value',
	'greatest',
	'json_extract',
	'json_extract_string',
	'lag',
	'last',
	'last_value',
	'lead',
	'least',
	'length',
	'list_aggregate',
	'lower',
	'max',
	'median',
	'min',
	'nullif',
	'percentile_cont',
	'quantile_cont',
	'rank',
	'regexp_matches',
	'regexp_replace',
	'round',
	'row_number',
	'string_agg',
	'string_split',
	'strftime',
	'strptime',
	'substring',
	'sum',
	'to_timestamp',
	'trim',
	'unnest',
	'upper'
])

type TokenType = 'kw' | 'type' | 'fn' | 'str' | 'num' | 'cmt' | 'punct' | 'plain'

interface Token {
	type: TokenType
	text: string
}

function tokenize(sql: string): Token[] {
	const out: Token[] = []
	const n = sql.length
	let i = 0
	while (i < n) {
		const c = sql[i]!

		// Line comment.
		if (c === '-' && sql[i + 1] === '-') {
			let j = i + 2
			while (j < n && sql[j] !== '\n') j++
			out.push({ type: 'cmt', text: sql.slice(i, j) })
			i = j
			continue
		}

		// Single-quoted string (no escape handling needed for cookbook content).
		if (c === "'") {
			let j = i + 1
			while (j < n && sql[j] !== "'") j++
			j = Math.min(j + 1, n)
			out.push({ type: 'str', text: sql.slice(i, j) })
			i = j
			continue
		}

		// Double-quoted identifier.
		if (c === '"') {
			let j = i + 1
			while (j < n && sql[j] !== '"') j++
			j = Math.min(j + 1, n)
			out.push({ type: 'plain', text: sql.slice(i, j) })
			i = j
			continue
		}

		// Number.
		if (c >= '0' && c <= '9') {
			let j = i
			while (j < n && /[\d._]/.test(sql[j]!)) j++
			out.push({ type: 'num', text: sql.slice(i, j) })
			i = j
			continue
		}

		// Identifier / keyword / function.
		if (/[A-Za-z_]/.test(c)) {
			let j = i
			while (j < n && /[\w]/.test(sql[j]!)) j++
			const text = sql.slice(i, j)
			const upper = text.toUpperCase()
			const lower = text.toLowerCase()
			let type: TokenType = 'plain'
			if (KEYWORDS.has(upper)) type = 'kw'
			else if (TYPES.has(upper)) type = 'type'
			else if (FUNCTIONS.has(lower) && sql[j] === '(') type = 'fn'
			out.push({ type, text })
			i = j
			continue
		}

		// Whitespace — collect so we emit one text node.
		if (/\s/.test(c)) {
			let j = i
			while (j < n && /\s/.test(sql[j]!)) j++
			out.push({ type: 'plain', text: sql.slice(i, j) })
			i = j
			continue
		}

		// Punctuation / operator.
		out.push({ type: 'punct', text: c })
		i++
	}
	return out
}

const TOKEN_CLASS: Record<TokenType, string> = {
	kw: 'font-semibold text-[#1d4ed8] dark:text-[#7aa2ff]',
	type: 'text-[#6b4bd2] dark:text-[#b794ff]',
	fn: 'text-[#6b4bd2] dark:text-[#b794ff]',
	str: 'text-[#a35a1a] dark:text-[#f2c78d]',
	num: 'text-[#0f7a4a] dark:text-[#9eddb2]',
	cmt: 'italic text-(--text-tertiary)',
	punct: 'text-(--text-tertiary)',
	plain: ''
}

function CodeBlock({ sql }: { sql: string }) {
	const tokens = useMemo(() => tokenize(sql), [sql])
	return (
		<pre className="thin-scrollbar overflow-x-auto rounded-md border border-l-2 border-(--divider) border-l-(--primary)/40 bg-(--app-bg)/70 px-3 py-2.5 font-mono text-[12px] leading-relaxed text-(--text-primary)">
			<code>
				{tokens.map((t, i) => {
					const cls = TOKEN_CLASS[t.type]
					if (!cls) return <Fragment key={i}>{t.text}</Fragment>
					return (
						<span key={i} className={cls}>
							{t.text}
						</span>
					)
				})}
			</code>
		</pre>
	)
}

// ─── Shortcuts tab ──────────────────────────────────────────────────────────

export function ShortcutsTab() {
	return (
		<div className="flex flex-col gap-6">
			<section className="flex flex-col">
				<div className="flex items-baseline gap-2 border-b border-(--divider) pb-1.5">
					<h3 className="text-sm font-semibold tracking-tight text-(--text-primary)">Keyboard</h3>
					<span className="text-[11px] text-(--text-tertiary) tabular-nums">{SHORTCUTS.length}</span>
				</div>
				<ul className="flex flex-col divide-y divide-(--divider)/50">
					{SHORTCUTS.map((s) => (
						<li key={s.action} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
							<div className="flex min-w-0 flex-1 flex-col">
								<span className="text-sm text-(--text-primary)">{s.action}</span>
								{s.note ? <span className="text-[11px] text-(--text-tertiary)">{s.note}</span> : null}
							</div>
							<div className="flex shrink-0 items-center gap-1">
								{s.keys.map((k, i) => (
									<Keycap key={i}>{k}</Keycap>
								))}
							</div>
						</li>
					))}
				</ul>
			</section>

			<section className="flex flex-col">
				<div className="flex items-baseline gap-2 border-b border-(--divider) pb-1.5">
					<h3 className="text-sm font-semibold tracking-tight text-(--text-primary)">Dialect tips</h3>
					<span className="text-[11px] text-(--text-tertiary) tabular-nums">{DIALECT_TIPS.length}</span>
				</div>
				<ul className="flex flex-col divide-y divide-(--divider)/50">
					{DIALECT_TIPS.map((t) => (
						<li key={t.title} className="flex flex-col gap-1 py-3">
							<h4 className="text-xs font-semibold tracking-tight text-(--text-primary)">{t.title}</h4>
							<p className="text-xs leading-relaxed text-(--text-secondary)">{t.body}</p>
						</li>
					))}
				</ul>
			</section>

			<ExternalDocsLink />
		</div>
	)
}

// ─── Shared bits ────────────────────────────────────────────────────────────

function SearchBar({
	value,
	onChange,
	placeholder,
	resultCount,
	totalCount
}: {
	value: string
	onChange: (v: string) => void
	placeholder: string
	resultCount: number
	totalCount: number
}) {
	return (
		<div className="flex flex-col gap-2">
			<label className="relative">
				<span className="sr-only">Search</span>
				<Icon
					name="search"
					height={14}
					width={14}
					className="absolute top-0 bottom-0 left-2 my-auto text-(--text-tertiary)"
				/>
				<input
					type="text"
					inputMode="search"
					placeholder={placeholder}
					value={value}
					onInput={(e) => onChange(e.currentTarget.value)}
					className="min-h-8 w-full rounded-md border-(--bg-input) bg-(--bg-input) p-1.5 pl-7 text-sm text-black placeholder:text-[#666] dark:text-white dark:placeholder-[#919296]"
				/>
				{value ? (
					<button
						type="button"
						onClick={() => onChange('')}
						aria-label="Clear search"
						className="absolute top-1/2 right-1 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-sm text-(--text-tertiary) hover:text-(--text-primary)"
					>
						<Icon name="x" className="h-3 w-3" />
					</button>
				) : null}
			</label>
			<p className="text-[11px] text-(--text-tertiary) tabular-nums">
				{resultCount === totalCount ? `${totalCount}` : `${resultCount} of ${totalCount}`}
			</p>
		</div>
	)
}

function EmptyResults({ label }: { label: string }) {
	return (
		<div className="flex flex-col items-center gap-2 rounded-md border border-dashed border-(--divider) bg-(--cards-bg)/40 px-6 py-12 text-center">
			<Icon name="search" className="h-5 w-5 text-(--text-tertiary)" />
			<p className="text-sm text-(--text-secondary)">{label}</p>
		</div>
	)
}

function ExternalDocsLink() {
	return (
		<a
			href={DUCKDB_DOCS_URL}
			target="_blank"
			rel="noreferrer"
			className="inline-flex items-center gap-1.5 self-start text-xs text-(--text-tertiary) transition-colors hover:text-(--primary)"
		>
			Full DuckDB reference
			<Icon name="external-link" className="h-3 w-3" />
		</a>
	)
}

function copy(text: string) {
	if (typeof navigator === 'undefined' || !navigator.clipboard) return
	navigator.clipboard.writeText(text).then(
		() => toast.success('Copied', { duration: 1500 }),
		() => toast.error('Copy failed')
	)
}
