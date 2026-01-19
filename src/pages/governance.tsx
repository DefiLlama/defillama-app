import {
	ColumnFiltersState,
	getCoreRowModel,
	getExpandedRowModel,
	getFilteredRowModel,
	getSortedRowModel,
	SortingState,
	useReactTable
} from '@tanstack/react-table'
import * as React from 'react'
import { maxAgeForNext } from '~/api'
import { Icon } from '~/components/Icon'
import { governanceColumns } from '~/components/Table/Defi/columns'
import { VirtualTable } from '~/components/Table/Table'
import { GOVERNANCE_COMPOUND_API, GOVERNANCE_SNAPSHOT_API, GOVERNANCE_TALLY_API } from '~/constants'
import { useDebounce } from '~/hooks/useDebounce'
import Layout from '~/layout'
import { capitalizeFirstLetter } from '~/utils'
import { fetchJson } from '~/utils/async'
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticProps = withPerformanceLogging('governance', async () => {
	const [snapshot, compound, tally] = await Promise.all([
		fetchJson(GOVERNANCE_SNAPSHOT_API),
		fetchJson(GOVERNANCE_COMPOUND_API),
		fetchJson(GOVERNANCE_TALLY_API)
	])

	return {
		props: {
			data: Object.values({ ...snapshot, ...compound, ...tally }).map((x: { states: { [key: string]: number } }) => ({
				...x,
				subRowData: x.states
			}))
		},
		revalidate: maxAgeForNext([22])
	}
})

const pageName = ['Governance']

export default function Governance({ data }) {
	const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
	const [sorting, setSorting] = React.useState<SortingState>([{ id: 'successfulPropsalsInLast30Days', desc: true }])

	const instance = useReactTable({
		data: data,
		columns: governanceColumns,
		state: {
			columnFilters,
			sorting
		},
		onSortingChange: setSorting,
		onColumnFiltersChange: setColumnFilters,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		getExpandedRowModel: getExpandedRowModel(),
		getRowCanExpand: () => true
	})

	const [projectName, setProjectName] = React.useState('')
	const debouncedProjectName = useDebounce(projectName, 200)

	React.useEffect(() => {
		React.startTransition(() => {
			instance.getColumn('name')?.setFilterValue(debouncedProjectName)
		})
	}, [debouncedProjectName, instance])

	return (
		<Layout
			title={`Governance - DefiLlama`}
			description={`Governance overview by projects. DefiLlama is committed to providing accurate data without ads or sponsored content, as well as transparency.`}
			keywords={`governance proposals, governance by project`}
			canonicalUrl={`/governance`}
			pageName={pageName}
		>
			<div className="rounded-md border border-(--cards-border) bg-(--cards-bg)">
				<div className="flex flex-wrap items-center justify-end gap-2 p-3">
					<h1 className="mr-auto text-xl font-semibold">Governance Proposals by Project</h1>
					<label className="relative w-full sm:max-w-[280px]">
						<span className="sr-only">Search projects...</span>
						<Icon
							name="search"
							height={16}
							width={16}
							className="absolute top-0 bottom-0 left-2 my-auto text-(--text-tertiary)"
						/>
						<input
							name="search"
							value={projectName}
							onChange={(e) => {
								setProjectName(e.target.value)
							}}
							placeholder="Search projects..."
							className="w-full rounded-md border border-(--form-control-border) bg-white p-1 pl-7 text-black dark:bg-black dark:text-white"
						/>
					</label>
				</div>
				<VirtualTable instance={instance} renderSubComponent={renderSubComponent} />
			</div>
		</Layout>
	)
}

const RenderSubComponent = ({ row }) => {
	const subRowEntries = React.useMemo(() => Object.entries(row.original.subRowData), [row.original.subRowData])

	return (
		<span className="flex flex-col gap-1 pl-[72px]">
			{subRowEntries.map(([type, value]) => (
				<span key={row.original.name + type + value}>{capitalizeFirstLetter(type) + ' Proposals : ' + value}</span>
			))}
		</span>
	)
}

const renderSubComponent = ({ row }) => <RenderSubComponent row={row} />
