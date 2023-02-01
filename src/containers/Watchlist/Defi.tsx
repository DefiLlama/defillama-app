import { useMemo } from 'react'
import { FolderPlus, Trash2 } from 'react-feather'
import styled from 'styled-components'
import { Header, TYPE } from '~/Theme'
import { Panel } from '~/components'
import { ProtocolsTable } from '~/components/Table'
import Row from '~/components/Row'
import { ProtocolsChainsSearch } from '~/components/Search'
import { Menu } from '~/components/DropdownMenu'
import { useIsClient } from '~/hooks'
import { DEFAULT_PORTFOLIO_NAME, useWatchlist } from '~/contexts/LocalStorage'

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

export function DefiWatchlistContainer({ protocolsDict }) {
	const isClient = useIsClient()

	const { addPortfolio, removePortfolio, savedProtocols, portfolios, selectedPortfolio, setSelectedPortfolio } =
		useWatchlist()

	const savedProtocolsInWatchlist = Object.values(savedProtocols)

	const filteredProtocols = useMemo(() => {
		if (isClient) {
			return protocolsDict.filter((p) => savedProtocolsInWatchlist.includes(p.name))
		} else return []
	}, [isClient, protocolsDict, savedProtocolsInWatchlist])

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

			{filteredProtocols.length ? (
				<ProtocolsTable data={filteredProtocols} />
			) : (
				<Panel>
					<p style={{ textAlign: 'center' }}>You have not saved any protocols.</p>
				</Panel>
			)}
		</>
	)
}
