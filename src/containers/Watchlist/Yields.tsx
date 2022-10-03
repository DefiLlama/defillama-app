import { useMemo } from 'react'
import { FolderPlus, Trash2 } from 'react-feather'
import styled from 'styled-components'
import { Header, TYPE } from '~/Theme'
import { Panel } from '~/components'
import Row from '~/components/Row'
import { Menu } from '~/components/DropdownMenu'
import { YieldsPoolsTable } from '~/components/Table'
import { YieldsSearch } from '~/components/Search'
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

export function YieldsWatchlistContainer({ protocolsDict }) {
	const isClient = useIsClient()

	const { addPortfolio, removePortfolio, savedProtocols, portfolios, selectedPortfolio, setSelectedPortfolio } =
		useWatchlist()

	const savedProtocolsInWatchlist = Object.values(savedProtocols)

	const filteredProtocols = useMemo(() => {
		if (isClient) {
			const list = protocolsDict.filter((p) => savedProtocolsInWatchlist.includes(p.pool))
			return list.map((t) => ({
				pool: t.symbol,
				configID: t.pool,
				projectslug: t.project,
				project: t.projectName,
				chains: [t.chain],
				tvl: t.tvlUsd,
				apy: t.apy,
				apyBase: t.apyBase,
				apyReward: t.apyReward,
				rewardTokensSymbols: t.rewardTokensSymbols,
				rewards: t.rewardTokensNames,
				change1d: t.apyPct1D,
				change7d: t.apyPct7D,
				outlook: t.apy >= 0.005 ? t.predictions.predictedClass : null,
				confidence: t.apy >= 0.005 ? t.predictions.binnedConfidence : null,
				url: t.url,
				category: t.category
			}))
		} else return []
	}, [isClient, savedProtocolsInWatchlist, protocolsDict])

	return (
		<>
			<YieldsSearch step={{ category: 'Yields', name: 'Watchlist', hideOptions: true }} />

			<Header>Saved Pools</Header>

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
				<YieldsPoolsTable data={filteredProtocols} />
			) : (
				<Panel>
					<p style={{ textAlign: 'center' }}>You have not saved any pools.</p>
				</Panel>
			)}
		</>
	)
}
