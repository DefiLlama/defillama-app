import * as Ariakit from '@ariakit/react'
import { matchSorter } from 'match-sorter'
import { toast } from 'react-hot-toast'
import { startTransition, useCallback, useDeferredValue, useMemo, useState } from 'react'
import { Icon } from '~/components/Icon'
import { LoadingSpinner } from '~/components/Loaders'
import { getStorageJSON, setStorageJSON } from '~/contexts/localStorageStore'
import {
	chartDatasets,
	chartDatasetCategories,
	type ChartDatasetDefinition,
	type ChartOptionsMap
} from '../chart-datasets'
import { datasets, datasetCategories, type DatasetDefinition } from '../datasets'
import { inferColumnKind, TypeBadge } from './primitives'
import { columnShapeFor } from './schemaShapes'
import { identifierize, tableNameFor, type RegisteredTable, type TableSource } from './useTableRegistry'

const COLLAPSED_KEY = 'sql-schema-collapsed-categories'

type FilterKind = 'all' | 'flat' | 'timeseries'

const FILTER_LABELS: Record<FilterKind, string> = {
	all: 'All',
	flat: 'Flat',
	timeseries: 'Time series'
}

export interface SchemaBrowserProps {
	chartOptionsMap: ChartOptionsMap
	loadedTables: RegisteredTable[]
	onLoad: (source: TableSource) => Promise<RegisteredTable | null>
	onReplaceSql: (snippet: string) => void
	onInsertAtCursor: (text: string) => void
	loading: string | null
}

type SchemaEntry =
	| {
			kind: 'flat'
			id: string
			category: string
			tableName: string
			description: string
			dataset: DatasetDefinition
	  }
	| {
			kind: 'ts'
			id: string
			category: string
			displayName: string
			slug: string
			description: string
			dataset: ChartDatasetDefinition
	  }

export function SchemaBrowser({
	chartOptionsMap,
	loadedTables,
	onLoad,
	onReplaceSql,
	onInsertAtCursor,
	loading
}: SchemaBrowserProps) {
	const [search, setSearch] = useState('')
	const [filter, setFilter] = useState<FilterKind>('all')
	const deferred = useDeferredValue(search)

	const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set(getStorageJSON<string[]>(COLLAPSED_KEY, [])))

	const toggleCollapsed = useCallback((category: string) => {
		setCollapsed((prev) => {
			const next = new Set(prev)
			if (next.has(category)) next.delete(category)
			else next.add(category)
			setStorageJSON(COLLAPSED_KEY, [...next])
			return next
		})
	}, [])

	const allEntries = useMemo<SchemaEntry[]>(() => {
		const out: SchemaEntry[] = []
		for (const d of datasets) {
			out.push({
				kind: 'flat',
				id: `flat:${d.slug}`,
				category: d.category,
				tableName: identifierize(d.slug),
				description: d.description,
				dataset: d
			})
		}
		for (const d of chartDatasets) {
			out.push({
				kind: 'ts',
				id: `ts:${d.slug}`,
				category: d.category,
				displayName: `ts_${identifierize(d.slug)}_<${d.paramLabel.toLowerCase()}>`,
				slug: d.slug,
				description: d.description,
				dataset: d
			})
		}
		return out
	}, [])

	const filtered = useMemo(() => {
		let list = allEntries
		if (filter === 'flat') list = list.filter((e) => e.kind === 'flat')
		else if (filter === 'timeseries') list = list.filter((e) => e.kind === 'ts')
		if (!deferred) return list
		const toName = (e: SchemaEntry) => (e.kind === 'flat' ? e.tableName : e.displayName)
		const toDataFields = (e: SchemaEntry) =>
			e.kind === 'flat' ? (e.dataset.fields ?? []).join(' ') : (columnShapeFor(e.slug) === 'dynamic' ? '' : (columnShapeFor(e.slug) as readonly string[]).join(' '))
		return matchSorter(list, deferred, {
			keys: [toName, 'description', 'category', toDataFields],
			threshold: matchSorter.rankings.CONTAINS
		})
	}, [allEntries, deferred, filter])

	const grouped = useMemo(() => {
		const byCategory = new Map<string, SchemaEntry[]>()
		for (const e of filtered) {
			const arr = byCategory.get(e.category) ?? []
			arr.push(e)
			byCategory.set(e.category, arr)
		}
		const ordered: string[] = []
		const seen = new Set<string>()
		for (const c of [...datasetCategories, ...chartDatasetCategories]) {
			if (byCategory.has(c) && !seen.has(c)) {
				ordered.push(c)
				seen.add(c)
			}
		}
		return ordered.map((c) => ({ category: c, items: byCategory.get(c)! }))
	}, [filtered])

	const loadedByKey = useMemo(() => {
		const m = new Map<string, RegisteredTable>()
		for (const t of loadedTables) {
			if (t.source.kind === 'dataset') m.set(`flat:${t.source.slug}`, t)
			else m.set(`ts:${t.source.slug}:${t.source.param}`, t)
		}
		return m
	}, [loadedTables])

	const totalVisible = filtered.length

	return (
		<div className="flex flex-col gap-5">
			<BrowserHeader
				search={search}
				onSearchChange={setSearch}
				filter={filter}
				onFilterChange={setFilter}
				totalVisible={totalVisible}
				totalAvailable={allEntries.length}
			/>

			{grouped.length === 0 ? (
				<EmptyResults search={deferred} />
			) : (
				<div className="flex flex-col gap-5">
					{grouped.map(({ category, items }) => (
						<CategorySection
							key={category}
							category={category}
							items={items}
							collapsed={collapsed.has(category)}
							onToggle={() => toggleCollapsed(category)}
							loadedByKey={loadedByKey}
							chartOptionsMap={chartOptionsMap}
							onReplaceSql={onReplaceSql}
							onInsertAtCursor={onInsertAtCursor}
							onLoad={onLoad}
							loading={loading}
						/>
					))}
				</div>
			)}
		</div>
	)
}

function BrowserHeader({
	search,
	onSearchChange,
	filter,
	onFilterChange,
	totalVisible,
	totalAvailable
}: {
	search: string
	onSearchChange: (v: string) => void
	filter: FilterKind
	onFilterChange: (k: FilterKind) => void
	totalVisible: number
	totalAvailable: number
}) {
	return (
		<div className="flex flex-col gap-2">
			<label className="relative">
				<span className="sr-only">Search schema</span>
				<Icon
					name="search"
					height={14}
					width={14}
					className="absolute top-0 bottom-0 left-2 my-auto text-(--text-tertiary)"
				/>
				<input
					type="text"
					inputMode="search"
					placeholder="Search tables, columns, descriptions…"
					value={search}
					onInput={(e) => onSearchChange(e.currentTarget.value)}
					className="min-h-8 w-full rounded-md border-(--bg-input) bg-(--bg-input) p-1.5 pl-7 text-sm text-black placeholder:text-[#666] dark:text-white dark:placeholder-[#919296]"
				/>
				{search ? (
					<button
						type="button"
						onClick={() => onSearchChange('')}
						aria-label="Clear search"
						className="absolute top-1/2 right-1 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-sm text-(--text-tertiary) hover:text-(--text-primary)"
					>
						<Icon name="x" className="h-3 w-3" />
					</button>
				) : null}
			</label>

			<div className="flex flex-wrap items-center justify-between gap-3">
				<div
					role="tablist"
					aria-label="Dataset kind"
					className="inline-flex items-center gap-0.5 rounded-md border border-(--divider) bg-(--cards-bg) p-0.5"
				>
					{(Object.keys(FILTER_LABELS) as FilterKind[]).map((k) => {
						const active = filter === k
						return (
							<button
								key={k}
								type="button"
								role="tab"
								aria-selected={active}
								onClick={() => onFilterChange(k)}
								className={`rounded-sm px-2.5 py-1 text-xs font-medium transition-colors ${
									active
										? 'bg-(--primary) text-white shadow-sm'
										: 'text-(--text-secondary) hover:bg-(--link-hover-bg) hover:text-(--text-primary)'
								}`}
							>
								{FILTER_LABELS[k]}
							</button>
						)
					})}
				</div>
				<p className="text-[11px] text-(--text-tertiary) tabular-nums">
					{totalVisible === totalAvailable ? `${totalAvailable} tables` : `${totalVisible} of ${totalAvailable}`}
				</p>
			</div>
		</div>
	)
}

function EmptyResults({ search }: { search: string }) {
	return (
		<div className="flex flex-col items-center gap-2 rounded-md border border-dashed border-(--divider) bg-(--cards-bg)/40 px-6 py-12 text-center">
			<Icon name="search" className="h-5 w-5 text-(--text-tertiary)" />
			<p className="text-sm text-(--text-secondary)">
				{search ? (
					<>
						No tables match <span className="font-mono text-(--text-primary)">"{search}"</span>.
					</>
				) : (
					'No tables match these filters.'
				)}
			</p>
		</div>
	)
}

function CategorySection({
	category,
	items,
	collapsed,
	onToggle,
	loadedByKey,
	chartOptionsMap,
	onReplaceSql,
	onInsertAtCursor,
	onLoad,
	loading
}: {
	category: string
	items: SchemaEntry[]
	collapsed: boolean
	onToggle: () => void
	loadedByKey: Map<string, RegisteredTable>
	chartOptionsMap: ChartOptionsMap
	onReplaceSql: (snippet: string) => void
	onInsertAtCursor: (text: string) => void
	onLoad: (source: TableSource) => Promise<RegisteredTable | null>
	loading: string | null
}) {
	return (
		<section className="flex flex-col">
			<button
				type="button"
				onClick={onToggle}
				aria-expanded={!collapsed}
				className="group flex items-baseline gap-2 border-b border-(--divider) pb-1.5 text-left"
			>
				<Icon
					name="chevron-right"
					className={`h-3 w-3 shrink-0 text-(--text-tertiary) transition-transform duration-150 group-hover:text-(--text-primary) ${
						collapsed ? '' : 'rotate-90'
					}`}
				/>
				<h3 className="text-sm font-semibold tracking-tight text-(--text-primary)">{category}</h3>
				<span className="text-[11px] text-(--text-tertiary) tabular-nums">{items.length}</span>
			</button>

			{!collapsed && (
				<ul className="flex flex-col divide-y divide-(--divider)/50">
					{items.map((item) =>
						item.kind === 'flat' ? (
							<li key={item.id}>
								<FlatRow
									entry={item}
									loaded={loadedByKey.get(item.id)}
									onReplaceSql={onReplaceSql}
									onInsertAtCursor={onInsertAtCursor}
									onLoad={onLoad}
									loading={loading}
								/>
							</li>
						) : (
							<li key={item.id}>
								<TsRow
									entry={item}
									options={chartOptionsMap[item.dataset.slug] ?? []}
									loadedByKey={loadedByKey}
									onReplaceSql={onReplaceSql}
									onInsertAtCursor={onInsertAtCursor}
									onLoad={onLoad}
									loading={loading}
								/>
							</li>
						)
					)}
				</ul>
			)}
		</section>
	)
}

function FlatRow({
	entry,
	loaded,
	onReplaceSql,
	onInsertAtCursor,
	onLoad,
	loading
}: {
	entry: Extract<SchemaEntry, { kind: 'flat' }>
	loaded: RegisteredTable | undefined
	onReplaceSql: (snippet: string) => void
	onInsertAtCursor: (text: string) => void
	onLoad: (source: TableSource) => Promise<RegisteredTable | null>
	loading: string | null
}) {
	const snippet = `SELECT * FROM ${entry.tableName} LIMIT 100\n`
	const isLoading = loading === entry.tableName

	const staticFields = entry.dataset.fields ?? []
	const loadedCols = loaded?.columns ?? []
	const typeByName = new Map(loadedCols.map((c) => [c.name, c.type]))
	const columns = staticFields.length > 0
		? staticFields.map((name) => ({ name, type: typeByName.get(name) }))
		: loadedCols.map((c) => ({ name: c.name, type: c.type }))

	return (
		<div className="flex flex-col gap-2 py-3.5">
			<div className="flex flex-wrap items-start justify-between gap-3">
				<div className="flex min-w-0 flex-1 flex-col gap-1">
					<div className="flex flex-wrap items-center gap-2">
						<span className="font-mono text-[13.5px] font-semibold text-(--text-primary)">{entry.tableName}</span>
						<KindTag kind="flat" />
						{loaded ? <LoadedPill rowCount={loaded.rowCount} /> : <AutoLoadHint />}
					</div>
					<p className="text-xs text-(--text-secondary)">{entry.description}</p>
				</div>
				<RowActions
					onInsert={() => onReplaceSql(snippet)}
					onLoad={() => {
						onLoad({ kind: 'dataset', slug: entry.dataset.slug })
					}}
					onCopy={() => copyToClipboard(entry.tableName)}
					isLoading={isLoading}
					alreadyLoaded={!!loaded}
					canLoad={!loading}
				/>
			</div>

			{columns.length > 0 ? (
				<ColumnChips columns={columns} onInsertColumn={(name) => onInsertAtCursor(name)} />
			) : (
				<p className="text-[11px] text-(--text-tertiary) italic">Columns resolved on load.</p>
			)}
		</div>
	)
}

function TsRow({
	entry,
	options,
	loadedByKey,
	onReplaceSql,
	onInsertAtCursor,
	onLoad,
	loading
}: {
	entry: Extract<SchemaEntry, { kind: 'ts' }>
	options: Array<{ label: string; value: string; category?: string; isChild?: boolean }>
	loadedByKey: Map<string, RegisteredTable>
	onReplaceSql: (snippet: string) => void
	onInsertAtCursor: (text: string) => void
	onLoad: (source: TableSource) => Promise<RegisteredTable | null>
	loading: string | null
}) {
	const [param, setParam] = useState<string>('')
	const selectedOption = options.find((o) => o.value === param)
	const resolvedName = param
		? tableNameFor({ kind: 'chart', slug: entry.slug, param })
		: entry.displayName
	const loaded = param ? loadedByKey.get(`ts:${entry.slug}:${param}`) : undefined
	const isLoading = !!param && loading === resolvedName
	const snippet = `SELECT * FROM ${resolvedName} LIMIT 100\n`

	const shape = columnShapeFor(entry.slug)
	const loadedCols = loaded?.columns ?? []
	const typeByName = new Map(loadedCols.map((c) => [c.name, c.type]))
	let columns: Array<{ name: string; type?: string }> = []
	if (shape === 'dynamic') {
		columns = loadedCols.map((c) => ({ name: c.name, type: c.type }))
	} else {
		columns = shape.map((name) => ({ name, type: typeByName.get(name) }))
	}

	return (
		<div className="flex flex-col gap-2 py-3.5">
			<div className="flex flex-wrap items-start justify-between gap-3">
				<div className="flex min-w-0 flex-1 flex-col gap-1">
					<div className="flex flex-wrap items-center gap-2">
						<span className="font-mono text-[13.5px] font-semibold text-(--text-primary)">
							{param ? resolvedName : <span className="text-(--text-secondary)">{entry.displayName}</span>}
						</span>
						<KindTag kind="ts" />
						{loaded ? <LoadedPill rowCount={loaded.rowCount} /> : null}
					</div>
					<p className="text-xs text-(--text-secondary)">{entry.description}</p>
				</div>
				<RowActions
					onInsert={() => onReplaceSql(snippet)}
					onLoad={() => {
						if (!param || !selectedOption) return
						onLoad({
							kind: 'chart',
							slug: entry.slug,
							param: selectedOption.value,
							paramLabel: selectedOption.label
						})
					}}
					onCopy={() => param && copyToClipboard(resolvedName)}
					isLoading={isLoading}
					alreadyLoaded={!!loaded}
					canLoad={!!param && !loading}
					canInsert={!!param}
					canCopy={!!param}
					disabledHint={!param ? `Pick ${entry.dataset.paramLabel.toLowerCase()} →` : undefined}
				/>
			</div>

			<ParamCombobox
				paramLabel={entry.dataset.paramLabel}
				options={options}
				value={param}
				onChange={setParam}
			/>

			{columns.length > 0 ? (
				<ColumnChips columns={columns} onInsertColumn={(name) => onInsertAtCursor(name)} />
			) : shape === 'dynamic' ? (
				<p className="text-[11px] text-(--text-tertiary) italic">Columns depend on response — load to see.</p>
			) : null}
		</div>
	)
}

function ColumnChips({
	columns,
	onInsertColumn
}: {
	columns: Array<{ name: string; type?: string }>
	onInsertColumn: (name: string) => void
}) {
	return (
		<ul className="flex flex-wrap gap-1.5">
			{columns.map((c) => (
				<li key={c.name}>
					<button
						type="button"
						onClick={() => onInsertColumn(c.name)}
						title={c.type ? `${c.name} · ${c.type}\nClick to insert column name` : `${c.name}\nClick to insert column name`}
						className="group inline-flex items-center gap-1 rounded-sm border border-(--divider) bg-(--cards-bg) px-1.5 py-0.5 transition-colors hover:border-(--primary)/50 hover:bg-(--primary)/5"
					>
						<TypeBadge kind={inferColumnKind(c.type)} />
						<span className="font-mono text-[11.5px] text-(--text-primary) group-hover:text-(--primary)">{c.name}</span>
					</button>
				</li>
			))}
		</ul>
	)
}

function RowActions({
	onInsert,
	onLoad,
	onCopy,
	isLoading,
	alreadyLoaded,
	canLoad,
	canInsert = true,
	canCopy = true,
	disabledHint
}: {
	onInsert: () => void
	onLoad: () => void
	onCopy: () => void
	isLoading: boolean
	alreadyLoaded: boolean
	canLoad: boolean
	canInsert?: boolean
	canCopy?: boolean
	disabledHint?: string
}) {
	return (
		<div className="flex shrink-0 items-center gap-1.5">
			{disabledHint ? (
				<span className="mr-1 text-[10px] text-(--text-tertiary)">{disabledHint}</span>
			) : null}
			<button
				type="button"
				onClick={onCopy}
				disabled={!canCopy}
				aria-label="Copy table name"
				title="Copy table name"
				className="flex h-7 w-7 items-center justify-center rounded-md text-(--text-tertiary) transition-colors hover:bg-(--link-hover-bg) hover:text-(--text-primary) disabled:cursor-not-allowed disabled:opacity-40"
			>
				<Icon name="copy" className="h-3.5 w-3.5" />
			</button>
			<button
				type="button"
				onClick={onLoad}
				disabled={!canLoad || alreadyLoaded}
				title={alreadyLoaded ? 'Already loaded in this session' : 'Load CSV into session'}
				className="inline-flex items-center gap-1.5 rounded-md border border-(--divider) bg-(--cards-bg) px-2.5 py-1 text-xs font-medium text-(--text-primary) transition-colors hover:border-(--primary)/40 hover:text-(--primary) disabled:cursor-not-allowed disabled:opacity-40"
			>
				{isLoading ? <LoadingSpinner size={10} /> : <Icon name="download-cloud" className="h-3 w-3" />}
				{alreadyLoaded ? 'Loaded' : 'Load'}
			</button>
			<button
				type="button"
				onClick={onInsert}
				disabled={!canInsert}
				title="Insert SELECT snippet at cursor"
				className="inline-flex items-center gap-1.5 rounded-md bg-(--primary) px-2.5 py-1 text-xs font-medium text-white shadow-sm transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
			>
				<Icon name="arrow-right" className="h-3 w-3" />
				Insert
			</button>
		</div>
	)
}

function ParamCombobox({
	paramLabel,
	options,
	value,
	onChange
}: {
	paramLabel: string
	options: Array<{ label: string; value: string; category?: string; isChild?: boolean }>
	value: string
	onChange: (next: string) => void
}) {
	const [search, setSearch] = useState('')
	const deferred = useDeferredValue(search)

	const matches = useMemo(() => {
		if (!deferred) return options.slice(0, 200)
		return matchSorter(options, deferred, { keys: ['label', 'value'] }).slice(0, 200)
	}, [options, deferred])

	const current = options.find((o) => o.value === value)

	if (options.length === 0) {
		return (
			<p className="text-[11px] text-(--text-tertiary) italic">
				No {paramLabel.toLowerCase()} options available.
			</p>
		)
	}

	return (
		<div className="flex items-center gap-2 text-xs">
			<span className="shrink-0 text-(--text-tertiary)">{paramLabel}:</span>
			<Ariakit.ComboboxProvider
				resetValueOnHide
				setValue={(v) => {
					startTransition(() => setSearch(v))
				}}
			>
				<Ariakit.SelectProvider
					value={value}
					setValue={(next) => {
						if (typeof next === 'string') onChange(next)
					}}
				>
					<Ariakit.Select
						className={`inline-flex min-w-[160px] max-w-[220px] items-center justify-between gap-1.5 rounded-md border px-2 py-1 text-xs transition-colors ${
							value
								? 'border-(--primary)/50 bg-(--primary)/5 text-(--primary)'
								: 'border-(--divider) bg-(--cards-bg) text-(--text-secondary) hover:border-(--primary)/40 hover:text-(--text-primary)'
						}`}
					>
						<span className="truncate font-mono">
							{current?.label ?? `Pick ${paramLabel.toLowerCase()}…`}
						</span>
						<Ariakit.SelectArrow />
					</Ariakit.Select>
					<Ariakit.SelectPopover
						gutter={6}
						portal
						sameWidth={false}
						unmountOnHide
						className="z-50 flex max-h-80 w-[min(320px,90vw)] flex-col overflow-hidden rounded-md border border-(--divider) bg-(--cards-bg) shadow-lg"
					>
						<div className="relative border-b border-(--divider) p-2">
							<Icon
								name="search"
								height={12}
								width={12}
								className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-(--text-tertiary)"
							/>
							<Ariakit.Combobox
								autoSelect
								placeholder={`Filter ${paramLabel.toLowerCase()}s…`}
								className="w-full rounded-md border border-(--divider) bg-(--app-bg) py-1 pr-2 pl-6 text-xs text-(--text-primary) placeholder:text-(--text-tertiary) focus:border-(--primary) focus:outline-none"
							/>
						</div>
						<Ariakit.ComboboxList className="thin-scrollbar overflow-y-auto">
							{matches.length === 0 ? (
								<p className="px-3 py-4 text-center text-xs text-(--text-tertiary)">No matches.</p>
							) : (
								matches.map((opt) => (
									<Ariakit.SelectItem
										key={opt.value}
										value={opt.value}
										render={<Ariakit.ComboboxItem />}
										className={`flex cursor-pointer items-center justify-between gap-2 px-3 py-1.5 text-xs text-(--text-primary) data-active-item:bg-(--link-hover-bg) ${
											opt.isChild ? 'pl-6 text-(--text-secondary)' : ''
										}`}
									>
										<span className="truncate">{opt.label}</span>
										<Ariakit.SelectItemCheck className="ml-auto text-(--primary)" />
									</Ariakit.SelectItem>
								))
							)}
						</Ariakit.ComboboxList>
					</Ariakit.SelectPopover>
				</Ariakit.SelectProvider>
			</Ariakit.ComboboxProvider>
			{value ? (
				<button
					type="button"
					onClick={() => onChange('')}
					aria-label="Clear selection"
					className="text-[11px] text-(--text-tertiary) underline-offset-2 hover:text-(--text-primary) hover:underline"
				>
					clear
				</button>
			) : null}
			<span className="ml-auto text-[10px] text-(--text-tertiary) tabular-nums">
				{options.length.toLocaleString()} option{options.length === 1 ? '' : 's'}
			</span>
		</div>
	)
}

function KindTag({ kind }: { kind: 'flat' | 'ts' }) {
	return (
		<span className="rounded-sm bg-(--link-hover-bg) px-1.5 py-px text-[9px] font-semibold tracking-wider text-(--text-tertiary) uppercase">
			{kind === 'flat' ? 'Dataset' : 'Time series'}
		</span>
	)
}

function AutoLoadHint() {
	return (
		<span
			title="Referenced tables are auto-loaded when you run a query that references them."
			className="inline-flex items-center gap-1 text-[10px] text-(--text-tertiary)"
		>
			<span aria-hidden className="inline-block h-1 w-1 rounded-full bg-(--text-tertiary)/60" />
			auto-loads on run
		</span>
	)
}

function LoadedPill({ rowCount }: { rowCount: number }) {
	return (
		<span className="inline-flex items-center gap-1 rounded-sm bg-emerald-500/15 px-1.5 py-px text-[10px] font-medium text-emerald-700 dark:text-emerald-400">
			<Icon name="check" className="h-2.5 w-2.5" />
			Loaded · {formatCount(rowCount)}
		</span>
	)
}

function formatCount(n: number): string {
	if (n < 1000) return n.toLocaleString()
	if (n < 10_000) return `${(n / 1000).toFixed(1)}k`
	if (n < 1_000_000) return `${Math.round(n / 1000)}k`
	return `${(n / 1_000_000).toFixed(1)}m`
}

function copyToClipboard(text: string) {
	if (typeof navigator === 'undefined' || !navigator.clipboard) return
	navigator.clipboard.writeText(text).then(
		() => toast.success('Copied', { duration: 1500 }),
		() => toast.error('Copy failed')
	)
}
