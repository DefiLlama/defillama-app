import { matchSorter } from 'match-sorter'
import { useCallback, useDeferredValue, useMemo, useState } from 'react'
import { Icon } from '~/components/Icon'
import { LoadingSpinner } from '~/components/Loaders'
import { TrialCsvLimitModal } from '~/components/TrialCsvLimitModal'
import { useAuthContext } from '~/containers/Subscription/auth'
import {
	chartDatasets,
	chartDatasetCategories,
	type ChartDatasetDefinition,
	type ChartOptionsMap
} from './chart-datasets'
import { ChartDatasetModal } from './ChartDatasetModal'
import { DatasetPreviewModal } from './DatasetPreviewModal'
import { datasets, datasetCategories, type DatasetDefinition } from './datasets'
import { MultiMetricModal } from './MultiMetricModal'

const TABS = ['Datasets', 'Time Series'] as const
type Tab = (typeof TABS)[number]

const ALL_CATEGORY = 'All'

export function DownloadsCatalog({ chartOptionsMap }: { chartOptionsMap: ChartOptionsMap }) {
	const { isAuthenticated, hasActiveSubscription, isTrial, loaders, authorizedFetch } = useAuthContext()
	const [activeTab, setActiveTab] = useState<Tab>('Datasets')
	const [previewDataset, setPreviewDataset] = useState<DatasetDefinition | null>(null)
	const [previewChartDataset, setPreviewChartDataset] = useState<ChartDatasetDefinition | null>(null)
	const [trialLimitOpen, setTrialLimitOpen] = useState(false)
	const [combineModalOpen, setCombineModalOpen] = useState(false)

	const [searchValue, setSearchValue] = useState('')
	const deferredSearch = useDeferredValue(searchValue)
	const [selectedCategory, setSelectedCategory] = useState<string>(ALL_CATEGORY)

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

	const isUserLoading = loaders.userLoading

	return (
		<div className="flex flex-col gap-6">
			<div className="flex flex-col gap-1">
				<h1 className="text-2xl font-semibold">Downloads</h1>
				<p className="text-sm text-(--text-secondary)">
					Download CSV datasets from DefiLlama. Click a dataset to preview and choose columns.
				</p>
			</div>

			<div className="flex items-center gap-1 rounded-lg border border-(--divider) bg-(--bg-primary) p-1">
				{TABS.map((tab) => (
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
					<span className={`ml-1.5 ${selectedCategory === ALL_CATEGORY ? 'text-white/70' : 'text-(--text-tertiary)'}`}>
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

			{(deferredSearch || selectedCategory !== ALL_CATEGORY) && (
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
			) : (
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
			)}

			{combineModalOpen ? (
				<MultiMetricModal
					chartOptionsMap={chartOptionsMap}
					authorizedFetch={authorizedFetch}
					isPreview={isPreview}
					onClose={() => setCombineModalOpen(false)}
				/>
			) : null}

			{previewChartDataset && (
				<ChartDatasetModal
					dataset={previewChartDataset}
					options={chartOptionsMap[previewChartDataset.slug] ?? []}
					authorizedFetch={authorizedFetch}
					onClose={() => setPreviewChartDataset(null)}
					isTrial={isTrial}
					isPreview={isPreview}
				/>
			)}

			{previewDataset && (
				<DatasetPreviewModal
					dataset={previewDataset}
					authorizedFetch={authorizedFetch}
					onClose={() => setPreviewDataset(null)}
					isTrial={isTrial}
					isPreview={isPreview}
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
