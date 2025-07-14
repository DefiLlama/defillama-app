import * as React from 'react'
import { useRouter } from 'next/router'
import { YieldsLoopTable } from './Tables/Loop'
import { YieldFiltersV2 } from './Filters'
import { useFormatYieldQueryParams } from './hooks'
import { toFilterPool } from './utils'

const YieldPageLoop = ({ pools, projectList, chainList, categoryList, tokens }) => {
	const { query, pathname } = useRouter()
	const { minTvl, maxTvl, minApy, maxApy } = query

	const {
		selectedProjects,
		selectedChains,
		selectedAttributes,
		includeTokens,
		excludeTokens,
		exactTokens,
		selectedCategories,
		pairTokens
	} = useFormatYieldQueryParams({ projectList, chainList, categoryList })

	const poolsData = React.useMemo(() => {
		const pair_tokens = pairTokens.map((token) => token.toLowerCase())
		const include_tokens = includeTokens.map((token) => token.toLowerCase())
		const exclude_tokens = excludeTokens.map((token) => token.toLowerCase())
		const exact_tokens = exactTokens.map((token) => token.toLowerCase())

		return pools.reduce((acc, curr) => {
			const toFilter = toFilterPool({
				curr,
				pathname,
				selectedProjects,
				selectedChains,
				selectedAttributes,
				includeTokens: include_tokens,
				excludeTokens: exclude_tokens,
				exactTokens: exact_tokens,
				selectedCategories,
				minTvl,
				maxTvl,
				minApy,
				maxApy,
				pairTokens: pair_tokens
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
		exactTokens,
		pathname,
		pairTokens
	])

	return (
		<>
			<YieldFiltersV2
				header="Leveraged Lending"
				poolsNumber={poolsData.length}
				projectsNumber={selectedProjects.length}
				chainsNumber={selectedChains.length}
				tokens={tokens}
				chainList={chainList}
				selectedChains={selectedChains}
				projectList={projectList}
				selectedProjects={selectedProjects}
				attributes={true}
				resetFilters={true}
			/>

			{poolsData.length > 0 ? (
				<YieldsLoopTable data={poolsData} />
			) : (
				<p className="p-5 bg-(--cards-bg) rounded-md text-center">Couldn't find any pools for these filters</p>
			)}
		</>
	)
}

export default YieldPageLoop
