import * as React from 'react'
import { useRouter } from 'next/router'
import { Panel } from '~/components'
import { YieldsPoolsTable } from '~/components/Table'
import { YieldFiltersV2 } from '~/components/Filters'
import { AnnouncementWrapper } from '~/components/Announcement'
import { useFormatYieldQueryParams } from './hooks'
import { toFilterPool } from './utils'

const YieldPage = ({ pools, projectList, chainList, categoryList, tokens, tokenSymbolsList }) => {
	const { query, pathname, push } = useRouter()
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
					tvl: curr.tvlUsd,
					apy: curr.apy,
					apyBase: curr.apyBase,
					apyReward: curr.apyReward,
					rewardTokensSymbols: curr.rewardTokensSymbols,
					rewards: curr.rewardTokensNames,
					change1d: curr.apyPct1D,
					change7d: curr.apyPct7D,
					outlook: curr.apy >= 0.005 ? curr.predictions.predictedClass : null,
					confidence: curr.apy >= 0.005 ? curr.predictions.binnedConfidence : null,
					url: curr.url,
					category: curr.category,
					il7d: curr.il7d,
					apyBase7d: curr.apyBase7d,
					apyNet7d: curr.apyNet7d,
					apyMean30d: curr.apyMean30d,
					volumeUsd1d: curr.volumeUsd1d,
					volumeUsd7d: curr.volumeUsd7d,
					apyBaseInception: curr.apyBaseInception,
					apyIncludingLsdApy: curr.apyIncludingLsdApy,
					apyBaseIncludingLsdApy: curr.apyBaseIncludingLsdApy,
					apyBaseBorrow: curr.apyBaseBorrow,
					apyRewardBorrow: curr.apyRewardBorrow,
					apyBorrow: curr.apyBorrow,
					totalSupplyUsd: curr.totalSupplyUsd,
					totalBorrowUsd: curr.totalBorrowUsd,
					totalAvailableUsd: curr.totalAvailableUsd,
					ltv: curr.ltv,
					lsdTokenOnly: curr.lsdTokenOnly
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
			{includeTokens.length > 0 &&
				(!selectedAttributes.includes('no_il') || !selectedAttributes.includes('single_exposure')) && (
					<AnnouncementWrapper>
						Do you want to see only pools that have a single token? Click{' '}
						<a
							style={{ textDecoration: 'underline' }}
							onClick={() => {
								push(
									{
										pathname,
										query: {
											...query,
											attribute: ['no_il', 'single_exposure']
										}
									},
									undefined,
									{ shallow: true }
								)
							}}
						>
							here
						</a>
					</AnnouncementWrapper>
				)}

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
				categoryList={categoryList}
				selectedCategories={selectedCategories}
				attributes={true}
				tvlRange={true}
				apyRange={true}
				show7dBaseApy={true}
				show7dIL={true}
				resetFilters={true}
				show1dVolume={true}
				show7dVolume={true}
				showInceptionApy={true}
				includeLsdApy={true}
				showNetBorrowApy={true}
				showBorrowBaseApy={true}
				showBorrowRewardApy={true}
				showTotalSupplied={true}
				showTotalBorrowed={true}
				showAvailable={true}
				showLTV={true}
			/>

			{poolsData.length > 0 ? (
				<YieldsPoolsTable data={poolsData} />
			) : (
				<Panel as="p" style={{ margin: 0, textAlign: 'center' }}>
					Couldn't find any pools for these filters
				</Panel>
			)}
		</>
	)
}

export default YieldPage
