import { maxAgeForNext } from '~/api'
import * as React from 'react'
import Layout from '~/layout'
import {
	useReactTable,
	SortingState,
	getCoreRowModel,
	getSortedRowModel,
	getFilteredRowModel,
	ColumnFiltersState,
	getExpandedRowModel
} from '@tanstack/react-table'
import { VirtualTable } from '~/components/Table/Table'
import { governanceColumns } from '~/components/Table/Defi/columns'
import { GOVERNANCE_SNAPSHOT_API, GOVERNANCE_COMPOUND_API, GOVERNANCE_TALLY_API } from '~/constants'
import { capitalizeFirstLetter } from '~/utils'
import { withPerformanceLogging } from '~/utils/perf'

import { fetchJson } from '~/utils/async'
import { Icon } from '~/components/Icon'
import { ProtocolsChainsSearch } from '~/components/Search/ProtocolsChains'

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

	React.useEffect(() => {
		const projectsColumns = instance.getColumn('name')
		const id = setTimeout(() => {
			projectsColumns.setFilterValue(projectName)
		}, 200)
		return () => clearTimeout(id)
	}, [projectName, instance])

	return (
		<Layout title={`Governance - DefiLlama`} defaultSEO>
			<ProtocolsChainsSearch />
			<div className="bg-(--cards-bg) border border-[#e6e6e6] dark:border-[#222324] rounded-md">
				<div className="flex items-center gap-2 justify-end flex-wrap p-3">
					<h1 className="text-xl font-semibold mr-auto">Governance</h1>
					<div className="relative w-full sm:max-w-[280px]">
						<Icon
							name="search"
							height={16}
							width={16}
							className="absolute text-(--text3) top-0 bottom-0 my-auto left-2"
						/>
						<input
							value={projectName}
							onChange={(e) => {
								setProjectName(e.target.value)
							}}
							placeholder="Search projects..."
							className="border border-(--form-control-border) w-full p-[6px] pl-7 bg-white dark:bg-black text-black dark:text-white rounded-md text-sm"
						/>
					</div>
				</div>
				<VirtualTable instance={instance} renderSubComponent={renderSubComponent} />
			</div>
		</Layout>
	)
}

const renderSubComponent = ({ row }) => {
	return (
		<span className="flex flex-col gap-1 pl-[72px]">
			{Object.entries(row.original.subRowData).map(([type, value]) => (
				<span key={row.original.name + type + value}>{capitalizeFirstLetter(type) + ' Proposals : ' + value}</span>
			))}
		</span>
	)
}
