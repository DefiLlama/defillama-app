import { useMemo, useState } from 'react'
import { Menu } from '~/components/Menu'
import { DEFAULT_PORTFOLIO_NAME, useLocalStorageSettingsManager, useWatchlistManager } from '~/contexts/LocalStorage'
import { formatProtocolsList, formatDataWithExtraTvls } from '~/hooks/data/defi'
import { ProtocolsByChainTable } from '~/components/Table/Defi/Protocols'
import { Icon } from '~/components/Icon'
import { WatchListTabs } from '../Yields/Watchlist'
import { SelectWithCombobox } from '~/components/SelectWithCombobox'
import type { IFormattedProtocol } from '~/api/types'
import { ChainsByCategoryTable } from '~/containers/ChainsByCategory/Table'
import * as Ariakit from '@ariakit/react'
import { useIsClient } from '~/hooks'
import { useSubscribe } from '~/hooks/useSubscribe'
import { SubscribeModal } from '~/components/Modal/SubscribeModal'
import { SubscribePlusCard } from '~/components/SubscribeCards/SubscribePlusCard'
import { useRouter } from 'next/router'

export function DefiWatchlistContainer({
	protocolsList,
	parentProtocols,
	protocolsVolumeByChain,
	protocolsFeesAndRevenueByChain,
	chains,
	chainAssets
}) {
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
		portfolios: chainPortfolios,
		selectedPortfolio: chainSelectedPortfolio,
		savedProtocols: savedChains,
		addProtocol: addChain,
		removeProtocol: removeChain
	} = useWatchlistManager('chains')

	const formattedProtocols = useMemo(() => {
		return formatProtocolsList({
			extraTvlsEnabled,
			protocols: protocolsList,
			volumeData: protocolsVolumeByChain,
			feesData: protocolsFeesAndRevenueByChain,
			parentProtocols: parentProtocols,
			noSubrows: true
		})
	}, [protocolsList, parentProtocols, extraTvlsEnabled, protocolsVolumeByChain, protocolsFeesAndRevenueByChain])

	const filteredProtocols = useMemo(() => {
		return formattedProtocols.filter((p) => savedProtocols.has(p.name))
	}, [
		protocolsList,
		savedProtocols,
		extraTvlsEnabled,
		parentProtocols,
		protocolsVolumeByChain,
		protocolsFeesAndRevenueByChain
	])

	const protocolOptions = useMemo(() => {
		return formattedProtocols.map((protocol) => ({
			key: protocol.name,
			name: protocol.name
		}))
	}, [formattedProtocols])

	const selectedProtocolNames = useMemo(() => {
		return Array.from(savedProtocols)
	}, [savedProtocols])

	const handleProtocolSelection = (selectedValues: string[]) => {
		const currentSet = new Set(selectedProtocolNames)
		const newSet = new Set(selectedValues)

		const toAdd = selectedValues.filter((name) => !currentSet.has(name))
		const toRemove = selectedProtocolNames.filter((name) => !newSet.has(name))

		toAdd.forEach((name) => addProtocol(name))
		toRemove.forEach((name) => removeProtocol(name))
	}

	// Chains data
	const formattedChains = useMemo(() => {
		if (!chains) return []
		return formatDataWithExtraTvls({
			data: chains,
			applyLqAndDc: true,
			extraTvlsEnabled,
			chainAssets
		})
	}, [chains, chainAssets, extraTvlsEnabled])

	console.log('chains!!!!', chains)
	console.log('formattedChains', formattedChains)

	const filteredChains = useMemo(() => {
		return formattedChains.filter((c) => savedChains.has(c.name))
	}, [formattedChains, savedChains])

	const chainOptions = useMemo(() => {
		return (formattedChains || []).map((c) => ({ key: c.name, name: c.name }))
	}, [formattedChains])

	const selectedChainNames = useMemo(() => Array.from(savedChains), [savedChains])

	const handleChainSelection = (selectedValues: string[]) => {
		const currentSet = new Set(selectedChainNames)
		const newSet = new Set(selectedValues)
		const toAdd = selectedValues.filter((name) => !currentSet.has(name))
		const toRemove = selectedChainNames.filter((name) => !newSet.has(name))
		toAdd.forEach((name) => addChain(name))
		toRemove.forEach((name) => removeChain(name))
	}

	console.log('chainOptions', chainOptions)

	return (
		<>
			<WatchListTabs />
			<div className="bg-(--cards-bg) border border-(--cards-border) rounded-md">
				<PortfolioSelection
					portfolios={portfolios}
					selectedPortfolio={selectedPortfolio}
					setSelectedPortfolio={setSelectedPortfolio}
					addPortfolio={addPortfolio}
					removePortfolio={removePortfolio}
				/>
				{filteredProtocols.length > 0 && <TopMovers protocols={filteredProtocols} />}
				<PortfolioNotifications
					selectedPortfolio={selectedPortfolio}
					filteredProtocols={filteredProtocols}
					filteredChains={filteredChains}
				/>
				<ProtocolSelection
					protocolOptions={protocolOptions}
					selectedProtocolNames={selectedProtocolNames}
					handleProtocolSelection={handleProtocolSelection}
					selectedPortfolio={selectedPortfolio}
				/>
				<div className="p-4">
					<div className="flex items-center justify-between mb-4">
						{/* <h2 className="text-lg font-medium">
							{selectedPortfolio === DEFAULT_PORTFOLIO_NAME ? 'Watchlist' : `${selectedPortfolio} Portfolio`}
						</h2> */}
						{selectedProtocolNames.length > 0 && (
							<span className="text-sm text-(--text-secondary)">
								{selectedProtocolNames.length} protocol{selectedProtocolNames.length === 1 ? '' : 's'}
							</span>
						)}
					</div>
					{filteredProtocols.length ? (
						<ProtocolsByChainTable data={filteredProtocols} />
					) : (
						<div className="p-8 text-center">
							<div className="max-w-sm mx-auto">
								<Icon
									name="bookmark"
									height={48}
									width={48}
									className="mx-auto mb-4 text-(--text-secondary) opacity-50"
								/>
								<p className="text-(--text-secondary) mb-2">No protocols in this portfolio</p>
								<p className="text-sm text-(--text-secondary) opacity-75">
									Use the protocol selector above to add protocols to your portfolio
								</p>
							</div>
						</div>
					)}
				</div>

				{/* Chains watchlist */}
				<div className="p-4 border-t border-(--cards-border)">
					<div className="mb-3">
						<h2 className="text-lg font-medium mb-1">Manage Chains</h2>
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
				<div className="p-4">
					<div className="flex items-center justify-between mb-4">
						<h2 className="text-lg font-medium">Chains</h2>
						{selectedChainNames.length > 0 && (
							<span className="text-sm text-(--text-secondary)">
								{selectedChainNames.length} chain{selectedChainNames.length === 1 ? '' : 's'}
							</span>
						)}
					</div>
					{filteredChains.length ? (
						<ChainsByCategoryTable data={filteredChains} />
					) : (
						<div className="p-8 text-center">
							<div className="max-w-sm mx-auto">
								<Icon name="map" height={48} width={48} className="mx-auto mb-4 text-(--text-secondary) opacity-50" />
								<p className="text-(--text-secondary) mb-2">No chains in this portfolio</p>
								<p className="text-sm text-(--text-secondary) opacity-75">
									Use the chains selector above to add chains
								</p>
							</div>
						</div>
					)}
					<div className="h-[100px]"></div>
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
	const { subscription, isSubscriptionLoading } = useSubscribe()
	const [showSubscribeModal, setShowSubscribeModal] = useState(false)

	// Notification settings state
	const [frequency, setFrequency] = useState<'daily' | 'weekly'>('weekly')
	const [selectedProtocolMetrics, setSelectedProtocolMetrics] = useState<Set<string>>(new Set())
	const [selectedChainMetrics, setSelectedChainMetrics] = useState<Set<string>>(new Set())

	// Available metrics for protocols and chains
	const protocolMetrics = [
		{ key: 'tvl', name: 'TVL (Total Value Locked)', description: 'Changes in total value locked' },
		{ key: 'fees', name: 'Fees', description: 'Protocol fees generated' },
		{ key: 'revenue', name: 'Revenue', description: 'Protocol revenue changes' },
		{ key: 'volume', name: 'Volume', description: 'Trading volume changes' },
		{ key: 'perp_volume', name: 'Perps Volume', description: 'Perpetual volume changes' },
		{ key: 'mcap', name: 'Market Cap', description: 'Market capitalization changes' },
		{ key: 'price', name: 'Price', description: 'Price changes' },
		{ key: 'fdv', name: 'FDV', description: 'Fully Diluted Valuation' },
		{ key: 'outstanding_fdv', name: 'Outstanding FDV', description: 'Outstanding Fully Diluted Valuation' }

		// { key: 'change_1d', name: '24h Change', description: '24-hour percentage changes' },
		// { key: 'change_7d', name: '7d Change', description: '7-day percentage changes' },
		// { key: 'change_1m', name: '30d Change', description: '30-day percentage changes' },
		// { key: 'users', name: 'Active Users', description: 'Active user count changes' },
		// { key: 'txs', name: 'Transactions', description: 'Transaction count changes' }
	]

	const chainMetrics = [
		{ key: 'tvl', name: 'TVL (Total Value Locked)', description: 'Changes in total value locked' },
		{ key: 'volume', name: 'Volume', description: 'DEX volume changes' },
		{ key: 'perp_volume', name: 'Perps Volume', description: 'Perpetual volume changes' },
		{ key: 'fees', name: 'Fees', description: 'Chain fees generated' },
		{ key: 'revenue', name: 'Revenue', description: 'Chain revenue changes' },
		{ key: 'price', name: 'Price', description: 'Price changes' },
		{ key: 'mcap', name: 'Market Cap', description: 'Market capitalization changes' },
		{ key: 'fdv', name: 'FDV', description: 'Fully Diluted Valuation' },
		{ key: 'inflows', name: 'Inflows', description: 'Inflows' },
		// { key: 'change_1d', name: '24h Change', description: '24-hour TVL percentage changes' },
		// { key: 'change_7d', name: '7d Change', description: '7-day TVL percentage changes' },
		// { key: 'change_1m', name: '30d Change', description: '30-day TVL percentage changes' },
		{ key: 'addresses', name: 'Active Addresses', description: 'Active address count changes' },
		{ key: 'txs', name: 'Transactions', description: 'Transaction count changes' },
		{ key: 'stablecoins', name: 'Stablecoins', description: 'Stablecoin volume changes' },
		{ key: 'bridge_volume', name: 'Bridge Volume', description: 'Cross-chain bridge volume' }
	]

	const handleNotificationsButtonClick = () => {
		if (!isClient) return
		if (subscription?.status !== 'active') {
			setShowSubscribeModal(true)
		} else {
			dialogStore.toggle()
		}
	}

	const handleProtocolMetricToggle = (metricKey: string) => {
		const newSelected = new Set(selectedProtocolMetrics)
		if (newSelected.has(metricKey)) {
			newSelected.delete(metricKey)
		} else {
			newSelected.add(metricKey)
		}
		setSelectedProtocolMetrics(newSelected)
	}

	const handleChainMetricToggle = (metricKey: string) => {
		const newSelected = new Set(selectedChainMetrics)
		if (newSelected.has(metricKey)) {
			newSelected.delete(metricKey)
		} else {
			newSelected.add(metricKey)
		}
		setSelectedChainMetrics(newSelected)
	}

	const handleSaveSettings = () => {
		// TODO: Implement actual saving logic
		console.log('Saving notification settings:', {
			frequency,
			protocolMetrics: Array.from(selectedProtocolMetrics),
			chainMetrics: Array.from(selectedChainMetrics),
			portfolioName: selectedPortfolio
		})
		dialogStore.hide()
	}

	return (
		<Ariakit.DialogProvider store={dialogStore}>
			<div className="p-4 border-b border-(--cards-border)">
				<h2 className="text-lg font-medium mb-1">Notifications</h2>
				<p className="text-sm text-(--text-secondary)">
					Select or deselect protocols for the "{selectedPortfolio}" portfolio
				</p>

				<button
					onClick={handleNotificationsButtonClick}
					className="flex items-center gap-2 py-2 px-3 text-sm rounded-md hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) transition-colors border border-(--form-control-border) text-(--text-primary)"
				>
					<Icon name="eye" height={16} width={16} />
					<span>Set up notifications</span>
				</button>
			</div>
			{isClient && (
				<SubscribeModal isOpen={showSubscribeModal} onClose={() => setShowSubscribeModal(false)}>
					<SubscribePlusCard context="modal" returnUrl={router.asPath} />
				</SubscribeModal>
			)}

			{isClient && (
				<Ariakit.Dialog
					store={dialogStore}
					className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
				>
					<div className="bg-(--bg-main) border border-(--cards-border) rounded-lg shadow-lg max-w-2xl w-full max-h-[80vh] overflow-hidden">
						{/* Header */}
						<div className="flex items-center justify-between p-6 border-b border-(--cards-border)">
							<div>
								<h2 className="text-xl font-semibold text-(--text-primary)">Notification Settings</h2>
								<p className="text-sm text-(--text-secondary) mt-1">
									Configure your alerts for "{selectedPortfolio}" portfolio
								</p>
							</div>
							<Ariakit.DialogDismiss className="p-2 rounded-md hover:bg-(--primary-hover) transition-colors">
								<Icon name="x" height={20} width={20} className="text-(--text-secondary)" />
							</Ariakit.DialogDismiss>
						</div>

						<div className="overflow-y-auto max-h-[calc(80vh-180px)]">
							{/* Frequency Selection */}
							<div className="p-6 border-b border-(--cards-border)">
								<h3 className="text-lg font-medium text-(--text-primary) mb-3">Notification Frequency</h3>
								<div className="flex gap-4">
									<label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg border border-(--form-control-border) hover:bg-(--primary-hover) transition-colors">
										<input
											type="radio"
											name="frequency"
											value="daily"
											checked={frequency === 'daily'}
											onChange={(e) => setFrequency(e.target.value as 'daily' | 'weekly')}
											className="w-4 h-4 text-blue-600 focus:ring-blue-500"
										/>
										<div>
											<div className="text-sm font-medium text-(--text-primary)">Daily</div>
											<div className="text-xs text-(--text-secondary)">Receive updates every day</div>
										</div>
									</label>
									<label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg border border-(--form-control-border) hover:bg-(--primary-hover) transition-colors">
										<input
											type="radio"
											name="frequency"
											value="weekly"
											checked={frequency === 'weekly'}
											onChange={(e) => setFrequency(e.target.value as 'daily' | 'weekly')}
											className="w-4 h-4 text-blue-600 focus:ring-blue-500"
										/>
										<div>
											<div className="text-sm font-medium text-(--text-primary)">Weekly</div>
											<div className="text-xs text-(--text-secondary)">Receive updates every week</div>
										</div>
									</label>
								</div>
							</div>

							{/* Protocol Metrics */}
							<div className="p-6 border-b border-(--cards-border)">
								<h3 className="text-lg font-medium text-(--text-primary) mb-3">Protocol Metrics</h3>
								{filteredProtocols.length > 0 ? (
									<>
										<p className="text-sm text-(--text-secondary) mb-4">
											Select which metrics you want to receive notifications for across your {filteredProtocols.length}{' '}
											watchlisted protocol{filteredProtocols.length === 1 ? '' : 's'}
										</p>
										<div className="grid grid-cols-1 gap-3 max-h-60 overflow-y-auto">
											{protocolMetrics.map((metric) => (
												<label
													key={metric.key}
													className="flex items-center gap-3 p-3 rounded-lg border border-(--form-control-border) hover:bg-(--primary-hover) transition-colors cursor-pointer"
												>
													<input
														type="checkbox"
														checked={selectedProtocolMetrics.has(metric.key)}
														onChange={() => handleProtocolMetricToggle(metric.key)}
														className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
													/>
													<div className="min-w-0 flex-1">
														<div className="text-sm font-medium text-(--text-primary)">{metric.name}</div>
														<div className="text-xs text-(--text-secondary)">{metric.description}</div>
													</div>
												</label>
											))}
										</div>
										<div className="mt-3 flex gap-2">
											<button
												onClick={() => setSelectedProtocolMetrics(new Set(protocolMetrics.map((m) => m.key)))}
												className="text-xs px-3 py-1 rounded-md bg-(--primary-bg) text-(--primary-text) hover:bg-(--primary-hover) transition-colors"
											>
												Select All
											</button>
											<button
												onClick={() => setSelectedProtocolMetrics(new Set())}
												className="text-xs px-3 py-1 rounded-md border border-(--form-control-border) text-(--text-secondary) hover:bg-(--primary-hover) transition-colors"
											>
												Clear All
											</button>
										</div>
									</>
								) : (
									<div className="text-center py-8">
										<Icon
											name="bookmark"
											height={32}
											width={32}
											className="mx-auto mb-3 text-(--text-secondary) opacity-50"
										/>
										<p className="text-sm text-(--text-secondary)">No protocols in your watchlist</p>
										<p className="text-xs text-(--text-secondary) opacity-75 mt-1">
											Add protocols to your watchlist to set up notifications
										</p>
									</div>
								)}
							</div>

							{/* Chain Metrics */}
							<div className="p-6">
								<h3 className="text-lg font-medium text-(--text-primary) mb-3">Chain Metrics</h3>
								{filteredChains.length > 0 ? (
									<>
										<p className="text-sm text-(--text-secondary) mb-4">
											Select which metrics you want to receive notifications for across your {filteredChains.length}{' '}
											watchlisted chain{filteredChains.length === 1 ? '' : 's'}
										</p>
										<div className="grid grid-cols-1 gap-3 max-h-60 overflow-y-auto">
											{chainMetrics.map((metric) => (
												<label
													key={metric.key}
													className="flex items-center gap-3 p-3 rounded-lg border border-(--form-control-border) hover:bg-(--primary-hover) transition-colors cursor-pointer"
												>
													<input
														type="checkbox"
														checked={selectedChainMetrics.has(metric.key)}
														onChange={() => handleChainMetricToggle(metric.key)}
														className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
													/>
													<div className="min-w-0 flex-1">
														<div className="text-sm font-medium text-(--text-primary)">{metric.name}</div>
														<div className="text-xs text-(--text-secondary)">{metric.description}</div>
													</div>
												</label>
											))}
										</div>
										<div className="mt-3 flex gap-2">
											<button
												onClick={() => setSelectedChainMetrics(new Set(chainMetrics.map((m) => m.key)))}
												className="text-xs px-3 py-1 rounded-md bg-(--primary-bg) text-(--primary-text) hover:bg-(--primary-hover) transition-colors"
											>
												Select All
											</button>
											<button
												onClick={() => setSelectedChainMetrics(new Set())}
												className="text-xs px-3 py-1 rounded-md border border-(--form-control-border) text-(--text-secondary) hover:bg-(--primary-hover) transition-colors"
											>
												Clear All
											</button>
										</div>
									</>
								) : (
									<div className="text-center py-8">
										<Icon
											name="map"
											height={32}
											width={32}
											className="mx-auto mb-3 text-(--text-secondary) opacity-50"
										/>
										<p className="text-sm text-(--text-secondary)">No chains in your watchlist</p>
										<p className="text-xs text-(--text-secondary) opacity-75 mt-1">
											Add chains to your watchlist to set up notifications
										</p>
									</div>
								)}
							</div>
						</div>

						{/* Footer */}
						<div className="flex items-center justify-between p-6 border-t border-(--cards-border) bg-(--bg-secondary)">
							<div className="text-sm text-(--text-secondary)">
								{selectedProtocolMetrics.size + selectedChainMetrics.size} metric
								{selectedProtocolMetrics.size + selectedChainMetrics.size === 1 ? '' : 's'} selected
								{(selectedProtocolMetrics.size > 0 || selectedChainMetrics.size > 0) && (
									<span className="ml-2">
										({selectedProtocolMetrics.size} protocol, {selectedChainMetrics.size} chain)
									</span>
								)}
							</div>
							<div className="flex gap-3">
								<Ariakit.DialogDismiss className="px-4 py-2 text-sm rounded-md border border-(--form-control-border) text-(--text-secondary) hover:bg-(--primary-hover) transition-colors">
									Cancel
								</Ariakit.DialogDismiss>
								<button
									onClick={handleSaveSettings}
									className="px-4 py-2 text-sm rounded-md bg-(--primary-bg) text-(--primary-text) hover:bg-(--primary-hover) transition-colors font-medium"
								>
									Save Settings
								</button>
							</div>
						</div>
					</div>
				</Ariakit.Dialog>
			)}
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
	return (
		<div className="p-4 border-b border-(--cards-border)">
			<h1 className="text-xl font-semibold mb-4">Portfolio</h1>
			<div className="flex items-center flex-wrap gap-4">
				<span className="text-sm font-medium text-(--text-primary)">Active portfolio:</span>
				<Menu
					name={selectedPortfolio.length > 100 ? selectedPortfolio.substring(0, 100) + '...' : selectedPortfolio}
					key={`${selectedPortfolio}-${portfolios.length}`}
					options={portfolios}
					onItemClick={(value) => setSelectedPortfolio(value)}
					className="flex items-center justify-between gap-2 py-2 px-3 text-sm rounded-md cursor-pointer flex-nowrap relative border border-(--form-control-border) text-(--text-primary) hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) font-medium min-w-[120px]"
				/>
				<button
					onClick={() => {
						const newPortfolio = prompt('Enter a name for the new portfolio')
						if (newPortfolio) {
							addPortfolio(newPortfolio)
						}
					}}
					className="flex items-center gap-2 py-2 px-3 text-sm rounded-md hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) transition-colors border border-(--form-control-border) text-(--text-primary)"
					title="Create new portfolio"
				>
					<Icon name="folder-plus" height={16} width={16} />
					<span>New</span>
				</button>
				{selectedPortfolio !== DEFAULT_PORTFOLIO_NAME && (
					<button
						onClick={() => removePortfolio(selectedPortfolio)}
						className="flex items-center gap-2 py-2 px-3 text-sm rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 focus-visible:bg-red-50 dark:focus-visible:bg-red-900/20 transition-colors border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400"
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

type ProtocolSelectionProps = {
	protocolOptions: Array<{ key: string; name: string }>
	selectedProtocolNames: string[]
	handleProtocolSelection: (selectedValues: string[]) => void
	selectedPortfolio: string
}

function ProtocolSelection({
	protocolOptions,
	selectedProtocolNames,
	handleProtocolSelection,
	selectedPortfolio
}: ProtocolSelectionProps) {
	return (
		<div className="p-4 border-b border-(--cards-border)">
			<div className="mb-3">
				<h2 className="text-lg font-medium mb-1">Manage Protocols</h2>
				<p className="text-sm text-(--text-secondary)">
					Select or deselect protocols for the "{selectedPortfolio}" portfolio
				</p>
			</div>
			<SelectWithCombobox
				allValues={protocolOptions}
				selectedValues={selectedProtocolNames}
				setSelectedValues={handleProtocolSelection}
				label={
					selectedProtocolNames.length > 0
						? `${selectedProtocolNames.length} protocol${selectedProtocolNames.length === 1 ? '' : 's'} selected`
						: 'Select protocols...'
				}
				labelType="regular"
			/>
		</div>
	)
}

type TopMoversProps = {
	protocols: IFormattedProtocol[]
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
			const changeKey = `change_${period}`
			let candidates = protocols
				.filter((p) => p[changeKey] !== null && p[changeKey] !== undefined)
				.map((p) => ({
					name: p.name,
					change: p[changeKey] as number,
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
		<div className="p-4 border-b border-(--cards-border)">
			<div className="mb-4">
				<h2 className="text-lg font-medium mb-1">Top Movers</h2>
				<p className="text-sm text-(--text-secondary)">Biggest changes in your portfolio</p>
			</div>

			{/* Filters */}
			<div className="flex flex-wrap items-center gap-4 mb-4">
				<div className="flex items-center gap-2">
					<span className="text-sm font-medium text-(--text-secondary)">Show:</span>
					<label className="flex items-center gap-2 cursor-pointer">
						<input
							type="checkbox"
							checked={showPositiveMoves}
							onChange={(e) => setShowPositiveMoves(e.target.checked)}
							className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
						/>
						<span className="text-sm text-green-600">Positive moves</span>
					</label>
					<label className="flex items-center gap-2 cursor-pointer">
						<input
							type="checkbox"
							checked={showNegativeMoves}
							onChange={(e) => setShowNegativeMoves(e.target.checked)}
							className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
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
			<div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
				{(['1d', '7d', '1m'] as const).map((period) => (
					<div key={period} className="bg-(--bg-secondary) rounded-lg p-4">
						<h3 className="font-medium text-(--text-primary) mb-3 text-center">
							{period === '1d' ? '24 Hours' : period === '7d' ? '7 Days' : '30 Days'}
						</h3>

						{topMovers[period].length > 0 ? (
							<div className="space-y-2">
								{topMovers[period].map((mover, index) => (
									<div
										key={mover.name}
										className="flex items-center justify-between p-2 rounded bg-(--bg-main) hover:bg-(--primary-hover) transition-colors"
									>
										<div className="flex items-center gap-2 min-w-0 flex-1">
											<span className="text-xs text-(--text-secondary) font-medium w-4 shrink-0">#{index + 1}</span>
											<span className="text-sm font-medium text-(--text-primary) truncate">{mover.name}</span>
										</div>
										<div className="flex items-center gap-1 shrink-0 ml-2">
											<span className={`text-sm font-medium ${mover.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
												{mover.change >= 0 ? '+' : ''}
												{parseFloat(mover.change.toFixed(2))}%
											</span>
											<Icon
												name={mover.change >= 0 ? 'chevron-up' : 'chevron-down'}
												height={16}
												width={16}
												className={`${mover.change >= 0 ? 'text-green-600' : 'text-red-600'} shrink-0`}
											/>
										</div>
									</div>
								))}
							</div>
						) : (
							<div className="text-center py-4">
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
