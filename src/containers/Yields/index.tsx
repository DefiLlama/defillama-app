import * as React from 'react'
import { useRouter } from 'next/router'
import { Announcement } from '~/components/Announcement'
import { LocalLoader } from '~/components/Loaders'
import { YieldFiltersV2 } from './Filters'
import { useFormatYieldQueryParams } from './hooks'
import { YieldsPoolsTable } from './Tables/Pools'
import { toFilterPool } from './utils'

const YieldPage = ({ pools, projectList, chainList, categoryList, tokens, tokenSymbolsList, usdPeggedSymbols }) => {
	const { query, pathname, push } = useRouter()

	const [loading, setLoading] = React.useState(true)

	const {
		selectedProjects,
		selectedChains,
		selectedAttributes,
		includeTokens,
		excludeTokens,
		exactTokens,
		selectedCategories,
		pairTokens,
		minTvl,
		maxTvl,
		minApy,
		maxApy
	} = useFormatYieldQueryParams({ projectList, chainList, categoryList })

	React.useEffect(() => {
		const timer = setTimeout(() => setLoading(false), 1000)
		return () => clearTimeout(timer)
	}, [])

	React.useEffect(() => {
		setLoading(true)
		const timer = setTimeout(() => setLoading(false), 500)
		return () => clearTimeout(timer)
	}, [
		minTvl,
		maxTvl,
		minApy,
		maxApy,
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

	const poolsData = React.useMemo(() => {
		const pair_tokens = pairTokens.map((token) => token.toLowerCase())
		const include_tokens = includeTokens.map((token) => token.toLowerCase())
		const excludeTokensSet = new Set(excludeTokens.map((token) => token.toLowerCase()))
		const exact_tokens = exactTokens.map((token) => token.toLowerCase())

		const selectedProjectsSet = new Set(selectedProjects)
		const selectedChainsSet = new Set(selectedChains)
		const selectedCategoriesSet = new Set(selectedCategories)

		return pools.reduce((acc, curr) => {
			const toFilter = toFilterPool({
				curr,
				pathname,
				selectedProjectsSet,
				selectedChainsSet,
				selectedAttributes,
				includeTokens: include_tokens,
				excludeTokensSet,
				exactTokens: exact_tokens,
				selectedCategoriesSet,
				minTvl,
				maxTvl,
				minApy,
				maxApy,
				pairTokens: pair_tokens,
				usdPeggedSymbols
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
					lsdTokenOnly: curr.lsdTokenOnly,
					poolMeta: curr.poolMeta
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
		pairTokens,
		usdPeggedSymbols
	])
	const prepareCsv = React.useCallback(() => {
		const headers = [
			'Pool',
			'Project',
			'Chain',
			'TVL',
			'APY',
			'APY Base',
			'APY Reward',
			'Change 1d',
			'Change 7d',
			'Outlook',
			'Confidence',
			'Category',
			'IL 7d',
			'APY Base 7d',
			'APY Net 7d',
			'APY Mean 30d',
			'Volume 1d',
			'Volume 7d',
			'APY Base Inception',
			'APY Including LSD APY',
			'APY Base Including LSD APY',
			'APY Base Borrow',
			'APY Reward Borrow',
			'APY Borrow',
			'Total Supply USD',
			'Total Borrow USD',
			'Total Available USD',
			'Pool Meta'
		]
		const csvData = poolsData.map((row) => {
			return {
				Pool: row.pool,
				Project: row.project,
				Chain: row.chains,
				TVL: row.tvl,
				APY: row.apy,
				'APY Base': row.apyBase,
				'APY Reward': row.apyReward,
				'Change 1d': row.change1d,
				'Change 7d': row.change7d,
				Outlook: row.outlook,
				Confidence: row.confidence,
				Category: row.category,
				'IL 7d': row.il7d,
				'APY Base 7d': row.apyBase7d,
				'APY Net 7d': row.apyNet7d,
				'APY Mean 30d': row.apyMean30d,
				'Volume 1d': row.volumeUsd1d,
				'Volume 7d': row.volumeUsd7d,
				'APY Base Inception': row.apyBaseInception,
				'APY Including LSD APY': row.apyIncludingLsdApy,
				'APY Base Including LSD APY': row.apyBaseIncludingLsdApy,
				'APY Base Borrow': row.apyBaseBorrow,
				'APY Reward Borrow': row.apyRewardBorrow,
				'APY Borrow': row.apyBorrow,
				'Total Supply USD': row.totalSupplyUsd,
				'Total Borrow USD': row.totalBorrowUsd,
				'Total Available USD': row.totalAvailableUsd,
				'Pool Meta': row.poolMeta
			}
		})

		return {
			filename: 'yields.csv',
			rows: [headers].concat(csvData.map((row) => headers.map((header) => row[header])))
		}
	}, [poolsData])

	return (
		<>
			{includeTokens.length > 0 &&
				(!selectedAttributes.includes('no_il') || !selectedAttributes.includes('single_exposure')) && (
					<Announcement notCancellable>
						Do you want to see only pools that have a single token? Click{' '}
						<a
							className="font-medium text-(--blue) underline"
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
					</Announcement>
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
				prepareCsv={prepareCsv}
			/>

			{loading ? (
				<div className="m-auto flex min-h-[360px] items-center justify-center">
					<LocalLoader />
				</div>
			) : poolsData.length > 0 ? (
				<YieldsPoolsTable data={poolsData} />
			) : (
				<p className="rounded-md border border-(--cards-border) bg-(--cards-bg) p-5 text-center">
					Couldn't find any pools for these filters
				</p>
			)}
		</>
	)
}

export default YieldPage
