import * as Ariakit from '@ariakit/react'
import { lazy, Suspense, useCallback, useRef, useState } from 'react'
import { Icon } from '~/components/Icon'
import { LoadingSpinner } from '~/components/Loaders'
import { TrialCsvLimitModal } from '~/components/TrialCsvLimitModal'
import { ConfirmationModal } from '~/containers/ProDashboard/components/ConfirmationModal'
import { useAuthContext } from '~/containers/Subscribtion/auth'
import {
	chartDatasets,
	chartDatasetCategories,
	type ChartDatasetDefinition,
	type ChartOptionsMap
} from './chart-datasets'
import { ChartDatasetModal } from './ChartDatasetModal'
import { DatasetPreviewModal } from './DatasetPreviewModal'
import { datasets, datasetCategories, type DatasetDefinition } from './datasets'

const SubscribeProModal = lazy(() =>
	import('~/components/SubscribeCards/SubscribeProCard').then((m) => ({ default: m.SubscribeProModal }))
)

const TABS = ['Datasets', 'Charts'] as const
type Tab = (typeof TABS)[number]

export function DownloadsCatalog({ chartOptionsMap }: { chartOptionsMap: ChartOptionsMap }) {
	const { isAuthenticated, hasActiveSubscription, isTrial, user, loaders, authorizedFetch } = useAuthContext()
	const [activeTab, setActiveTab] = useState<Tab>('Datasets')
	const [previewDataset, setPreviewDataset] = useState<DatasetDefinition | null>(null)
	const [previewChartDataset, setPreviewChartDataset] = useState<ChartDatasetDefinition | null>(null)
	const [showSubscribeModal, setShowSubscribeModal] = useState(false)
	const [trialConfirmOpen, setTrialConfirmOpen] = useState(false)
	const [trialLimitOpen, setTrialLimitOpen] = useState(false)
	const pendingDatasetRef = useRef<DatasetDefinition | null>(null)
	const pendingChartDatasetRef = useRef<ChartDatasetDefinition | null>(null)

	const csvDownloadCount = typeof user?.flags?.csvDownload === 'number' ? user.flags.csvDownload : 0

	const subscribeModalStore = Ariakit.useDialogStore({
		open: showSubscribeModal,
		setOpen: setShowSubscribeModal
	})

	const handleCardClick = useCallback(
		(dataset: DatasetDefinition) => {
			if (!isAuthenticated || !hasActiveSubscription) {
				setShowSubscribeModal(true)
				return
			}

			if (isTrial) {
				if (csvDownloadCount >= 1) {
					setTrialLimitOpen(true)
					return
				}
				pendingDatasetRef.current = dataset
				setTrialConfirmOpen(true)
				return
			}

			setPreviewDataset(dataset)
		},
		[isAuthenticated, hasActiveSubscription, isTrial, csvDownloadCount]
	)

	const handleChartCardClick = useCallback(
		(dataset: ChartDatasetDefinition) => {
			if (!isAuthenticated || !hasActiveSubscription) {
				setShowSubscribeModal(true)
				return
			}

			if (isTrial) {
				if (csvDownloadCount >= 1) {
					setTrialLimitOpen(true)
					return
				}
				pendingChartDatasetRef.current = dataset
				setTrialConfirmOpen(true)
				return
			}

			setPreviewChartDataset(dataset)
		},
		[isAuthenticated, hasActiveSubscription, isTrial, csvDownloadCount]
	)

	const handleTrialConfirm = useCallback(() => {
		if (pendingDatasetRef.current) {
			setPreviewDataset(pendingDatasetRef.current)
			pendingDatasetRef.current = null
		}
		if (pendingChartDatasetRef.current) {
			setPreviewChartDataset(pendingChartDatasetRef.current)
			pendingChartDatasetRef.current = null
		}
	}, [])

	const isUserLoading = loaders.userLoading

	return (
		<div className="flex flex-col gap-6">
			<div className="flex flex-col gap-1">
				<h1 className="text-2xl font-semibold">Downloads</h1>
				<p className="text-sm text-(--text-secondary)">
					Download CSV datasets from the DefiLlama API. Click a dataset to preview and choose columns.
				</p>
			</div>

			<div className="flex items-center gap-1 rounded-lg border border-(--divider) bg-(--bg-primary) p-1">
				{TABS.map((tab) => (
					<button
						key={tab}
						type="button"
						onClick={() => setActiveTab(tab)}
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

			{activeTab === 'Datasets' ? (
				<div className="flex flex-col gap-8">
					{datasetCategories.map((category) => {
						const categoryDatasets = datasets.filter((d) => d.category === category)
						return (
							<section key={category} className="flex flex-col gap-3">
								<h2 className="text-lg font-semibold text-(--text-primary)">{category}</h2>
								<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
									{categoryDatasets.map((dataset) => {
										const disabled = !!isUserLoading
										return (
											<button
												key={dataset.slug}
												type="button"
												disabled={disabled}
												onClick={() => handleCardClick(dataset)}
												className="group flex cursor-pointer flex-col gap-3 rounded-xl border border-(--form-control-border) bg-(--bg-primary) p-5 text-left transition-all duration-150 hover:border-(--primary)/40 hover:shadow-md active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
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
						)
					})}
				</div>
			) : (
				<div className="flex flex-col gap-8">
					{chartDatasetCategories.map((category) => {
						const categoryDatasets = chartDatasets.filter((d) => d.category === category)
						return (
							<section key={`chart-${category}`} className="flex flex-col gap-3">
								<h2 className="text-lg font-semibold text-(--text-primary)">{category}</h2>
								<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
									{categoryDatasets.map((dataset) => {
										const disabled = !!isUserLoading
										return (
											<button
												key={dataset.slug}
												type="button"
												disabled={disabled}
												onClick={() => handleChartCardClick(dataset)}
												className="group flex cursor-pointer flex-col gap-3 rounded-xl border border-(--form-control-border) bg-(--bg-primary) p-5 text-left transition-all duration-150 hover:border-(--primary)/40 hover:shadow-md active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
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
							</section>
						)
					})}
				</div>
			)}

			{previewChartDataset && (
				<ChartDatasetModal
					dataset={previewChartDataset}
					options={chartOptionsMap[previewChartDataset.slug] ?? []}
					authorizedFetch={authorizedFetch}
					onClose={() => setPreviewChartDataset(null)}
					isTrial={isTrial}
				/>
			)}

			{previewDataset && (
				<DatasetPreviewModal
					dataset={previewDataset}
					authorizedFetch={authorizedFetch}
					onClose={() => setPreviewDataset(null)}
					isTrial={isTrial}
				/>
			)}

			{showSubscribeModal ? (
				<Suspense fallback={null}>
					<SubscribeProModal dialogStore={subscribeModalStore} />
				</Suspense>
			) : null}

			{trialConfirmOpen ? (
				<ConfirmationModal
					isOpen={trialConfirmOpen}
					onClose={() => {
						setTrialConfirmOpen(false)
						pendingDatasetRef.current = null
					}}
					onConfirm={handleTrialConfirm}
					title="Trial CSV download"
					message="Trial accounts get 1 CSV download. Do you want to use it now?"
					confirmText="Continue"
					cancelText="Cancel"
					confirmButtonClass="bg-(--primary) hover:opacity-90 text-white"
				/>
			) : null}

			{trialLimitOpen ? <TrialCsvLimitModal isOpen={trialLimitOpen} onClose={() => setTrialLimitOpen(false)} /> : null}
		</div>
	)
}
