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
import { useRouter } from 'next/router'
import { Icon } from '~/components/Icon'
import { fetchWithErrorLogging } from '~/utils/async'
import * as Ariakit from '@ariakit/react'

export const getStaticProps = withPerformanceLogging('calendar', async () => {
	const res = await fetchWithErrorLogging(PROTOCOL_EMISSIONS_API)
		.then((res) => res.json())
		.catch(() => [])

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

const options = ['Unlock', 'Close', 'Macro', 'Crypto']

export default function Protocols({ emissions }) {
	const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
	const [sorting, setSorting] = React.useState<SortingState>([])
	const router = useRouter()
	const { type } = router.query

	const selectedOptions = React.useMemo(() => {
		let selectedOptions: string[]
		if (type) {
			if (typeof type === 'string') {
				selectedOptions = type === 'All' ? [...options] : type === 'None' ? [] : [type]
			} else {
				selectedOptions = [...type]
			}
		} else selectedOptions = [...options]

		return selectedOptions
	}, [type])

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

			<div className="bg-[var(--cards-bg)] rounded-md">
				<div className="flex items-center gap-4 flex-wrap last:*:ml-auto p-3">
					<h1 className="text-xl font-semibold">Crypto Calendar</h1>

					<Ariakit.SelectProvider
						value={selectedOptions}
						setValue={(newOptions) => {
							router.push(
								{
									pathname: router.pathname,
									query: {
										...router.query,
										type: newOptions
									}
								},
								undefined,
								{ shallow: true }
							)
						}}
					>
						<Ariakit.Select className="bg-[var(--btn-bg)] hover:bg-[var(--btn-hover-bg)] focus-visible:bg-[var(--btn-hover-bg)] flex items-center gap-2 py-2 px-3 text-xs rounded-md cursor-pointer text-[var(--text1)] flex-nowrap">
							{selectedOptions.length > 0 ? (
								<>
									<span>Type: </span>
									<span className="text-[var(--link)]">
										{`${selectedOptions[1]}${
											selectedOptions.length > 1 ? ` + ${selectedOptions.length - 1} others` : ''
										}`}
									</span>
								</>
							) : (
								<span>Filter by type</span>
							)}
							<Ariakit.SelectArrow />
						</Ariakit.Select>
						<Ariakit.SelectPopover
							unmountOnHide
							gutter={6}
							hideOnInteractOutside
							wrapperProps={{
								className: 'max-sm:!fixed max-sm:!bottom-0 max-sm:!top-[unset] max-sm:!transform-none max-sm:!w-full'
							}}
							className="flex flex-col bg-[var(--bg1)] rounded-md z-10 overflow-auto overscroll-contain min-w-[180px] max-h-[60vh] border border-[hsl(204,20%,88%)] dark:border-[hsl(204,3%,32%)] max-sm:drawer"
						>
							<span className="sticky z-[1] top-0 flex flex-wrap justify-between gap-1 bg-[var(--bg1)] text-[var(--link)] text-xs border-b border-black/10 dark:border-white/10">
								<button
									onClick={() => {
										router.push(
											{
												pathname: router.pathname,
												query: {
													...router.query,
													type: 'None'
												}
											},
											undefined,
											{ shallow: true }
										)
									}}
									className="p-3"
								>
									Clear
								</button>
								<button
									onClick={() => {
										router.push(
											{
												pathname: router.pathname,
												query: {
													...router.query,
													type: 'All'
												}
											},
											undefined,
											{ shallow: true }
										)
									}}
									className="p-3"
								>
									Toggle all
								</button>
							</span>

							{options.map((value) => (
								<Ariakit.SelectItem
									key={`calendar-type-${value}`}
									value={value}
									className="flex items-center justify-between gap-4 py-2 px-3 flex-shrink-0 hover:bg-[var(--primary1-hover)] focus-visible:bg-[var(--primary1-hover)] data-[active-item]:bg-[var(--primary1-hover)] cursor-pointer last-of-type:rounded-b-md border-b border-black/10 dark:border-white/10"
								>
									<span>{value}</span>
									<Ariakit.SelectItemCheck className="h-3 w-3 flex items-center justify-center rounded-sm flex-shrink-0 border border-[#28a2b5]" />
								</Ariakit.SelectItem>
							))}
						</Ariakit.SelectPopover>
					</Ariakit.SelectProvider>

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
							className="border border-black/10 dark:border-white/10 w-full p-[6px] pl-7 bg-white dark:bg-black text-black dark:text-white rounded-md text-sm"
						/>
					</div>
				</div>
				<VirtualTable instance={instance} />
			</div>
		</Layout>
	)
}
