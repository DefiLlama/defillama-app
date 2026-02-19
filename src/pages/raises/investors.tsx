import {
	type ColumnDef,
	type ColumnFiltersState,
	getCoreRowModel,
	getFilteredRowModel,
	getSortedRowModel,
	type SortingState,
	useReactTable
} from '@tanstack/react-table'
import { useRouter } from 'next/router'
import * as React from 'react'
import { maxAgeForNext } from '~/api'
import { Icon } from '~/components/Icon'
import { IconsRow } from '~/components/IconsRow'
import { BasicLink } from '~/components/Link'
import { VirtualTable } from '~/components/Table/Table'
import { useTableSearch } from '~/components/Table/utils'
import { Tooltip } from '~/components/Tooltip'
import { getInvestorsPageData } from '~/containers/Raises/queries'
import type { IInvestorsPageData, IInvestorTimespan } from '~/containers/Raises/types'
import Layout from '~/layout'
import { formattedNum, slug } from '~/utils'
import { withPerformanceLogging } from '~/utils/perf'
import { pushShallowQuery } from '~/utils/routerQuery'

interface INormalizedInvestor extends IInvestorTimespan {
	name: string
}

export const getStaticProps = withPerformanceLogging('raises/active-investors', async () => {
	const data = await getInvestorsPageData()

	return {
		props: data,
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
		onSortingChange: setSorting,
		onColumnFiltersChange: setColumnFilters,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getFilteredRowModel: getFilteredRowModel()
	})

	const [investorName, setInvestorName] = useTableSearch({ instance, columnToSearch: 'name' })

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
							className="w-full rounded-md border border-(--form-control-border) bg-white p-1 pl-7 text-black dark:bg-black dark:text-white"
						/>
					</label>
					<div className="flex w-fit flex-nowrap items-center overflow-x-auto rounded-md border border-(--form-control-border) text-(--text-form)">
						{allPeriods.map((dataInterval) => (
							<button
								className="shrink-0 px-2 py-1.5 text-xs font-medium whitespace-nowrap hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) data-[active=true]:bg-(--old-blue) data-[active=true]:text-white"
								data-active={dataInterval.value === selectedPeriod}
								onClick={() => {
									pushShallowQuery(router, { period: dataInterval.value })
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
