import * as React from 'react'
import { useRouter } from 'next/router'
import { YieldsBorrowTable } from '~/components/Table/Yields/Borrow'
import { YieldFiltersV2 } from '~/components/Filters/yields'
import { useFormatYieldQueryParams } from './hooks'
import { toFilterPool } from './utils'

const YieldPageBorrow = ({ pools, projectList, chainList, categoryList, tokens, tokenSymbolsList }) => {
	const { query, pathname } = useRouter()
	const { minTvl, maxTvl, minApy, maxApy } = query

	const {
		selectedProjects,
		selectedChains,
		selectedAttributes,
		includeTokens,
		excludeTokens,
		exactTokens,
		selectedCategories
	} = useFormatYieldQueryParams({ projectList, chainList, categoryList })

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
				exactTokens,
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
		exactTokens,
		pathname
	])

	return (
		<>
			<YieldFiltersV2
				header="Yield Rankings"
				poolsNumber={poolsData.length}
				projectsNumber={selectedProjects.length}
				chainsNumber={selectedChains.length}
				tokens={tokens}
				tokensList={tokenSymbolsList}
				selectedTokens={includeTokens}
				chainList={chainList}
				selectedChains={selectedChains}
				projectList={projectList}
				selectedProjects={selectedProjects}
				attributes={true}
				resetFilters={true}
			/>

			{poolsData.length > 0 ? (
				<YieldsBorrowTable data={poolsData} />
			) : (
				<p className="border border-black/10 dark:border-white/10 p-5 rounded-md text-center">
					Couldn't find any pools for these filters
				</p>
			)}
		</>
	)
}

export default YieldPageBorrow
