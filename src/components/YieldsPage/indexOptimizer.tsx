import * as React from 'react'
import { useRouter } from 'next/router'
import { Panel } from '~/components'
import { TableFilters, TableHeader } from '~/components/Table/shared'
import YieldsSearch from '~/components/Search/Yields/Optimizer'
import { findOptimizerPools, formatOptimizerPool } from './utils'
import styled from 'styled-components'
import YieldsOptimizerTable from '../Table/Yields/Optimizer'
import { Header } from '~/Theme'

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

const YieldsOptimizerPage = ({ pools }) => {
	const { query, pathname } = useRouter()

	const { lend = 'USDC', borrow = 'ETH' } = query

	const poolsData = React.useMemo(() => {
		return findOptimizerPools(pools, lend, borrow).map(formatOptimizerPool)
	}, [query, pools])

	return (
		<>
			<Header>
				Yields Optimizer Calculator (Supply: {lend} ➞ Borrow: {borrow}){' '}
			</Header>
			<SearchWrapper>
				<YieldsSearch pathname={pathname} lend />
				<YieldsSearch pathname={pathname} />
			</SearchWrapper>

			<TableFilters>
				<TableHeader>Lending Optimizer</TableHeader>
			</TableFilters>

			{poolsData.length > 0 ? (
				<YieldsOptimizerTable data={poolsData} />
			) : (
				<Panel as="p" style={{ margin: 0, textAlign: 'center' }}>
					Couldn't find any pools for these filters
				</Panel>
			)}
		</>
	)
}

export default YieldsOptimizerPage
