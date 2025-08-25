import { useMemo, useState } from 'react'
import { useRouter } from 'next/router'
import * as Ariakit from '@ariakit/react'
import type { IFormattedProtocol } from '~/api/types'
import { Icon } from '~/components/Icon'
import { Menu } from '~/components/Menu'
import { SubscribeModal } from '~/components/Modal/SubscribeModal'
import { SelectWithCombobox } from '~/components/SelectWithCombobox'
import { SubscribePlusCard } from '~/components/SubscribeCards/SubscribePlusCard'
import { ProtocolsByChainTable } from '~/components/Table/Defi/Protocols'
import { ChainsByCategoryTable } from '~/containers/ChainsByCategory/Table'
import { DEFAULT_PORTFOLIO_NAME, useLocalStorageSettingsManager, useWatchlistManager } from '~/contexts/LocalStorage'
import { useIsClient } from '~/hooks'
import { formatDataWithExtraTvls, formatProtocolsList } from '~/hooks/data/defi'
import { useSubscribe } from '~/hooks/useSubscribe'
import { WatchListTabs } from '../Yields/Watchlist'

export function DefiWatchlistContainer({
	protocolsList,
	parentProtocols,
	protocolsVolumeByChain,
	protocolsFeesAndRevenueByChain,
	chains
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

	const formattedChains = useMemo(() => {
		if (!chains) return []
		return formatDataWithExtraTvls({
			data: chains,
			applyLqAndDc: true,
			extraTvlsEnabled,
			chainAssets: null
		})
	}, [chains, extraTvlsEnabled])

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

	return (
		<>
			<WatchListTabs />
			<div className="flex flex-col gap-2">
				<PortfolioSelection
					portfolios={portfolios}
					selectedPortfolio={selectedPortfolio}
					setSelectedPortfolio={setSelectedPortfolio}
					addPortfolio={addPortfolio}
					removePortfolio={removePortfolio}
				/>
				{filteredProtocols.length > 0 && <TopMovers protocols={filteredProtocols} />}

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
					{filteredProtocols.length ? (
						<ProtocolsByChainTable data={filteredProtocols} useStickyHeader={false} />
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

				<div className="rounded-md border border-(--cards-border) bg-(--cards-bg) p-4">
					<div className="mb-3">
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

				<div className="rounded-md border border-(--cards-border) bg-(--cards-bg) p-4">
					<div className="mb-4 flex items-center justify-between">
						<h2 className="text-lg font-medium">Chains</h2>
						{selectedChainNames.length > 0 && (
							<span className="text-sm text-(--text-secondary)">
								{selectedChainNames.length} chain{selectedChainNames.length === 1 ? '' : 's'}
							</span>
						)}
					</div>
					{filteredChains.length ? (
						<ChainsByCategoryTable data={filteredChains} useStickyHeader={false} borderless />
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
				<button
					onClick={() => {
						const newPortfolio = prompt('Enter a name for the new portfolio')
						if (newPortfolio) {
							addPortfolio(newPortfolio)
						}
					}}
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
		<div className="rounded-md border border-(--cards-border) bg-(--cards-bg) p-4">
			<div className="mb-3">
				<h2 className="mb-1 text-lg font-medium">Manage Protocols</h2>
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
					<div key={period} className="rounded-lg bg-(--bg-secondary) p-4">
						<h3 className="mb-3 text-center font-medium text-(--text-primary)">
							{period === '1d' ? '24 Hours' : period === '7d' ? '7 Days' : '30 Days'}
						</h3>

						{topMovers[period].length > 0 ? (
							<div className="space-y-2">
								{topMovers[period].map((mover, index) => (
									<div
										key={mover.name}
										className="flex items-center justify-between rounded bg-(--bg-main) p-2 transition-colors hover:bg-(--primary-hover)"
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
