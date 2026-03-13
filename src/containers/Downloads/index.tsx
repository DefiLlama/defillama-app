import * as Ariakit from '@ariakit/react'
import { lazy, Suspense, useCallback, useRef, useState } from 'react'
import { Icon } from '~/components/Icon'
import { LoadingSpinner } from '~/components/Loaders'
import { TrialCsvLimitModal } from '~/components/TrialCsvLimitModal'
import { ConfirmationModal } from '~/containers/ProDashboard/components/ConfirmationModal'
import { useAuthContext } from '~/containers/Subscribtion/auth'
import { DatasetPreviewModal } from './DatasetPreviewModal'
import { datasets, datasetCategories, type DatasetDefinition } from './datasets'

const SubscribeProModal = lazy(() =>
	import('~/components/SubscribeCards/SubscribeProCard').then((m) => ({ default: m.SubscribeProModal }))
)

export function DownloadsCatalog() {
	const { isAuthenticated, hasActiveSubscription, isTrial, user, loaders, authorizedFetch } = useAuthContext()
	const [previewDataset, setPreviewDataset] = useState<DatasetDefinition | null>(null)
	const [showSubscribeModal, setShowSubscribeModal] = useState(false)
	const [trialConfirmOpen, setTrialConfirmOpen] = useState(false)
	const [trialLimitOpen, setTrialLimitOpen] = useState(false)
	const pendingDatasetRef = useRef<DatasetDefinition | null>(null)

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

	const handleTrialConfirm = useCallback(() => {
		if (pendingDatasetRef.current) {
			setPreviewDataset(pendingDatasetRef.current)
			pendingDatasetRef.current = null
		}
	}, [])

	const isUserLoading = loaders.userLoading

	return (
		<div className="flex flex-col gap-8">
			<div className="flex flex-col gap-1">
				<h1 className="text-2xl font-semibold">Downloads</h1>
				<p className="text-sm text-(--text-secondary)">
					Download CSV datasets from the DefiLlama API. Click a dataset to preview and choose columns.
				</p>
			</div>

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

			{previewDataset && (
				<DatasetPreviewModal
					dataset={previewDataset}
					authorizedFetch={authorizedFetch}
					onClose={() => setPreviewDataset(null)}
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
