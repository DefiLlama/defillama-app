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
import { VirtualTable } from '~/components/Table/Table'
import { emissionsColumns } from '~/components/Table/Defi/columns'
import { withPerformanceLogging } from '~/utils/perf'
import { Announcement } from '~/components/Announcement'
import { Icon } from '~/components/Icon'
import { formattedNum } from '~/utils'
import { UpcomingUnlockVolumeChart } from '~/components/Charts/UpcomingUnlockVolumeChart'

export const getStaticProps = withPerformanceLogging('unlocks', async () => {
	const data = await getAllProtocolEmissions()

	return {
		props: {
			data
		},
		revalidate: maxAgeForNext([22])
	}
})

export default function Protocols({ data }) {
	const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
	const [sorting, setSorting] = React.useState<SortingState>([])

	const instance = useReactTable({
		data,
		columns: emissionsColumns,
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

	const { upcomingUnlocks30dValue } = React.useMemo(() => {
		let upcomingUnlocks30dValue = 0
		const now = Date.now() / 1000
		const thirtyDaysLater = now + 30 * 24 * 60 * 60

		data?.forEach((protocol) => {
			if (!protocol.upcomingEvent || protocol.tPrice === null || protocol.tPrice === undefined) {
				return
			}

			protocol.upcomingEvent.forEach((event) => {
				if (event.timestamp === null || !event.noOfTokens || event.noOfTokens.length === 0) {
					return
				}

				const totalTokens = event.noOfTokens.reduce((sum, amount) => sum + amount, 0)
				if (totalTokens === 0) {
					return
				}

				const valueUSD = totalTokens * protocol.tPrice
				if (event.timestamp >= now && event.timestamp <= thirtyDaysLater) {
					upcomingUnlocks30dValue += valueUSD
				}
			})
		})

		return { upcomingUnlocks30dValue }
	}, [data])

	return (
		<Layout title={`Unlocks - DefiLlama`} defaultSEO>
			<Announcement notCancellable>
				<span>Are we missing any protocol?</span>{' '}
				<a
					href="https://airtable.com/shrD1bSGYNcdFQ6kd"
					className="text-[var(--blue)] underline font-medium"
					target="_blank"
					rel="noopener noreferrer"
				>
					Add it here!
				</a>
			</Announcement>

			<div className="grid grid-cols-1 relative isolate xl:grid-cols-[auto_1fr] gap-1">
				<div className="flex flex-col gap-2 p-6 col-span-1 w-full xl:w-[380px] bg-[var(--cards-bg)] rounded-md overflow-x-auto">
					<h1 className="text-xl mb-4 font-semibold">Unlock Statistics</h1>
					<table className="text-base w-full border-collapse mt-4">
						<tbody>
							<tr>
								<th className="text-[#545757] dark:text-[#cccccc] font-normal text-left pb-1">
									Total Protocols Tracked
								</th>
								<td className="font-jetbrains text-right">{data?.length || 0}</td>
							</tr>
							<tr>
								<th className="text-[#545757] dark:text-[#cccccc] font-normal text-left pb-1">
									Upcoming Unlocks (30d)
								</th>
								<td className="font-jetbrains text-right">{formattedNum(upcomingUnlocks30dValue, true)}</td>
							</tr>
						</tbody>
					</table>
				</div>
				<div className="flex flex-col gap-4 col-span-1 min-h-[378px] bg-[var(--cards-bg)] rounded-md">
					<UpcomingUnlockVolumeChart protocols={data} />
				</div>
			</div>

			<div className="bg-[var(--cards-bg)] rounded-md">
				<div className="flex items-center gap-4 flex-wrap last:*:ml-auto p-3">
					<h1 className="text-xl font-semibold">Token Unlocks</h1>
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
							placeholder="Search projects..."
							className="border border-black/10 dark:border-white/10 w-full p-2 pl-7 bg-white dark:bg-black text-black dark:text-white rounded-md text-sm"
						/>
					</div>
				</div>
				<VirtualTable instance={instance} stripedBg rowSize={80} />
			</div>
		</Layout>
	)
}
