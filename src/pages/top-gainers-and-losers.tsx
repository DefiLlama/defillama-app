import {
	type ColumnDef,
	getCoreRowModel,
	getSortedRowModel,
	type SortingState,
	useReactTable
} from '@tanstack/react-table'
import type { InferGetStaticPropsType } from 'next'
import { useMemo, useState } from 'react'
import { Bookmark } from '~/components/Bookmark'
import { IconsRow } from '~/components/IconsRow'
import { BasicLink } from '~/components/Link'
import { PercentChange } from '~/components/PercentChange'
import { VirtualTable } from '~/components/Table/Table'
import { splitArrayByFalsyValues } from '~/components/Table/utils'
import { TokenLogo } from '~/components/TokenLogo'
import { fetchProtocols } from '~/containers/Protocols/api'
import type { ProtocolsResponse } from '~/containers/Protocols/api.types'
import { TVL_SETTINGS_KEYS_SET, useLocalStorageSettingsManager } from '~/contexts/LocalStorage'
import Layout from '~/layout'
import { formattedNum, getPercentChange, slug, tokenIconUrl } from '~/utils'
import { maxAgeForNext } from '~/utils/maxAgeForNext'
import { withPerformanceLogging } from '~/utils/perf'

const GAINERS_SORTING_STATE: SortingState = [{ id: 'change_1d', desc: true }]
const LOSERS_SORTING_STATE: SortingState = [{ id: 'change_1d', desc: false }]

type RawProtocol = ProtocolsResponse['protocols'][number]
type ExtraTvlEntry = {
	tvl: number | null
	tvlPrevDay: number | null
	tvlPrevWeek: number | null
	tvlPrevMonth: number | null
}
type ProtocolBaseRow = RawProtocol & {
	extraTvl: Record<string, ExtraTvlEntry>
}
type ProtocolRow = ProtocolBaseRow & {
	change_1d: number | null
	change_7d: number | null
	change_1m: number | null
	mcaptvl: number | null
}

const topGainersAndLosersColumns: ColumnDef<ProtocolRow>[] = [
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
		cell: ({ getValue }) => (
			<>
				<PercentChange percent={getValue()} />
			</>
		),
		meta: {
			align: 'end',
			headerHelperText: 'Change in TVL in the last 24 hours'
		},
		size: 140
	},
	{
		header: 'Mcap/TVL',
		accessorKey: 'mcaptvl',
		cell: (info) => info.getValue<number | null>(),
		size: 120,
		meta: {
			align: 'end'
		}
	}
]

function TopGainersAndLosersTable({ data, sortingState }: { data: Array<ProtocolRow>; sortingState: SortingState }) {
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
		enableSortingRemoval: false,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel()
	})

	return <VirtualTable instance={instance} />
}

export const getStaticProps = withPerformanceLogging('top-gainers-and-losers', async () => {
	const { protocols } = await fetchProtocols()

	const rows: ProtocolBaseRow[] = protocols.map((protocol) => {
		const extraTvl: Record<string, ExtraTvlEntry> = {}
		for (const key in protocol.chainTvls) {
			if (TVL_SETTINGS_KEYS_SET.has(key)) {
				extraTvl[key] = protocol.chainTvls[key]
			}
		}

		return {
			...protocol,
			extraTvl
		}
	})

	return {
		props: {
			protocols: rows
		},
		revalidate: maxAgeForNext([22])
	}
})

export default function TopGainersLosers({ protocols }: InferGetStaticPropsType<typeof getStaticProps>) {
	const [tvlSettings] = useLocalStorageSettingsManager('tvl')
	const data = useMemo<Array<ProtocolRow>>(() => {
		return protocols.map((protocol) => {
			let finalTvl: number | null = protocol.tvl
			let finalTvlPrevDay: number | null = protocol.tvlPrevDay
			let finalTvlPrevWeek: number | null = protocol.tvlPrevWeek
			let finalTvlPrevMonth: number | null = protocol.tvlPrevMonth

			for (const extraTvlType in protocol.extraTvl ?? {}) {
				const key = extraTvlType.toLowerCase()
				const entry = protocol.extraTvl?.[extraTvlType]
				if (!entry || !tvlSettings[key] || key === 'doublecounted' || key === 'liquidstaking') continue

				const { tvl, tvlPrevDay, tvlPrevWeek, tvlPrevMonth } = entry
				if (tvl != null) finalTvl = (finalTvl ?? 0) + tvl
				if (tvlPrevDay != null) finalTvlPrevDay = (finalTvlPrevDay ?? 0) + tvlPrevDay
				if (tvlPrevWeek != null) finalTvlPrevWeek = (finalTvlPrevWeek ?? 0) + tvlPrevWeek
				if (tvlPrevMonth != null) finalTvlPrevMonth = (finalTvlPrevMonth ?? 0) + tvlPrevMonth
			}

			const tvl = finalTvl != null && finalTvl < 0 ? 0 : (finalTvl ?? 0)
			const tvlPrevDay = finalTvlPrevDay != null && finalTvlPrevDay < 0 ? 0 : (finalTvlPrevDay ?? 0)
			const tvlPrevWeek = finalTvlPrevWeek != null && finalTvlPrevWeek < 0 ? 0 : (finalTvlPrevWeek ?? 0)
			const tvlPrevMonth = finalTvlPrevMonth != null && finalTvlPrevMonth < 0 ? 0 : (finalTvlPrevMonth ?? 0)
			const mcaptvl = protocol.mcap != null && tvl !== 0 ? +(protocol.mcap / tvl).toFixed(2) : null

			return {
				...protocol,
				tvl,
				tvlPrevDay,
				tvlPrevWeek,
				tvlPrevMonth,
				change_1d: getPercentChange(tvl, tvlPrevDay),
				change_7d: getPercentChange(tvl, tvlPrevWeek),
				change_1m: getPercentChange(tvl, tvlPrevMonth),
				mcaptvl
			}
		})
	}, [protocols, tvlSettings])

	const { topGainers, topLosers } = useMemo(() => {
		const values = splitArrayByFalsyValues(data, 'change_1d')
		const sortedData = values[0].sort((a, b) => b['change_1d'] - a['change_1d'])
		const n = sortedData.length
		const topCount = Math.min(5, n)
		const bottomCount = Math.min(5, n - topCount)

		return {
			topGainers: sortedData.slice(0, topCount),
			topLosers: bottomCount > 0 ? sortedData.slice(-bottomCount).reverse() : []
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
				<TopGainersAndLosersTable key="gainers-change_1d" data={topGainers} sortingState={GAINERS_SORTING_STATE} />
			</div>

			<div className="rounded-md border border-(--cards-border) bg-(--cards-bg)">
				<h1 className="p-3 text-xl font-semibold">Top Losers</h1>
				<TopGainersAndLosersTable key="losers-change_1d" data={topLosers} sortingState={LOSERS_SORTING_STATE} />
			</div>
		</Layout>
	)
}
