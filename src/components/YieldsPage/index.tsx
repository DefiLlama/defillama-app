import * as React from 'react'
import { useRouter } from 'next/router'
import { Panel } from '~/components'
import { Dropdowns, TableFilters, TableHeader } from '~/components/Table/shared'
import { YieldsPoolsTable } from '~/components/Table'
import {
	YieldAttributes,
	TVLRange,
	APYRange,
	FiltersByChain,
	YieldProjects,
	FiltersByCategory,
	ResetAllYieldFilters
} from '~/components/Filters'
import { YieldsSearch } from '~/components/Search'
import { useFormatYieldQueryParams } from './hooks'
import { toFilterPool } from './utils'
import { useGetYieldsSearchList } from '../Search/Yields/hooks'
import { FiltersByToken } from '../Filters/shared/FilterByToken'

const YieldPage = ({ pools, projectList, chainList, categoryList }) => {
	const { data: tokens } = useGetYieldsSearchList()

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
					apyNet7d: curr.apyNet7d
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
			<YieldsSearch
				step={{ category: 'Home', name: 'Yields' }}
				pathname={pathname}
				poolsNumber={pools.length}
				projectsNumber={projectList.length}
				chainsNumber={chainList.length}
			/>

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
					<FiltersByCategory categoryList={categoryList} selectedCategories={selectedCategories} pathname={pathname} />
					<YieldAttributes pathname={pathname} />
					<TVLRange />
					<APYRange />
					<ResetAllYieldFilters pathname={pathname} />
				</Dropdowns>
			</TableFilters>

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
