import * as React from 'react'
import { useRouter } from 'next/router'
import { Panel } from '~/components'
import { YieldsPoolsTable } from '~/components/Table'
import {
	YieldAttributes,
	TVLRange,
	APYRange,
	FiltersByChain,
	YieldProjects,
	FiltersByCategory,
	FiltersByToken,
	YieldFiltersV2,
	ResetAllYieldFilters
} from '~/components/Filters'
import { useFormatYieldQueryParams } from './hooks'
import { toFilterPool } from './utils'
import OptionToggle from '../OptionToggle'

const YieldPage = ({ pools, projectList, chainList, categoryList, tokens, tokenSymbolsList }) => {
	const { query, pathname, push } = useRouter()
	const { minTvl, maxTvl, minApy, maxApy, show7dBaseApy, show7dIL } = query

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
					apyNet7d: curr.apyNet7d,
					apyMean30d: curr.apyMean30d
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
				poolsNumber={pools.length}
				projectsNumber={projectList.length}
				chainsNumber={chainList.length}
				tokens={tokens}
			>
				<FiltersByToken
					tokensList={tokenSymbolsList}
					selectedTokens={includeTokens}
					pathname={pathname}
					variant="secondary"
				/>
				<FiltersByChain chainList={chainList} selectedChains={selectedChains} pathname={pathname} variant="secondary" />
				<YieldProjects
					projectList={projectList}
					selectedProjects={selectedProjects}
					pathname={pathname}
					variant="secondary"
				/>
				<FiltersByCategory
					categoryList={categoryList}
					selectedCategories={selectedCategories}
					pathname={pathname}
					variant="secondary"
				/>
				<YieldAttributes pathname={pathname} variant="secondary" />
				<TVLRange variant="secondary" />
				<APYRange variant="secondary" />

				<OptionToggle
					name="Show 7d Base Apy"
					toggle={() => {
						const enabled = show7dBaseApy === 'true'
						push({ pathname, query: { ...query, show7dBaseApy: !enabled } }, undefined, { shallow: true })
					}}
					enabled={query.show7dBaseApy === 'true'}
				/>

				<OptionToggle
					name="Show 7d IL"
					toggle={() => {
						const enabled = show7dIL === 'true'
						push({ pathname, query: { ...query, show7dIL: !enabled } }, undefined, { shallow: true })
					}}
					enabled={query.show7dIL === 'true'}
				/>

				<ResetAllYieldFilters pathname={pathname} variant="secondary" />
			</YieldFiltersV2>

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
