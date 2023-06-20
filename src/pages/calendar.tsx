import { maxAgeForNext } from '~/api'
import { getAllProtocolEmissions } from '~/api/categories/protocols'
import * as React from 'react'
import Layout from '~/layout'
import {
	useReactTable,
	SortingState,
	getCoreRowModel,
	getSortedRowModel,
	getFilteredRowModel,
	ColumnFiltersState
} from '@tanstack/react-table'
import styled from 'styled-components'
import VirtualTable from '~/components/Table/Table'
import { calendarColumns } from '~/components/Table/Defi/columns'
import { Header } from '~/Theme'
import { SearchIcon, SearchWrapper, TableHeaderAndSearch } from '~/components/Table/shared'
import { withPerformanceLogging } from '~/utils/perf'
import { AnnouncementWrapper } from '~/components/Announcement'
import calendarEvents from '~/constants/calendar'
import { formatPercentage } from '~/utils'

export const getStaticProps = withPerformanceLogging('unlocks', async () => {
	const emissions = await getAllProtocolEmissions()

	return {
		props: {
			emissions: emissions.filter((p) => p.upcomingEvent[0]?.timestamp)
		},
		revalidate: maxAgeForNext([22])
	}
})

export default function Protocols({ emissions }) {
	const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
	const [sorting, setSorting] = React.useState<SortingState>([])

	const allEvents = emissions
		.map((e) => {
			const tokens = e.upcomingEvent
				.map((x) => x.noOfTokens)
				.reduce((acc, curr) => (acc += curr.length === 2 ? curr[1] - curr[0] : curr[0]), 0)
			const tokenValue = e.tPrice ? tokens * e.tPrice : null
			const unlockPercent = tokenValue && e.mcap ? (tokenValue / e.mcap) * 100 : null
			if (unlockPercent === null || unlockPercent <= 4) return null
			return {
				name: `${e.tSymbol} ${formatPercentage(unlockPercent)}% unlock`,
				timestamp: new Date(e.upcomingEvent[0].timestamp * 1e3),
				type: 'Unlock',
				link: e.name
			}
		})
		.filter((e) => e !== null)
		.concat(
			calendarEvents
				.map((type) =>
					type[1].map((e) => ({
						name: e[1],
						timestamp: new Date(e[0]),
						type: type[0]
					}))
				)
				.flat()
		)
		.filter((e) => e.timestamp >= new Date())
		.sort((a, b) => a.timestamp - b.timestamp)

	const instance = useReactTable({
		data: allEvents,
		columns: calendarColumns,
		state: {
			columnFilters,
			sorting
		},
		onSortingChange: setSorting,
		onColumnFiltersChange: setColumnFilters,
		getFilteredRowModel: getFilteredRowModel(),
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel()
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
		<Layout title={`Calendar - DefiLlama`} defaultSEO>
			<AnnouncementWrapper>
				<span>Want us to track other events? Tweet at @0xngmi on twitter!</span>
			</AnnouncementWrapper>

			<TableHeaderAndSearch>
				<Header>Crypto Calendar</Header>

				<SearchWrapper>
					<SearchIcon size={16} />

					<input
						value={projectName}
						onChange={(e) => {
							setProjectName(e.target.value)
						}}
						placeholder="Search events..."
					/>
				</SearchWrapper>
			</TableHeaderAndSearch>

			<TableWrapper instance={instance} skipVirtualization />
		</Layout>
	)
}

const TableWrapper = styled(VirtualTable)`
	table {
		table-layout: auto;
	}
`
