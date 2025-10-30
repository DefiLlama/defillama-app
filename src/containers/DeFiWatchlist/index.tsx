import { useMemo, useState } from 'react'
import { useRouter } from 'next/router'
import { DialogForm } from '~/components/DialogForm'
import { Icon } from '~/components/Icon'
import { Menu } from '~/components/Menu'
import { SelectWithCombobox } from '~/components/SelectWithCombobox'
import { ChainsByCategoryTable } from '~/containers/ChainsByCategory/Table'
import { DEFAULT_PORTFOLIO_NAME, useLocalStorageSettingsManager, useWatchlistManager } from '~/contexts/LocalStorage'
import { formatProtocolsList2 } from '~/hooks/data/defi'
import { ChainProtocolsTable } from '../ChainOverview/Table'
import { IProtocol } from '../ChainOverview/types'
import { useGroupAndFormatChains } from '../ChainsByCategory'
import { WatchListTabs } from '../Yields/Watchlist'

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
				{protocolsTableData.length > 0 && <TopMovers protocols={protocolsTableData} />}

				<div className="rounded-md border border-(--cards-border) bg-(--cards-bg)">
					<div className="flex flex-col items-start gap-2 p-2">
						<div>
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
