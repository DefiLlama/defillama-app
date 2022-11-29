import * as React from 'react'
import { useRouter } from 'next/router'
import styled from 'styled-components'
import { Header } from '~/Theme'
import { Panel } from '~/components'
import { TableFilters } from '~/components/Table/shared'
import YieldsSearch from '~/components/Search/Yields/Optimizer'
import YieldsOptimizerTable from '~/components/Table/Yields/Optimizer'
import {
	YieldAttributes,
	FiltersByChain,
	YieldProjects,
	LTV,
	ResetAllYieldFilters,
	AvailableRange
} from '~/components/Filters'
import { useFormatYieldQueryParams } from './hooks'
import { filterPool, findOptimizerPools, formatOptimizerPool } from './utils'
import { YIELDS_SETTINGS } from '~/contexts/LocalStorage'

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

export const ToggleWrapper = styled.label`
	display: flex;
	align-items: center;
	flex-wrap: nowrap;
	gap: 8px;
	cursor: pointer;
`

const BAD_DEBT_KEY = YIELDS_SETTINGS.NO_BAD_DEBT.toLowerCase()

const YieldsOptimizerPage = ({ pools, projectList, chainList, categoryList, lendingProtocols, searchData }) => {
	const { query, pathname, push } = useRouter()
	const customLTV = typeof query.customLTV === 'string' ? query.customLTV : null
	const minAvailable = typeof query.minAvailable === 'string' ? query.minAvailable : null
	const maxAvailable = typeof query.maxAvailable === 'string' ? query.maxAvailable : null

	const { lend, borrow } = query
	const { selectedChains, selectedAttributes, selectedLendingProtocols } = useFormatYieldQueryParams({
		projectList,
		chainList,
		lendingProtocols,
		categoryList
	})

	// get cdp collateral -> debt token route
	const cdpPools = pools
		.filter((p) => p.category === 'CDP')
		.map((p) => ({ ...p, chains: [p.chain], borrow: { ...p, symbol: p.mintedCoin.toUpperCase() } }))

	const lendingPools = pools.filter((p) => p.category !== 'CDP')
	const poolsData = React.useMemo(() => {
		let filteredPools = findOptimizerPools(lendingPools, lend, borrow, cdpPools)
			.filter((pool) => {
				if (typeof lend === 'string' && lend.toLowerCase() == 'eth' && pool.symbol?.toLowerCase() == 'steth') {
					return false
				}

				if (typeof borrow === 'string' && borrow == 'eth' && pool.borrow?.symbol?.toLowerCase() == 'steth') {
					return false
				}

				return filterPool({
					pool,
					selectedChains,
					selectedAttributes,
					minAvailable,
					maxAvailable,
					selectedLendingProtocols,
					customLTV
				})
			})
			.map((p) => formatOptimizerPool(p, customLTV))
			.sort((a, b) => b.totalReward - a.totalReward)

		return filteredPools
	}, [
		lendingPools,
		lend,
		borrow,
		cdpPools,
		selectedChains,
		selectedAttributes,
		minAvailable,
		maxAvailable,
		selectedLendingProtocols,
		customLTV
	])

	const isBadDebtToggled = selectedAttributes.includes(BAD_DEBT_KEY)

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
				<YieldsSearch pathname={pathname} lend searchData={searchData} data-alwaysdisplay />
				<YieldsSearch pathname={pathname} searchData={searchData} data-alwaysdisplay />
				<LTV placeholder="Custom LTV" />
			</SearchWrapper>

			<TableFilters>
				<FiltersByChain chainList={chainList} selectedChains={selectedChains} pathname={pathname} />
				<YieldProjects
					projectList={lendingProtocols}
					selectedProjects={selectedLendingProtocols}
					pathname={pathname}
					label="Lending Protocols"
					query="lendingProtocol"
				/>
				<YieldAttributes pathname={pathname} />
				<AvailableRange />
				<ToggleWrapper>
					<input
						type="checkbox"
						value="hideEvents"
						checked={isBadDebtToggled}
						onChange={() => {
							push(
								{
									pathname,
									query: {
										...query,
										attribute: isBadDebtToggled
											? selectedAttributes.filter((a) => a !== BAD_DEBT_KEY)
											: [...selectedAttributes, BAD_DEBT_KEY]
									}
								},
								undefined,
								{ shallow: true }
							)
						}}
					/>
					<span>Exclude bad debt</span>
				</ToggleWrapper>

				<ResetAllYieldFilters pathname={pathname} />
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
