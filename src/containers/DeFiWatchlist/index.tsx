import { lazy, Suspense, useMemo, useState } from 'react'
import { useRouter } from 'next/router'
import * as Ariakit from '@ariakit/react'
import { toast } from 'react-hot-toast'
import { DialogForm } from '~/components/DialogForm'
import { Icon } from '~/components/Icon'
import { Menu } from '~/components/Menu'
import { SelectWithCombobox } from '~/components/SelectWithCombobox'
import { ChainsByCategoryTable } from '~/containers/ChainsByCategory/Table'
import { DEFAULT_PORTFOLIO_NAME, useLocalStorageSettingsManager } from '~/contexts/LocalStorage'
import { formatProtocolsList2 } from '~/hooks/data/defi'
import { useBookmarks } from '~/hooks/useBookmarks'
import { useEmailNotifications, type NotificationSettings } from '~/hooks/useEmailNotifications'
import { useIsClient } from '~/hooks/useIsClient'
import { toNumberOrNullFromQueryParam } from '~/utils'
import { mapAPIMetricToUI, mapUIMetricToAPI } from '~/utils/notificationMetrics'
import { ChainProtocolsTable } from '../ChainOverview/Table'
import { IProtocol } from '../ChainOverview/types'
import { useGroupAndFormatChains } from '../ChainsByCategory'
import { useAuthContext } from '../Subscribtion/auth'
import { WatchListTabs } from '../Yields/Watchlist'
import { chainMetrics, protocolMetrics } from './constants'

const SubscribeProModal = lazy(() =>
	import('~/components/SubscribeCards/SubscribeProCard').then((m) => ({ default: m.SubscribeProModal }))
)

export function DefiWatchlistContainer({ protocols, chains }) {
	const [extraTvlsEnabled] = useLocalStorageSettingsManager('tvl')

	const {
		portfolios,
		selectedPortfolio,
		savedProtocols,
		addPortfolio,
		removePortfolio,
		setSelectedPortfolio,
		addProtocol,
		removeProtocol,
		isLoadingWatchlist
	} = useBookmarks('defi')

	const { deletePreferences: deleteNotificationPreferences } = useEmailNotifications(null)

	const {
		savedProtocols: savedChains,
		addProtocol: addChain,
		removeProtocol: removeChain,
		setSelectedPortfolio: setSelectedChainPortfolio
	} = useBookmarks('chains')

	const { protocolOptions, savedProtocolsList, selectedProtocolNames } = useMemo(() => {
		return {
			protocolOptions: (protocols || []).map((c) => ({ key: c.name, name: c.name })),
			savedProtocolsList: protocols.filter(
				(c) => savedProtocols.has(c.name) || c.childProtocols?.some((cp) => savedProtocols.has(cp.name))
			),
			selectedProtocolNames: Array.from(savedProtocols)
		}
	}, [protocols, savedProtocols])

	const router = useRouter()

	const minTvl = toNumberOrNullFromQueryParam(router.query.minTvl)
	const maxTvl = toNumberOrNullFromQueryParam(router.query.maxTvl)

	const protocolsTableData = useMemo(() => {
		return formatProtocolsList2({ protocols: savedProtocolsList, extraTvlsEnabled, minTvl, maxTvl })
	}, [savedProtocolsList, extraTvlsEnabled, minTvl, maxTvl])

	const handleProtocolSelection = (selectedValues: string[]) => {
		const currentSet = new Set(selectedProtocolNames)
		const newSet = new Set(selectedValues)

		const toAdd = selectedValues.filter((name) => !currentSet.has(name))
		const toRemove = selectedProtocolNames.filter((name) => !newSet.has(name))

		toAdd.forEach((name) => addProtocol(name))
		toRemove.forEach((name) => removeProtocol(name))
	}

	const { chainOptions, savedChainsList, selectedChainNames } = useMemo(() => {
		return {
			chainOptions: (chains || []).map((c) => ({ key: c.name, name: c.name })),
			savedChainsList: chains.filter((c) => savedChains.has(c.name)),
			selectedChainNames: Array.from(savedChains)
		}
	}, [chains, savedChains])

	const { chainsTableData } = useGroupAndFormatChains({ chains: savedChainsList, category: 'All', hideGroupBy: true })

	const handleChainSelection = (selectedValues: string[]) => {
		const currentSet = new Set(selectedChainNames)
		const newSet = new Set(selectedValues)
		const toAdd = selectedValues.filter((name) => !currentSet.has(name))
		const toRemove = selectedChainNames.filter((name) => !newSet.has(name))
		toAdd.forEach((name) => addChain(name))
		toRemove.forEach((name) => removeChain(name))
	}

	if (isLoadingWatchlist) {
		return (
			<>
				<WatchListTabs />
				<div className="flex items-center justify-center p-8">
					<div className="text-center">
						<div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-t-2 border-b-2 border-(--text-primary)"></div>
						<p className="text-sm text-(--text-secondary)">Loading watchlist...</p>
					</div>
				</div>
			</>
		)
	}

	return (
		<>
			<WatchListTabs />
			<div className="flex flex-col gap-2">
				<PortfolioSelection
					portfolios={portfolios}
					selectedPortfolio={selectedPortfolio}
					setSelectedPortfolio={(portfolio) => {
						setSelectedPortfolio(portfolio)
						setSelectedChainPortfolio(portfolio)
					}}
					addPortfolio={(name) => {
						addPortfolio(name)
						setSelectedChainPortfolio(name)
					}}
					removePortfolio={(name) => {
						deleteNotificationPreferences({ portfolioName: name })
							.catch(() => {})
							.finally(() => {
								removePortfolio(name)
								setSelectedChainPortfolio(DEFAULT_PORTFOLIO_NAME)
							})
					}}
				/>
				<PortfolioNotifications
					selectedPortfolio={selectedPortfolio}
					filteredProtocols={protocolsTableData as any}
					filteredChains={chainsTableData}
				/>
				{protocolsTableData.length > 0 && <TopMovers protocols={protocolsTableData} />}
				<ProtocolSelection
					protocolOptions={protocolOptions}
					selectedProtocolNames={selectedProtocolNames}
					handleProtocolSelection={handleProtocolSelection}
					selectedPortfolio={selectedPortfolio}
				/>
				<div className="rounded-md border border-(--cards-border) bg-(--cards-bg) p-4">
					<div className="mb-4 flex items-center justify-between">
						<h2 className="text-lg font-medium">Protocols</h2>
						{selectedProtocolNames.length > 0 && (
							<span className="text-sm text-(--text-secondary)">
								{selectedProtocolNames.length} protocol{selectedProtocolNames.length === 1 ? '' : 's'}
							</span>
						)}
					</div>
					{protocolsTableData.length ? (
						<ChainProtocolsTable protocols={protocolsTableData} useStickyHeader={false} borderless />
					) : (
						<div className="p-8 text-center">
							<div className="mx-auto max-w-sm">
								<Icon
									name="bookmark"
									height={48}
									width={48}
									className="mx-auto mb-4 text-(--text-secondary) opacity-50"
								/>
								<p className="mb-2 text-(--text-secondary)">No protocols in this portfolio</p>
								<p className="text-sm text-(--text-secondary) opacity-75">
									Use the protocol selector above to add protocols to your portfolio
								</p>
							</div>
						</div>
					)}
				</div>

				<div className="rounded-md border border-(--cards-border) bg-(--cards-bg)">
					<div className="flex flex-col items-start gap-2 p-2">
						<div>
							<h2 className="mb-1 text-lg font-medium">Manage Chains</h2>
							<p className="text-sm text-(--text-secondary)">
								Select or deselect chains for the "{selectedPortfolio}" portfolio
							</p>
						</div>
						<SelectWithCombobox
							allValues={chainOptions}
							selectedValues={selectedChainNames}
							setSelectedValues={handleChainSelection}
							label={
								selectedChainNames.length > 0
									? `${selectedChainNames.length} chain${selectedChainNames.length === 1 ? '' : 's'} selected`
									: 'Select chains...'
							}
							labelType="regular"
						/>
					</div>
					{chainsTableData.length ? (
						<ChainsByCategoryTable data={chainsTableData} useStickyHeader={false} borderless showByGroup={false} />
					) : (
						<div className="p-8 text-center">
							<div className="mx-auto max-w-sm">
								<Icon name="map" height={48} width={48} className="mx-auto mb-4 text-(--text-secondary) opacity-50" />
								<p className="mb-2 text-(--text-secondary)">No chains in this portfolio</p>
								<p className="text-sm text-(--text-secondary) opacity-75">
									Use the chains selector above to add chains
								</p>
							</div>
						</div>
					)}
				</div>
			</div>
		</>
	)
}

function PortfolioNotifications({
	selectedPortfolio,
	filteredProtocols = [],
	filteredChains = []
}: {
	selectedPortfolio: string
	filteredProtocols?: any[]
	filteredChains?: any[]
}) {
	const dialogStore = Ariakit.useDialogStore()
	const isClient = useIsClient()
	const { loaders, isAuthenticated, hasActiveSubscription } = useAuthContext()
	const {
		preferences,
		isLoading,
		savePreferences,
		isSaving,
		updateStatus,
		isUpdatingStatus,
		deletePreferences,
		isDeleting
	} = useEmailNotifications(selectedPortfolio)
	const subscribeModalStore = Ariakit.useDialogStore()

	const formStore = Ariakit.useFormStore({
		defaultValues: {
			protocolMetrics: [] as string[],
			chainMetrics: [] as string[]
		}
	})

	const handleNotificationsButtonClick = () => {
		if (!isClient || loaders.userLoading) return

		if (filteredProtocols.length === 0 && filteredChains.length === 0) {
			toast.error('Please add protocols or chains to your watchlist first')
			return
		}

		if (!isAuthenticated || !hasActiveSubscription) {
			subscribeModalStore.show()
		} else {
			dialogStore.toggle()

			if (preferences?.settings) {
				// Load protocol metrics
				if (preferences.settings.protocols) {
					const allProtocolEntries = Object.entries(preferences.settings.protocols)
					if (allProtocolEntries.length > 0) {
						const [protocolId, firstMetrics] = allProtocolEntries[0]

						if (Array.isArray(firstMetrics)) {
							const uiMetrics = firstMetrics.map(mapAPIMetricToUI)
							formStore.setValue('protocolMetrics', uiMetrics)
						}
					}
				} else {
					formStore.setValue('protocolMetrics', [])
				}

				// Load chain metrics
				if (preferences.settings.chains) {
					const allChainEntries = Object.entries(preferences.settings.chains)
					if (allChainEntries.length > 0) {
						const [chainName, firstMetrics] = allChainEntries[0]

						if (Array.isArray(firstMetrics)) {
							const uiMetrics = firstMetrics.map(mapAPIMetricToUI)
							formStore.setValue('chainMetrics', uiMetrics)
						}
					}
				} else {
					formStore.setValue('chainMetrics', [])
				}
			} else {
				formStore.setValue('protocolMetrics', [])
				formStore.setValue('chainMetrics', [])
			}
		}
	}

	const handleFormSubmit = async () => {
		try {
			const values = formStore.getState().values
			const { protocolMetrics, chainMetrics } = values

			const settings: NotificationSettings = {}

			if (protocolMetrics?.length > 0 && filteredProtocols.length > 0) {
				settings.protocols = {}
				filteredProtocols.forEach((protocol) => {
					const identifier = protocol.slug
					settings.protocols![identifier] = protocolMetrics.map(mapUIMetricToAPI)
				})
			}

			if (chainMetrics?.length > 0 && filteredChains.length > 0) {
				settings.chains = {}
				filteredChains.forEach((chain) => {
					settings.chains![chain.name] = chainMetrics.map(mapUIMetricToAPI)
				})
			}

			if (!settings.protocols && !settings.chains) {
				toast.error('Unable to save: no valid settings configured')
				return
			}

			await savePreferences({
				portfolioName: selectedPortfolio,
				settings,
				frequency: 'weekly'
			})

			dialogStore.hide()
		} catch (error) {
			console.log('Error saving notification preferences:', error)
			toast.error('Failed to save notification preferences')
		}
	}

	const handleDisableNotifications = async () => {
		updateStatus({ portfolioName: selectedPortfolio, active: false }).then(() => {
			dialogStore.hide()
		})
	}

	const handleDeleteNotifications = async () => {
		deletePreferences({ portfolioName: selectedPortfolio }).then(() => {
			dialogStore.hide()
		})
	}

	return (
		<Ariakit.DialogProvider store={dialogStore}>
			<div className="rounded-md border border-(--cards-border) bg-(--cards-bg) p-4">
				<div className="mb-3">
					<h2 className="mb-1 text-lg font-medium">Email Notifications</h2>
					<p className="text-sm text-(--text-secondary)">
						{preferences ? (
							preferences.active ? (
								<span className="flex items-center gap-2">
									<Icon name="check-circle" height={16} width={16} className="text-green-600" />
									<span>
										Weekly email notifications are <strong className="text-green-600">active</strong> for "
										{selectedPortfolio}" portfolio
									</span>
								</span>
							) : (
								<span className="flex items-center gap-2">
									<Icon name="pause" height={16} width={16} className="text-(--text-secondary)" />
									<span>
										Weekly email notifications are <strong className="text-(--text-secondary)">disabled</strong> for "
										{selectedPortfolio}" portfolio
									</span>
								</span>
							)
						) : (
							<span>Set up weekly email notifications for the "{selectedPortfolio}" portfolio</span>
						)}
					</p>
				</div>

				{preferences?.settings && (
					<div className="mb-3 rounded-md bg-(--bg-glass) p-3">
						<div className="space-y-1 text-xs text-(--text-secondary)">
							{preferences.settings.protocols && Object.keys(preferences.settings.protocols).length > 0 && (
								<div>
									<span className="font-medium">
										Tracking {Object.keys(preferences.settings.protocols).length} protocol(s)
									</span>
									{' - '}
									<span>{Object.values(preferences.settings.protocols)[0]?.map(mapAPIMetricToUI).join(', ')}</span>
								</div>
							)}
							{preferences.settings.chains && Object.keys(preferences.settings.chains).length > 0 && (
								<div>
									<span className="font-medium">
										Tracking {Object.keys(preferences.settings.chains).length} chain(s)
									</span>
									{' - '}
									<span>{Object.values(preferences.settings.chains)[0]?.map(mapAPIMetricToUI).join(', ')}</span>
								</div>
							)}
							<div className="mt-1 text-xs opacity-75">
								<Icon name="calendar" height={12} width={12} className="mr-1 inline" />
								Delivered weekly to your email
							</div>
						</div>
					</div>
				)}

				<div className="flex items-center gap-2">
					<button
						onClick={handleNotificationsButtonClick}
						disabled={loaders.userLoading || isLoading}
						className="flex items-center gap-2 rounded-md border border-(--form-control-border) px-3 py-2 text-sm text-(--text-primary) transition-colors hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) disabled:cursor-not-allowed disabled:opacity-50"
					>
						<Icon name="mail" height={16} width={16} />
						<span>{preferences ? 'Update settings' : 'Set up notifications'}</span>
					</button>

					{preferences && (
						<>
							{preferences.active && (
								<button
									onClick={handleDisableNotifications}
									disabled={loaders.userLoading || isUpdatingStatus}
									className="flex items-center gap-2 rounded-md border border-gray-300 px-3 py-2 text-sm text-(--text-secondary) transition-colors hover:bg-gray-100 focus-visible:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:focus-visible:bg-gray-800"
									title="Temporarily disable notifications"
								>
									<Icon name="pause" height={16} width={16} />
									<span>{isUpdatingStatus ? 'Disabling...' : 'Disable'}</span>
								</button>
							)}
							{!preferences.active && (
								<button
									onClick={() => updateStatus({ portfolioName: selectedPortfolio, active: true })}
									disabled={loaders.userLoading || isUpdatingStatus}
									className="flex items-center gap-2 rounded-md border border-green-200 px-3 py-2 text-sm text-green-600 transition-colors hover:bg-green-50 focus-visible:bg-green-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-green-800 dark:text-green-400 dark:hover:bg-green-900/20 dark:focus-visible:bg-green-900/20"
									title="Re-enable notifications"
								>
									<Icon name="check-circle" height={16} width={16} />
									<span>{isUpdatingStatus ? 'Enabling...' : 'Enable'}</span>
								</button>
							)}
							<button
								onClick={handleDeleteNotifications}
								disabled={loaders.userLoading || isDeleting}
								className="flex items-center gap-2 rounded-md border border-red-200 px-3 py-2 text-sm text-red-600 transition-colors hover:bg-red-50 focus-visible:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20 dark:focus-visible:bg-red-900/20"
								title="Permanently delete notification preferences"
							>
								<Icon name="trash-2" height={16} width={16} />
								<span>{isDeleting ? 'Deleting...' : 'Delete'}</span>
							</button>
						</>
					)}
				</div>
			</div>
			<Suspense fallback={<></>}>
				<SubscribeProModal dialogStore={subscribeModalStore} />
			</Suspense>

			<Ariakit.Dialog
				store={dialogStore}
				className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
			>
				<div className="max-h-[80vh] w-full max-w-2xl overflow-hidden rounded-lg border border-(--cards-border) bg-(--bg-main) shadow-lg">
					<div className="flex items-center justify-between border-b border-(--cards-border) p-6">
						<div>
							<h2 className="text-xl font-semibold text-(--text-primary)">
								Email Notification Settings
								{preferences &&
									(preferences.active ? (
										<span className="ml-2 inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-normal text-green-700 dark:bg-green-900/30 dark:text-green-400">
											<Icon name="check" height={12} width={12} />
											Active
										</span>
									) : (
										<span className="ml-2 inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-normal text-gray-700 dark:bg-gray-900/30 dark:text-gray-400">
											<Icon name="pause" height={12} width={12} />
											Disabled
										</span>
									))}
							</h2>
							<p className="mt-1 text-sm text-(--text-secondary)">
								Configure weekly email alerts for "{selectedPortfolio}" portfolio
							</p>
						</div>
						<Ariakit.DialogDismiss className="rounded-md p-2 transition-colors hover:bg-(--primary-hover)">
							<Icon name="x" height={20} width={20} className="text-(--text-secondary)" />
						</Ariakit.DialogDismiss>
					</div>

					<Ariakit.Form
						store={formStore}
						onSubmit={(e) => {
							e.preventDefault()
							handleFormSubmit()
						}}
						className="max-h-[calc(80vh-180px)] overflow-y-auto"
					>
						<div className="border-b border-(--cards-border) p-6">
							<h3 className="mb-3 text-lg font-medium text-(--text-primary)">Protocol Metrics</h3>
							{filteredProtocols.length > 0 ? (
								<>
									<p className="mb-4 text-sm text-(--text-secondary)">
										Select which metrics you want to receive notifications for your {filteredProtocols.length}{' '}
										watchlisted protocol{filteredProtocols.length === 1 ? '' : 's'}.
									</p>
									<div className="flex max-h-60 flex-wrap gap-3 overflow-y-auto">
										{protocolMetrics.map((metric) => (
											<label key={metric.key} className="flex cursor-pointer items-center gap-2">
												<Ariakit.FormCheckbox
													name="protocolMetrics"
													value={metric.key}
													className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
												/>
												<span className="text-sm font-medium text-(--text-primary)">{metric.name}</span>
											</label>
										))}
									</div>
								</>
							) : (
								<div className="py-8 text-center">
									<Icon
										name="bookmark"
										height={32}
										width={32}
										className="mx-auto mb-3 text-(--text-secondary) opacity-50"
									/>
									<p className="text-sm text-(--text-secondary)">No protocols in your watchlist</p>
									<p className="mt-1 text-xs text-(--text-secondary) opacity-75">
										Add protocols to your watchlist to set up notifications
									</p>
								</div>
							)}
						</div>

						<div className="p-6">
							<h3 className="mb-3 text-lg font-medium text-(--text-primary)">Chain Metrics</h3>
							{filteredChains.length > 0 ? (
								<>
									<p className="mb-4 text-sm text-(--text-secondary)">
										Select which metrics you want to receive notifications for your {filteredChains.length} watchlisted
										chain{filteredChains.length === 1 ? '' : 's'}.
									</p>
									<div className="flex max-h-60 flex-wrap gap-3 overflow-y-auto">
										{chainMetrics.map((metric) => (
											<label key={metric.key} className="flex cursor-pointer items-center gap-2">
												<Ariakit.FormCheckbox
													name="chainMetrics"
													value={metric.key}
													className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
												/>
												<span className="text-sm font-medium text-(--text-primary)">{metric.name}</span>
											</label>
										))}
									</div>
								</>
							) : (
								<div className="py-8 text-center">
									<Icon name="map" height={32} width={32} className="mx-auto mb-3 text-(--text-secondary) opacity-50" />
									<p className="text-sm text-(--text-secondary)">No chains in your watchlist</p>
									<p className="mt-1 text-xs text-(--text-secondary) opacity-75">
										Add chains to your watchlist to set up notifications
									</p>
								</div>
							)}
						</div>

						<div className="flex items-center justify-between border-t border-(--cards-border) bg-(--bg-secondary) p-6">
							<div className="flex items-center gap-3">
								{preferences ? (
									<>
										{preferences.active && (
											<button
												type="button"
												onClick={handleDisableNotifications}
												disabled={isUpdatingStatus}
												className="flex items-center gap-2 rounded-md border border-gray-300 px-3 py-2 text-sm text-(--text-secondary) transition-colors hover:bg-gray-100 focus-visible:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:focus-visible:bg-gray-800"
											>
												<Icon name="pause" height={14} width={14} />
												<span>{isUpdatingStatus ? 'Disabling...' : 'Disable Notifications'}</span>
											</button>
										)}
										<button
											type="button"
											onClick={handleDeleteNotifications}
											disabled={isDeleting}
											className="flex items-center gap-2 rounded-md border border-red-200 px-3 py-2 text-sm text-red-600 transition-colors hover:bg-red-50 focus-visible:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20 dark:focus-visible:bg-red-900/20"
										>
											<Icon name="trash-2" height={14} width={14} />
											<span>{isDeleting ? 'Deleting...' : 'Delete Permanently'}</span>
										</button>
									</>
								) : (
									<div className="text-sm text-(--text-secondary)">
										Configure notification settings for your portfolio
									</div>
								)}
							</div>
							<div className="flex gap-3">
								<Ariakit.DialogDismiss className="rounded-md border border-(--form-control-border) px-4 py-2 text-sm text-(--text-secondary) transition-colors hover:bg-(--primary-hover)">
									Cancel
								</Ariakit.DialogDismiss>
								<Ariakit.FormSubmit
									disabled={isSaving}
									className="rounded-md bg-(--primary-bg) px-4 py-2 text-sm font-medium text-(--primary-text) transition-colors hover:bg-(--primary-hover) disabled:cursor-not-allowed disabled:opacity-50"
								>
									{isSaving ? 'Saving...' : preferences ? 'Update Settings' : 'Enable Notifications'}
								</Ariakit.FormSubmit>
							</div>
						</div>
					</Ariakit.Form>
				</div>
			</Ariakit.Dialog>
		</Ariakit.DialogProvider>
	)
}

type PortfolioSelectionProps = {
	portfolios: string[]
	selectedPortfolio: string
	setSelectedPortfolio: (value: string) => void
	addPortfolio: (name: string) => void
	removePortfolio: (name: string) => void | Promise<void>
}

function PortfolioSelection({
	portfolios,
	selectedPortfolio,
	setSelectedPortfolio,
	addPortfolio,
	removePortfolio
}: PortfolioSelectionProps) {
	const [open, setOpen] = useState(false)
	return (
		<div className="rounded-md border border-(--cards-border) bg-(--cards-bg) p-4">
			<h1 className="mb-4 text-xl font-semibold">Portfolio</h1>
			<div className="flex flex-wrap items-center gap-4">
				<span className="text-sm font-medium text-(--text-primary)">Active portfolio:</span>
				<Menu
					name={selectedPortfolio.length > 100 ? selectedPortfolio.substring(0, 100) + '...' : selectedPortfolio}
					key={`${selectedPortfolio}-${portfolios.length}`}
					options={portfolios}
					onItemClick={(value) => setSelectedPortfolio(value)}
					className="relative flex min-w-[120px] cursor-pointer flex-nowrap items-center justify-between gap-2 rounded-md border border-(--form-control-border) px-3 py-2 text-sm font-medium text-(--text-primary) hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg)"
				/>
				<DialogForm
					title="New Portfolio"
					description="Enter the name of your new portfolio"
					open={open}
					setOpen={setOpen}
					onSubmit={addPortfolio}
				/>
				<button
					onClick={() => setOpen(true)}
					className="flex items-center gap-2 rounded-md border border-(--form-control-border) px-3 py-2 text-sm text-(--text-primary) transition-colors hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg)"
					title="Create new portfolio"
				>
					<Icon name="folder-plus" height={16} width={16} />
					<span>New</span>
				</button>
				{selectedPortfolio !== DEFAULT_PORTFOLIO_NAME && (
					<button
						onClick={() => removePortfolio(selectedPortfolio)}
						className="flex items-center gap-2 rounded-md border border-red-200 px-3 py-2 text-sm text-red-600 transition-colors hover:bg-red-50 focus-visible:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20 dark:focus-visible:bg-red-900/20"
						title="Delete current portfolio"
					>
						<Icon name="trash-2" height={16} width={16} />
						<span>Delete</span>
					</button>
				)}
			</div>
		</div>
	)
}

type TopMoversProps = {
	protocols: IProtocol[]
}

function TopMovers({ protocols }: TopMoversProps) {
	const [showPositiveMoves, setShowPositiveMoves] = useState(true)
	const [showNegativeMoves, setShowNegativeMoves] = useState(true)
	const [selectedChains, setSelectedChains] = useState<string[]>([])

	const availableChains = useMemo(() => {
		const chainSet = new Set<string>()
		protocols.forEach((protocol) => {
			protocol.chains?.forEach((chain) => chainSet.add(chain))
		})
		return Array.from(chainSet).sort()
	}, [protocols])

	const topMovers = useMemo(() => {
		const periods = ['1d', '7d', '1m']
		const movers: Record<string, Array<{ name: string; change: number; chains: string[] }>> = {}

		periods.forEach((period) => {
			const changeKey = `change${period}`
			let candidates = protocols
				.filter((p) => p.tvlChange?.[changeKey] != null && p.tvlChange[changeKey] != null)
				.map((p) => ({
					name: p.name,
					change: p.tvlChange?.[changeKey] as number,
					chains: p.chains || []
				}))

			if (!showPositiveMoves && !showNegativeMoves) {
				candidates = []
			} else if (showPositiveMoves && !showNegativeMoves) {
				candidates = candidates.filter((p) => p.change > 0)
			} else if (!showPositiveMoves && showNegativeMoves) {
				candidates = candidates.filter((p) => p.change < 0)
			}

			if (selectedChains.length > 0) {
				candidates = candidates.filter((p) => p.chains.some((chain) => selectedChains.includes(chain)))
			}

			candidates.sort((a, b) => Math.abs(b.change) - Math.abs(a.change))
			movers[period] = candidates.slice(0, 3)
		})

		return movers
	}, [protocols, showPositiveMoves, showNegativeMoves, selectedChains])

	const chainOptions = useMemo(() => {
		return availableChains.map((chain) => ({
			key: chain,
			name: chain
		}))
	}, [availableChains])

	return (
		<div className="rounded-md border border-(--cards-border) bg-(--cards-bg) p-4">
			<div className="mb-4">
				<h2 className="mb-1 text-lg font-medium">Top Movers</h2>
				<p className="text-sm text-(--text-secondary)">Biggest changes in your portfolio</p>
			</div>

			{/* Filters */}
			<div className="mb-4 flex flex-wrap items-center gap-4">
				<div className="flex items-center gap-2">
					<span className="text-sm font-medium text-(--text-secondary)">Show:</span>
					<label className="flex cursor-pointer items-center gap-2">
						<input
							type="checkbox"
							checked={showPositiveMoves}
							onChange={(e) => setShowPositiveMoves(e.target.checked)}
							className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
						/>
						<span className="text-sm text-green-600">Positive moves</span>
					</label>
					<label className="flex cursor-pointer items-center gap-2">
						<input
							type="checkbox"
							checked={showNegativeMoves}
							onChange={(e) => setShowNegativeMoves(e.target.checked)}
							className="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
						/>
						<span className="text-sm text-red-600">Negative moves</span>
					</label>
				</div>

				{availableChains.length > 0 && (
					<div className="flex items-center gap-2">
						<span className="text-sm font-medium text-(--text-secondary)">Chains:</span>
						<SelectWithCombobox
							allValues={chainOptions}
							selectedValues={selectedChains}
							setSelectedValues={setSelectedChains}
							label={
								selectedChains.length > 0
									? `${selectedChains.length} chain${selectedChains.length === 1 ? '' : 's'}`
									: 'All chains'
							}
							labelType="regular"
						/>
					</div>
				)}
			</div>

			{/* Top Movers Cards */}
			<div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
				{(['1d', '7d', '1m'] as const).map((period) => (
					<div key={period} className="rounded-lg bg-(--bg-glass) p-4">
						<h3 className="mb-3 text-center font-medium text-(--text-primary)">
							{period === '1d' ? '24 Hours' : period === '7d' ? '7 Days' : '30 Days'}
						</h3>

						{topMovers[period].length > 0 ? (
							<div className="space-y-2">
								{topMovers[period].map((mover, index) => (
									<div
										key={mover.name}
										className="flex items-center justify-between rounded bg-(--bg-main) p-2 transition-colors"
									>
										<div className="flex min-w-0 flex-1 items-center gap-2">
											<span className="w-4 shrink-0 text-xs font-medium text-(--text-secondary)">#{index + 1}</span>
											<span className="truncate text-sm font-medium text-(--text-primary)">{mover.name}</span>
										</div>
										<div className="ml-2 flex shrink-0 items-center gap-1">
											<span className={`text-sm font-medium ${mover.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
												{mover.change >= 0 ? '+' : ''}
												{parseFloat(mover.change.toFixed(2))}%
											</span>
											<Icon
												name={mover.change >= 0 ? 'arrow-up' : 'arrow-down'}
												height={16}
												width={16}
												className={`${mover.change >= 0 ? 'text-green-600' : 'text-red-600'} shrink-0`}
											/>
										</div>
									</div>
								))}
							</div>
						) : (
							<div className="py-4 text-center">
								<Icon
									name="bar-chart"
									height={24}
									width={24}
									className="mx-auto mb-2 text-(--text-secondary) opacity-50"
								/>
								<p className="text-sm text-(--text-secondary)">No movers found</p>
							</div>
						)}
					</div>
				))}
			</div>
		</div>
	)
}

function ProtocolSelection({
	protocolOptions,
	selectedProtocolNames,
	handleProtocolSelection,
	selectedPortfolio
}: {
	protocolOptions: Array<{ key: string; name: string }>
	selectedProtocolNames: string[]
	handleProtocolSelection: (selectedValues: string[]) => void
	selectedPortfolio: string
}) {
	return (
		<div className="rounded-md border border-(--cards-border) bg-(--cards-bg) p-4">
			<div className="mb-4">
				<h2 className="mb-1 text-lg font-medium">Protocol Selection</h2>
				<p className="text-sm text-(--text-secondary)">Select protocols to add to "{selectedPortfolio}" portfolio</p>
			</div>
			<SelectWithCombobox
				allValues={protocolOptions}
				selectedValues={selectedProtocolNames}
				setSelectedValues={handleProtocolSelection}
				label={
					selectedProtocolNames.length > 0
						? `${selectedProtocolNames.length} protocol${selectedProtocolNames.length === 1 ? '' : 's'} selected`
						: 'Search and select protocols...'
				}
				labelType="regular"
			/>
		</div>
	)
}
