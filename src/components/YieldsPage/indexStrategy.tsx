import * as React from 'react'
import { useRouter } from 'next/router'
import styled from 'styled-components'
import { Panel } from '~/components'
import { TableFilters, TableHeader } from '~/components/Table/shared'
import YieldsStrategyTable from '~/components/Table/Yields/Strategy'
import { YieldAttributes, FiltersByChain, YieldProjects } from '~/components/Filters'
import YieldsSearch from '~/components/Search/Yields/Optimizer'
import { filterPool, findStrategyPools, formatOptimizerPool } from './utils'

import { Header } from '~/Theme'
import { useFormatYieldQueryParams } from './hooks'

import { calculateLoopAPY } from '~/api/categories/yield/index'

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

const YieldsStrategyPage = ({ pools, projectList, chainList, categoryList, allPools }) => {
	const { query, pathname } = useRouter()

	const lend = typeof query.lend === 'string' ? query.lend : null
	const borrow = typeof query.borrow === 'string' ? query.borrow : null

	const { selectedChains, selectedAttributes, selectedProjects } = useFormatYieldQueryParams({
		projectList,
		chainList,
		categoryList
	})

	// calc looped lending
	const loopStrategies = calculateLoopAPY(pools)

	const poolsData = React.useMemo(() => {
		let filteredPools = findStrategyPools(pools, lend, borrow, allPools, loopStrategies)
			.filter((pool) => filterPool({ pool, selectedChains, selectedAttributes, selectedProjects }))
			.map(formatOptimizerPool)

		return filteredPools
	}, [pools, borrow, lend, selectedChains, selectedAttributes, selectedProjects, allPools, loopStrategies])

	return (
		<>
			<Header>
				Strategy Finder{' '}
				{lend && !borrow ? (
					<>(Supply: {lend || ''})</>
				) : lend && borrow ? (
					<>
						(Supply: {lend || ''} ➞ Borrow: {borrow || ''})
					</>
				) : null}
			</Header>

			<SearchWrapper>
				<YieldsSearch pathname={pathname} value={lend} key={lend} lend data-alwaysdisplay />
				{lend && <YieldsSearch pathname={pathname} value={borrow} key={borrow} data-alwaysdisplay />}
			</SearchWrapper>

			<TableFilters>
				<TableHeader>Nb of Strategies: {poolsData.length > 0 ? <>{poolsData.length}</> : <>{null}</>}</TableHeader>
				<FiltersByChain chainList={chainList} selectedChains={selectedChains} pathname={pathname} />
				<YieldProjects projectList={projectList} selectedProjects={selectedProjects} pathname={pathname} />
				<YieldAttributes pathname={pathname} />
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
