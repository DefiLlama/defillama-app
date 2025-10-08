import * as React from 'react'
import { useRouter } from 'next/router'
import {
	ColumnDef,
	ColumnFiltersState,
	getCoreRowModel,
	getFilteredRowModel,
	getSortedRowModel,
	SortingState,
	useReactTable
} from '@tanstack/react-table'
import { maxAgeForNext } from '~/api'
import { Icon } from '~/components/Icon'
import { IconsRow } from '~/components/IconsRow'
import { BasicLink } from '~/components/Link'
import { VirtualTable } from '~/components/Table/Table'
import { Tooltip } from '~/components/Tooltip'
import { RAISES_API } from '~/constants'
import { IRaises } from '~/containers/ChainOverview/types'
import Layout from '~/layout'
import { formattedNum, slug } from '~/utils'
import { fetchJson } from '~/utils/async'
import { withPerformanceLogging } from '~/utils/perf'

interface ITimespan {
	topCategory: string | null
	topRound: string | null
	amounts: Array<number>
	deals: number
}

interface IDealTimespan extends ITimespan {
	projects: Set<string>
	chains: Set<string>
	topAmount: number
}

interface IInvestorTimespan extends ITimespan {
	projects: string
	chains: Array<string>
	medianAmount: number
}

interface IInvestor {
	name: string
	last30d: IInvestorTimespan
	last180d: IInvestorTimespan
	last1y: IInvestorTimespan
	allTime: IInvestorTimespan
}

interface INormalizedInvestor extends IInvestorTimespan {
	name: string
}

function calculateMedian(amounts: Array<number>) {
	if (amounts.length === 0) return 0

	const sorted = [...amounts].sort((a, b) => a - b)
	const mid = Math.floor(sorted.length / 2)

	return sorted.length % 2 === 0
		? (sorted[mid - 1] + sorted[mid]) / 2 // Even number of items
		: sorted[mid] // Odd number of items
}

export const getStaticProps = withPerformanceLogging('raises/active-investors', async () => {
	const data: { raises: Array<IRaises> } = await fetchJson(RAISES_API)

	const deals: Record<
		string,
		{
			name: string
			last30d: IDealTimespan
			last180d: IDealTimespan
			last1y: IDealTimespan
			allTime: IDealTimespan
		}
	> = {}
	for (const raise of data.raises ?? []) {
		for (const lead of raise.leadInvestors) {
			deals[lead] = deals[lead] || {
				name: lead,
				last30d: {
					topCategory: null,
					topRound: null,
					topAmount: 0,
					amounts: [],
					projects: new Set(),
					chains: new Set(),
					deals: 0
				},
				last180d: {
					topCategory: null,
					topRound: null,
					topAmount: 0,
					amounts: [],
					projects: new Set(),
					chains: new Set(),
					deals: 0
				},
				last1y: {
					topCategory: null,
					topRound: null,
					topAmount: 0,
					amounts: [],
					projects: new Set(),
					chains: new Set(),
					deals: 0
				},
				allTime: {
					topCategory: null,
					topRound: null,
					topAmount: 0,
					amounts: [],
					projects: new Set(),
					chains: new Set(),
					deals: 0
				}
			}
			if (raise.date * 1000 >= Date.now() - 30 * 24 * 60 * 60 * 1000) {
				deals[lead].last30d.deals = (deals[lead].last30d.deals ?? 0) + 1
				deals[lead].last30d.projects.add(raise.name)
				for (const chain of raise.chains ?? []) {
					deals[lead].last30d.chains.add(chain)
				}
				if (raise.amount) {
					deals[lead].last30d.amounts.push(raise.amount)
				}
				if (raise.amount && raise.amount > deals[lead].last30d.topAmount) {
					deals[lead].last30d.topCategory = raise.category ?? null
					deals[lead].last30d.topRound = raise.round ?? null
					deals[lead].last30d.topAmount = raise.amount
				}
			}
			if (raise.date * 1000 >= Date.now() - 180 * 24 * 60 * 60 * 1000) {
				deals[lead].last180d.deals = (deals[lead].last180d.deals || 0) + 1
				deals[lead].last180d.projects.add(raise.name)
				for (const chain of raise.chains ?? []) {
					deals[lead].last180d.chains.add(chain)
				}
				if (raise.amount) {
					deals[lead].last180d.amounts.push(raise.amount)
				}
				if (raise.amount && raise.amount > deals[lead].last180d.topAmount) {
					deals[lead].last180d.topCategory = raise.category ?? null
					deals[lead].last180d.topRound = raise.round ?? null
					deals[lead].last180d.topAmount = raise.amount
				}
			}
			if (raise.date * 1000 >= Date.now() - 365 * 24 * 60 * 60 * 1000) {
				deals[lead].last1y.deals = (deals[lead].last1y.deals || 0) + 1
				deals[lead].last1y.projects.add(raise.name)
				for (const chain of raise.chains ?? []) {
					deals[lead].last1y.chains.add(chain)
				}
				if (raise.amount) {
					deals[lead].last1y.amounts.push(raise.amount)
				}
				if (raise.amount && raise.amount > deals[lead].last1y.topAmount) {
					deals[lead].last1y.topCategory = raise.category ?? null
					deals[lead].last1y.topRound = raise.round ?? null
					deals[lead].last1y.topAmount = raise.amount
				}
			}
			deals[lead].allTime.deals = (deals[lead].allTime.deals ?? 0) + 1
			deals[lead].allTime.projects.add(raise.name)
			for (const chain of raise.chains ?? []) {
				deals[lead].allTime.chains.add(chain)
			}
			if (raise.amount) {
				deals[lead].allTime.amounts.push(raise.amount)
			}
			if (raise.amount && raise.amount > deals[lead].allTime.topAmount) {
				deals[lead].allTime.topCategory = raise.category ?? null
				deals[lead].allTime.topRound = raise.round ?? null
				deals[lead].allTime.topAmount = raise.amount
			}
		}
	}
	const investors: IInvestor[] = []
	for (const investor in deals) {
		const investorData = deals[investor]
		const last30d = investorData.last30d
		const last180d = investorData.last180d
		const last1y = investorData.last1y
		const allTime = investorData.allTime
		investors.push({
			name: investor,
			last30d: {
				...last30d,
				projects: Array.from(last30d.projects).join(', '),
				chains: Array.from(last30d.chains),
				medianAmount: calculateMedian(last30d.amounts)
			},
			last180d: {
				...last180d,
				projects: Array.from(last180d.projects).join(', '),
				chains: Array.from(last180d.chains),
				medianAmount: calculateMedian(last180d.amounts)
			},
			last1y: {
				...last1y,
				projects: Array.from(last1y.projects).join(', '),
				chains: Array.from(last1y.chains),
				medianAmount: calculateMedian(last1y.amounts)
			},
			allTime: {
				...allTime,
				projects: Array.from(allTime.projects).join(', '),
				chains: Array.from(allTime.chains),
				medianAmount: calculateMedian(allTime.amounts)
			}
		})
	}

	return {
		props: {
			investors
		},
		revalidate: maxAgeForNext([22])
	}
})

const pageName = ['Investors']

const columns: ColumnDef<INormalizedInvestor>[] = [
	{
		header: 'Investor',
		accessorKey: 'name',
		enableSorting: false,
		cell: ({ getValue }) => {
			return (
				<BasicLink
					href={`/raises/${slug(getValue() as string)}`}
					className="overflow-hidden text-sm font-medium text-ellipsis whitespace-nowrap text-(--link-text) hover:underline"
				>
					{getValue() as string}
				</BasicLink>
			)
		},
		size: 200
	},
	{
		header: 'Deals',
		accessorKey: 'deals',
		size: 120,
		meta: {
			align: 'end'
		}
	},
	{
		header: 'Median Amount',
		id: 'medianAmount',
		accessorFn: (row) => (row.medianAmount ? row.medianAmount * 1e6 : null),
		cell: ({ getValue }) => {
			return <>{(getValue() as number) ? formattedNum(getValue() as number, true) : null}</>
		},
		size: 140,
		meta: {
			align: 'end'
		}
	},
	{
		header: 'Chains',
		accessorKey: 'chains',
		enableSorting: false,
		cell: ({ getValue }) => <IconsRow links={getValue() as Array<string>} url="/bridges" iconType="chain" />,
		size: 100,
		meta: {
			align: 'end'
		}
	},

	{
		header: 'Top Project Category',
		accessorKey: 'topCategory',
		enableSorting: false,
		size: 180
	},
	{
		header: 'Top Round Type',
		accessorKey: 'topRound',
		enableSorting: false,
		size: 140
	},
	{
		header: 'Projects',
		accessorKey: 'projects',
		enableSorting: false,
		cell: ({ getValue }) => {
			return (
				<Tooltip content={getValue() as string}>
					<span className="line-clamp-1 min-w-0 overflow-x-hidden text-ellipsis whitespace-normal">
						{getValue() as string}
					</span>
				</Tooltip>
			)
		},
		size: 240
	}
]

const allPeriods = [
	{ value: 'allTime', label: 'All Time' },
	{ value: '30d', label: '30d' },
	{ value: '180d', label: '180d' },
	{ value: '1y', label: '1y' }
]
const validPeriods = new Set(allPeriods.map((p) => p.value))

const ActiveInvestors = ({ investors }: { investors: IInvestor[] }) => {
	const router = useRouter()
	const { period } = router.query
	const selectedPeriod = typeof period === 'string' && validPeriods.has(period) ? period : allPeriods[0].value

	const [sorting, setSorting] = React.useState<SortingState>([{ desc: true, id: 'deals' }])

	const normalizedData: Array<INormalizedInvestor> = React.useMemo(() => {
		return investors
			.map((d) => {
				const dataInInterval =
					selectedPeriod === 'allTime'
						? d.allTime
						: selectedPeriod === '30d'
							? d.last30d
							: selectedPeriod === '180d'
								? d.last180d
								: d.last1y
				return {
					name: d.name,
					...dataInInterval
				}
			})
			.sort((a, b) => b.deals - a.deals)
	}, [investors, selectedPeriod])

	const [investorName, setInvestorName] = React.useState('')

	const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])

	const instance = useReactTable({
		data: normalizedData,
		columns,
		state: {
			columnFilters,
			sorting
		},
		onSortingChange: setSorting,
		onColumnFiltersChange: setColumnFilters,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getFilteredRowModel: getFilteredRowModel()
	})

	React.useEffect(() => {
		const projectsColumns = instance.getColumn('name')
		const id = setTimeout(() => {
			projectsColumns.setFilterValue(investorName)
		}, 200)
		return () => clearTimeout(id)
	}, [investorName, instance])

	return (
		<Layout
			title={`Investors - DefiLlama`}
			description={`Deals by Investors. DefiLlama is committed to providing accurate data without ads or sponsored content, as well as transparency.`}
			keywords={`cryptoinvestors, defi investors, blockchain investors, latest blockchain deals`.toLowerCase()}
			canonicalUrl={`/raises/investors`}
			pageName={pageName}
		>
			<div className="rounded-md border border-(--cards-border) bg-(--cards-bg)">
				<div className="flex flex-wrap items-center justify-end gap-2 p-3">
					<h1 className="mr-auto text-xl font-semibold">Deals by Investors</h1>
					<label className="relative w-full sm:max-w-[280px]">
						<span className="sr-only">Search investors...</span>
						<Icon
							name="search"
							height={16}
							width={16}
							className="absolute top-0 bottom-0 left-2 my-auto text-(--text-tertiary)"
						/>
						<input
							name="search"
							value={investorName}
							onChange={(e) => {
								setInvestorName(e.target.value)
							}}
							placeholder="Search investors..."
							className="w-full rounded-md border border-(--form-control-border) bg-white p-1 pl-7 text-black max-sm:py-0.5 dark:bg-black dark:text-white"
						/>
					</label>
					<div className="flex w-fit flex-nowrap items-center overflow-x-auto rounded-md border border-(--form-control-border) text-(--text-form)">
						{allPeriods.map((dataInterval) => (
							<button
								className="shrink-0 px-2 py-1.5 text-xs font-medium whitespace-nowrap hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) data-[active=true]:bg-(--old-blue) data-[active=true]:text-white"
								data-active={dataInterval.value === selectedPeriod}
								onClick={() => {
									router.push(
										{
											pathname: router.pathname,
											query: {
												...router.query,
												period: dataInterval.value
											}
										},
										undefined,
										{ shallow: true }
									)
								}}
								key={`deals-period-${dataInterval.value}`}
							>
								{dataInterval.label}
							</button>
						))}
					</div>
				</div>
				<VirtualTable instance={instance} />
			</div>
		</Layout>
	)
}

export default ActiveInvestors
