import * as React from 'react'
import { useRouter } from 'next/router'
import { Panel } from '~/components'
import { Dropdowns, TableFilters, TableHeader } from '~/components/Table'
import { YieldsBorrowTable } from '~/components/VirtualTable'
import {
	YieldAttributes,
	FiltersByChain,
	YieldProjects,
	ResetAllYieldFilters,
	attributeOptions
} from '~/components/Filters'
import { YieldsSearch } from '~/components/Search'
import { useFormatYieldQueryParams } from './hooks'

const YieldPageBorrow = ({ pools, projectList, chainList, categoryList }) => {
	const { query, pathname } = useRouter()
	const { minTvl, maxTvl, minApy, maxApy } = query

	const { selectedProjects, selectedChains, selectedAttributes, includeTokens, excludeTokens, selectedCategories } =
		useFormatYieldQueryParams({ projectList, chainList, categoryList })

	const poolsData = React.useMemo(() => {
		return pools.reduce((acc, curr) => {
			let toFilter = true

			// used in pages like /yields/stablecoins to filter some pools by default
			attributeOptions.forEach((option) => {
				// check if this page has default attribute filter function
				if (option.defaultFilterFnOnPage[pathname]) {
					// apply default attribute filter function
					toFilter = toFilter && option.defaultFilterFnOnPage[pathname](curr)
				}
			})

			selectedAttributes.forEach((attribute) => {
				const attributeOption = attributeOptions.find((o) => o.key === attribute)

				if (attributeOption) {
					toFilter = toFilter && attributeOption.filterFn(curr)
				}
			})

			toFilter = toFilter && selectedProjects?.map((p) => p.toLowerCase()).includes(curr.project.toLowerCase())

			toFilter = toFilter && selectedCategories?.map((p) => p.toLowerCase()).includes(curr.category.toLowerCase())

			const tokensInPool: string[] = curr.symbol.split('-').map((x) => x.toLowerCase())

			const includeToken =
				includeTokens.length > 0
					? includeTokens
							.map((t) => t.toLowerCase())
							.find((token) => {
								if (tokensInPool.some((x) => x.includes(token.toLowerCase()))) {
									return true
								} else if (token === 'eth') {
									return tokensInPool.find((x) => x.includes('weth') && x.includes(token))
								} else return false
							})
					: true

			const excludeToken = !excludeTokens
				.map((t) => t.toLowerCase())
				.find((token) => tokensInPool.includes(token.toLowerCase()))

			toFilter =
				toFilter &&
				selectedChains.map((t) => t.toLowerCase()).includes(curr.chain.toLowerCase()) &&
				includeToken &&
				excludeToken

			const isValidTvlRange =
				(minTvl !== undefined && !Number.isNaN(Number(minTvl))) ||
				(maxTvl !== undefined && !Number.isNaN(Number(maxTvl)))

			const isValidApyRange =
				(minApy !== undefined && !Number.isNaN(Number(minApy))) ||
				(maxApy !== undefined && !Number.isNaN(Number(maxApy)))

			if (isValidTvlRange) {
				toFilter =
					toFilter && (minTvl ? curr.totalSupplyUsd > minTvl : true) && (maxTvl ? curr.totalSupplyUsd < maxTvl : true)
			}

			if (isValidApyRange) {
				toFilter = toFilter && (minApy ? curr.apyBase > minApy : true) && (maxApy ? curr.apyBase < maxApy : true)
			}

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
