import { maxAgeForNext } from '~/api'
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
import { VirtualTable } from '~/components/Table/Table'
import { calendarColumns } from '~/components/Table/Defi/columns'
import { withPerformanceLogging } from '~/utils/perf'
import { Announcement } from '~/components/Announcement'
import calendarEvents from '~/constants/calendar'
import { formatPercentage } from '~/utils'
import { PROTOCOL_EMISSIONS_API } from '~/constants'
import { BasicDropdown } from '~/components/Filters/common/BasicDropdown'
import { useRouter } from 'next/router'
import { Icon } from '~/components/Icon'
import { fetchWithErrorLogging } from '~/utils/async'

export const getStaticProps = withPerformanceLogging('calendar', async () => {
	const res = await fetchWithErrorLogging(`${PROTOCOL_EMISSIONS_API}`).then((res) => res.json())

	const emissions = res.map((protocol) => {
		const unlocksByDate = {}
		protocol.events?.forEach((e) => {
			if (e.timestamp < Date.now() / 1000 || (e.noOfTokens.length === 1 && e.noOfTokens[0] === 0)) return
			unlocksByDate[e.timestamp] =
				(unlocksByDate[e.timestamp] ?? 0) +
				(e.noOfTokens.length === 2 ? e.noOfTokens[1] - e.noOfTokens[0] : e.noOfTokens[0])
		})
		const unlocksList = Object.entries(unlocksByDate)
		const maxUnlock = unlocksList.reduce((max, curr) => {
			if (max[1] < curr[1]) {
				return curr
			}
			return max
		}, unlocksList[0])

		const tSymbol = protocol.name === 'LooksRare' ? 'LOOKS' : protocol.tokenPrice?.[0]?.symbol ?? null

		return {
			...protocol,
			unlock: maxUnlock,
			tPrice: protocol.tokenPrice?.[0]?.price ?? null,
			tSymbol
		}
	})

	return {
		props: {
			emissions: emissions.filter((p) => p.unlock) || []
		},
		revalidate: maxAgeForNext([22])
	}
})

export default function Protocols({ emissions }) {
	const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
	const [sorting, setSorting] = React.useState<SortingState>([])
	const { pathname, query } = useRouter()
	const { type } = query
	const options = ['Unlock', 'Close', 'Macro', 'Crypto']

	let selectedOptions: string[]
	if (type) {
		if (typeof type === 'string') {
			selectedOptions = type === 'All' ? [...options] : type === 'None' ? [] : [type]
		} else {
			selectedOptions = [...type]
		}
	} else selectedOptions = [...options]

	const allEvents = emissions
		.map((e) => {
			const tokens = e.unlock[1]
			const tokenValue = e.tPrice ? tokens * e.tPrice : null
			const unlockPercent = tokenValue && e.mcap ? (tokenValue / e.mcap) * 100 : null
			if (unlockPercent === null || unlockPercent <= 4) return null
			return {
				name: `${e.tSymbol} ${formatPercentage(unlockPercent)}% unlock`,
				timestamp: new Date(e.unlock[0] * 1e3),
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
		.filter((e) => e.timestamp >= new Date() && selectedOptions.includes(e.type))
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
			<Announcement notCancellable>Want us to track other events? Tweet at @0xngmi on twitter!</Announcement>

			<div className="flex items-center gap-4 flex-wrap last:*:ml-auto -mb-6">
				<h1 className="text-2xl font-medium">Crypto Calendar</h1>

				<BasicDropdown
					pathname={pathname}
					options={options}
					selectedOptions={selectedOptions}
					label="Type"
					urlKey="type"
				/>

				<div className="relative w-full sm:max-w-[280px]">
					<Icon
						name="search"
						height={16}
						width={16}
						className="absolute text-[var(--text3)] top-0 bottom-0 my-auto left-2"
					/>
					<input
						value={projectName}
						onChange={(e) => {
							setProjectName(e.target.value)
						}}
						placeholder="Search events..."
						className="border border-black/10 dark:border-white/10 w-full p-2 pl-7 bg-white dark:bg-black text-black dark:text-white rounded-md text-sm"
					/>
				</div>
			</div>

			<VirtualTable instance={instance} />
		</Layout>
	)
}
