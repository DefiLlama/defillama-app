import * as React from 'react'
import { useRouter } from 'next/router'
import { Panel } from '~/components'
import { Dropdowns, TableFilters, TableHeader } from '~/components/Table/shared'
import { YieldsBorrowTable } from '~/components/Table'
import { YieldAttributes, FiltersByChain, YieldProjects, ResetAllYieldFilters } from '~/components/Filters'
import { YieldsSearch } from '~/components/Search'
import { useFormatYieldQueryParams } from './hooks'
import { toFilterPool } from './utils'
import { FiltersByToken } from '../Filters/shared/FilterByToken'
import { useGetYieldsSearchList } from '../Search/Yields/hooks'

const YieldPageBorrow = ({ pools, projectList, chainList, categoryList }) => {
	const { query, pathname } = useRouter()
	const { minTvl, maxTvl, minApy, maxApy } = query

	const { data: tokens } = useGetYieldsSearchList()

	const { selectedProjects, selectedChains, selectedAttributes, includeTokens, excludeTokens, selectedCategories } =
		useFormatYieldQueryParams({ projectList, chainList, categoryList })

	const poolsData = React.useMemo(() => {
		return pools.reduce((acc, curr) => {
			const toFilter = toFilterPool({
				curr,
				pathname,
				selectedProjects,
				selectedChains,
				selectedAttributes,
				includeTokens,
				excludeTokens,
				selectedCategories,
				minTvl,
				maxTvl,
				minApy,
				maxApy
			})

			if (toFilter) {
				return acc.concat({
					pool: curr.symbol,
					configID: curr.pool,
					projectslug: curr.project,
					project: curr.projectName,
					airdrop: curr.airdrop,
					chains: [curr.chain],
					apyBase: curr.apyBase,
					apyReward: curr.apyReward,
					apyBorrow: curr.apyBorrow,
					apyBaseBorrow: curr.apyBaseBorrow,
					apyRewardBorrow: curr.apyRewardBorrow,
					totalSupplyUsd: curr.totalSupplyUsd,
					totalBorrowUsd: curr.totalBorrowUsd,
					totalAvailableUsd: curr.totalAvailableUsd,
					url: curr.url,
					ltv: curr.ltv,
					rewardTokensSymbols: curr.rewardTokensSymbols,
					rewards: curr.rewardTokensNames
				})
			} else return acc
		}, [])
	}, [
		minTvl,
		maxTvl,
		minApy,
		maxApy,
		pools,
		selectedProjects,
		selectedCategories,
		selectedChains,
		selectedAttributes,
		includeTokens,
		excludeTokens,
		pathname
	])

	return (
		<>
			<YieldsSearch step={{ category: 'Home', name: 'Yields' }} pathname={pathname} />

			<TableFilters>
				<TableHeader>Yield Rankings</TableHeader>

				<Dropdowns>
					{tokens?.length ? (
						<FiltersByToken
							tokensList={tokens.map(({ symbol }) => symbol || '')}
							selectedTokens={includeTokens}
							pathname={pathname}
						/>
					) : null}
					<FiltersByChain chainList={chainList} selectedChains={selectedChains} pathname={pathname} />
					<YieldProjects projectList={projectList} selectedProjects={selectedProjects} pathname={pathname} />
					<YieldAttributes pathname={pathname} />
					<ResetAllYieldFilters pathname={pathname} />
				</Dropdowns>
			</TableFilters>

			{poolsData.length > 0 ? (
				<YieldsBorrowTable data={poolsData} />
			) : (
				<Panel as="p" style={{ margin: 0, textAlign: 'center' }}>
					Couldn't find any pools for these filters
				</Panel>
			)}
		</>
	)
}

export default YieldPageBorrow
