import * as React from 'react'
import { useRouter } from 'next/router'
import * as Ariakit from '@ariakit/react'
import {
	ColumnFiltersState,
	getCoreRowModel,
	getFilteredRowModel,
	getSortedRowModel,
	SortingState,
	useReactTable
} from '@tanstack/react-table'
import { maxAgeForNext } from '~/api'
import { Announcement } from '~/components/Announcement'
import { Icon } from '~/components/Icon'
import { calendarColumns } from '~/components/Table/Defi/columns'
import { VirtualTable } from '~/components/Table/Table'
import { PROTOCOL_EMISSIONS_API } from '~/constants'
import calendarEvents from '~/constants/calendar'
import Layout from '~/layout'
import { formatPercentage } from '~/utils'
import { fetchJson } from '~/utils/async'
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticProps = withPerformanceLogging('calendar', async () => {
	const res = await fetchJson(PROTOCOL_EMISSIONS_API).catch(() => [])

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

		const tSymbol = protocol.name === 'LooksRare' ? 'LOOKS' : (protocol.tokenPrice?.[0]?.symbol ?? null)

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
		<Layout
			title={`Calendar - DefiLlama`}
			description={`Crypto calendar on DefiLlama. DefiLlama is committed to providing accurate data without ads or sponsored content, as well as transparency.`}
			keywords={`crypto calendar, defillama`}
			canonicalUrl={`/calendar`}
		>
			<Announcement notCancellable>Want us to track other events? Tweet at @0xngmi on twitter!</Announcement>

			<div className="rounded-md border border-(--cards-border) bg-(--cards-bg)">
				<div className="flex flex-wrap items-center gap-4 p-3 *:last:ml-auto">
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
						<Ariakit.Select className="flex cursor-pointer flex-nowrap items-center gap-2 rounded-md bg-(--btn-bg) px-3 py-2 text-xs text-(--text-primary) hover:bg-(--btn-hover-bg) focus-visible:bg-(--btn-hover-bg)">
							{selectedOptions.length > 0 ? (
								<>
									<span>Type: </span>
									<span className="text-(--link)">
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
								className: 'max-sm:fixed! max-sm:bottom-0! max-sm:top-[unset]! max-sm:transform-none! max-sm:w-full!'
							}}
							className="max-sm:drawer z-10 flex max-h-[60vh] min-w-[180px] flex-col overflow-auto overscroll-contain rounded-md border border-[hsl(204,20%,88%)] bg-(--bg-main) max-sm:rounded-b-none dark:border-[hsl(204,3%,32%)]"
						>
							<Ariakit.PopoverDismiss className="ml-auto p-2 opacity-50 sm:hidden">
								<Icon name="x" className="h-5 w-5" />
							</Ariakit.PopoverDismiss>

							<span className="sticky top-0 z-1 flex flex-wrap justify-between gap-1 border-b border-(--form-control-border) bg-(--bg-main) text-xs text-(--link)">
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
									className="flex shrink-0 cursor-pointer items-center justify-between gap-4 border-b border-(--form-control-border) px-3 py-2 last-of-type:rounded-b-md hover:bg-(--primary-hover) focus-visible:bg-(--primary-hover) data-active-item:bg-(--primary-hover)"
								>
									<span>{value}</span>
									<Ariakit.SelectItemCheck className="flex h-3 w-3 shrink-0 items-center justify-center rounded-xs border border-[#28a2b5]" />
								</Ariakit.SelectItem>
							))}
						</Ariakit.SelectPopover>
					</Ariakit.SelectProvider>

					<label className="relative w-full sm:max-w-[280px]">
						<span className="sr-only">Search events...</span>
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
							placeholder="Search events..."
							className="w-full rounded-md border border-(--form-control-border) bg-white p-1 py-0.5 pl-7 text-base text-black dark:bg-black dark:text-white"
						/>
					</label>
				</div>
				<VirtualTable instance={instance} />
			</div>
		</Layout>
	)
}
