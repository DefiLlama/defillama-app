import * as Ariakit from '@ariakit/react'
import { useRouter } from 'next/router'
import { lazy, startTransition, Suspense, useMemo, useState } from 'react'
import { toast } from 'react-hot-toast'
import { DialogForm } from '~/components/DialogForm'
import { Icon } from '~/components/Icon'
import { BasicLink } from '~/components/Link'
import { LocalLoader } from '~/components/Loaders'
import { Menu } from '~/components/Menu'
import { SelectWithCombobox } from '~/components/Select/SelectWithCombobox'
import { TokenLogo } from '~/components/TokenLogo'
import { ICONS_CDN } from '~/constants'
import { ChainsByCategoryTable } from '~/containers/ChainsByCategory/Table'
import { DEFAULT_PORTFOLIO_NAME, useLocalStorageSettingsManager } from '~/contexts/LocalStorage'
import { formatProtocolsList2 } from '~/hooks/data/defi'
import { useBookmarks } from '~/hooks/useBookmarks'
import { useEmailNotifications, type NotificationSettings } from '~/hooks/useEmailNotifications'
import { useIsClient } from '~/hooks/useIsClient'
import { renderPercentChange, toNumberOrNullFromQueryParam } from '~/utils'
import { mapAPIMetricToUI, mapUIMetricToAPI } from '~/utils/notificationMetrics'
import { ChainProtocolsTable } from '../ChainOverview/Table'
import type { IProtocol } from '../ChainOverview/types'
import { useGroupAndFormatChains } from '../ChainsByCategory'
import { useAuthContext } from '../Subscribtion/auth'
import { WatchListTabs } from '../Yields/Watchlist'
import { chainMetrics, protocolMetrics } from './constants'

const EMPTY_PROTOCOLS: IProtocol[] = []
const EMPTY_CHAINS: Array<{ name: string }> = []

const SubscribeProModal = lazy(() =>
	import('~/components/SubscribeCards/SubscribeProCard').then((m) => ({ default: m.SubscribeProModal }))
)

export function DefiWatchlistContainer({ protocols, chains }) {
	const [extraTvlsEnabled] = useLocalStorageSettingsManager('tvl')

	const { selectedPortfolio, savedProtocols, addProtocol, removeProtocol, isLoadingWatchlist } = useBookmarks('defi')

	const { savedProtocols: savedChains, addProtocol: addChain, removeProtocol: removeChain } = useBookmarks('chains')

	const { protocolOptions, savedProtocolsList, selectedProtocolNames } = useMemo(() => {
		const resolvedProtocols = protocols ?? EMPTY_PROTOCOLS
		return {
			protocolOptions: resolvedProtocols.map((c) => ({ key: c.name, name: c.name })),
			savedProtocolsList: resolvedProtocols.filter(
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

		for (const name of toAdd) addProtocol(name)
		for (const name of toRemove) removeProtocol(name)
	}

	const { chainOptions, savedChainsList, selectedChainNames } = useMemo(() => {
		const resolvedChains = chains ?? EMPTY_CHAINS
		return {
			chainOptions: resolvedChains.map((c) => ({ key: c.name, name: c.name })),
			savedChainsList: resolvedChains.filter((c) => savedChains.has(c.name)),
			selectedChainNames: Array.from(savedChains)
		}
	}, [chains, savedChains])

	const { chainsTableData } = useGroupAndFormatChains({ chains: savedChainsList, category: 'All', hideGroupBy: true })

	const handleChainSelection = (selectedValues: string[]) => {
		const currentSet = new Set(selectedChainNames)
		const newSet = new Set(selectedValues)
		const toAdd = selectedValues.filter((name) => !currentSet.has(name))
		const toRemove = selectedChainNames.filter((name) => !newSet.has(name))
		for (const name of toAdd) addChain(name)
		for (const name of toRemove) removeChain(name)
	}

	if (isLoadingWatchlist) {
		return (
			<>
				<WatchListTabs />
				<div className="flex flex-1 items-center justify-center rounded-md border border-(--cards-border) bg-(--cards-bg) p-2">
					<LocalLoader />
				</div>
			</>
		)
	}

	return (
		<>
			<WatchListTabs />
			<div className="flex flex-col gap-2">
				<PortfolioSelection />
				<PortfolioNotifications
					selectedPortfolio={selectedPortfolio}
					filteredProtocols={protocolsTableData as any}
					filteredChains={chainsTableData}
				/>
				{protocolsTableData.length > 0 && <TopMovers protocols={protocolsTableData} />}
				<div className="rounded-md border border-(--cards-border) bg-(--cards-bg)">
					<div className="flex flex-wrap items-center gap-2 p-2">
						<div className="mr-auto">
							<h2 className="text-base font-semibold">Protocols</h2>
							<p className="text-xs text-(--text-disabled)">
								Select or deselect protocols for the "{selectedPortfolio}" portfolio
							</p>
						</div>
						<SelectWithCombobox
							allValues={protocolOptions}
							selectedValues={selectedProtocolNames}
							setSelectedValues={handleProtocolSelection}
							label={selectedProtocolNames.length > 0 ? 'Protocols' : 'Add protocols'}
							labelType="smol"
							variant="filter"
							portal
						/>
					</div>
					{protocolsTableData.length ? (
						<ChainProtocolsTable protocols={protocolsTableData} useStickyHeader={false} borderless />
					) : (
						<div className="flex min-h-[360px] flex-col items-center justify-center p-5 text-center">
							<Icon name="bookmark" height={32} width={32} className="mb-3 text-(--text-secondary) opacity-50" />
							<p className="text-sm text-(--text-secondary)">No protocols in your watchlist</p>
							<p className="mt-1 text-xs text-(--text-secondary) opacity-75">Use the selector above to add protocols</p>
						</div>
					)}
				</div>

				<div className="rounded-md border border-(--cards-border) bg-(--cards-bg)">
					<div className="flex flex-wrap items-center gap-2 p-2">
						<div className="mr-auto">
							<h2 className="text-base font-semibold">Chains</h2>
							<p className="text-xs text-(--text-disabled)">
								Select or deselect chains for the "{selectedPortfolio}" portfolio
							</p>
						</div>
						<SelectWithCombobox
							allValues={chainOptions}
							selectedValues={selectedChainNames}
							setSelectedValues={handleChainSelection}
							label={selectedChainNames.length > 0 ? 'Chains' : 'Add chains'}
							labelType="smol"
							variant="filter"
							portal
						/>
					</div>
					{chainsTableData.length ? (
						<ChainsByCategoryTable data={chainsTableData} useStickyHeader={false} borderless showByGroup={false} />
					) : (
						<div className="flex min-h-[360px] flex-col items-center justify-center p-5 text-center">
							<Icon name="map" height={32} width={32} className="mb-3 text-(--text-secondary) opacity-50" />
							<p className="text-sm text-(--text-secondary)">No chains in your watchlist</p>
							<p className="mt-1 text-xs text-(--text-secondary) opacity-75">Use the selector above to add chains</p>
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
	const [shouldRenderModal, setShouldRenderModal] = useState(false)
	const subscribeModalStore = Ariakit.useDialogStore({ open: shouldRenderModal, setOpen: setShouldRenderModal })

	const { protocolsCount, protocolsFirstMetrics, chainsCount, chainsFirstMetrics } = useMemo(() => {
		const protocols = preferences?.settings?.protocols
		const chains = preferences?.settings?.chains
		let protocolsCount = 0
		let protocolsFirstMetrics = ''
		let chainsCount = 0
		let chainsFirstMetrics = ''

		for (const protocolId in protocols ?? {}) {
			protocolsCount++
			if (protocolsCount === 1) {
				protocolsFirstMetrics = protocols[protocolId]?.map(mapAPIMetricToUI).join(', ') ?? ''
			}
		}

		for (const chainId in chains ?? {}) {
			chainsCount++
			if (chainsCount === 1) {
				chainsFirstMetrics = chains[chainId]?.map(mapAPIMetricToUI).join(', ') ?? ''
			}
		}

		return {
			protocolsCount,
			protocolsFirstMetrics,
			chainsCount,
			chainsFirstMetrics
		}
	}, [preferences?.settings?.protocols, preferences?.settings?.chains])

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
						const [_protocolId, firstMetrics] = allProtocolEntries[0]

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
						const [_chainName, firstMetrics] = allChainEntries[0]

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
				for (const protocol of filteredProtocols) {
					const identifier = protocol.slug
					settings.protocols![identifier] = protocolMetrics.map(mapUIMetricToAPI)
				}
			}

			if (chainMetrics?.length > 0 && filteredChains.length > 0) {
				settings.chains = {}
				for (const chain of filteredChains) {
					settings.chains![chain.name] = chainMetrics.map(mapUIMetricToAPI)
				}
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
			<div className="rounded-md border border-(--cards-border) bg-(--cards-bg) p-3">
				<div className="mb-2">
					<h2 className="mb-0.5 text-base font-semibold">Email Notifications</h2>
					<p className="text-xs text-(--text-secondary)">
						{preferences ? (
							preferences.active ? (
								<span className="flex items-center gap-2">
									<Icon name="check-circle" height={14} width={14} className="text-green-600" />
									<span>
										Weekly email notifications are <strong className="text-green-600">active</strong> for "
										{selectedPortfolio}" portfolio
									</span>
								</span>
							) : (
								<span className="flex items-center gap-2">
									<Icon name="pause" height={14} width={14} className="text-(--text-secondary)" />
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
							{protocolsCount > 0 && (
								<div>
									<span className="font-medium">Tracking {protocolsCount} protocol(s)</span>
									{' - '}
									<span>{protocolsFirstMetrics}</span>
								</div>
							)}
							{chainsCount > 0 && (
								<div>
									<span className="font-medium">Tracking {chainsCount} chain(s)</span>
									{' - '}
									<span>{chainsFirstMetrics}</span>
								</div>
							)}
							<div className="mt-1 text-xs opacity-75">
								<Icon name="calendar" height={12} width={12} className="mr-1 inline" />
								Delivered weekly to your email
							</div>
						</div>
					</div>
				)}

				<div className="flex flex-wrap items-center gap-2">
					<button
						onClick={handleNotificationsButtonClick}
						disabled={loaders.userLoading || isLoading}
						className="flex items-center gap-2 rounded-md border border-(--form-control-border) px-2 py-1.5 text-xs text-(--text-primary) hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) disabled:cursor-not-allowed disabled:opacity-50"
					>
						<Icon name="mail" height={14} width={14} />
						<span>{preferences ? 'Update settings' : 'Set up notifications'}</span>
					</button>

					{preferences && (
						<>
							{preferences.active && (
								<button
									onClick={handleDisableNotifications}
									disabled={loaders.userLoading || isUpdatingStatus}
									className="flex items-center gap-2 rounded-md border border-gray-300 px-2 py-1.5 text-xs text-(--text-secondary) hover:bg-gray-100 focus-visible:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:focus-visible:bg-gray-800"
									title="Temporarily disable notifications"
								>
									<Icon name="pause" height={14} width={14} />
									<span>{isUpdatingStatus ? 'Disabling...' : 'Disable'}</span>
								</button>
							)}
							{!preferences.active && (
								<button
									onClick={() => updateStatus({ portfolioName: selectedPortfolio, active: true })}
									disabled={loaders.userLoading || isUpdatingStatus}
									className="flex items-center gap-2 rounded-md border border-green-200 px-2 py-1.5 text-xs text-green-600 hover:bg-green-50 focus-visible:bg-green-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-green-800 dark:text-green-400 dark:hover:bg-green-900/20 dark:focus-visible:bg-green-900/20"
									title="Re-enable notifications"
								>
									<Icon name="check-circle" height={14} width={14} />
									<span>{isUpdatingStatus ? 'Enabling...' : 'Enable'}</span>
								</button>
							)}
							<button
								onClick={handleDeleteNotifications}
								disabled={loaders.userLoading || isDeleting}
								className="flex items-center gap-2 rounded-md border border-red-200 px-2 py-1.5 text-xs text-red-600 hover:bg-red-50 focus-visible:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20 dark:focus-visible:bg-red-900/20"
								title="Permanently delete notification preferences"
							>
								<Icon name="trash-2" height={14} width={14} />
								<span>{isDeleting ? 'Deleting...' : 'Delete'}</span>
							</button>
						</>
					)}
				</div>
			</div>
			{shouldRenderModal ? (
				<Suspense fallback={<></>}>
					<SubscribeProModal dialogStore={subscribeModalStore} />
				</Suspense>
			) : null}

			<Ariakit.Dialog store={dialogStore} className="dialog max-w-2xl gap-0 overflow-hidden p-0" unmountOnHide>
				<div className="flex items-center justify-between border-b border-(--cards-border) p-4">
					<div>
						<h2 className="text-lg font-medium">
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
						<p className="mt-1 text-xs text-(--text-secondary)">
							Configure weekly email alerts for "{selectedPortfolio}" portfolio
						</p>
					</div>
					<Ariakit.DialogDismiss className="-my-2 rounded-lg p-2 text-(--text-tertiary) hover:bg-(--divider) hover:text-(--text-primary)">
						<Icon name="x" height={20} width={20} />
					</Ariakit.DialogDismiss>
				</div>

				<Ariakit.Form
					store={formStore}
					onSubmit={(e) => {
						e.preventDefault()
						handleFormSubmit()
					}}
					className="max-h-[calc(70dvh-140px)] overflow-y-auto"
				>
					<div className="border-b border-(--cards-border) p-4">
						<h3 className="mb-2 text-sm font-semibold">Protocol Metrics</h3>
						{filteredProtocols.length > 0 ? (
							<>
								<p className="mb-3 text-xs text-(--text-secondary)">
									Select which metrics you want to receive notifications for your {filteredProtocols.length} watchlisted
									protocol{filteredProtocols.length === 1 ? '' : 's'}.
								</p>
								<div className="flex max-h-60 flex-wrap gap-3 overflow-y-auto">
									{protocolMetrics.map((metric) => (
										<label key={metric.key} className="flex cursor-pointer items-center gap-2">
											<Ariakit.FormCheckbox
												name="protocolMetrics"
												value={metric.key}
												className="h-4 w-4 rounded border-(--form-control-border)"
											/>
											<span className="text-sm text-(--text-primary)">{metric.name}</span>
										</label>
									))}
								</div>
							</>
						) : (
							<div className="py-6 text-center">
								<Icon
									name="bookmark"
									height={24}
									width={24}
									className="mx-auto mb-2 text-(--text-secondary) opacity-50"
								/>
								<p className="text-xs text-(--text-secondary)">No protocols in your watchlist</p>
								<p className="mt-1 text-xs text-(--text-secondary) opacity-75">
									Add protocols to your watchlist to set up notifications
								</p>
							</div>
						)}
					</div>

					<div className="p-4">
						<h3 className="mb-2 text-sm font-semibold">Chain Metrics</h3>
						{filteredChains.length > 0 ? (
							<>
								<p className="mb-3 text-xs text-(--text-secondary)">
									Select which metrics you want to receive notifications for your {filteredChains.length} watchlisted
									chain{filteredChains.length === 1 ? '' : 's'}.
								</p>
								<div className="flex max-h-60 flex-wrap gap-3 overflow-y-auto">
									{chainMetrics.map((metric) => (
										<label key={metric.key} className="flex cursor-pointer items-center gap-2">
											<Ariakit.FormCheckbox
												name="chainMetrics"
												value={metric.key}
												className="h-4 w-4 rounded border-(--form-control-border)"
											/>
											<span className="text-sm text-(--text-primary)">{metric.name}</span>
										</label>
									))}
								</div>
							</>
						) : (
							<div className="py-6 text-center">
								<Icon name="map" height={24} width={24} className="mx-auto mb-2 text-(--text-secondary) opacity-50" />
								<p className="text-xs text-(--text-secondary)">No chains in your watchlist</p>
								<p className="mt-1 text-xs text-(--text-secondary) opacity-75">
									Add chains to your watchlist to set up notifications
								</p>
							</div>
						)}
					</div>

					<div className="flex flex-wrap items-center justify-between gap-2 border-t border-(--cards-border) p-4">
						<div className="flex items-center gap-2">
							{preferences ? (
								<>
									{preferences.active && (
										<button
											type="button"
											onClick={handleDisableNotifications}
											disabled={isUpdatingStatus}
											className="flex items-center gap-1.5 rounded-md border border-(--form-control-border) px-3 py-1.5 text-xs text-(--text-secondary) hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) disabled:cursor-not-allowed disabled:opacity-50"
										>
											<Icon name="pause" height={14} width={14} />
											<span>{isUpdatingStatus ? 'Disabling...' : 'Disable'}</span>
										</button>
									)}
									<button
										type="button"
										onClick={handleDeleteNotifications}
										disabled={isDeleting}
										className="flex items-center gap-1.5 rounded-md border border-red-200 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 focus-visible:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20 dark:focus-visible:bg-red-900/20"
									>
										<Icon name="trash-2" height={14} width={14} />
										<span>{isDeleting ? 'Deleting...' : 'Delete'}</span>
									</button>
								</>
							) : (
								<div className="text-xs text-(--text-secondary)">
									Configure notification settings for your portfolio
								</div>
							)}
						</div>
						<div className="flex gap-2">
							<Ariakit.DialogDismiss className="rounded-md border border-(--form-control-border) px-3 py-1.5 text-xs text-(--text-secondary) hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg)">
								Cancel
							</Ariakit.DialogDismiss>
							<Ariakit.FormSubmit
								disabled={isSaving}
								className="rounded-md bg-(--link-active-bg) px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
							>
								{isSaving ? 'Saving...' : preferences ? 'Update Settings' : 'Enable Notifications'}
							</Ariakit.FormSubmit>
						</div>
					</div>
				</Ariakit.Form>
			</Ariakit.Dialog>
		</Ariakit.DialogProvider>
	)
}

function PortfolioSelection() {
	const [open, setOpen] = useState(false)

	const { portfolios, selectedPortfolio, addPortfolio, removePortfolio, setSelectedPortfolio } = useBookmarks('defi')
	const { setSelectedPortfolio: setSelectedChainPortfolio } = useBookmarks('chains')
	const { deletePreferences: deleteNotificationPreferences } = useEmailNotifications(null)

	const handleSelectPortfolio = (portfolio: string) => {
		setSelectedPortfolio(portfolio)
		setSelectedChainPortfolio(portfolio)
	}

	const handleAddPortfolio = (name: string) => {
		addPortfolio(name)
		setSelectedChainPortfolio(name)
	}

	const handleRemovePortfolio = () => {
		deleteNotificationPreferences({ portfolioName: selectedPortfolio })
			.catch(() => {})
			.finally(() => {
				removePortfolio(selectedPortfolio)
				setSelectedChainPortfolio(DEFAULT_PORTFOLIO_NAME)
			})
	}

	return (
		<div className="rounded-md border border-(--cards-border) bg-(--cards-bg)">
			<div className="flex flex-wrap items-center gap-2 p-2">
				<h1 className="mr-auto text-base font-semibold">Portfolio</h1>
				<Menu
					name={selectedPortfolio.length > 100 ? selectedPortfolio.substring(0, 100) + '...' : selectedPortfolio}
					key={`${selectedPortfolio}-${portfolios.length}`}
					options={portfolios}
					onItemClick={(value) => handleSelectPortfolio(value)}
					className="relative flex min-w-[100px] cursor-pointer flex-nowrap items-center justify-between gap-2 rounded-md border border-(--form-control-border) px-2 py-1.5 text-xs font-medium text-(--text-form) hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg)"
				/>
				<DialogForm
					title="New Portfolio"
					description="Enter the name of your new portfolio"
					open={open}
					setOpen={setOpen}
					onSubmit={handleAddPortfolio}
				/>
				<button
					onClick={() => setOpen(true)}
					className="flex items-center gap-1 rounded-md border border-(--form-control-border) px-2 py-1.5 text-xs text-(--text-form) hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg)"
					title="Create new portfolio"
				>
					<Icon name="folder-plus" height={14} width={14} />
					<span>New</span>
				</button>
				{selectedPortfolio !== DEFAULT_PORTFOLIO_NAME && (
					<button
						onClick={handleRemovePortfolio}
						className="flex items-center gap-1 rounded-md border border-red-200 px-2 py-1.5 text-xs text-red-600 hover:bg-red-50 focus-visible:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20 dark:focus-visible:bg-red-900/20"
						title="Delete current portfolio"
					>
						<Icon name="trash-2" height={14} width={14} />
						<span>Delete</span>
					</button>
				)}
			</div>
		</div>
	)
}

type TopMoversProps = {
	protocols: Array<IProtocol & { slug?: string }>
}

function TopMovers({ protocols }: TopMoversProps) {
	const [showPositive, setShowPositive] = useState(true)
	const [showNegative, setShowNegative] = useState(true)
	const [selectedChains, setSelectedChains] = useState<string[]>([])
	const selectedChainsSet = useMemo(() => new Set(selectedChains), [selectedChains])

	const availableChains = useMemo(() => {
		const chainSet = new Set<string>()
		for (const protocol of protocols) {
			if (protocol.chains) {
				for (const chain of protocol.chains) chainSet.add(chain)
			}
		}
		return Array.from(chainSet).sort()
	}, [protocols])

	const topMovers = useMemo(() => {
		const periods = ['1d', '7d', '1m']
		const movers: Record<string, Array<{ name: string; slug?: string; change: number; chains: string[] }>> = {}

		for (const period of periods) {
			const changeKey = `change${period}`
			let candidates = protocols
				.filter((p) => p.tvlChange?.[changeKey] != null && p.tvlChange[changeKey] != null)
				.map((p) => ({
					name: p.name,
					slug: p.slug,
					change: p.tvlChange?.[changeKey] as number,
					chains: p.chains || []
				}))

			if (selectedChainsSet.size > 0) {
				candidates = candidates.filter((protocolEntry) => {
					for (const chain of protocolEntry.chains) {
						if (selectedChainsSet.has(chain)) return true
					}
					return false
				})
			}

			if (!showPositive && !showNegative) {
				candidates = []
			} else if (showPositive && !showNegative) {
				candidates = candidates.filter((p) => p.change > 0)
			} else if (!showPositive && showNegative) {
				candidates = candidates.filter((p) => p.change < 0)
			}

			candidates.sort((a, b) => Math.abs(b.change) - Math.abs(a.change))
			movers[period] = candidates.slice(0, 3)
		}

		return movers
	}, [protocols, showPositive, showNegative, selectedChainsSet])

	const chainOptions = useMemo(() => {
		return availableChains.map((chain) => ({
			key: chain,
			name: chain
		}))
	}, [availableChains])

	return (
		<div className="rounded-md border border-(--cards-border) bg-(--cards-bg)">
			<div className="flex flex-wrap items-center gap-2 p-2">
				<h2 className="mr-auto text-base font-semibold">Top Movers</h2>

				<label className="flex cursor-pointer items-center gap-1.5">
					<input
						type="checkbox"
						checked={showPositive}
						onChange={(e) => startTransition(() => setShowPositive(e.target.checked))}
						className="h-3.5 w-3.5 rounded border-(--form-control-border) accent-[#22c55e]"
					/>
					<span className="text-xs font-medium text-(--success)">Positive</span>
				</label>
				<label className="flex cursor-pointer items-center gap-1.5">
					<input
						type="checkbox"
						checked={showNegative}
						onChange={(e) => startTransition(() => setShowNegative(e.target.checked))}
						className="h-3.5 w-3.5 rounded border-(--form-control-border) accent-[#ef4444]"
					/>
					<span className="text-xs font-medium text-(--error)">Negative</span>
				</label>

				{availableChains.length > 0 && (
					<SelectWithCombobox
						allValues={chainOptions}
						selectedValues={selectedChains}
						setSelectedValues={setSelectedChains}
						label={
							selectedChains.length > 0
								? `${selectedChains.length} chain${selectedChains.length === 1 ? '' : 's'}`
								: 'All chains'
						}
						labelType="smol"
						variant="filter"
						portal
					/>
				)}
			</div>

			<div className="grid grid-cols-1 gap-4 p-3 pt-1 sm:grid-cols-3">
				{(['1d', '7d', '1m'] as const).map((period) => (
					<div key={period}>
						<span className="mb-1.5 block text-xs font-medium text-(--text-disabled) uppercase">
							{period === '1d' ? '24 Hours' : period === '7d' ? '7 Days' : '30 Days'}
						</span>

						{topMovers[period].length > 0 ? (
							<div className="flex flex-col">
								{topMovers[period].map((mover) => (
									<div
										key={mover.name}
										className="flex items-center justify-between gap-3 border-b border-(--divider) py-2 last:border-b-0"
									>
										<span className="flex min-w-0 items-center gap-2">
											<TokenLogo
												logo={mover.slug ? `${ICONS_CDN}/protocols/${mover.slug}?w=48&h=48` : undefined}
												size={20}
											/>
											{mover.slug ? (
												<BasicLink
													href={`/protocol/${mover.slug}`}
													className="truncate text-sm font-medium text-(--text-primary) hover:underline"
												>
													{mover.name}
												</BasicLink>
											) : (
												<span className="truncate text-sm font-medium text-(--text-primary)">{mover.name}</span>
											)}
										</span>
										<span
											className={`shrink-0 text-sm font-medium tabular-nums ${
												mover.change > 0
													? 'text-(--success)'
													: mover.change < 0
														? 'text-(--error)'
														: 'text-(--text-secondary)'
											}`}
										>
											{renderPercentChange(mover.change, false, 400, true)}
										</span>
									</div>
								))}
							</div>
						) : (
							<p className="py-3 text-center text-xs text-(--text-disabled)">No movers</p>
						)}
					</div>
				))}
			</div>
		</div>
	)
}
