import { useMemo } from 'react'
import { Menu } from '~/components/Menu'
import { DEFAULT_PORTFOLIO_NAME, useLocalStorageSettingsManager, useWatchlistManager } from '~/contexts/LocalStorage'
import { formatProtocolsList } from '~/hooks/data/defi'
import { useGetProtocolsList } from '~/api/categories/protocols/client'
import { useGetProtocolsFeesAndRevenueByChain, useGetProtocolsVolumeByChain } from '~/api/categories/chains/client'
import { ProtocolsByChainTable } from '~/components/Table/Defi/Protocols'
import { Icon } from '~/components/Icon'
import { ProtocolsChainsSearch } from '~/components/Search/ProtocolsChains'
import { WatchListTabs } from '../Yields/Watchlist'

export function DefiWatchlistContainer() {
	const [extraTvlsEnabled] = useLocalStorageSettingsManager('tvl')

	const { fullProtocolsList, parentProtocols, isLoading: fetchingProtocolsList } = useGetProtocolsList({ chain: 'All' })

	const { data: chainProtocolsVolumes, isLoading: fetchingProtocolsVolumeByChain } = useGetProtocolsVolumeByChain('All')

	const { data: chainProtocolsFees, isLoading: fetchingProtocolsFeesAndRevenueByChain } =
		useGetProtocolsFeesAndRevenueByChain('All')

	const { portfolios, selectedPortfolio, savedProtocols, addPortfolio, removePortfolio, setSelectedPortfolio } =
		useWatchlistManager('defi')

	const filteredProtocols = useMemo(() => {
		const protocols = formatProtocolsList({
			extraTvlsEnabled,
			protocols: fullProtocolsList,
			volumeData: chainProtocolsVolumes,
			feesData: chainProtocolsFees,
			parentProtocols: parentProtocols,
			noSubrows: true
		})

		return (protocols as any).filter((p) => savedProtocols.has(p.name))
	}, [fullProtocolsList, savedProtocols, extraTvlsEnabled, parentProtocols, chainProtocolsVolumes, chainProtocolsFees])

	return (
		<>
			<ProtocolsChainsSearch />
			<WatchListTabs />
			<div className="bg-(--cards-bg) rounded-md">
				<h1 className="text-xl font-semibold p-3">Saved Protocols</h1>

				<span className="flex items-center flex-wrap gap-4 p-3">
					<h2>Current portfolio:</h2>
					<Menu
						name={selectedPortfolio.length > 100 ? selectedPortfolio.substring(0, 100) + '...' : selectedPortfolio}
						key={`${selectedPortfolio}-${portfolios.length}`}
						options={portfolios}
						onItemClick={(value) => setSelectedPortfolio(value)}
						className="flex items-center justify-between gap-2 p-2 text-xs rounded-md cursor-pointer flex-nowrap relative border border-(--form-control-border) text-[#666] dark:text-[#919296] hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) font-medium"
					/>
					<button
						onClick={() => {
							const newPortfolio = prompt('Enter a name for the new portfolio')
							if (newPortfolio) {
								addPortfolio(newPortfolio)
							}
						}}
					>
						<Icon name="folder-plus" height={24} width={24} />
					</button>
					{selectedPortfolio !== DEFAULT_PORTFOLIO_NAME && (
						<button onClick={() => removePortfolio(selectedPortfolio)}>
							<Icon name="trash-2" height={24} width={24} />
						</button>
					)}
				</span>

				{fetchingProtocolsList || fetchingProtocolsVolumeByChain || fetchingProtocolsFeesAndRevenueByChain ? (
					<p className="p-3 rounded-md text-center">Fetching protocols...</p>
				) : filteredProtocols.length ? (
					<ProtocolsByChainTable data={filteredProtocols} />
				) : (
					<p className="p-3 rounded-md text-center">You have not saved any protocols.</p>
				)}
			</div>
		</>
	)
}
