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
	if (kind === 'chart') return 'bar-chart-2'
	return 'layers'
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
	return (
		<div className="flex flex-col gap-2 rounded-xl border border-(--divider) bg-(--bg-primary) p-3">
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2">
					<Icon name="clock" className="h-4 w-4 text-(--text-tertiary)" />
					<span className="text-xs font-medium text-(--text-secondary)">Recent downloads</span>
				</div>
				<button
					type="button"
					onClick={onClear}
					className="text-xs text-(--text-tertiary) transition-colors hover:text-(--text-primary)"
				>
					Clear
				</button>
			</div>
			<div className="flex thin-scrollbar gap-2 overflow-x-auto">
				{recents.slice(0, 8).map((preset) => (
					<button
						key={preset.id}
						type="button"
						onClick={() => onRun(preset)}
						className="group flex w-64 shrink-0 items-center gap-2 rounded-lg border border-(--divider) bg-(--cards-bg) px-3 py-2 text-left transition-colors hover:border-(--primary)/40"
						title={`Run ${preset.name}`}
					>
						<div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-(--primary)/10">
							<Icon name={kindIcon(preset.kind)} className="h-4 w-4 text-(--primary)" />
						</div>
						<div className="flex min-w-0 flex-1 flex-col">
							<span className="truncate text-xs font-medium text-(--text-primary)">{preset.name}</span>
							<span className="truncate text-[11px] text-(--text-tertiary)">{dayjs(preset.createdAt).fromNow()}</span>
						</div>
						<Icon
							name="download-cloud"
							className="h-4 w-4 shrink-0 text-(--text-tertiary) transition-colors group-hover:text-(--primary)"
						/>
					</button>
				))}
			</div>
		</div>
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

	const otherNames = useMemo(() => {
		if (!renamingPreset) return []
		return savedDownloads.filter((p) => p.id !== renamingPreset.id).map((p) => p.name)
	}, [savedDownloads, renamingPreset])

	if (savedDownloads.length === 0) {
		return (
			<div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-(--divider) bg-(--bg-primary) p-10 text-center">
				<Icon name="bookmark" className="h-6 w-6 text-(--text-tertiary)" />
				<p className="text-sm text-(--text-secondary)">No saved presets yet.</p>
				<p className="max-w-md text-xs text-(--text-tertiary)">
					Open any dataset, set your columns and filters, then click <b>Save preset</b> in the modal header to add it
					here.
				</p>
			</div>
		)
	}
	return (
		<>
			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
				{savedDownloads.map((preset) => (
					<SavedDownloadCard
						key={preset.id}
						preset={preset}
						onRun={onRun}
						onRenameRequest={setRenamingPreset}
						onDelete={onDelete}
					/>
				))}
			</div>
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
		</>
	)
}

function SavedDownloadCard({
	preset,
	onRun,
	onRenameRequest,
	onDelete
}: {
	preset: SavedDownload
	onRun: (preset: SavedDownload) => void
	onRenameRequest: (preset: SavedDownload) => void
	onDelete: (id: string) => void
}) {
	const handleDelete = () => {
		if (window.confirm(`Delete preset "${preset.name}"?`)) {
			onDelete(preset.id)
		}
	}
	return (
		<div className="flex flex-col gap-3 rounded-xl border border-(--form-control-border) bg-(--bg-primary) p-5">
			<div className="flex items-start gap-3">
				<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-(--primary)/10">
					<Icon name={kindIcon(preset.kind)} className="h-5 w-5 text-(--primary)" />
				</div>
				<div className="flex min-w-0 flex-1 flex-col">
					<span className="truncate font-medium text-(--text-primary)">{preset.name}</span>
					<span className="truncate text-xs text-(--text-tertiary)">{resolvedLabel(preset)}</span>
				</div>
			</div>
			{(() => {
				const description = describeSavedConfig(preset)
				return description ? <p className="text-xs text-(--text-secondary)">{description}</p> : null
			})()}
			<p className="text-[11px] text-(--text-tertiary)">
				{preset.lastRunAt
					? `Last run ${dayjs(preset.lastRunAt).fromNow()}`
					: `Created ${dayjs(preset.createdAt).fromNow()}`}
			</p>
			<div className="flex items-center gap-2">
				<button
					type="button"
					onClick={() => onRun(preset)}
					className="flex flex-1 items-center justify-center gap-1.5 rounded-md bg-(--primary) px-3 py-1.5 text-xs font-medium text-white transition-colors hover:opacity-90"
				>
					<Icon name="download-cloud" className="h-3.5 w-3.5" />
					Run
				</button>
				<button
					type="button"
					onClick={() => onRenameRequest(preset)}
					className="flex items-center justify-center gap-1 rounded-md border border-(--divider) px-2.5 py-1.5 text-xs font-medium text-(--text-secondary) transition-colors hover:bg-(--link-hover-bg) hover:text-(--text-primary)"
					title="Rename preset"
				>
					<Icon name="pencil" className="h-3.5 w-3.5" />
				</button>
				<button
					type="button"
					onClick={handleDelete}
					className="flex items-center justify-center gap-1 rounded-md border border-(--divider) px-2.5 py-1.5 text-xs font-medium text-(--text-secondary) transition-colors hover:bg-(--link-hover-bg) hover:text-red-500"
					title="Delete preset"
				>
					<Icon name="trash-2" className="h-3.5 w-3.5" />
				</button>
			</div>
		</div>
	)
}
