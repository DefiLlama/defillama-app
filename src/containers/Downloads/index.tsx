import dayjs from 'dayjs'
import { matchSorter } from 'match-sorter'
import { useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react'
import { toast } from 'react-hot-toast'
import { Icon, type IIcon } from '~/components/Icon'
import { LoadingSpinner } from '~/components/Loaders'
import { TrialCsvLimitModal } from '~/components/TrialCsvLimitModal'
import { useAuthContext } from '~/containers/Subscription/auth'
import { useRecentDownloads, useSavedDownloads } from '~/contexts/LocalStorage'
import {
	chartDatasets,
	chartDatasetCategories,
	chartDatasetsBySlug,
	type ChartDatasetDefinition,
	type ChartOptionsMap
} from './chart-datasets'
import { ChartDatasetModal } from './ChartDatasetModal'
import { DatasetPreviewModal } from './DatasetPreviewModal'
import { datasets, datasetCategories, datasetsBySlug, type DatasetDefinition } from './datasets'
import { MultiMetricModal } from './MultiMetricModal'
import {
	type ChartSavedConfig,
	type DatasetSavedConfig,
	describeSavedConfig,
	type MultiMetricSavedConfig,
	type SavedDownload
} from './savedDownloads'
import { SavePresetDialog } from './SavePresetDialog'

const ALL_TABS = ['Datasets', 'Time Series', 'Saved'] as const
type Tab = (typeof ALL_TABS)[number]

const ALL_CATEGORY = 'All'

export function DownloadsCatalog({ chartOptionsMap }: { chartOptionsMap: ChartOptionsMap }) {
	const { isAuthenticated, hasActiveSubscription, isTrial, loaders, authorizedFetch } = useAuthContext()
	const { savedDownloads, deleteDownload, renameDownload } = useSavedDownloads()
	const { recentDownloads, clearRecents } = useRecentDownloads()
	const [activeTab, setActiveTab] = useState<Tab>('Datasets')
	const [previewDataset, setPreviewDataset] = useState<DatasetDefinition | null>(null)
	const [previewChartDataset, setPreviewChartDataset] = useState<ChartDatasetDefinition | null>(null)
	const [trialLimitOpen, setTrialLimitOpen] = useState(false)
	const [combineModalOpen, setCombineModalOpen] = useState(false)
	const [datasetInitialConfig, setDatasetInitialConfig] = useState<DatasetSavedConfig | undefined>(undefined)
	const [chartInitialConfig, setChartInitialConfig] = useState<ChartSavedConfig | undefined>(undefined)
	const [multiMetricInitialConfig, setMultiMetricInitialConfig] = useState<MultiMetricSavedConfig | undefined>(
		undefined
	)

	const [searchValue, setSearchValue] = useState('')
	const deferredSearch = useDeferredValue(searchValue)
	const [selectedCategory, setSelectedCategory] = useState<string>(ALL_CATEGORY)

	const visibleTabs = useMemo(
		() => (savedDownloads.length > 0 ? ALL_TABS : ALL_TABS.filter((t) => t !== 'Saved')),
		[savedDownloads.length]
	)

	// If the Saved tab is active but no presets remain, fall back to Datasets.
	useEffect(() => {
		if (activeTab === 'Saved' && savedDownloads.length === 0) {
			setActiveTab('Datasets')
		}
	}, [activeTab, savedDownloads.length])

	const isPreview = !isAuthenticated || !hasActiveSubscription

	const allDatasetsByCategory = useMemo(() => {
		return datasetCategories.map((category) => ({
			category,
			items: datasets.filter((d) => d.category === category)
		}))
	}, [])

	const allChartsByCategory = useMemo(() => {
		return chartDatasetCategories.map((category) => ({
			category,
			items: chartDatasets.filter((d) => d.category === category)
		}))
	}, [])

	const filteredDatasetsByCategory = useMemo(() => {
		let grouped = allDatasetsByCategory
		if (selectedCategory !== ALL_CATEGORY) {
			grouped = grouped.filter((g) => g.category === selectedCategory)
		}
		if (!deferredSearch) return grouped
		return grouped
			.map((group) => {
				if (group.category.toLowerCase().includes(deferredSearch.toLowerCase())) return group
				const matched = matchSorter(group.items, deferredSearch, {
					keys: ['name', 'description', 'category'],
					threshold: matchSorter.rankings.CONTAINS
				})
				return { ...group, items: matched }
			})
			.filter((group) => group.items.length > 0)
	}, [deferredSearch, selectedCategory, allDatasetsByCategory])

	const filteredChartsByCategory = useMemo(() => {
		let grouped = allChartsByCategory
		if (selectedCategory !== ALL_CATEGORY) {
			grouped = grouped.filter((g) => g.category === selectedCategory)
		}
		if (!deferredSearch) return grouped
		return grouped
			.map((group) => {
				if (group.category.toLowerCase().includes(deferredSearch.toLowerCase())) return group
				const matched = matchSorter(group.items, deferredSearch, {
					keys: ['name', 'description', 'category'],
					threshold: matchSorter.rankings.CONTAINS
				})
				return { ...group, items: matched }
			})
			.filter((group) => group.items.length > 0)
	}, [deferredSearch, selectedCategory, allChartsByCategory])

	const totalFilteredCount = useMemo(() => {
		const groups = activeTab === 'Datasets' ? filteredDatasetsByCategory : filteredChartsByCategory
		return groups.reduce((sum, g) => sum + g.items.length, 0)
	}, [activeTab, filteredDatasetsByCategory, filteredChartsByCategory])

	const totalCount = useMemo(() => {
		return activeTab === 'Datasets' ? datasets.length : chartDatasets.length
	}, [activeTab])

	const currentCategories = useMemo(() => {
		return activeTab === 'Datasets' ? datasetCategories : chartDatasetCategories
	}, [activeTab])

	const categoryCounts = useMemo(() => {
		const groups = activeTab === 'Datasets' ? allDatasetsByCategory : allChartsByCategory
		const counts: Record<string, number> = {}
		for (const g of groups) {
			counts[g.category] = g.items.length
		}
		return counts
	}, [activeTab, allDatasetsByCategory, allChartsByCategory])

	const handleCardClick = useCallback(
		(dataset: DatasetDefinition) => {
			if (isAuthenticated && hasActiveSubscription && isTrial) {
				setTrialLimitOpen(true)
				return
			}

			setPreviewDataset(dataset)
		},
		[isAuthenticated, hasActiveSubscription, isTrial]
	)

	const handleChartCardClick = useCallback(
		(dataset: ChartDatasetDefinition) => {
			if (isAuthenticated && hasActiveSubscription && isTrial) {
				setTrialLimitOpen(true)
				return
			}

			setPreviewChartDataset(dataset)
		},
		[isAuthenticated, hasActiveSubscription, isTrial]
	)

	const handleRunPreset = useCallback(
		(preset: SavedDownload) => {
			if (isAuthenticated && hasActiveSubscription && isTrial) {
				setTrialLimitOpen(true)
				return
			}
			if (preset.kind === 'dataset') {
				const ds = datasetsBySlug.get(preset.slug)
				if (!ds) {
					toast.error(`Dataset "${preset.slug}" no longer available`)
					return
				}
				setDatasetInitialConfig(preset)
				setPreviewDataset(ds)
			} else if (preset.kind === 'chart') {
				const cd = chartDatasetsBySlug.get(preset.slug)
				if (!cd) {
					toast.error(`Chart "${preset.slug}" no longer available`)
					return
				}
				setChartInitialConfig(preset)
				setPreviewChartDataset(cd)
			} else {
				setMultiMetricInitialConfig(preset)
				setCombineModalOpen(true)
			}
			// lastRunAt is bumped inside recordRecent when the download actually completes.
		},
		[isAuthenticated, hasActiveSubscription, isTrial]
	)

	const isUserLoading = loaders.userLoading

	return (
		<div className="flex flex-col gap-6">
			<div className="flex flex-col gap-1">
				<h1 className="text-2xl font-semibold">Downloads</h1>
				<p className="text-sm text-(--text-secondary)">
					Download CSV datasets from DefiLlama. Click a dataset to preview and choose columns.
				</p>
			</div>

			{recentDownloads.length > 0 ? (
				<RecentDownloadsStrip recents={recentDownloads} onRun={handleRunPreset} onClear={clearRecents} />
			) : null}

			<div className="flex items-center gap-1 rounded-lg border border-(--divider) bg-(--bg-primary) p-1">
				{visibleTabs.map((tab) => (
					<button
						key={tab}
						type="button"
						onClick={() => {
							setActiveTab(tab)
							setSelectedCategory(ALL_CATEGORY)
						}}
						className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
							activeTab === tab
								? 'bg-(--primary) text-white shadow-sm'
								: 'text-(--text-secondary) hover:bg-(--link-hover-bg) hover:text-(--text-primary)'
						}`}
					>
						{tab}
					</button>
				))}
			</div>

			{activeTab !== 'Saved' ? (
				<label className="relative">
					<span className="sr-only">Search datasets</span>
					<Icon
						name="search"
						height={16}
						width={16}
						className="absolute top-0 bottom-0 left-2 my-auto text-(--text-tertiary)"
					/>
					<input
						type="text"
						inputMode="search"
						placeholder="Search..."
						value={searchValue}
						onInput={(e) => setSearchValue(e.currentTarget.value)}
						className="min-h-8 w-full rounded-md border-(--bg-input) bg-(--bg-input) p-1.5 pl-7 text-base text-black placeholder:text-[#666] dark:text-white dark:placeholder-[#919296]"
					/>
				</label>
			) : null}

			{activeTab !== 'Saved' ? (
				<div className="flex flex-wrap items-center gap-2">
					<button
						type="button"
						onClick={() => setSelectedCategory(ALL_CATEGORY)}
						className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
							selectedCategory === ALL_CATEGORY
								? 'bg-(--primary) text-white shadow-sm'
								: 'border border-(--divider) bg-(--bg-primary) text-(--text-secondary) hover:border-(--primary)/40 hover:text-(--text-primary)'
						}`}
					>
						All
						<span
							className={`ml-1.5 ${selectedCategory === ALL_CATEGORY ? 'text-white/70' : 'text-(--text-tertiary)'}`}
						>
							{totalCount}
						</span>
					</button>
					{currentCategories.map((category) => (
						<button
							key={category}
							type="button"
							onClick={() => setSelectedCategory(selectedCategory === category ? ALL_CATEGORY : category)}
							className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
								selectedCategory === category
									? 'bg-(--primary) text-white shadow-sm'
									: 'border border-(--divider) bg-(--bg-primary) text-(--text-secondary) hover:border-(--primary)/40 hover:text-(--text-primary)'
							}`}
						>
							{category}
							<span className={`ml-1.5 ${selectedCategory === category ? 'text-white/70' : 'text-(--text-tertiary)'}`}>
								{categoryCounts[category] ?? 0}
							</span>
						</button>
					))}
				</div>
			) : null}

			{activeTab !== 'Saved' && (deferredSearch || selectedCategory !== ALL_CATEGORY) && (
				<p className="text-xs text-(--text-tertiary)">
					Showing {totalFilteredCount} of {totalCount} datasets
					{selectedCategory !== ALL_CATEGORY ? ` in ${selectedCategory}` : ''}
					{deferredSearch ? ` matching "${deferredSearch}"` : ''}
				</p>
			)}

			{activeTab === 'Datasets' ? (
				<div className="flex flex-col gap-8">
					{filteredDatasetsByCategory.map(({ category, items }) => (
						<section key={category} className="flex flex-col gap-3">
							<h2 className="text-lg font-semibold text-(--text-primary)">{category}</h2>
							<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
								{items.map((dataset) => {
									const disabled = !!isUserLoading
									return (
										<button
											key={dataset.slug}
											type="button"
											disabled={disabled}
											onClick={() => handleCardClick(dataset)}
											className="group flex cursor-pointer touch-manipulation flex-col gap-3 rounded-xl border border-(--form-control-border) bg-(--bg-primary) p-5 text-left transition-all duration-150 hover:border-(--primary)/40 hover:shadow-md active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
										>
											<div className="flex items-start justify-between gap-3">
												<div className="flex items-center gap-3">
													<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-(--primary)/10">
														{disabled ? (
															<LoadingSpinner size={18} />
														) : (
															<Icon name="file-text" className="h-5 w-5 text-(--primary)" />
														)}
													</div>
													<span className="font-medium text-(--primary) group-hover:underline">{dataset.name}</span>
												</div>
												<Icon
													name="arrow-up-right"
													className="mt-0.5 h-4 w-4 shrink-0 text-(--text-secondary) transition-transform duration-150 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-(--primary)"
												/>
											</div>
											<p className="text-sm text-(--text-secondary)">{dataset.description}</p>
										</button>
									)
								})}
							</div>
						</section>
					))}
					{filteredDatasetsByCategory.length === 0 && (
						<p className="py-8 text-center text-sm text-(--text-tertiary)">No datasets match your search.</p>
					)}
				</div>
			) : activeTab === 'Time Series' ? (
				<div className="flex flex-col gap-8">
					<button
						type="button"
						onClick={() => {
							if (isTrial) {
								setTrialLimitOpen(true)
								return
							}
							setCombineModalOpen(true)
						}}
						className="group relative flex items-start justify-between gap-4 overflow-hidden rounded-xl border border-(--primary)/30 bg-gradient-to-br from-(--primary)/[0.08] to-(--primary)/[0.02] p-4 text-left transition-all hover:border-(--primary)/60 hover:from-(--primary)/[0.12] hover:to-(--primary)/[0.04]"
					>
						<div className="flex items-start gap-3">
							<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-(--primary)/15">
								<Icon name="layers" className="h-5 w-5 text-(--primary)" />
							</div>
							<div className="flex flex-col gap-0.5">
								<p className="font-medium text-(--text-primary)">Combine multiple metrics</p>
								<p className="text-sm text-(--text-secondary)">
									Pick a protocol or chain, mix any of its metrics — TVL, fees, volume, revenue — into a single CSV.
								</p>
							</div>
						</div>
						<span className="mt-1 inline-flex shrink-0 items-center gap-1 rounded-md bg-(--primary) px-2.5 py-1 text-xs font-medium text-white shadow-sm transition-transform group-hover:translate-x-0.5">
							Open builder
							<Icon name="arrow-up-right" className="h-3.5 w-3.5" />
						</span>
					</button>

					{filteredChartsByCategory.map(({ category, items }) => (
						<section key={`chart-${category}`} className="flex flex-col gap-3">
							<h2 className="text-lg font-semibold text-(--text-primary)">{category}</h2>
							<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
								{items.map((dataset) => {
									const disabled = !!isUserLoading
									return (
										<button
											key={dataset.slug}
											type="button"
											disabled={disabled}
											onClick={() => handleChartCardClick(dataset)}
											className="group flex cursor-pointer touch-manipulation flex-col gap-3 rounded-xl border border-(--form-control-border) bg-(--bg-primary) p-5 text-left transition-all duration-150 hover:border-(--primary)/40 hover:shadow-md active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
										>
											<div className="flex items-start justify-between gap-3">
												<div className="flex items-center gap-3">
													<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-(--primary)/10">
														{disabled ? (
															<LoadingSpinner size={18} />
														) : (
															<Icon name="bar-chart-2" className="h-5 w-5 text-(--primary)" />
														)}
													</div>
													<span className="font-medium text-(--primary) group-hover:underline">{dataset.name}</span>
												</div>
												<Icon
													name="arrow-up-right"
													className="mt-0.5 h-4 w-4 shrink-0 text-(--text-secondary) transition-transform duration-150 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-(--primary)"
												/>
											</div>
											<p className="text-sm text-(--text-secondary)">{dataset.description}</p>
											<span className="inline-flex w-fit items-center gap-1 rounded-full bg-(--link-hover-bg) px-2 py-0.5 text-xs text-(--text-tertiary)">
												Select {dataset.paramLabel}
											</span>
										</button>
									)
								})}
							</div>
							{category === 'RWA' ? (
								<p className="text-sm text-(--text-secondary)">
									Download more RWA data{' '}
									<a href="https://defillama.com/rwa" className="text-(--primary) underline hover:opacity-80">
										here
									</a>
									.
								</p>
							) : null}
						</section>
					))}
					{filteredChartsByCategory.length === 0 && (
						<p className="py-8 text-center text-sm text-(--text-tertiary)">No datasets match your search.</p>
					)}
				</div>
			) : (
				<SavedDownloadsContent
					savedDownloads={savedDownloads}
					onRun={handleRunPreset}
					onRename={renameDownload}
					onDelete={deleteDownload}
				/>
			)}

			{combineModalOpen ? (
				<MultiMetricModal
					chartOptionsMap={chartOptionsMap}
					authorizedFetch={authorizedFetch}
					isPreview={isPreview}
					initialConfig={multiMetricInitialConfig}
					onClose={() => {
						setCombineModalOpen(false)
						setMultiMetricInitialConfig(undefined)
					}}
				/>
			) : null}

			{previewChartDataset && (
				<ChartDatasetModal
					dataset={previewChartDataset}
					options={chartOptionsMap[previewChartDataset.slug] ?? []}
					authorizedFetch={authorizedFetch}
					onClose={() => {
						setPreviewChartDataset(null)
						setChartInitialConfig(undefined)
					}}
					isTrial={isTrial}
					isPreview={isPreview}
					initialConfig={chartInitialConfig}
				/>
			)}

			{previewDataset && (
				<DatasetPreviewModal
					dataset={previewDataset}
					authorizedFetch={authorizedFetch}
					onClose={() => {
						setPreviewDataset(null)
						setDatasetInitialConfig(undefined)
					}}
					isTrial={isTrial}
					isPreview={isPreview}
					initialConfig={datasetInitialConfig}
				/>
			)}

			{trialLimitOpen ? <TrialCsvLimitModal isOpen={trialLimitOpen} onClose={() => setTrialLimitOpen(false)} /> : null}

			<section className="mt-8 flex flex-col gap-4 border-t border-(--divider) pt-8">
				<h2 className="text-lg font-semibold text-(--text-primary)">FAQ</h2>
				<div className="divide-y divide-(--divider) border-y border-(--divider)">
					<FaqItem question="How do I subscribe to download data from DefiLlama?">
						DefiLlama data is available to subscribers of our Pro and API plans. Learn more about these plans{' '}
						<a
							href="https://defillama.com/subscription"
							className="text-(--primary) underline hover:opacity-80"
							target="_blank"
							rel="noopener noreferrer"
						>
							here
						</a>
						.
					</FaqItem>
					<FaqItem question="Is DefiLlama data available through an API?">
						Yes, DefiLlama data is available through both a free and paid{' '}
						<a
							href="https://api-docs.defillama.com/"
							className="text-(--primary) underline hover:opacity-80"
							target="_blank"
							rel="noopener noreferrer"
						>
							API
						</a>
						.
					</FaqItem>
					<FaqItem question="How can I contact DefiLlama with questions?">
						You can contact us by email, a support form, or live support{' '}
						<a
							href="https://defillama.com/support"
							className="text-(--primary) underline hover:opacity-80"
							target="_blank"
							rel="noopener noreferrer"
						>
							here
						</a>
						.
					</FaqItem>
				</div>
			</section>
		</div>
	)
}

const FaqItem = ({ question, children }: { question: string; children: React.ReactNode }) => (
	<details className="group">
		<summary className="flex cursor-pointer items-center gap-4 py-4">
			<span className="flex-1 text-sm font-medium text-(--text-primary)">{question}</span>
			<Icon
				name="chevron-down"
				height={16}
				width={16}
				className="shrink-0 text-(--text-secondary) transition-transform duration-200 group-open:rotate-180"
			/>
		</summary>
		<div className="pb-4 text-sm text-(--text-secondary)">{children}</div>
	</details>
)

function kindIcon(kind: SavedDownload['kind']): IIcon['name'] {
	if (kind === 'dataset') return 'file-text'
	// Chart and multi-metric share the "time series" bucket visually, but the icon
	// still differentiates (single bar chart vs layered stack) for quick scanning.
	if (kind === 'chart') return 'bar-chart-2'
	return 'layers'
}

// Collapse the three SavedDownload kinds into two visual buckets:
// - dataset: flat tabular exports
// - timeseries: chart + multiMetric (both produce date-indexed CSVs)
type KindBucket = 'dataset' | 'timeseries'

interface KindStyle {
	label: string
	accent: string
	fg: string
}

const KIND_STYLES: Record<KindBucket, KindStyle> = {
	dataset: {
		label: 'Dataset',
		accent: 'bg-sky-500',
		fg: 'text-sky-600 dark:text-sky-400'
	},
	timeseries: {
		label: 'Time series',
		accent: 'bg-violet-500',
		fg: 'text-violet-600 dark:text-violet-400'
	}
}

function kindBucket(kind: SavedDownload['kind']): KindBucket {
	return kind === 'dataset' ? 'dataset' : 'timeseries'
}

function kindStyle(kind: SavedDownload['kind']): KindStyle {
	return KIND_STYLES[kindBucket(kind)]
}

function resolvedLabel(preset: SavedDownload): string {
	if (preset.kind === 'dataset') return datasetsBySlug.get(preset.slug)?.name ?? preset.slug
	if (preset.kind === 'chart') return chartDatasetsBySlug.get(preset.slug)?.name ?? preset.slug
	return preset.paramLabel ?? preset.param
}

function RecentDownloadsStrip({
	recents,
	onRun,
	onClear
}: {
	recents: SavedDownload[]
	onRun: (preset: SavedDownload) => void
	onClear: () => void
}) {
	const items = recents.slice(0, 8)
	return (
		<section aria-label="Recent downloads" className="flex flex-col gap-2">
			<header className="flex items-baseline justify-between gap-3 px-0.5">
				<div className="flex items-baseline gap-2">
					<Icon name="clock" className="h-3 w-3 self-center text-(--text-tertiary)" />
					<h2 className="text-[11px] font-semibold tracking-[0.14em] text-(--text-tertiary) uppercase">Recent</h2>
					<span className="text-[11px] tabular-nums text-(--text-tertiary)/70">
						{items.length === 1 ? '1 run' : `${items.length} runs`}
					</span>
				</div>
				<button
					type="button"
					onClick={onClear}
					className="text-[11px] font-medium text-(--text-tertiary) transition-colors hover:text-(--text-primary)"
				>
					Clear all
				</button>
			</header>
			<div className="thin-scrollbar flex overflow-x-auto border-y border-(--divider)">
				<ul className="flex min-w-full gap-0">
					{items.map((preset, i) => {
						const style = kindStyle(preset.kind)
						return (
							<li
								key={preset.id}
								className="flex shrink-0 border-l border-(--divider) first:border-l-0"
								style={{ width: 'clamp(200px, 22%, 260px)' }}
							>
								<button
									type="button"
									onClick={() => onRun(preset)}
									title={`Run ${preset.name}`}
									className="group relative flex min-w-0 flex-1 flex-col gap-1 py-2.5 pr-3 pl-4 text-left transition-colors hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) focus-visible:outline-none"
								>
									<span
										className={`absolute top-3 bottom-3 left-2 w-0.5 rounded-full ${style.accent} opacity-40 transition-opacity group-hover:opacity-100`}
										aria-hidden="true"
									/>
									<span className="flex items-center gap-1.5">
										<span
											className={`inline-flex items-center gap-1 text-[10px] font-semibold tracking-wider uppercase ${style.fg}`}
										>
											<Icon name={kindIcon(preset.kind)} className="h-3 w-3" />
											{style.label}
										</span>
										{i === 0 ? (
											<span className="ml-auto rounded-sm bg-(--primary)/15 px-1 py-px text-[9px] font-semibold tracking-wide text-(--primary) uppercase">
												New
											</span>
										) : null}
									</span>
									<span className="truncate text-xs font-medium text-(--text-primary)">{preset.name}</span>
									<span className="flex items-center justify-between gap-2 text-[11px] tabular-nums text-(--text-tertiary)">
										<span className="truncate">{dayjs(preset.createdAt).fromNow()}</span>
										<Icon
											name="arrow-up-right"
											className="h-3 w-3 shrink-0 -translate-x-1 text-(--text-tertiary) opacity-0 transition-all group-hover:translate-x-0 group-hover:text-(--primary) group-hover:opacity-100"
										/>
									</span>
								</button>
							</li>
						)
					})}
				</ul>
			</div>
		</section>
	)
}

function SavedDownloadsContent({
	savedDownloads,
	onRun,
	onRename,
	onDelete
}: {
	savedDownloads: SavedDownload[]
	onRun: (preset: SavedDownload) => void
	onRename: (id: string, name: string) => void
	onDelete: (id: string) => void
}) {
	const [renamingPreset, setRenamingPreset] = useState<SavedDownload | null>(null)
	const [deletingId, setDeletingId] = useState<string | null>(null)

	const otherNames = useMemo(() => {
		if (!renamingPreset) return []
		return savedDownloads.filter((p) => p.id !== renamingPreset.id).map((p) => p.name)
	}, [savedDownloads, renamingPreset])

	const bucketCounts = useMemo(() => {
		let dataset = 0
		let timeseries = 0
		for (const p of savedDownloads) {
			if (p.kind === 'dataset') dataset++
			else timeseries++
		}
		return { dataset, timeseries }
	}, [savedDownloads])

	if (savedDownloads.length === 0) {
		return <SavedEmptyState />
	}

	return (
		<>
			<div className="flex items-baseline justify-between gap-3 px-0.5">
				<p className="text-[11px] font-semibold tracking-[0.14em] text-(--text-tertiary) uppercase">
					{savedDownloads.length} {savedDownloads.length === 1 ? 'preset' : 'presets'}
				</p>
				<p className="flex items-center gap-3 text-[11px] tabular-nums text-(--text-tertiary)">
					{bucketCounts.dataset > 0 ? (
						<span className="flex items-center gap-1.5">
							<span className={`h-1.5 w-1.5 rounded-full ${KIND_STYLES.dataset.accent}`} aria-hidden="true" />
							{bucketCounts.dataset} dataset{bucketCounts.dataset === 1 ? '' : 's'}
						</span>
					) : null}
					{bucketCounts.timeseries > 0 ? (
						<span className="flex items-center gap-1.5">
							<span className={`h-1.5 w-1.5 rounded-full ${KIND_STYLES.timeseries.accent}`} aria-hidden="true" />
							{bucketCounts.timeseries} time series
						</span>
					) : null}
				</p>
			</div>
			<ul className="-mx-1 border-y border-(--divider)">
				{savedDownloads.map((preset) => (
					<SavedDownloadRow
						key={preset.id}
						preset={preset}
						onRun={onRun}
						onRenameRequest={setRenamingPreset}
						onDeleteRequest={setDeletingId}
					/>
				))}
			</ul>
			{renamingPreset ? (
				<SavePresetDialog
					suggestedName={renamingPreset.name}
					existingNames={otherNames}
					title="Rename preset"
					description=""
					submitLabel="Rename"
					placeholder="Preset name"
					onSave={(name) => {
						if (name !== renamingPreset.name) {
							onRename(renamingPreset.id, name)
						}
						setRenamingPreset(null)
					}}
					onClose={() => setRenamingPreset(null)}
				/>
			) : null}
			{deletingId ? (
				<DeletePresetDialog
					preset={savedDownloads.find((p) => p.id === deletingId) ?? null}
					onConfirm={() => {
						if (deletingId) onDelete(deletingId)
						setDeletingId(null)
					}}
					onClose={() => setDeletingId(null)}
				/>
			) : null}
		</>
	)
}

function SavedEmptyState() {
	return (
		<div className="relative overflow-hidden rounded-xl border border-dashed border-(--divider) bg-(--bg-primary)/40">
			<div className="flex flex-col gap-4 px-8 py-10 sm:flex-row sm:items-center sm:gap-8">
				<div className="flex flex-col gap-1.5 sm:max-w-sm">
					<p className="text-[11px] font-semibold tracking-[0.14em] text-(--text-tertiary) uppercase">
						No presets yet
					</p>
					<p className="text-base font-medium text-(--text-primary)">
						Save a configuration to run it again in one click.
					</p>
					<p className="text-xs text-(--text-secondary)">
						Open a dataset, pick your columns, filters, date range — then click{' '}
						<span className="inline-flex items-center gap-1 rounded border border-(--divider) bg-(--bg-primary) px-1.5 py-0.5 text-[11px] font-medium text-(--text-primary)">
							<Icon name="bookmark" className="h-3 w-3" />
							Save preset
						</span>{' '}
						in the modal header.
					</p>
				</div>
				<div className="flex-1 opacity-60">
					<MockSavedRow
						kind="dataset"
						title="Chains TVL — name, tvl, chainId"
						sub="Chains TVL · tvl desc"
					/>
					<MockSavedRow
						kind="multiMetric"
						title="Aave V3 — TVL, Fees, Revenue +3"
						sub="Aave V3 · 6 metrics combined"
					/>
				</div>
			</div>
		</div>
	)
}

function MockSavedRow({ kind, title, sub }: { kind: SavedDownload['kind']; title: string; sub: string }) {
	const style = kindStyle(kind)
	return (
		<div className="pointer-events-none flex items-center gap-3 border-t border-(--divider) py-2.5 pr-2 pl-3 first:border-t-0">
			<span className={`h-5 w-0.5 shrink-0 rounded-full ${style.accent}`} aria-hidden="true" />
			<div className="flex min-w-0 flex-1 flex-col">
				<span className="truncate text-xs font-medium text-(--text-primary)">{title}</span>
				<span className="truncate text-[10px] text-(--text-tertiary)">{sub}</span>
			</div>
			<Icon name="arrow-up-right" className="h-3 w-3 shrink-0 text-(--text-tertiary)" />
		</div>
	)
}

function SavedDownloadRow({
	preset,
	onRun,
	onRenameRequest,
	onDeleteRequest
}: {
	preset: SavedDownload
	onRun: (preset: SavedDownload) => void
	onRenameRequest: (preset: SavedDownload) => void
	onDeleteRequest: (id: string) => void
}) {
	const style = kindStyle(preset.kind)
	const description = describeSavedConfig(preset)
	const sourceLabel = resolvedLabel(preset)
	const timestamp = preset.lastRunAt
		? { prefix: 'ran', value: dayjs(preset.lastRunAt).fromNow() }
		: { prefix: 'saved', value: dayjs(preset.createdAt).fromNow() }

	const handleRowActivate = (event: React.MouseEvent | React.KeyboardEvent) => {
		// Ignore when the user clicked one of the action buttons on the right.
		const target = event.target as HTMLElement
		if (target.closest('[data-row-action]')) return
		onRun(preset)
	}

	return (
		<li
			role="button"
			tabIndex={0}
			aria-label={`Run preset ${preset.name}`}
			onClick={handleRowActivate}
			onKeyDown={(e) => {
				if (e.key === 'Enter' || e.key === ' ') {
					e.preventDefault()
					handleRowActivate(e)
				}
			}}
			className="group relative flex cursor-pointer items-center gap-3 border-t border-(--divider) py-3.5 pr-3 pl-4 transition-colors first:border-t-0 hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) focus-visible:outline-none"
		>
			{/* Left: kind accent — hairline at rest, full bar on hover. */}
			<span
				className={`absolute top-2 bottom-2 left-1 w-0.5 rounded-full ${style.accent} opacity-30 transition-all group-hover:opacity-100 group-focus-visible:opacity-100`}
				aria-hidden="true"
			/>

			<div className="flex min-w-0 flex-1 flex-col gap-1">
				<div className="flex items-baseline gap-2">
					<span
						className={`shrink-0 text-[10px] font-semibold tracking-wider uppercase ${style.fg}`}
						aria-hidden="true"
					>
						{style.label}
					</span>
					<span className="truncate text-[15px] font-semibold text-(--text-primary)">{preset.name}</span>
				</div>
				<div className="flex min-w-0 items-center gap-2 text-[11.5px] text-(--text-tertiary)">
					<span className="truncate text-(--text-secondary)">{sourceLabel}</span>
					{description ? (
						<>
							<span aria-hidden="true" className="text-(--text-tertiary)/50">
								·
							</span>
							<span className="truncate">{description}</span>
						</>
					) : null}
				</div>
			</div>

			{/*
			 * Right rail: timestamp at rest, hover reveals actions + Run affordance.
			 * Actions are absolutely positioned so they overlay the timestamp without
			 * reserving blank space when the row is idle.
			 */}
			<div className="relative flex h-8 shrink-0 items-center justify-end pl-2 sm:min-w-[12rem]">
				<span className="text-[11px] tabular-nums text-(--text-tertiary) transition-opacity sm:group-hover:opacity-0 sm:group-focus-within:opacity-0">
					<span className="hidden text-(--text-tertiary)/60 sm:inline">{timestamp.prefix} </span>
					{timestamp.value}
				</span>

				{/* Desktop: hover-revealed actions overlay the timestamp */}
				<div className="absolute inset-y-0 right-0 hidden items-center gap-0.5 pl-2 opacity-0 transition-opacity sm:flex sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
					<button
						type="button"
						data-row-action
						onClick={(e) => {
							e.stopPropagation()
							onRenameRequest(preset)
						}}
						className="flex h-7 w-7 items-center justify-center rounded-md text-(--text-tertiary) transition-colors hover:bg-(--bg-primary) hover:text-(--text-primary) focus-visible:bg-(--bg-primary) focus-visible:text-(--text-primary) focus-visible:outline-none"
						aria-label={`Rename ${preset.name}`}
						title="Rename"
					>
						<Icon name="pencil" className="h-3.5 w-3.5" />
					</button>
					<button
						type="button"
						data-row-action
						onClick={(e) => {
							e.stopPropagation()
							onDeleteRequest(preset.id)
						}}
						className="flex h-7 w-7 items-center justify-center rounded-md text-(--text-tertiary) transition-colors hover:bg-red-500/10 hover:text-red-500 focus-visible:bg-red-500/10 focus-visible:text-red-500 focus-visible:outline-none"
						aria-label={`Delete ${preset.name}`}
						title="Delete"
					>
						<Icon name="trash-2" className="h-3.5 w-3.5" />
					</button>
					<span
						aria-hidden="true"
						className="ml-1 inline-flex items-center gap-1 rounded-md bg-(--primary) px-2.5 py-1 text-[11px] font-medium text-white shadow-sm"
					>
						<Icon name="download-cloud" className="h-3 w-3" />
						Run
					</span>
				</div>

				{/* Mobile: always-visible small action buttons (no hover available) */}
				<div className="ml-2 flex items-center gap-0.5 sm:hidden">
					<button
						type="button"
						data-row-action
						onClick={(e) => {
							e.stopPropagation()
							onRenameRequest(preset)
						}}
						className="flex h-7 w-7 items-center justify-center rounded-md text-(--text-tertiary)"
						aria-label={`Rename ${preset.name}`}
					>
						<Icon name="pencil" className="h-3.5 w-3.5" />
					</button>
					<button
						type="button"
						data-row-action
						onClick={(e) => {
							e.stopPropagation()
							onDeleteRequest(preset.id)
						}}
						className="flex h-7 w-7 items-center justify-center rounded-md text-(--text-tertiary)"
						aria-label={`Delete ${preset.name}`}
					>
						<Icon name="trash-2" className="h-3.5 w-3.5" />
					</button>
				</div>
			</div>
		</li>
	)
}

function DeletePresetDialog({
	preset,
	onConfirm,
	onClose
}: {
	preset: SavedDownload | null
	onConfirm: () => void
	onClose: () => void
}) {
	if (!preset) return null
	return (
		<div
			role="dialog"
			aria-modal="true"
			aria-labelledby="delete-preset-title"
			className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px]"
			onClick={onClose}
		>
			<div
				onClick={(e) => e.stopPropagation()}
				className="flex w-full max-w-sm flex-col gap-3 rounded-xl border border-(--cards-border) bg-(--cards-bg) p-5 shadow-2xl"
			>
				<div className="flex items-start gap-3">
					<div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-500/10">
						<Icon name="trash-2" className="h-4 w-4 text-red-500" />
					</div>
					<div className="flex flex-col gap-1">
						<h3 id="delete-preset-title" className="text-sm font-semibold text-(--text-primary)">
							Delete preset?
						</h3>
						<p className="text-xs text-(--text-secondary)">
							<span className="font-medium text-(--text-primary)">"{preset.name}"</span> will be removed. This can't be
							undone.
						</p>
					</div>
				</div>
				<div className="flex justify-end gap-2 pt-1">
					<button
						type="button"
						onClick={onClose}
						className="rounded-md border border-(--divider) px-3 py-1.5 text-xs font-medium text-(--text-secondary) transition-colors hover:bg-(--link-hover-bg) hover:text-(--text-primary)"
					>
						Cancel
					</button>
					<button
						type="button"
						onClick={onConfirm}
						autoFocus
						className="rounded-md bg-red-500 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-red-600"
					>
						Delete
					</button>
				</div>
			</div>
		</div>
	)
}
