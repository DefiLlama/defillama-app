import { useRouter } from 'next/router'
import * as React from 'react'
import { filterYieldPools } from '../domain/poolFilters'
import { mapPoolToLoopTableRow } from '../domain/poolRows'
import { getYieldViewFromPathname } from '../domain/views'
import { YieldFiltersV2 } from '../Filters'
import { useFormatYieldQueryParams } from '../hooks'
import { YieldsLoopTable } from '../Tables/Loop'

const YieldPageLoop = ({ pools, projectList, chainList, categoryList, tokens, usdPeggedSymbols, evmChains }) => {
	const { pathname } = useRouter()

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
	} = useFormatYieldQueryParams({ projectList, chainList, categoryList, evmChains })

	const poolsData = React.useMemo(() => {
		const filteredPools = filterYieldPools({
			pools,
			view: getYieldViewFromPathname(pathname),
			filters: {
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
			},
			usdPeggedSymbols
		})

		return filteredPools.map(mapPoolToLoopTableRow)
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
				evmChains={evmChains}
				projectList={projectList}
				selectedProjects={selectedProjects}
				attributes={true}
				resetFilters={true}
			/>

			{poolsData.length > 0 ? (
				<YieldsLoopTable data={poolsData} />
			) : (
				<p className="rounded-md border border-(--cards-border) bg-(--cards-bg) p-5 text-center">
					Couldn't find any pools for these filters
				</p>
			)}
		</>
	)
}

export default YieldPageLoop
