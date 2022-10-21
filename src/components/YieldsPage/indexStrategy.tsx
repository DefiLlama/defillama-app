import * as React from 'react'
import { useRouter } from 'next/router'
import { Panel } from '~/components'
import { TableFilters, TableHeader } from '~/components/Table/shared'
import YieldsSearch from '~/components/Search/Yields/Optimizer'
import { filterPool, findStrategyPools, formatOptimizerPool } from './utils'
import styled from 'styled-components'
import YieldsStrategyTable from '../Table/Yields/Strategy'
import { Header } from '~/Theme'
import { useFormatYieldQueryParams } from './hooks'
import { YieldAttributes, FiltersByChain } from '../Filters'
import { attributeOptions } from '~/components/Filters'
import { calculateLoopAPY } from '~/api/categories/yield/index'

const SearchWrapper = styled.div`
	display: grid;
	grid-template-columns: 1fr 1fr;
	grid-gap: 8px;
	width: 100%;
	margin-top: 8px;
	& > div {
		width: 100%;
		gap: 8px;
	}
`

const YieldsStrategyPage = ({ pools, projectList, chainList, categoryList, allPools }) => {
	const { query, pathname } = useRouter()

	const { lend, borrow } = query
	const { selectedChains, selectedAttributes } = useFormatYieldQueryParams({
		projectList,
		chainList,
		categoryList
	})

	// restrict bororw and farming part (min apy's, noIL, single exposure only)
	pools = pools.filter((p) => p.apy > 0.01 && p.apyBorrow !== 0)
	// ~1500pools
	allPools = allPools.filter((p) => p.ilRisk === 'no' && p.exposure === 'single' && p.apy > 0)

	// uppercase symbols (lend and borrow strings from router are upper case only)
	pools = pools.map((p) => ({ ...p, symbol: p.symbol.toUpperCase() }))
	allPools = allPools.map((p) => ({ ...p, symbol: p.symbol.toUpperCase() }))

	// calc looped lending
	const loopStrategies = calculateLoopAPY(pools)

	const poolsData = React.useMemo(() => {
		let filteredPools = findStrategyPools(pools, lend, borrow, allPools, loopStrategies)
			.filter((pool) => filterPool({ pool, selectedChains }))
			.map(formatOptimizerPool)

		if (selectedAttributes.length > 0) {
			for (const attribute of selectedAttributes) {
				const attributeOption = attributeOptions.find((o) => o.key === attribute)
				filteredPools = filteredPools.filter((p) => attributeOption.filterFn(p))
			}
		}
		return filteredPools
	}, [pools, borrow, lend, selectedChains, selectedAttributes, allPools, loopStrategies])

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
				<YieldsSearch pathname={pathname} lend />
				<YieldsSearch pathname={pathname} />
			</SearchWrapper>

			<TableFilters>
				<TableHeader>Nb of Strategies: {poolsData.length > 0 ? <>{poolsData.length}</> : <>{null}</>}</TableHeader>
				<FiltersByChain chainList={chainList} selectedChains={selectedChains} pathname={pathname} />
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
