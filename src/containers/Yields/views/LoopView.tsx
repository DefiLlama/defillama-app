import { YIELD_LOOP_DATASET_API } from '../constants'
import { YieldFiltersV2 } from '../Filters'
import { useFormatYieldQueryParams } from '../hooks'
import { PaginatedYieldsLoopTable } from '../Tables/Loop'
import type { YieldLoopTableRow } from '../Tables/types'
import { useYieldsServerTable } from '../useYieldsServerTable'

const EMPTY_ROWS: YieldLoopTableRow[] = []

const YieldPageLoop = ({ projectList, chainList, categoryList, tokens, evmChains }) => {
	const { rows, total, rowsQuery, tableProps } = useYieldsServerTable<YieldLoopTableRow>({
		endpoint: YIELD_LOOP_DATASET_API
	})
	const poolsData = rows.length > 0 ? rows : EMPTY_ROWS
	const poolsNumber = total

	const { selectedProjects, selectedChains } = useFormatYieldQueryParams({
		projectList,
		chainList,
		categoryList,
		evmChains
	})

	return (
		<>
			<YieldFiltersV2
				header="Leveraged Lending"
				poolsNumber={poolsNumber}
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

			{rowsQuery.isLoading && !rowsQuery.data ? (
				<p className="flex flex-1 items-center justify-center rounded-md border border-(--cards-border) bg-(--cards-bg) p-5">
					Loading pools...
				</p>
			) : rowsQuery.isError ? (
				<p className="flex flex-1 items-center justify-center rounded-md border border-(--cards-border) bg-(--cards-bg) p-5">
					Couldn't load pools.
				</p>
			) : poolsData.length > 0 ? (
				<PaginatedYieldsLoopTable data={poolsData} {...tableProps} />
			) : (
				<p className="flex flex-1 items-center justify-center rounded-md border border-(--cards-border) bg-(--cards-bg) p-5">
					Couldn't find any pools for these filters
				</p>
			)}
		</>
	)
}

export default YieldPageLoop
