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
import UpcomingUnlockVolumeChart from '~/components/Charts/UpcomingUnlockVolumeChart'

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
	const [sorting, setSorting] = React.useState<SortingState>([])

	const [projectName, setProjectName] = React.useState('')
	const [filteredData, setFilteredData] = React.useState(data)

	React.useEffect(() => {
		const id = setTimeout(() => {
			const searchTerm = projectName.toLowerCase()
			const filtered = projectName
				? data.filter(
						(protocol) =>
							protocol.name.toLowerCase().includes(searchTerm) ||
							(protocol.tSymbol && protocol.tSymbol.toLowerCase().includes(searchTerm))
				  )
				: data
			setFilteredData(filtered)
		}, 200)
		return () => clearTimeout(id)
	}, [projectName, data])

	const instance = useReactTable({
		data: filteredData,
		columns: emissionsColumns,
		state: {
			sorting
		},
		onSortingChange: setSorting,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel()
	})

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

			<div className="flex flex-col gap-5 p-3 mb-6 rounded-lg shadow bg-white dark:bg-[#090a0b]">
				<div className="grid grid-cols-1 relative isolate xl:grid-cols-[auto_1fr] bg-[var(--bg6)] border border-[var(--divider)] shadow rounded-xl">
					<div className="flex flex-col gap-2 p-6 col-span-1 w-full xl:w-[380px] rounded-t-xl xl:rounded-l-xl xl:rounded-r-none text-[var(--text1)] bg-[var(--bg7)] overflow-x-auto">
						<h1 className="text-xl mb-4 font-jetbrains">Unlock Statistics</h1>
						<summary className="flex items-center">
							<span className="flex flex-col">
								<span className="text-[#545757] dark:text-[#cccccc]">Total Protocols Tracked</span>
								<span className="font-semibold text-2xl font-jetbrains min-h-8">{data?.length || 0}</span>
							</span>
						</summary>

						<table className="text-base w-full border-collapse mt-4">
							<tbody>
								<tr>
									<th className="text-[#545757] dark:text-[#cccccc] font-normal text-left pb-1">
										Upcoming Unlocks (30d)
									</th>
									<td className="font-jetbrains text-right">{formattedNum(upcomingUnlocks30dValue, true)}</td>
								</tr>
							</tbody>
						</table>
					</div>
					<div className="flex flex-col gap-4 py-4 col-span-1 min-h-[360px]">
						<UpcomingUnlockVolumeChart protocols={data} />
					</div>
				</div>
			</div>

			<div className="flex items-center gap-4 flex-wrap last:*:ml-auto -mb-6">
				<h1 className="text-2xl font-medium">Token Unlocks</h1>

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
		</Layout>
	)
}
