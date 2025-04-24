import { maxAgeForNext } from '~/api'
import { getAllProtocolEmissions } from '~/api/categories/protocols'
import * as React from 'react'
import Layout from '~/layout'
import { useReactTable, SortingState, getCoreRowModel, getSortedRowModel } from '@tanstack/react-table'
import { VirtualTable } from '~/components/Table/Table'
import { emissionsColumns } from '~/components/Table/Defi/columns'
import { withPerformanceLogging } from '~/utils/perf'
import { Announcement } from '~/components/Announcement'
import { Icon } from '~/components/Icon'
import { formattedNum, slug } from '~/utils'
import { UpcomingUnlockVolumeChart } from '~/components/Charts/UpcomingUnlockVolumeChart'
import { useWatchlist } from '~/contexts/LocalStorage'

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
	const [showOnlyWatchlist, setShowOnlyWatchlist] = React.useState(false)
	const [showOnlyInsider, setShowOnlyInsider] = React.useState(false)
	const { savedProtocols } = useWatchlist()
	const [filteredData, setFilteredData] = React.useState(data)

	React.useEffect(() => {
		const id = setTimeout(() => {
			const searchTerm = projectName.toLowerCase()
			let filtered = projectName
				? data.filter(
						(protocol) =>
							protocol.name.toLowerCase().includes(searchTerm) ||
							(protocol.tSymbol && protocol.tSymbol.toLowerCase().includes(searchTerm))
				  )
				: data

			if (showOnlyWatchlist) {
				filtered = filtered.filter((protocol) => savedProtocols[slug(protocol.name)])
			}

			if (showOnlyInsider) {
				filtered = filtered.filter((protocol) => protocol.upcomingEvent?.some((event) => event.category === 'insiders'))
			}

			setFilteredData(filtered)
		}, 200)
		return () => clearTimeout(id)
	}, [projectName, data, showOnlyInsider, showOnlyWatchlist, savedProtocols])

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

		filteredData?.forEach((protocol) => {
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
	}, [filteredData])

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

			<div className="grid grid-cols-2 relative isolate xl:grid-cols-3 gap-1">
				<div className="bg-[var(--cards-bg)] rounded-md flex flex-col gap-6 p-5 col-span-2 w-full xl:col-span-1 overflow-x-auto">
					<h1 className="text-xl font-semibold">Unlock Statistics</h1>
					<p className="hidden md:flex flex-col">
						<span className="text-[#545757] dark:text-[#cccccc]">Total Protocols Tracked</span>
						<span className="font-semibold text-3xl font-jetbrains">{data?.length || 0}</span>
					</p>
					<p className="hidden md:flex flex-col">
						<span className="text-[#545757] dark:text-[#cccccc]">Upcoming Unlocks (30d)</span>
						<span className="font-semibold text-3xl font-jetbrains">{formattedNum(upcomingUnlocks30dValue, true)}</span>
					</p>
				</div>
				<div className="bg-[var(--cards-bg)] rounded-md flex flex-col col-span-2 min-h-[418px]">
					<UpcomingUnlockVolumeChart protocols={filteredData} />
				</div>
			</div>

			<div className="bg-[var(--cards-bg)] rounded-md">
				<div className="flex items-center justify-end gap-2 flex-wrap p-3">
					<h1 className="text-xl font-semibold mr-auto">Token Unlocks</h1>

					<button
						onClick={() => setShowOnlyWatchlist((prev) => !prev)}
						className="border border-[#E6E6E6] dark:border-[#39393E] p-[6px] px-3 bg-white dark:bg-black text-black dark:text-white rounded-md text-sm flex items-center gap-2 w-[200px] justify-center"
					>
						<Icon
							name="bookmark"
							height={16}
							width={16}
							style={{ fill: showOnlyWatchlist ? 'var(--text1)' : 'none' }}
						/>
						{showOnlyWatchlist ? 'Show All' : 'Show Watchlist'}
					</button>

					<button
						onClick={() => setShowOnlyInsider((prev) => !prev)}
						className="border border-[#E6E6E6] dark:border-[#39393E] p-[6px] px-3 bg-white dark:bg-black text-black dark:text-white rounded-md text-sm flex items-center gap-2 w-[200px] justify-center"
					>
						<Icon name="key" height={16} width={16} style={{ fill: showOnlyInsider ? 'var(--text1)' : 'none' }} />
						{showOnlyInsider ? 'Show All' : 'Show Insiders Only'}
					</button>

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
							className="border border-[#E6E6E6] dark:border-[#39393E] w-full p-[6px] pl-7 bg-white dark:bg-black text-black dark:text-white rounded-md text-sm"
						/>
					</div>
				</div>
				<VirtualTable instance={instance} stripedBg rowSize={80} />
			</div>
		</Layout>
	)
}
