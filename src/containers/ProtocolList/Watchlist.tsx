import { useMemo, useState } from 'react'
import { Menu } from '~/components/Menu'
import { DEFAULT_PORTFOLIO_NAME, useLocalStorageSettingsManager, useWatchlistManager } from '~/contexts/LocalStorage'
import { formatProtocolsList } from '~/hooks/data/defi'
import { useGetProtocolsList } from '~/api/categories/protocols/client'
import { useGetProtocolsFeesAndRevenueByChain, useGetProtocolsVolumeByChain } from '~/api/categories/chains/client'
import { ProtocolsByChainTable } from '~/components/Table/Defi/Protocols'
import { Icon } from '~/components/Icon'
import { ProtocolsChainsSearch } from '~/components/Search/ProtocolsChains'
import { WatchListTabs } from '../Yields/Watchlist'
import { SelectWithCombobox } from '~/components/SelectWithCombobox'
import type { IFormattedProtocol } from '~/api/types'

export function DefiWatchlistContainer() {
	const [extraTvlsEnabled] = useLocalStorageSettingsManager('tvl')

	const { fullProtocolsList, parentProtocols, isLoading: fetchingProtocolsList } = useGetProtocolsList({ chain: 'All' })

	const { data: chainProtocolsVolumes, isLoading: fetchingProtocolsVolumeByChain } = useGetProtocolsVolumeByChain('All')

	const { data: chainProtocolsFees, isLoading: fetchingProtocolsFeesAndRevenueByChain } =
		useGetProtocolsFeesAndRevenueByChain('All')

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

	const formattedProtocols = useMemo(() => {
		return formatProtocolsList({
			extraTvlsEnabled,
			protocols: fullProtocolsList,
			volumeData: chainProtocolsVolumes,
			feesData: chainProtocolsFees,
			parentProtocols: parentProtocols,
			noSubrows: true
		})
	}, [fullProtocolsList, parentProtocols, extraTvlsEnabled, chainProtocolsVolumes, chainProtocolsFees])

	const filteredProtocols = useMemo(() => {
		return formattedProtocols.filter((p) => savedProtocols.has(p.name))
	}, [fullProtocolsList, savedProtocols, extraTvlsEnabled, parentProtocols, chainProtocolsVolumes, chainProtocolsFees])

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

	return (
		<>
			<ProtocolsChainsSearch />
			<WatchListTabs />
			<div className="bg-(--cards-bg) border border-(--cards-border) rounded-md">
				<PortfolioSelection
					portfolios={portfolios}
					selectedPortfolio={selectedPortfolio}
					setSelectedPortfolio={setSelectedPortfolio}
					addPortfolio={addPortfolio}
					removePortfolio={removePortfolio}
				/>
				<ProtocolSelection
					protocolOptions={protocolOptions}
					selectedProtocolNames={selectedProtocolNames}
					handleProtocolSelection={handleProtocolSelection}
					selectedPortfolio={selectedPortfolio}
				/>
				{filteredProtocols.length > 0 && <TopMovers protocols={filteredProtocols} />}
				<div className="p-4">
					<div className="flex items-center justify-between mb-4">
						<h2 className="text-lg font-medium">
							{selectedPortfolio === DEFAULT_PORTFOLIO_NAME ? 'Watchlist' : `${selectedPortfolio} Portfolio`}
						</h2>
						{selectedProtocolNames.length > 0 && (
							<span className="text-sm text-(--text2)">
								{selectedProtocolNames.length} protocol{selectedProtocolNames.length === 1 ? '' : 's'}
							</span>
						)}
					</div>
					{fetchingProtocolsList || fetchingProtocolsVolumeByChain || fetchingProtocolsFeesAndRevenueByChain ? (
						<div className="p-8 text-center">
							<div className="inline-flex items-center gap-2 text-(--text2)">
								<div className="animate-spin rounded-full h-4 w-4 border-2 border-(--text2) border-t-transparent"></div>
								<span>Loading protocols...</span>
							</div>
						</div>
					) : filteredProtocols.length ? (
						<ProtocolsByChainTable data={filteredProtocols} />
					) : (
						<div className="p-8 text-center">
							<div className="max-w-sm mx-auto">
								<Icon name="bookmark" height={48} width={48} className="mx-auto mb-4 text-(--text2) opacity-50" />
								<p className="text-(--text2) mb-2">No protocols in this portfolio</p>
								<p className="text-sm text-(--text2) opacity-75">
									Use the protocol selector above to add protocols to your portfolio
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
		<div className="p-4 border-b border-(--cards-border)">
			<h1 className="text-xl font-semibold mb-4">Portfolio</h1>
			<div className="flex items-center flex-wrap gap-4">
				<span className="text-sm font-medium text-(--text1)">Active portfolio:</span>
				<Menu
					name={selectedPortfolio.length > 100 ? selectedPortfolio.substring(0, 100) + '...' : selectedPortfolio}
					key={`${selectedPortfolio}-${portfolios.length}`}
					options={portfolios}
					onItemClick={(value) => setSelectedPortfolio(value)}
					className="flex items-center justify-between gap-2 py-2 px-3 text-sm rounded-md cursor-pointer flex-nowrap relative border border-(--form-control-border) text-(--text1) hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) font-medium min-w-[120px]"
				/>
				<button
					onClick={() => {
						const newPortfolio = prompt('Enter a name for the new portfolio')
						if (newPortfolio) {
							addPortfolio(newPortfolio)
						}
					}}
					className="flex items-center gap-2 py-2 px-3 text-sm rounded-md hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) transition-colors border border-(--form-control-border) text-(--text1)"
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
				<p className="text-sm text-(--text2)">Select or deselect protocols for the "{selectedPortfolio}" portfolio</p>
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
				<p className="text-sm text-(--text2)">Biggest changes in your portfolio</p>
			</div>

			{/* Filters */}
			<div className="flex flex-wrap items-center gap-4 mb-4">
				<div className="flex items-center gap-2">
					<span className="text-sm font-medium text-(--text2)">Show:</span>
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
						<span className="text-sm font-medium text-(--text2)">Chains:</span>
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
					<div key={period} className="bg-(--bg2) rounded-lg p-4">
						<h3 className="font-medium text-(--text1) mb-3 text-center">
							{period === '1d' ? '24 Hours' : period === '7d' ? '7 Days' : '30 Days'}
						</h3>

						{topMovers[period].length > 0 ? (
							<div className="space-y-2">
								{topMovers[period].map((mover, index) => (
									<div
										key={mover.name}
										className="flex items-center justify-between p-2 rounded bg-(--bg1) hover:bg-(--primary1-hover) transition-colors"
									>
										<div className="flex items-center gap-2 min-w-0 flex-1">
											<span className="text-xs text-(--text2) font-medium w-4 shrink-0">#{index + 1}</span>
											<span className="text-sm font-medium text-(--text1) truncate">{mover.name}</span>
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
								<Icon name="bar-chart" height={24} width={24} className="mx-auto mb-2 text-(--text2) opacity-50" />
								<p className="text-sm text-(--text2)">No movers found</p>
							</div>
						)}
					</div>
				))}
			</div>
		</div>
	)
}
