import { ColumnDef, getCoreRowModel, getSortedRowModel, SortingState, useReactTable } from '@tanstack/react-table'
import { useMemo, useState } from 'react'
import { maxAgeForNext } from '~/api'
import { getSimpleProtocolsPageData } from '~/api/categories/protocols'
import { basicPropertiesToKeep } from '~/api/categories/protocols/utils'
import { Bookmark } from '~/components/Bookmark'
import { IconsRow } from '~/components/IconsRow'
import { BasicLink } from '~/components/Link'
import { IProtocolRow } from '~/components/Table/Defi/Protocols/types'
import { VirtualTable } from '~/components/Table/Table'
import { splitArrayByFalsyValues } from '~/components/Table/utils'
import { TokenLogo } from '~/components/TokenLogo'
import { useCalcStakePool2Tvl } from '~/hooks/data'
import Layout from '~/layout'
import { formattedNum, renderPercentChange, slug, tokenIconUrl } from '~/utils'
import { withPerformanceLogging } from '~/utils/perf'

const GAINERS_SORTING_STATE: SortingState = [{ id: 'change_1d', desc: true }]
const LOSERS_SORTING_STATE: SortingState = [{ id: 'change_1d', desc: false }]

const topGainersAndLosersColumns: ColumnDef<IProtocolRow>[] = [
	{
		header: 'Name',
		accessorKey: 'name',
		enableSorting: false,
		cell: ({ getValue, row }) => {
			const value = getValue() as string

			return (
				<span
					className="relative flex items-center gap-2"
					style={{ paddingLeft: row.depth ? row.depth * 48 : row.depth === 0 ? 24 : 0 }}
				>
					<Bookmark readableName={value} data-lgonly data-bookmark />
					<span className="vf-row-index shrink-0" aria-hidden="true" />
					<TokenLogo logo={tokenIconUrl(value)} data-lgonly />
					<BasicLink
						href={`/protocol/${slug(value)}`}
						className="overflow-hidden text-sm font-medium text-ellipsis whitespace-nowrap text-(--link-text) hover:underline"
					>{`${value}`}</BasicLink>
				</span>
			)
		},
		size: 260
	},
	{
		header: 'Chains',
		accessorKey: 'chains',
		enableSorting: false,
		cell: ({ getValue }) => <IconsRow links={getValue() as Array<string>} url="/chain" iconType="chain" />,
		meta: {
			align: 'end',
			headerHelperText: "Chains are ordered by protocol's highest TVL on each chain"
		},
		size: 200
	},
	{
		header: 'TVL',
		accessorKey: 'tvl',
		cell: ({ getValue }) => {
			return <>{formattedNum(getValue(), true)}</>
		},
		meta: {
			align: 'end'
		},
		size: 100
	},
	{
		header: '1d TVL Change',
		accessorKey: 'change_1d',
		cell: ({ getValue }) => <>{renderPercentChange(getValue())}</>,
		meta: {
			align: 'end',
			headerHelperText: 'Change in TVL in the last 24 hours'
		},
		size: 140
	},
	{
		header: 'Mcap/TVL',
		accessorKey: 'mcaptvl',
		cell: (info) => {
			return <>{(info.getValue() ?? null) as string | null}</>
		},
		size: 120,
		meta: {
			align: 'end'
		}
	}
]

function TopGainersAndLosersTable({ data, sortingState }: { data: Array<IProtocolRow>; sortingState: SortingState }) {
	const [sorting, setSorting] = useState<SortingState>(sortingState)

	const instance = useReactTable({
		data,
		columns: topGainersAndLosersColumns,
		state: {
			sorting
		},
		defaultColumn: {
			sortUndefined: 'last'
		},
		onSortingChange: setSorting,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel()
	})

	return <VirtualTable instance={instance} />
}

export const getStaticProps = withPerformanceLogging('top-gainers-and-losers', async () => {
	const { protocols } = await getSimpleProtocolsPageData([...basicPropertiesToKeep, 'extraTvl'])

	return {
		props: {
			protocols
		},
		revalidate: maxAgeForNext([22])
	}
})

export default function TopGainersLosers({ protocols }) {
	const data = useCalcStakePool2Tvl(protocols)
	const { topGainers, topLosers } = useMemo(() => {
		const values = splitArrayByFalsyValues(data, 'change_1d')
		const sortedData = values[0].sort((a, b) => b['change_1d'] - a['change_1d'])

		return {
			topGainers: sortedData.slice(0, 5),
			topLosers: sortedData.slice(-5).reverse()
		}
	}, [data])

	return (
		<Layout
			title={`Top Gainers and Losers - DefiLlama`}
			description={`Top Gainers and Losers by their TVL. DefiLlama is committed to providing accurate data without ads or sponsored content, as well as transparency.`}
			keywords={`top gainers, top losers, defi top gainers, defi top losers, top gainers and losers by tvl`}
			canonicalUrl={`/top-gainers-and-losers`}
		>
			<div className="rounded-md border border-(--cards-border) bg-(--cards-bg)">
				<h1 className="p-3 text-xl font-semibold">Top Gainers</h1>
				<TopGainersAndLosersTable data={topGainers} sortingState={GAINERS_SORTING_STATE} />
			</div>

			<div className="rounded-md border border-(--cards-border) bg-(--cards-bg)">
				<h1 className="p-3 text-xl font-semibold">Top Losers</h1>
				<TopGainersAndLosersTable data={topLosers} sortingState={LOSERS_SORTING_STATE} />
			</div>
		</Layout>
	)
}
