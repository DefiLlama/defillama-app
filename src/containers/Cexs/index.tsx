import { useQueries, useQuery } from '@tanstack/react-query'
import { createColumnHelper } from '@tanstack/react-table'
import { useRouter } from 'next/router'
import { useMemo } from 'react'
import { BasicLink } from '~/components/Link'
import { QuestionHelper } from '~/components/QuestionHelper'
import { TableWithSearch } from '~/components/Table/TableWithSearch'
import { useAuthContext } from '~/containers/Subscription/auth'
import { formattedNum, slug, toNiceDayMonthAndYear } from '~/utils'
import { fetchCexInflowsProxy } from './api'
import { DateFilter } from './DateFilter'
import type { ICex } from './types'

type CexRow = ICex & { customRange: number | null }

const DEFAULT_SORTING_STATE = [{ id: 'cleanAssetsTvl', desc: true }]

const getDateTimestamp = (dateString: string | string[] | undefined): number | null => {
	if (!dateString || typeof dateString !== 'string') return null
	return Number.isNaN(Number(dateString)) ? null : Number(dateString)
}

function CustomRangeCell({ cexSlug, coin }: { cexSlug: string | null; coin: string | null }) {
	const router = useRouter()
	const { authorizedFetch } = useAuthContext()

	const startDate = getDateTimestamp(router.query.startDate)
	const endDate = getDateTimestamp(router.query.endDate)

	const { data, isLoading } = useQuery({
		queryKey: ['cex-inflows', cexSlug, startDate, endDate],
		queryFn: () => fetchCexInflowsProxy(cexSlug!, startDate! / 1e3, endDate! / 1e3, coin ?? '', authorizedFetch),
		staleTime: 60 * 60 * 1000,
		refetchOnWindowFocus: false,
		enabled: !!cexSlug && !!startDate && !!endDate,
		retry: false
	})

	if (!startDate || !endDate || !cexSlug) return null

	if (isLoading) {
		return (
			<span className="relative ml-auto block h-4 w-16 overflow-hidden rounded bg-black/5 dark:bg-white/10">
				<span className="pointer-events-none absolute inset-y-0 -right-1/2 -left-1/2 animate-shimmer bg-[linear-gradient(99.97deg,transparent,rgba(0,0,0,0.08),transparent)] dark:bg-[linear-gradient(99.97deg,transparent,rgba(255,255,255,0.08),transparent)]" />
			</span>
		)
	}

	const value = data?.outflows ?? null
	return (
		<span className={value == null ? '' : value < 0 ? 'text-(--error)' : value > 0 ? 'text-(--success)' : ''}>
			{value != null ? formattedNum(value, true) : ''}
		</span>
	)
}

export const Cexs = ({ cexs }: { cexs: Array<ICex> }) => {
	const router = useRouter()
	const { authorizedFetch } = useAuthContext()

	const startDate = getDateTimestamp(router.query.startDate)
	const endDate = getDateTimestamp(router.query.endDate)

	const queries = useQueries({
		queries: cexs.map((c) => ({
			queryKey: ['cex-inflows', c.slug ?? null, startDate, endDate],
			queryFn: () => fetchCexInflowsProxy(c.slug!, startDate! / 1e3, endDate! / 1e3, c.coin ?? '', authorizedFetch),
			staleTime: 60 * 60 * 1000,
			refetchOnWindowFocus: false,
			enabled: !!c.slug && !!startDate && !!endDate,
			retry: false
		}))
	})

	const enrichedData = useMemo<CexRow[]>(
		() => cexs.map((c, i) => ({ ...c, customRange: queries[i]?.data?.outflows ?? null })),
		[cexs, queries]
	)

	return (
		<>
			<TableWithSearch
				data={enrichedData}
				columns={columns}
				columnToSearch={'name'}
				placeholder={'Search exchange...'}
				header={'CEX Transparency'}
				headingAs="h1"
				customFilters={() => (
					<DateFilter startDate={startDate} endDate={endDate} key={`cexs-date-filter-${startDate}-${endDate}`} />
				)}
				csvFileName="cex-transparency"
				sortingState={DEFAULT_SORTING_STATE}
			/>
		</>
	)
}

const columnHelper = createColumnHelper<CexRow>()

const columns = [
	columnHelper.accessor('name', {
		header: 'Name',
		enableSorting: false,
		cell: ({ getValue, row }) => {
			return (
				<span className="relative flex items-center gap-2">
					<span className="vf-row-index shrink-0" aria-hidden="true" />
					{row.original.slug == null ? (
						getValue()
					) : (
						<BasicLink
							href={`/cex/${slug(row.original.slug)}`}
							className="overflow-hidden text-sm font-medium text-ellipsis whitespace-nowrap text-(--link-text) hover:underline"
						>
							{getValue()}
						</BasicLink>
					)}
				</span>
			)
		}
	}),
	columnHelper.accessor('currentTvl', {
		header: 'Assets',
		cell: (info) => {
			if (info.row.original.slug == null) {
				return (
					<QuestionHelper text="This CEX has not published a list of all hot and cold wallets" className="ml-auto" />
				)
			}
			const value = info.getValue()
			return <>{value != null ? formattedNum(value, true) : null}</>
		},
		size: 120,
		meta: {
			align: 'end',
			headerHelperText:
				'This excludes IOU assets issued by the CEX that are already counted on another chain, such as Binance-pegged BTC in BSC, which is already counted in Bitcoin chain'
		}
	}),
	columnHelper.accessor('cleanAssetsTvl', {
		header: 'Clean Assets',
		cell: (info) => {
			const coinSymbol = info.row.original.coinSymbol
			if (info.row.original.slug == null) {
				return (
					<QuestionHelper text="This CEX has not published a list of all hot and cold wallets" className="ml-auto" />
				)
			}
			const value = info.getValue()
			if (value == null) return null

			const helperText =
				coinSymbol == null
					? `Original TVL doesn't contain any coin issued by this CEX`
					: `This excludes all TVL from ${coinSymbol}, which is a token issued by this CEX`

			return (
				<span className="flex items-center justify-end gap-1">
					<QuestionHelper text={helperText} />
					<span>{formattedNum(value, true)}</span>
				</span>
			)
		},
		size: 145,
		meta: {
			align: 'end',
			headerHelperText: 'TVL of the CEX excluding all assets issued by itself, such as their own token'
		}
	}),
	columnHelper.accessor('inflows_24h', {
		header: '24h Inflows',
		size: 120,
		cell: (info) => {
			const value = info.getValue()
			return (
				<span className={value == null ? '' : value < 0 ? 'text-(--error)' : value > 0 ? 'text-(--success)' : ''}>
					{value != null ? formattedNum(value, true) : ''}
				</span>
			)
		},
		meta: {
			align: 'end'
		}
	}),
	columnHelper.accessor('inflows_1w', {
		header: '7d Inflows',
		size: 120,
		cell: (info) => {
			const value = info.getValue()
			return (
				<span className={value == null ? '' : value < 0 ? 'text-(--error)' : value > 0 ? 'text-(--success)' : ''}>
					{value != null ? formattedNum(value, true) : ''}
				</span>
			)
		},
		meta: {
			align: 'end'
		}
	}),
	columnHelper.accessor('inflows_1m', {
		header: '1m Inflows',
		size: 120,
		cell: (info) => {
			const value = info.getValue()
			return (
				<span className={value == null ? '' : value < 0 ? 'text-(--error)' : value > 0 ? 'text-(--success)' : ''}>
					{value != null ? formattedNum(value, true) : ''}
				</span>
			)
		},
		meta: {
			align: 'end'
		}
	}),
	columnHelper.accessor('spotVolume', {
		header: 'Spot Volume',
		cell: (info) => (info.getValue() != null ? formattedNum(info.getValue(), true) : null),
		size: 125,
		meta: {
			align: 'end'
		}
	}),
	columnHelper.accessor('oi', {
		header: '24h Open Interest',
		cell: (info) => (info.getValue() != null ? formattedNum(info.getValue(), true) : null),
		size: 160,
		meta: {
			align: 'end'
		}
	}),
	columnHelper.accessor('leverage', {
		header: 'Avg Leverage',
		cell: (info) => {
			const value = info.getValue()
			return value != null ? Number(Number(value).toFixed(2)) + 'x' : null
		},
		size: 130,
		meta: {
			align: 'end',
			headerHelperText: 'Open Interest / Clean Assets'
		}
	}),
	columnHelper.accessor('customRange', {
		header: 'Custom range Inflows',
		size: 200,
		cell: ({ row }) => <CustomRangeCell cexSlug={row.original.slug ?? null} coin={row.original.coin ?? null} />,
		meta: {
			align: 'end'
		}
	}),
	columnHelper.accessor('auditor', {
		header: 'Auditor',
		size: 100,
		meta: {
			align: 'end'
		}
	}),
	columnHelper.accessor('lastAuditDate', {
		header: 'Last audit date',
		cell: ({ getValue }) => {
			const value = getValue()
			return <>{value == null ? null : toNiceDayMonthAndYear(value)}</>
		},
		size: 130,
		meta: {
			align: 'end'
		}
	})
	/*
	{
		header: 'Audit link',
		accessorKey: 'auditLink',
		size: 80,
		enableSorting: false,
		cell: ({ getValue }) => (
			<>
				{getValue() == null ? null : (
					<a
					href={getValue()}
					target="_blank"
					rel="noopener noreferrer"
					className="shrink-0 rounded-md  bg-(--link-button) hover:bg-(--link-button-hover) p-1.5"
				>
					<Icon name="arrow-up-right" height={14} width={14} />
					<span className="sr-only">open in new tab</span>
				</a>
				)}
			</>
		),
		meta: {
			align: 'end'
		}
	},
	{
		header: 'Link to Wallets',
		accessorKey: 'walletsLink',
		size: 120,
		enableSorting: false,
		cell: ({ getValue }) => (
			<>
				{getValue() == null ? (
					<QuestionHelper text="This CEX has no published their wallet addresses" />
				) : (
					<a
					href={getValue()}
					target="_blank"
					rel="noopener noreferrer"
					className="shrink-0 rounded-md  bg-(--link-button) hover:bg-(--link-button-hover) p-1.5"
				>
					<Icon name="arrow-up-right" height={14} width={14} />
					<span className="sr-only">open in new tab</span>
				</a>
				)}
			</>
		),
		meta: {
			align: 'end'
		}
	}
	*/
]
