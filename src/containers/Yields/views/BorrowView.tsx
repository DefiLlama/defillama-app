import { useRouter } from 'next/router'
import * as React from 'react'
import { filterYieldPools } from '../domain/poolFilters'
import { mapPoolToBorrowTableRow } from '../domain/poolRows'
import { getYieldViewFromPathname } from '../domain/views'
import { YieldFiltersV2 } from '../Filters'
import { useFormatYieldQueryParams } from '../hooks'
import { YieldsBorrowTable } from '../Tables/Borrow'

const YieldPageBorrow = ({
	pools,
	projectList,
	chainList,
	categoryList,
	tokens,
	tokenSymbolsList,
	usdPeggedSymbols,
	evmChains
}) => {
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

		const rows = []
		for (const pool of filteredPools) {
			rows.push(mapPoolToBorrowTableRow(pool))
		}
		return rows
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
				header="Yield Rankings"
				poolsNumber={poolsData.length}
				projectsNumber={selectedProjects.length}
				chainsNumber={selectedChains.length}
				tokens={tokens}
				tokensList={tokenSymbolsList}
				selectedTokens={includeTokens}
				chainList={chainList}
				selectedChains={selectedChains}
				evmChains={evmChains}
				projectList={projectList}
				selectedProjects={selectedProjects}
				attributes={true}
				resetFilters={true}
			/>

			{poolsData.length > 0 ? (
				<YieldsBorrowTable data={poolsData} />
			) : (
				<p className="flex flex-1 items-center justify-center rounded-md border border-(--cards-border) bg-(--cards-bg) p-5">
					Couldn't find any pools for these filters
				</p>
			)}
		</>
	)
}

export default YieldPageBorrow
