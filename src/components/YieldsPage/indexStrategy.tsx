import * as React from 'react'
import { useRouter } from 'next/router'
import styled from 'styled-components'
import { Panel } from '~/components'
import { TableFilters, TableHeader } from '~/components/Table/shared'
import YieldsStrategyTable from '~/components/Table/Yields/Strategy'
import {
	YieldAttributes,
	FiltersByChain,
	YieldProjects,
	TVLRange,
	LTV,
	AvailableRange,
	ResetAllYieldFilters
} from '~/components/Filters'
import YieldsSearch from '~/components/Search/Yields/Optimizer'
import { filterPool, findStrategyPools } from './utils'

import { Header } from '~/Theme'
import { useFormatYieldQueryParams } from './hooks'

const SearchWrapper = styled.div`
	display: flex;
	flex-direction: column;
	gap: 8px;
	width: 100%;
	margin-top: 8px;

	& > * {
		gap: 8px;
		flex: 1;
	}

	& > * {
		& > *[data-searchicon='true'] {
			top: 14px;
			right: 16px;
		}
	}

	@media (min-width: ${({ theme }) => theme.bpMed}) {
		flex-direction: row;
	}
`

const YieldsStrategyPage = ({
	pools,
	projectList,
	yieldsList,
	chainList,
	categoryList,
	allPools,
	lendingProtocols,
	farmProtocols
}) => {
	const { query, pathname, isReady } = useRouter()

	const lend = typeof query.lend === 'string' ? query.lend : null
	const borrow = typeof query.borrow === 'string' ? query.borrow : null
	const minTvl = typeof query.minTvl === 'string' ? query.minTvl : null
	const maxTvl = typeof query.maxTvl === 'string' ? query.maxTvl : null
	const minAvailable = typeof query.minAvailable === 'string' ? query.minAvailable : null
	const maxAvailable = typeof query.maxAvailable === 'string' ? query.maxAvailable : null
	const customLTV = typeof query.customLTV === 'string' ? query.customLTV : null

	const { selectedChains, selectedAttributes, selectedLendingProtocols, selectedFarmProtocols } =
		useFormatYieldQueryParams({
			projectList,
			chainList,
			categoryList,
			lendingProtocols,
			farmProtocols
		})

	// prepare cdp pools
	const cdpPools = pools
		.filter((p) => p.category === 'CDP')
		.map((p) => ({ ...p, chains: [p.chain], borrow: { ...p, symbol: p.mintedCoin.toUpperCase() } }))

	// exclude cdp from lending
	const lendingPools = pools.filter((p) => p.category !== 'CDP')
	const poolsData = React.useMemo(() => {
		let filteredPools = findStrategyPools(lendingPools, lend, borrow, allPools, cdpPools, customLTV).filter((pool) =>
			filterPool({
				pool,
				selectedChains,
				selectedAttributes,
				minTvl,
				maxTvl,
				minAvailable,
				maxAvailable,
				selectedLendingProtocols,
				selectedFarmProtocols,
				customLTV
			})
		)

		return filteredPools
	}, [
		lendingPools,
		borrow,
		lend,
		selectedChains,
		selectedAttributes,
		selectedLendingProtocols,
		selectedFarmProtocols,
		allPools,
		cdpPools,
		minTvl,
		maxTvl,
		minAvailable,
		maxAvailable,
		customLTV
	])

	return (
		<>
			<Header>
				Strategy Finder{' '}
				{lend && !borrow ? (
					<>(Supply: {lend || ''})</>
				) : lend && borrow ? (
					<>
						(Supply: {lend || ''} ➞ Borrow: {borrow || ''} ➞ Farm: {borrow || ''})
					</>
				) : null}
			</Header>

			<SearchWrapper>
				<YieldsSearch
					pathname={pathname}
					value={lend}
					key={isReady + 'lend'}
					yieldsList={yieldsList}
					lend
					data-alwaysdisplay
				/>
				{lend && (
					<YieldsSearch
						pathname={pathname}
						value={borrow}
						key={isReady + 'borrow'}
						yieldsList={yieldsList}
						data-alwaysdisplay
					/>
				)}
			</SearchWrapper>

			<TableFilters>
				<TableHeader>Nb of Strategies: {poolsData.length > 0 ? <>{poolsData.length}</> : <>{null}</>}</TableHeader>
				<FiltersByChain chainList={chainList} selectedChains={selectedChains} pathname={pathname} />
				<YieldProjects
					projectList={lendingProtocols}
					selectedProjects={selectedLendingProtocols}
					pathname={pathname}
					label="Lending Protocols"
					query="lendingProtocol"
				/>
				<YieldProjects
					projectList={farmProtocols}
					selectedProjects={selectedFarmProtocols}
					pathname={pathname}
					label="Farm Protocols"
					query="farmProtocol"
				/>
				<YieldAttributes pathname={pathname} />
				<AvailableRange />
				<TVLRange />
				<LTV header={'% of max LTV'} />
				<ResetAllYieldFilters pathname={pathname} />
			</TableFilters>

			{poolsData.length > 0 ? (
				<YieldsStrategyTable data={poolsData} />
			) : (
				<Panel as="p" style={{ margin: 0, textAlign: 'center' }}>
					Given a collateral token this finder will display "lend-borrow-farm" strategies across all our tracked pools.
					<br />
					It calculates the total Strategy APY taking into account the individual apy components at each step.
					<br />
					<br />
					To narrow search results, you can optionally select a token to borrow.
					<br />
					<br />
					To start just select a collateral token above.
				</Panel>
			)}
		</>
	)
}

export default YieldsStrategyPage
