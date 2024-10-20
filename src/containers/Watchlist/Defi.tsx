import { useMemo } from 'react'
import { FolderPlus, Trash2 } from 'react-feather'
import styled from 'styled-components'
import { Header, TYPE } from '~/Theme'
import { Panel } from '~/components'
import Row from '~/components/Row'
import { ProtocolsChainsSearch } from '~/components/Search'
import { Menu } from '~/components/DropdownMenu'
import { useIsClient } from '~/hooks'
import { DEFAULT_PORTFOLIO_NAME, useDefiManager, useWatchlist } from '~/contexts/LocalStorage'
import { formatProtocolsList } from '~/hooks/data/defi'
import { useGetProtocolsList } from '~/api/categories/protocols/client'
import { useGetProtocolsFeesAndRevenueByChain, useGetProtocolsVolumeByChain } from '~/api/categories/chains/client'
import { ProtocolsByChainTable } from '~/components/Table/Defi/Protocols'

interface IFolder {
	isSaved?: boolean
}

const Action = styled.button<IFolder>`
	svg {
		fill: ${({ theme: { text1 }, isSaved }) => (isSaved ? text1 : 'none')};

		path,
		line {
			stroke: ${({ theme: { text1 } }) => text1};
		}
	}
`

export function DefiWatchlistContainer() {
	const [extraTvlsEnabled] = useDefiManager()

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
			<ProtocolsChainsSearch step={{ category: 'Home', name: 'Watchlist' }} />

			<Header>Saved Protocols</Header>

			<Row sx={{ gap: '1rem', margin: '12px 0 -20px' }}>
				<TYPE.main>Current portfolio:</TYPE.main>
				<Menu
					name={selectedPortfolio.length > 100 ? selectedPortfolio.substring(0, 100) + '...' : selectedPortfolio}
					options={portfolios.map(function (portfolio) {
						return portfolio.length > 100 ? portfolio.substring(0, 100) + '...' : portfolio
					})}
					onItemClick={(value) => setSelectedPortfolio(value)}
				/>
				<Action onClick={addPortfolio}>
					<FolderPlus />
				</Action>
				{selectedPortfolio !== DEFAULT_PORTFOLIO_NAME && (
					<Action onClick={removePortfolio}>
						<Trash2 />
					</Action>
				)}
			</Row>

			{fetchingProtocolsList || fetchingProtocolsVolumeByChain || fetchingProtocolsFeesAndRevenueByChain ? (
				<Panel>
					<p style={{ textAlign: 'center' }}>Fetching protocols...</p>
				</Panel>
			) : filteredProtocols.length ? (
				<ProtocolsByChainTable data={filteredProtocols} />
			) : (
				<Panel>
					<p style={{ textAlign: 'center' }}>You have not saved any protocols.</p>
				</Panel>
			)}
		</>
	)
}
