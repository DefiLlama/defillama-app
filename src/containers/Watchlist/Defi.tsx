import { useMemo } from 'react'
import { FolderPlus, Trash2 } from 'react-feather'
import styled from 'styled-components'
import { Header, TYPE } from '~/Theme'
import { Panel, ProtocolsTable } from '~/components'
import Row from '~/components/Row'
import { ProtocolsChainsSearch } from '~/components/Search'
import { columnsToShow } from '~/components/Table'
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

const columns = columnsToShow(
	'protocolName',
	'category',
	'chains',
	'1dChange',
	'7dChange',
	'1mChange',
	'tvl',
	'mcaptvl'
)

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
				<Menu name={selectedPortfolio} options={portfolios} onItemClick={(value) => setSelectedPortfolio(value)} />
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
				<ProtocolsTable data={filteredProtocols} columns={columns} />
			) : (
				<Panel>
					<p style={{ textAlign: 'center' }}>You have not saved any protocols.</p>
				</Panel>
			)}
		</>
	)
}
