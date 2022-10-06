import * as React from 'react'
import { useRouter } from 'next/router'
import { Panel } from '~/components'
import { TableFilters, TableHeader } from '~/components/Table/shared'
import YieldsSearch from '~/components/Search/Yields/Optimizer'
import { filterPool, findOptimizerPools, formatOptimizerPool, toFilterPool } from './utils'
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

const YieldsOptimizerPage = ({ pools, projectList, chainList, categoryList }) => {
	const { query, pathname } = useRouter()

	const { lend, borrow } = query
	const { selectedChains, selectedAttributes } = useFormatYieldQueryParams({ projectList, chainList, categoryList })

	const poolsData = React.useMemo(() => {
		let filteredPools = findOptimizerPools(pools, lend, borrow)
			.filter((pool) => filterPool({ pool, selectedChains }))
			.map(formatOptimizerPool)

		if (selectedAttributes.length > 0) {
			const attributeOption = attributeOptions.find((o) => o.key === selectedAttributes[0])
			filteredPools = filteredPools.filter((p) => attributeOption.filterFn(p))
		}
		return filteredPools
	}, [pools, borrow, lend, selectedChains, selectedAttributes])

	return (
		<>
			<Header>
				Yields Optimizer Calculator{' '}
				{lend && borrow ? (
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
				<TableHeader>Lending Optimizer</TableHeader>
				<FiltersByChain chainList={chainList} selectedChains={selectedChains} pathname={pathname} />
				<YieldAttributes pathname={pathname} />
			</TableFilters>

			{poolsData.length > 0 ? (
				<YieldsOptimizerTable data={poolsData} />
			) : (
				<Panel as="p" style={{ margin: 0, textAlign: 'center' }}>
					Please select both tokens.
				</Panel>
			)}
		</>
	)
}

export default YieldsOptimizerPage
