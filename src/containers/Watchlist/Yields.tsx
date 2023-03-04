import { useMemo } from 'react'
import { FolderPlus, Trash2 } from 'react-feather'
import styled from 'styled-components'
import { Header, TYPE } from '~/Theme'
import { Panel } from '~/components'
import Row from '~/components/Row'
import { Menu } from '~/components/DropdownMenu'
import { YieldsPoolsTable } from '~/components/Table'
import { useIsClient } from '~/hooks'
import { DEFAULT_PORTFOLIO_NAME, useWatchlist } from '~/contexts/LocalStorage'
import OptionToggle from '~/components/OptionToggle'
import { useRouter } from 'next/router'

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
	const { query, pathname, push } = useRouter()
	const { show7dBaseApy, show7dIL, show1dVolume, show7dVolume, showInceptionApy } = query

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
				apyBase7d: t.apyBase7d,
				apyReward: t.apyReward,
				apyNet7d: t.apyNet7d,
				apyMean30d: t.apyMean30d,
				il7d: t.il7d,
				rewardTokensSymbols: t.rewardTokensSymbols,
				rewards: t.rewardTokensNames,
				change1d: t.apyPct1D,
				change7d: t.apyPct7D,
				outlook: t.apy >= 0.005 ? t.predictions.predictedClass : null,
				confidence: t.apy >= 0.005 ? t.predictions.binnedConfidence : null,
				url: t.url,
				category: t.category,
				volumeUsd1d: t.volumeUsd1d,
				volumeUsd7d: t.volumeUsd7d,
				apyBaseInception: t.apyBaseInception
			}))
		} else return []
	}, [isClient, savedProtocolsInWatchlist, protocolsDict])

	return (
		<>
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

				<OptionToggle
					name="Show 7d Base Apy"
					toggle={() => {
						const enabled = show7dBaseApy === 'true'
						push({ pathname, query: { ...query, show7dBaseApy: !enabled } }, undefined, { shallow: true })
					}}
					enabled={query.show7dBaseApy === 'true'}
					style={{ marginLeft: 'auto' }}
				/>

				<OptionToggle
					name="Show 7d IL"
					toggle={() => {
						const enabled = show7dIL === 'true'
						push({ pathname, query: { ...query, show7dIL: !enabled } }, undefined, { shallow: true })
					}}
					enabled={query.show7dIL === 'true'}
				/>
			</Row>

			<OptionToggle
				name="Show 1d Volume"
				toggle={() => {
					const enabled = show1dVolume === 'true'
					push({ pathname, query: { ...query, show1dVolume: !enabled } }, undefined, { shallow: true })
				}}
				enabled={query.show1dVolume === 'true'}
				style={{ marginLeft: 'auto' }}
			/>

			<OptionToggle
				name="Show 7d Volume"
				toggle={() => {
					const enabled = show7dVolume === 'true'
					push({ pathname, query: { ...query, show7dVolume: !enabled } }, undefined, { shallow: true })
				}}
				enabled={query.show7dVolume === 'true'}
				style={{ marginLeft: 'auto' }}
			/>

			<OptionToggle
				name="Show Inception APY"
				toggle={() => {
					const enabled = showInceptionApy === 'true'
					push({ pathname, query: { ...query, showInceptionApy: !enabled } }, undefined, { shallow: true })
				}}
				enabled={query.showInceptionApy === 'true'}
				style={{ marginLeft: 'auto' }}
			/>

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
