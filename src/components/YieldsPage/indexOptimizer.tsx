import * as React from 'react'
import { useRouter } from 'next/router'
import { Panel } from '~/components'
import { TableFilters, TableHeader } from '~/components/Table/shared'
import YieldsSearch from '~/components/Search/Yields/Optimizer'
import { filterPool, findOptimizerPools, formatOptimizerPool } from './utils'
import styled from 'styled-components'
import YieldsOptimizerTable from '../Table/Yields/Optimizer'
import { Header } from '~/Theme'
import { useFormatYieldQueryParams } from './hooks'
import { YieldAttributes, FiltersByChain } from '../Filters'
import { attributeOptions } from '~/components/Filters'

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

const YieldsOptimizerPage = ({ pools, projectList, yieldsList, chainList, categoryList }) => {
	const { query, pathname } = useRouter()

	const { lend, borrow } = query
	const { selectedChains, selectedAttributes } = useFormatYieldQueryParams({ projectList, chainList, categoryList })

	// get cdp collateral -> debt token route
	const cdpRoutes = pools
		.filter((p) => p.category === 'CDP')
		.map((p) => ({ ...p, chains: [p.chain], borrow: { ...p, symbol: p.mintedCoin } }))

	const poolsData = React.useMemo(() => {
		let filteredPools = findOptimizerPools(pools, lend, borrow)
			.concat(cdpRoutes)
			.filter((pool) => filterPool({ pool, selectedChains }))
			.map(formatOptimizerPool)

		if (selectedAttributes.length > 0) {
			const attributeOption = attributeOptions.find((o) => o.key === selectedAttributes[0])
			filteredPools = filteredPools.filter((p) => attributeOption.filterFn(p))
		}
		return filteredPools
	}, [pools, borrow, lend, selectedChains, selectedAttributes, cdpRoutes])

	return (
		<>
			<Header>
				Lending Optimizer Calculator{' '}
				{lend && borrow ? (
					<>
						(Supply: {lend || ''} ➞ Borrow: {borrow || ''})
					</>
				) : null}
			</Header>
			<SearchWrapper>
				<YieldsSearch pathname={pathname} lend yieldsList={yieldsList} />
				<YieldsSearch pathname={pathname} yieldsList={yieldsList} />
			</SearchWrapper>

			<TableFilters>
				<TableHeader>Lending Optimizer</TableHeader>
				<FiltersByChain chainList={chainList} selectedChains={selectedChains} pathname={pathname} />
				<YieldAttributes pathname={pathname} />
			</TableFilters>

			{poolsData.length > 0 ? (
				<YieldsOptimizerTable data={poolsData} />
			) : (
				<Panel as="p" style={{ margin: 0, textAlign: 'center' }}>
					Given a token to use for collateral and a token to borrow, this calculator will look at all the lending
					protocols
					<br />
					and calculate how much would it cost to borrow on each one, taking into account incentives, supply APR and
					borrow APR,
					<br />
					providing a list of all possible lending routes, their cost and LTV.
					<br />
					<br />
					This is similar to skyscanner for flights or 1inch for swaps, but for lending. It calculates the optimal
					lending route.
					<br />
					<br />
					To start just select two tokens above.
				</Panel>
			)}
		</>
	)
}

export default YieldsOptimizerPage
