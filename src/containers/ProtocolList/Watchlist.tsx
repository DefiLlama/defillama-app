import { useMemo } from 'react'
import { Menu } from '~/components/Menu'
import { useIsClient } from '~/hooks'
import { DEFAULT_PORTFOLIO_NAME, useLocalStorageSettingsManager, useWatchlist } from '~/contexts/LocalStorage'
import { formatProtocolsList } from '~/hooks/data/defi'
import { useGetProtocolsList } from '~/api/categories/protocols/client'
import { useGetProtocolsFeesAndRevenueByChain, useGetProtocolsVolumeByChain } from '~/api/categories/chains/client'
import { ProtocolsByChainTable } from '~/components/Table/Defi/Protocols'
import { Icon } from '~/components/Icon'
import { ProtocolsChainsSearch } from '~/components/Search/ProtocolsChains'
import { WatchListTabs } from '../Yields/Watchlist'

interface IFolder {
	isSaved?: boolean
}

export function DefiWatchlistContainer() {
	const [extraTvlsEnabled] = useLocalStorageSettingsManager('tvl')

	const { fullProtocolsList, parentProtocols, isLoading: fetchingProtocolsList } = useGetProtocolsList({ chain: 'All' })
	const { data: chainProtocolsVolumes, isLoading: fetchingProtocolsVolumeByChain } = useGetProtocolsVolumeByChain('All')

	const { data: chainProtocolsFees, isLoading: fetchingProtocolsFeesAndRevenueByChain } =
		useGetProtocolsFeesAndRevenueByChain('All')

	const isClient = useIsClient()

	const { addPortfolio, removePortfolio, savedProtocols, portfolios, selectedPortfolio, setSelectedPortfolio } =
		useWatchlist()

	const savedProtocolsInWatchlist = Object.values(savedProtocols)

	const filteredProtocols = useMemo(() => {
		if (isClient) {
			const protocols = formatProtocolsList({
				extraTvlsEnabled,
				protocols: fullProtocolsList,
				volumeData: chainProtocolsVolumes,
				feesData: chainProtocolsFees,
				parentProtocols: parentProtocols,
				noSubrows: true
			})

			return (protocols as any).filter((p) => savedProtocolsInWatchlist.includes(p.name))
		} else return []
	}, [
		isClient,
		fullProtocolsList,
		savedProtocolsInWatchlist,
		extraTvlsEnabled,
		parentProtocols,
		chainProtocolsVolumes,
		chainProtocolsFees
	])

	return (
		<>
			<ProtocolsChainsSearch />
			<WatchListTabs />
			<div className="bg-[var(--cards-bg)]">
				<h1 className="text-xl font-semibold p-3">Saved Protocols</h1>

				<span className="flex items-center flex-wrap gap-4 p-3">
					<h2>Current portfolio:</h2>
					<Menu
						name={selectedPortfolio.length > 100 ? selectedPortfolio.substring(0, 100) + '...' : selectedPortfolio}
						options={portfolios.map(function (portfolio) {
							return portfolio.length > 100 ? portfolio.substring(0, 100) + '...' : portfolio
						})}
						onItemClick={(value) => setSelectedPortfolio(value)}
						className="flex items-center justify-between gap-2 p-2 text-xs rounded-md cursor-pointer flex-nowrap relative border border-[var(--form-control-border)] text-[#666] dark:text-[#919296] hover:bg-[var(--link-hover-bg)] focus-visible:bg-[var(--link-hover-bg)] font-medium"
					/>
					<button onClick={addPortfolio}>
						<Icon name="folder-plus" height={24} width={24} />
					</button>
					{selectedPortfolio !== DEFAULT_PORTFOLIO_NAME && (
						<button onClick={removePortfolio}>
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
