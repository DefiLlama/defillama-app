import {
	type ColumnFiltersState,
	createColumnHelper,
	getCoreRowModel,
	getFilteredRowModel,
	getSortedRowModel,
	type SortingState,
	useReactTable
} from '@tanstack/react-table'
import { useRouter } from 'next/router'
import * as React from 'react'
import { Icon } from '~/components/Icon'
import { IconsRow } from '~/components/IconsRow'
import { toChainIconItems } from '~/components/IconsRow/utils'
import { BasicLink } from '~/components/Link'
import { VirtualTable } from '~/components/Table/Table'
import { useTableSearch } from '~/components/Table/utils'
import { Tooltip } from '~/components/Tooltip'
import { getInvestorsPageData } from '~/containers/Raises/queries'
import type { IInvestorsPageData, IInvestorTimespan } from '~/containers/Raises/types'
import Layout from '~/layout'
import { formattedNum, slug } from '~/utils'
import { maxAgeForNext } from '~/utils/maxAgeForNext'
import { withPerformanceLogging } from '~/utils/perf'
import { pushShallowQuery } from '~/utils/routerQuery'

interface INormalizedInvestor extends IInvestorTimespan {
	name: string
}

const columnHelper = createColumnHelper<INormalizedInvestor>()

export const getStaticProps = withPerformanceLogging('raises/active-investors', async () => {
	const data = await getInvestorsPageData()

	return {
		props: data,
		revalidate: maxAgeForNext([22])
	}
})

const pageName = ['Investors']

const columns = [
	columnHelper.accessor('name', {
		header: 'Investor',
		enableSorting: false,
		cell: ({ getValue }) => {
			return (
				<BasicLink
					href={`/raises/${slug(getValue())}`}
					className="overflow-hidden text-sm font-medium text-ellipsis whitespace-nowrap text-(--link-text) hover:underline"
				>
					{getValue()}
				</BasicLink>
			)
		},
		meta: {
			headerClassName: 'w-[min(200px,40vw)]'
		}
	}),
	columnHelper.accessor('deals', {
		header: 'Deals',
		meta: {
			headerClassName: 'w-[120px]',
			align: 'end'
		}
	}),
	columnHelper.accessor((row) => (row.medianAmount ? row.medianAmount * 1e6 : null), {
		id: 'medianAmount',
		header: 'Median Amount',
		cell: (info) => (info.getValue() != null ? formattedNum(info.getValue(), true) : null),
		meta: {
			headerClassName: 'w-[140px]',
			align: 'end'
		}
	}),
	columnHelper.accessor('chains', {
		header: 'Chains',
		enableSorting: false,
		cell: ({ getValue }) => <IconsRow items={toChainIconItems(getValue())} />,
		meta: {
			headerClassName: 'w-[100px]',
			align: 'end'
		}
	}),

	columnHelper.accessor('topCategory', {
		header: 'Top Project Category',
		enableSorting: false,
		meta: {
			headerClassName: 'w-[min(180px,40vw)]'
		}
	}),
	columnHelper.accessor('topRound', {
		header: 'Top Round Type',
		enableSorting: false,
		meta: {
			headerClassName: 'w-[140px]'
		}
	}),
	columnHelper.accessor('projects', {
		header: 'Projects',
		enableSorting: false,
		cell: ({ getValue }) => {
			return (
				<Tooltip content={getValue()}>
					<span className="line-clamp-1 min-w-0 overflow-x-hidden text-ellipsis whitespace-normal">{getValue()}</span>
				</Tooltip>
			)
		},
		meta: {
			headerClassName: 'w-[min(240px,40vw)]'
		}
	})
]

const allPeriods = [
	{ value: 'allTime', label: 'All Time' },
	{ value: '30d', label: '30d' },
	{ value: '180d', label: '180d' },
	{ value: '1y', label: '1y' }
]
const validPeriods = new Set(allPeriods.map((p) => p.value))

const ActiveInvestors = ({ investors }: IInvestorsPageData) => {
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

	const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])

	const instance = useReactTable({
		data: normalizedData,
		columns,
		state: {
			columnFilters,
			sorting
		},
		defaultColumn: {
			sortUndefined: 'last'
		},
		enableSortingRemoval: false,
		onSortingChange: (updater) => React.startTransition(() => setSorting(updater)),
		onColumnFiltersChange: (updater) => React.startTransition(() => setColumnFilters(updater)),
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getFilteredRowModel: getFilteredRowModel()
	})

	const [_investorName, setInvestorName] = useTableSearch({ instance, columnToSearch: 'name' })

	return (
		<Layout
			title={`Crypto & DeFi Investors Directory - DefiLlama`}
			description="Browse crypto and DeFi investors by deal count, total funding, and portfolio. Explore VC activity and investment trends on DefiLlama."
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
							onInput={(e) => setInvestorName(e.currentTarget.value)}
							placeholder="Search investors..."
							className="w-full rounded-md border border-(--form-control-border) bg-white p-1 pl-7 text-black dark:bg-black dark:text-white"
						/>
					</label>
					<div className="flex w-fit flex-nowrap items-center overflow-x-auto rounded-md border border-(--form-control-border) text-(--text-form)">
						{allPeriods.map((dataInterval) => (
							<button
								className="shrink-0 px-2 py-1.5 text-xs font-medium whitespace-nowrap hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) data-[active=true]:bg-(--old-blue) data-[active=true]:text-white"
								data-active={dataInterval.value === selectedPeriod}
								onClick={() => {
									void pushShallowQuery(router, { period: dataInterval.value })
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
