import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/router'
import { DialogForm } from '~/components/DialogForm'
import { Icon } from '~/components/Icon'
import { Menu } from '~/components/Menu'
import { SelectWithCombobox } from '~/components/SelectWithCombobox'
import { ChainsByCategoryTable } from '~/containers/ChainsByCategory/Table'
import { DEFAULT_PORTFOLIO_NAME, useLocalStorageSettingsManager, useWatchlistManager } from '~/contexts/LocalStorage'
import { useIsClient } from '~/hooks'
import { formatDataWithExtraTvls, formatProtocolsList, formatProtocolsList2 } from '~/hooks/data/defi'
import { useNotifications, type NotificationSettings } from '~/hooks/useNotifications'
import { useSubscribe } from '~/hooks/useSubscribe'
import { formatTimeToHHMM, getUserTimezone, mapAPIMetricToUI, mapUIMetricToAPI } from '~/utils/notificationMetrics'
import { ChainProtocolsTable } from '../ChainOverview/Table'
import { IProtocol } from '../ChainOverview/types'
import { useGroupAndFormatChains } from '../ChainsByCategory'
import { WatchListTabs } from '../Yields/Watchlist'
import { chainMetrics, protocolMetrics } from './constants'

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
		removeProtocol
	} = useWatchlistManager('defi')

	const {
		savedProtocols: savedChains,
		addProtocol: addChain,
		removeProtocol: removeChain,
		setSelectedPortfolio: setSelectedChainPortfolio
	} = useWatchlistManager('chains')

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

	const minTvl =
		typeof router.query.minTvl === 'string' && router.query.minTvl !== '' && !Number.isNaN(Number(router.query.minTvl))
			? +router.query.minTvl
			: null

	const maxTvl =
		typeof router.query.maxTvl === 'string' && router.query.maxTvl !== '' && !Number.isNaN(Number(router.query.maxTvl))
			? +router.query.maxTvl
			: null

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
						removePortfolio(name)
						setSelectedChainPortfolio(DEFAULT_PORTFOLIO_NAME)
					}}
				/>
				<PortfolioNotifications
					selectedPortfolio={selectedPortfolio}
					filteredProtocols={protocolsTableData}
					filteredChains={chainsTableData}
				/>
				{protocolsTableData.length > 0 && <TopMovers protocols={protocolsTableData} />}
				<ProtocolSelection
					protocolOptions={protocolsTableData.map((p) => ({ key: p.name, name: p.name }))}
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
	filteredProtocols?: IFormattedProtocol[]
	filteredChains?: any[]
}) {
	const dialogStore = Ariakit.useDialogStore()
	const isClient = useIsClient()
	const router = useRouter()
	const { subscription } = useSubscribe()
	const { preferences, isLoading, savePreferences, isSaving } = useNotifications()
	const [showSubscribeModal, setShowSubscribeModal] = useState(false)
	const [sendTime, setSendTime] = useState({ hour: 9, minute: 0 })

	// Load existing preferences into form when available
	const formStore = Ariakit.useFormStore({
		defaultValues: {
			frequency: (preferences?.frequency || 'weekly') as 'daily' | 'weekly',
			protocolMetrics: [] as string[],
			chainMetrics: [] as string[],
			sendHour: preferences?.sendTime ? parseInt(preferences.sendTime.split(':')[0]) : 9,
			sendMinute: preferences?.sendTime ? parseInt(preferences.sendTime.split(':')[1]) : 0
		}
	})

	// Update form values when preferences load
	useEffect(() => {
		if (preferences) {
			formStore.setValue('frequency', preferences.frequency)

			// Extract protocol metrics from preferences
			const protocolMetrics: string[] = []
			if (preferences.settings.protocols) {
				// Get all unique metrics from all protocols
				const allMetrics = new Set<string>()
				Object.values(preferences.settings.protocols).forEach((metrics) => {
					metrics.forEach((metric) => {
						allMetrics.add(mapAPIMetricToUI(metric))
					})
				})
				protocolMetrics.push(...Array.from(allMetrics))
			}
			formStore.setValue('protocolMetrics', protocolMetrics)

			// Extract chain metrics from preferences
			const chainMetrics: string[] = []
			if (preferences.settings.chains) {
				const allMetrics = new Set<string>()
				Object.values(preferences.settings.chains).forEach((metrics) => {
					metrics.forEach((metric) => {
						allMetrics.add(mapAPIMetricToUI(metric))
					})
				})
				chainMetrics.push(...Array.from(allMetrics))
			}
			formStore.setValue('chainMetrics', chainMetrics)

			// Set send time
			if (preferences.sendTime) {
				const [hour, minute] = preferences.sendTime.split(':').map(Number)
				setSendTime({ hour, minute })
				formStore.setValue('sendHour', hour)
				formStore.setValue('sendMinute', minute)
			}
		}
	}, [preferences])

	const handleNotificationsButtonClick = () => {
		if (!isClient) return
		if (subscription?.status !== 'active') {
			setShowSubscribeModal(true)
		} else {
			dialogStore.toggle()
		}
	}

	const handleFormSubmit = async (state: any) => {
		try {
			const { frequency, protocolMetrics, chainMetrics, sendHour, sendMinute } = state.values

			// Build notification settings based on selected watchlist items
			const settings: NotificationSettings = {}

			// Add protocols to settings if metrics are selected
			if (protocolMetrics?.length > 0 && filteredProtocols.length > 0) {
				settings.protocols = {}
				filteredProtocols.forEach((protocol) => {
					// Use defillamaId as the slug, or fallback to converting name to slug
					const slug =
						typeof protocol.defillamaId === 'string'
							? protocol.defillamaId
							: protocol.name.toLowerCase().replace(/\s+/g, '-')
					settings.protocols![slug] = protocolMetrics.map(mapUIMetricToAPI)
				})
			}

			// Add chains to settings if metrics are selected
			if (chainMetrics?.length > 0 && filteredChains.length > 0) {
				settings.chains = {}
				filteredChains.forEach((chain) => {
					settings.chains![chain.name] = chainMetrics.map(mapUIMetricToAPI)
				})
			}

			// Validate that at least one entity has metrics
			if (!settings.protocols && !settings.chains) {
				alert('Please select at least one metric for protocols or chains')
				return
			}

			// Save preferences
			await savePreferences({
				settings,
				frequency: frequency as 'daily' | 'weekly',
				sendTime: formatTimeToHHMM(sendHour ?? 9, sendMinute ?? 0),
				timezone: getUserTimezone()
			})

			// Close dialog on success
			dialogStore.hide()
		} catch (error) {
			console.error('Error saving notification preferences:', error)
		}
	}

	formStore.useSubmit(handleFormSubmit)

	return (
		<Ariakit.DialogProvider store={dialogStore}>
			<div className="rounded-md border border-(--cards-border) bg-(--cards-bg) p-4">
				<h2 className="mb-1 text-lg font-medium">Notifications</h2>
				<p className="mb-3 text-sm text-(--text-secondary)">
					Set up notifications for the "{selectedPortfolio}" portfolio
				</p>

				<div className="flex items-center gap-3">
					<button
						onClick={handleNotificationsButtonClick}
						disabled={isLoading}
						className="flex items-center gap-2 rounded-md border border-(--form-control-border) px-3 py-2 text-sm text-(--text-primary) transition-colors hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) disabled:cursor-not-allowed disabled:opacity-50"
					>
						<Icon name="bell" height={16} width={16} />
						<span>{preferences ? 'Update notifications' : 'Set up notifications'}</span>
					</button>
					{preferences && preferences.active && (
						<span className="flex items-center gap-1 text-xs text-green-600">
							<Icon name="check-circle" height={14} width={14} />
							<span>Active</span>
						</span>
					)}
				</div>
			</div>
			{isClient && (
				<SubscribeModal isOpen={showSubscribeModal} onClose={() => setShowSubscribeModal(false)}>
					<SubscribePlusCard context="modal" returnUrl={router.asPath} />
				</SubscribeModal>
			)}

			<Ariakit.Dialog
				store={dialogStore}
				className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
			>
				<div className="max-h-[80vh] w-full max-w-2xl overflow-hidden rounded-lg border border-(--cards-border) bg-(--bg-main) shadow-lg">
					<div className="flex items-center justify-between border-b border-(--cards-border) p-6">
						<div>
							<h2 className="text-xl font-semibold text-(--text-primary)">Notification Settings</h2>
							<p className="mt-1 text-sm text-(--text-secondary)">
								Configure your alerts for "{selectedPortfolio}" portfolio
							</p>
						</div>
						<Ariakit.DialogDismiss className="rounded-md p-2 transition-colors hover:bg-(--primary-hover)">
							<Icon name="x" height={20} width={20} className="text-(--text-secondary)" />
						</Ariakit.DialogDismiss>
					</div>

					<Ariakit.Form
						store={formStore}
						onSubmit={handleFormSubmit}
						className="max-h-[calc(80vh-180px)] overflow-y-auto"
					>
						<div className="border-b border-(--cards-border) p-6">
							<h3 className="mb-3 text-lg font-medium text-(--text-primary)">Notification Frequency</h3>
							<div className="mb-4 flex gap-4">
								<label className="flex cursor-pointer items-center gap-3 rounded-lg border border-(--form-control-border) p-3 transition-colors hover:bg-(--primary-hover)">
									<Ariakit.FormRadio
										name="frequency"
										value="daily"
										className="h-4 w-4 text-blue-600 focus:ring-blue-500"
									/>
									<div>
										<div className="text-sm font-medium text-(--text-primary)">Daily</div>
										<div className="text-xs text-(--text-secondary)">Receive updates every day</div>
									</div>
								</label>
								<label className="flex cursor-pointer items-center gap-3 rounded-lg border border-(--form-control-border) p-3 transition-colors hover:bg-(--primary-hover)">
									<Ariakit.FormRadio
										name="frequency"
										value="weekly"
										className="h-4 w-4 text-blue-600 focus:ring-blue-500"
									/>
									<div>
										<div className="text-sm font-medium text-(--text-primary)">Weekly</div>
										<div className="text-xs text-(--text-secondary)">Receive updates every week</div>
									</div>
								</label>
							</div>

							<div className="mt-4">
								<h4 className="mb-2 text-sm font-medium text-(--text-primary)">Send Time</h4>
								<div className="flex items-center gap-3">
									<div className="flex items-center gap-2">
										<label className="text-sm text-(--text-secondary)">Hour:</label>
										<Ariakit.FormInput
											name="sendHour"
											type="number"
											min="0"
											max="23"
											className="w-20 rounded-md border border-(--form-control-border) bg-(--bg-main) px-3 py-2 text-sm text-(--text-primary)"
											onChange={(e) => setSendTime({ ...sendTime, hour: parseInt(e.target.value) || 0 })}
										/>
									</div>
									<div className="flex items-center gap-2">
										<label className="text-sm text-(--text-secondary)">Minute:</label>
										<Ariakit.FormInput
											name="sendMinute"
											type="number"
											min="0"
											max="59"
											className="w-20 rounded-md border border-(--form-control-border) bg-(--bg-main) px-3 py-2 text-sm text-(--text-primary)"
											onChange={(e) => setSendTime({ ...sendTime, minute: parseInt(e.target.value) || 0 })}
										/>
									</div>
									<span className="text-xs text-(--text-secondary)">
										({formatTimeToHHMM(sendTime.hour, sendTime.minute)} in your timezone)
									</span>
								</div>
							</div>
						</div>

						<div className="border-b border-(--cards-border) p-6">
							<h3 className="mb-3 text-lg font-medium text-(--text-primary)">Protocol Metrics</h3>
							{filteredProtocols.length > 0 ? (
								<>
									<p className="mb-4 text-sm text-(--text-secondary)">
										Select which metrics you want to receive notifications for across your {filteredProtocols.length}{' '}
										watchlisted protocol{filteredProtocols.length === 1 ? '' : 's'}
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
										Select which metrics you want to receive notifications for across your {filteredChains.length}{' '}
										watchlisted chain{filteredChains.length === 1 ? '' : 's'}
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
							<div className="text-sm text-(--text-secondary)">Configure notification settings for your portfolio</div>
							<div className="flex gap-3">
								<Ariakit.DialogDismiss className="rounded-md border border-(--form-control-border) px-4 py-2 text-sm text-(--text-secondary) transition-colors hover:bg-(--primary-hover)">
									Cancel
								</Ariakit.DialogDismiss>
								<Ariakit.FormSubmit
									disabled={isSaving}
									className="rounded-md bg-(--primary-bg) px-4 py-2 text-sm font-medium text-(--primary-text) transition-colors hover:bg-(--primary-hover) disabled:cursor-not-allowed disabled:opacity-50"
								>
									{isSaving ? 'Saving...' : 'Save Settings'}
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
	removePortfolio: (name: string) => void
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
