import { useDeferredValue, useMemo, useState } from 'react'
import { matchSorter } from 'match-sorter'
import { Icon } from '~/components/Icon'
import { LoadingSpinner } from '~/components/Loaders'
import {
	chartDatasets,
	chartDatasetCategories,
	type ChartDatasetDefinition,
	type ChartOptionsMap
} from '../chart-datasets'
import { datasets, datasetCategories, type DatasetDefinition } from '../datasets'
import type { RegisteredTable, TableSource } from './useTableRegistry'

interface LoadTableModalProps {
	chartOptionsMap: ChartOptionsMap
	onClose: () => void
	onLoad: (source: TableSource) => Promise<void> | void
	loading: string | null
	existing: RegisteredTable[]
}

type ModalTab = 'flat' | 'timeseries'

export function LoadTableModal({ chartOptionsMap, onClose, onLoad, loading, existing }: LoadTableModalProps) {
	const [tab, setTab] = useState<ModalTab>('flat')
	const [search, setSearch] = useState('')
	const deferred = useDeferredValue(search)
	const [selectedChart, setSelectedChart] = useState<ChartDatasetDefinition | null>(null)
	const [selectedParam, setSelectedParam] = useState<string>('')

	const existingKeys = useMemo(() => {
		const s = new Set<string>()
		for (const t of existing) {
			if (t.source.kind === 'dataset') s.add(`d:${t.source.slug}`)
			else s.add(`c:${t.source.slug}:${t.source.param}`)
		}
		return s
	}, [existing])

	const filteredDatasets = useMemo(() => {
		if (!deferred) return datasetCategories.map((c) => ({ category: c, items: datasets.filter((d) => d.category === c) }))
		return datasetCategories
			.map((c) => {
				const items = datasets.filter((d) => d.category === c)
				const matched = matchSorter(items, deferred, {
					keys: ['name', 'description', 'category'],
					threshold: matchSorter.rankings.CONTAINS
				})
				return { category: c, items: matched }
			})
			.filter((g) => g.items.length > 0)
	}, [deferred])

	const filteredCharts = useMemo(() => {
		if (!deferred)
			return chartDatasetCategories.map((c) => ({ category: c, items: chartDatasets.filter((d) => d.category === c) }))
		return chartDatasetCategories
			.map((c) => {
				const items = chartDatasets.filter((d) => d.category === c)
				const matched = matchSorter(items, deferred, {
					keys: ['name', 'description', 'category'],
					threshold: matchSorter.rankings.CONTAINS
				})
				return { category: c, items: matched }
			})
			.filter((g) => g.items.length > 0)
	}, [deferred])

	return (
		<div
			role="dialog"
			aria-modal="true"
			aria-labelledby="load-table-title"
			className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px]"
			onClick={onClose}
		>
			<div
				onClick={(e) => e.stopPropagation()}
				className="flex max-h-[85vh] w-full max-w-3xl flex-col gap-4 overflow-hidden rounded-xl border border-(--cards-border) bg-(--cards-bg) p-5 shadow-2xl"
			>
				<div className="flex items-start justify-between gap-3">
					<div className="flex flex-col gap-1">
						<h2 id="load-table-title" className="text-lg font-semibold text-(--text-primary)">
							Add table
						</h2>
						<p className="text-xs text-(--text-secondary)">
							Load a DefiLlama dataset or time-series into this SQL session.
						</p>
					</div>
					<button
						type="button"
						onClick={onClose}
						aria-label="Close"
						className="flex h-7 w-7 items-center justify-center rounded-md text-(--text-tertiary) hover:bg-(--link-hover-bg) hover:text-(--text-primary)"
					>
						<Icon name="x" className="h-4 w-4" />
					</button>
				</div>

				<div className="flex items-center gap-1 rounded-lg border border-(--divider) bg-(--bg-primary) p-1">
					{(
						[
							{ id: 'flat' as const, label: 'Datasets' },
							{ id: 'timeseries' as const, label: 'Time series' }
						] as const
					).map((t) => (
						<button
							key={t.id}
							type="button"
							onClick={() => {
								setTab(t.id)
								setSelectedChart(null)
								setSelectedParam('')
							}}
							className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
								tab === t.id
									? 'bg-(--primary) text-white shadow-sm'
									: 'text-(--text-secondary) hover:bg-(--link-hover-bg) hover:text-(--text-primary)'
							}`}
						>
							{t.label}
						</button>
					))}
				</div>

				<label className="relative">
					<span className="sr-only">Search datasets</span>
					<Icon
						name="search"
						height={14}
						width={14}
						className="absolute top-0 bottom-0 left-2 my-auto text-(--text-tertiary)"
					/>
					<input
						type="text"
						inputMode="search"
						placeholder="Search..."
						value={search}
						onInput={(e) => setSearch(e.currentTarget.value)}
						className="min-h-8 w-full rounded-md border-(--bg-input) bg-(--bg-input) p-1.5 pl-7 text-sm text-black placeholder:text-[#666] dark:text-white dark:placeholder-[#919296]"
					/>
				</label>

				<div className="flex-1 overflow-y-auto thin-scrollbar pr-1">
					{tab === 'flat' ? (
						<FlatDatasetList
							grouped={filteredDatasets}
							existingKeys={existingKeys}
							loading={loading}
							onLoad={onLoad}
						/>
					) : selectedChart ? (
						<TimeSeriesParamPicker
							dataset={selectedChart}
							options={chartOptionsMap[selectedChart.slug] ?? []}
							existingKeys={existingKeys}
							value={selectedParam}
							onChange={setSelectedParam}
							onBack={() => {
								setSelectedChart(null)
								setSelectedParam('')
							}}
							onConfirm={() => {
								const opt = (chartOptionsMap[selectedChart.slug] ?? []).find((o) => o.value === selectedParam)
								if (!opt) return
								onLoad({ kind: 'chart', slug: selectedChart.slug, param: opt.value, paramLabel: opt.label })
							}}
							loading={loading}
						/>
					) : (
						<TimeSeriesDatasetList grouped={filteredCharts} onSelect={setSelectedChart} />
					)}
				</div>
			</div>
		</div>
	)
}

function FlatDatasetList({
	grouped,
	existingKeys,
	loading,
	onLoad
}: {
	grouped: Array<{ category: string; items: DatasetDefinition[] }>
	existingKeys: Set<string>
	loading: string | null
	onLoad: (source: TableSource) => Promise<void> | void
}) {
	if (grouped.length === 0) {
		return <p className="py-8 text-center text-sm text-(--text-tertiary)">No datasets match your search.</p>
	}
	return (
		<div className="flex flex-col gap-5">
			{grouped.map(({ category, items }) => (
				<section key={category} className="flex flex-col gap-2">
					<h3 className="text-xs font-semibold tracking-wide text-(--text-primary) uppercase">{category}</h3>
					<ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
						{items.map((d) => {
							const isLoaded = existingKeys.has(`d:${d.slug}`)
							const isLoading = loading === identifierSafe(d.slug)
							return (
								<li key={d.slug}>
									<button
										type="button"
										disabled={isLoaded || !!loading}
										onClick={() => onLoad({ kind: 'dataset', slug: d.slug })}
										className="group flex w-full flex-col gap-1 rounded-lg border border-(--form-control-border) bg-(--bg-primary) p-3 text-left transition-all hover:border-(--primary)/40 disabled:cursor-not-allowed disabled:opacity-50"
									>
										<div className="flex items-center justify-between gap-2">
											<span className="font-medium text-(--text-primary) group-hover:text-(--primary)">{d.name}</span>
											{isLoaded ? (
												<span className="inline-flex items-center gap-1 rounded-sm bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-400">
													<Icon name="check" className="h-3 w-3" />
													Loaded
												</span>
											) : isLoading ? (
												<LoadingSpinner size={12} />
											) : (
												<Icon name="plus" className="h-3.5 w-3.5 text-(--text-tertiary) group-hover:text-(--primary)" />
											)}
										</div>
										<p className="text-xs text-(--text-secondary)">{d.description}</p>
									</button>
								</li>
							)
						})}
					</ul>
				</section>
			))}
		</div>
	)
}

function TimeSeriesDatasetList({
	grouped,
	onSelect
}: {
	grouped: Array<{ category: string; items: ChartDatasetDefinition[] }>
	onSelect: (d: ChartDatasetDefinition) => void
}) {
	if (grouped.length === 0) {
		return <p className="py-8 text-center text-sm text-(--text-tertiary)">No datasets match your search.</p>
	}
	return (
		<div className="flex flex-col gap-5">
			{grouped.map(({ category, items }) => (
				<section key={category} className="flex flex-col gap-2">
					<h3 className="text-xs font-semibold tracking-wide text-(--text-primary) uppercase">{category}</h3>
					<ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
						{items.map((d) => (
							<li key={d.slug}>
								<button
									type="button"
									onClick={() => onSelect(d)}
									className="group flex w-full flex-col gap-1 rounded-lg border border-(--form-control-border) bg-(--bg-primary) p-3 text-left transition-all hover:border-(--primary)/40"
								>
									<div className="flex items-center justify-between gap-2">
										<span className="font-medium text-(--text-primary) group-hover:text-(--primary)">{d.name}</span>
										<Icon name="chevron-right" className="h-4 w-4 text-(--text-tertiary) group-hover:text-(--primary)" />
									</div>
									<p className="text-xs text-(--text-secondary)">{d.description}</p>
									<span className="inline-flex w-fit items-center gap-1 rounded-full bg-(--link-hover-bg) px-2 py-0.5 text-[10px] text-(--text-tertiary)">
										Pick {d.paramLabel}
									</span>
								</button>
							</li>
						))}
					</ul>
				</section>
			))}
		</div>
	)
}

function TimeSeriesParamPicker({
	dataset,
	options,
	existingKeys,
	value,
	onChange,
	onBack,
	onConfirm,
	loading
}: {
	dataset: ChartDatasetDefinition
	options: Array<{ label: string; value: string; category?: string; isChild?: boolean }>
	existingKeys: Set<string>
	value: string
	onChange: (v: string) => void
	onBack: () => void
	onConfirm: () => void
	loading: string | null
}) {
	const [search, setSearch] = useState('')
	const deferred = useDeferredValue(search)

	const filtered = useMemo(() => {
		if (!deferred) return options
		return matchSorter(options, deferred, { keys: ['label', 'value'] })
	}, [options, deferred])

	const selectedLoaded = value ? existingKeys.has(`c:${dataset.slug}:${value}`) : false

	return (
		<div className="flex flex-col gap-3">
			<div className="flex items-center gap-2">
				<button
					type="button"
					onClick={onBack}
					className="flex h-7 w-7 items-center justify-center rounded-md text-(--text-tertiary) transition-colors hover:bg-(--link-hover-bg) hover:text-(--text-primary)"
					aria-label="Back"
				>
					<Icon name="arrow-left" className="h-4 w-4" />
				</button>
				<div className="flex min-w-0 flex-col gap-0.5">
					<span className="truncate text-sm font-semibold text-(--text-primary)">{dataset.name}</span>
					<span className="text-xs text-(--text-tertiary)">Pick {dataset.paramLabel.toLowerCase()}</span>
				</div>
			</div>

			<label className="relative">
				<span className="sr-only">Filter {dataset.paramLabel}s</span>
				<Icon
					name="search"
					height={14}
					width={14}
					className="absolute top-0 bottom-0 left-2 my-auto text-(--text-tertiary)"
				/>
				<input
					type="text"
					inputMode="search"
					placeholder={`Filter ${dataset.paramLabel.toLowerCase()}s...`}
					value={search}
					onInput={(e) => setSearch(e.currentTarget.value)}
					className="min-h-8 w-full rounded-md border-(--bg-input) bg-(--bg-input) p-1.5 pl-7 text-sm text-black placeholder:text-[#666] dark:text-white dark:placeholder-[#919296]"
				/>
			</label>

			<ul className="flex max-h-80 flex-col overflow-y-auto thin-scrollbar divide-y divide-(--divider) border-y border-(--divider)">
				{filtered.slice(0, 200).map((opt) => {
					const isLoaded = existingKeys.has(`c:${dataset.slug}:${opt.value}`)
					const active = value === opt.value
					return (
						<li key={opt.value}>
							<button
								type="button"
								onClick={() => onChange(opt.value)}
								disabled={isLoaded}
								className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm transition-colors ${
									active ? 'bg-(--primary)/10 text-(--primary)' : 'text-(--text-primary) hover:bg-(--link-hover-bg)'
								} disabled:cursor-not-allowed disabled:opacity-50`}
							>
								<span className={`truncate ${opt.isChild ? 'pl-4 text-(--text-secondary)' : ''}`}>{opt.label}</span>
								{isLoaded ? (
									<span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">Loaded</span>
								) : active ? (
									<Icon name="check" className="h-3.5 w-3.5 text-(--primary)" />
								) : null}
							</button>
						</li>
					)
				})}
				{filtered.length === 0 ? (
					<li className="py-8 text-center text-sm text-(--text-tertiary)">No matches.</li>
				) : null}
			</ul>

			<div className="flex items-center justify-end gap-2">
				<button
					type="button"
					onClick={onBack}
					className="rounded-md border border-(--divider) px-3 py-1.5 text-xs font-medium text-(--text-secondary) transition-colors hover:bg-(--link-hover-bg) hover:text-(--text-primary)"
				>
					Cancel
				</button>
				<button
					type="button"
					onClick={onConfirm}
					disabled={!value || selectedLoaded || !!loading}
					className="inline-flex items-center gap-1.5 rounded-md bg-(--primary) px-3 py-1.5 text-xs font-medium text-white shadow-sm transition-colors hover:bg-(--primary)/90 disabled:cursor-not-allowed disabled:opacity-40"
				>
					{loading ? <LoadingSpinner size={12} /> : <Icon name="plus" className="h-3.5 w-3.5" />}
					Load table
				</button>
			</div>
		</div>
	)
}

function identifierSafe(s: string): string {
	return s.toLowerCase().replace(/[^a-z0-9_]+/g, '_').replace(/^_+|_+$/g, '')
}
