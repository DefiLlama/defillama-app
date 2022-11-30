import * as React from 'react'
import { useRouter } from 'next/router'
import { Panel } from '~/components'
import YieldsLoopTable from '../Table/Yields/Loop'
import {
	YieldAttributes,
	FiltersByChain,
	YieldProjects,
	ResetAllYieldFilters,
	YieldFiltersV2
} from '~/components/Filters'
import { useFormatYieldQueryParams } from './hooks'
import { toFilterPool } from './utils'

const YieldPageLoop = ({ pools, projectList, chainList, categoryList, tokens }) => {
	const { query, pathname } = useRouter()
	const { minTvl, maxTvl, minApy, maxApy } = query

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
					rewards: curr.rewardTokensNames,
					loopApy: curr.loopApy,
					boost: curr.boost,
					netSupplyApy: curr.apyBase + curr.apyReward
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
			<YieldFiltersV2
				header="Leveraged Lending"
				poolsNumber={poolsData.length}
				projectsNumber={selectedProjects.length}
				chainsNumber={selectedChains.length}
				tokens={tokens}
			>
				<FiltersByChain chainList={chainList} selectedChains={selectedChains} pathname={pathname} variant="secondary" />
				<YieldProjects
					projectList={projectList}
					selectedProjects={selectedProjects}
					pathname={pathname}
					variant="secondary"
				/>
				<YieldAttributes pathname={pathname} variant="secondary" />
				<ResetAllYieldFilters pathname={pathname} variant="secondary" />
			</YieldFiltersV2>

			{poolsData.length > 0 ? (
				<YieldsLoopTable data={poolsData} />
			) : (
				<Panel as="p" style={{ margin: 0, textAlign: 'center' }}>
					Couldn't find any pools for these filters
				</Panel>
			)}
		</>
	)
}

export default YieldPageLoop
