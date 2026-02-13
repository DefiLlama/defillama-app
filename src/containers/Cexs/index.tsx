import { useQuery } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { useRouter } from 'next/router'
import { useMemo } from 'react'
import toast from 'react-hot-toast'
import { BasicLink } from '~/components/Link'
import { QuestionHelper } from '~/components/QuestionHelper'
import { TableWithSearch } from '~/components/Table/TableWithSearch'
import { formattedNum, slug, toNiceDayMonthAndYear } from '~/utils'
import { fetchCexInflows } from './api'
import { DateFilter } from './DateFilter'
import type { ICex } from './types'

const DEFAULT_SORTING_STATE = [{ id: 'cleanAssetsTvl', desc: true }]

const getOutflowsByTimerange = async (
	startTime: number | null,
	endTime: number | null,
	cexData: ICex[]
): Promise<Record<string, { outflows?: number }>> => {
	let loadingToastId: string | undefined
	try {
		if (startTime && endTime) {
			loadingToastId = toast.loading('Fetching inflows data...')

			const cexsApiResults = await Promise.allSettled(
				cexData.map(async (c) => {
					if (c.slug === undefined) {
						return [null, null] as const
					} else {
						const res = await fetchCexInflows(c.slug, startTime / 1e3, endTime / 1e3, c.coin ?? '')

						return [c.slug, res] as const
					}
				})
			)

			const cexs = cexsApiResults
				.map((result) => {
					if (result.status === 'fulfilled') {
						return result.value
					}
					return undefined
				})
				.filter((item): item is readonly [string, { outflows?: number }] => item != null && item[0] != null)

			toast.dismiss(loadingToastId)

			return cexs.length ? Object.fromEntries(cexs) : {}
		}
	} catch {
		toast.dismiss(loadingToastId)
		toast.error('Failed to fetch inflows data')
		return {}
	}
	return {}
}

const getDateTimestamp = (dateString: string | string[] | undefined): number | null => {
	if (!dateString || typeof dateString !== 'string') return null
	return Number.isNaN(Number(dateString)) ? null : Number(dateString)
}

export const Cexs = ({ cexs }: { cexs: Array<ICex> }) => {
	const router = useRouter()

	const startDate = getDateTimestamp(router.query.startDate)
	const endDate = getDateTimestamp(router.query.endDate)

	const { data: customRangeInflows = {} } = useQuery({
		queryKey: ['cexs', startDate, endDate],
		queryFn: () => getOutflowsByTimerange(startDate, endDate, cexs),
		staleTime: 60 * 60 * 1000,
		refetchOnWindowFocus: false,
		enabled: !!startDate && !!endDate,
		retry: false
	})

	const cexsWithCustomRange = useMemo(() => {
		return cexs.map((cex) => ({
			...cex,
			customRange: cex.slug != null ? customRangeInflows[cex.slug]?.outflows : undefined
		}))
	}, [cexs, customRangeInflows])

	return (
		<>
			<TableWithSearch
				data={cexsWithCustomRange}
				columns={columns}
				columnToSearch={'name'}
				placeholder={'Search exchange...'}
				header={'CEX Transparency'}
				customFilters={
					<DateFilter startDate={startDate} endDate={endDate} key={`cexs-date-filter-${startDate}-${endDate}`} />
				}
				sortingState={DEFAULT_SORTING_STATE}
			/>
		</>
	)
}

const columns: ColumnDef<ICex>[] = [
	{
		header: 'Name',
		accessorKey: 'name',
		enableSorting: false,
		cell: ({ getValue, row }) => {
			return (
				<span className="relative flex items-center gap-2">
					<span className="vf-row-index shrink-0" aria-hidden="true" />
					{row.original.slug === undefined ? (
						getValue<string>()
					) : (
						<BasicLink
							href={`/cex/${slug(row.original.slug)}`}
							className="overflow-hidden text-sm font-medium text-ellipsis whitespace-nowrap text-(--link-text) hover:underline"
						>
							{getValue<string>()}
						</BasicLink>
					)}
				</span>
			)
		}
	},
	{
		header: 'Assets',
		accessorKey: 'currentTvl',
		cell: (info) => {
			if (info.row.original.slug == null) {
				return (
					<QuestionHelper text="This CEX has not published a list of all hot and cold wallets" className="ml-auto" />
				)
			}
			const value = info.getValue<number | null>()
			return <>{value != null ? formattedNum(value, true) : null}</>
		},
		size: 120,
		meta: {
			align: 'end',
			headerHelperText:
				'This excludes IOU assets issued by the CEX that are already counted on another chain, such as Binance-pegged BTC in BSC, which is already counted in Bitcoin chain'
		}
	},
	{
		header: 'Clean Assets',
		accessorKey: 'cleanAssetsTvl',
		cell: (info) => {
			const coinSymbol = info.row.original.coinSymbol
			if (info.row.original.slug == null) {
				return (
					<QuestionHelper text="This CEX has not published a list of all hot and cold wallets" className="ml-auto" />
				)
			}
			const value = info.getValue<number | null>()
			if (value == null) return null

			const helperText =
				coinSymbol === undefined
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
	},
	{
		header: '24h Inflows',
		accessorKey: 'inflows_24h',
		size: 120,
		cell: (info) => {
			const value = info.getValue<number | null>()
			return (
				<span className={value == null ? '' : value < 0 ? 'text-(--error)' : value > 0 ? 'text-(--success)' : ''}>
					{value != null ? formattedNum(value, true) : ''}
				</span>
			)
		},
		meta: {
			align: 'end'
		}
	},
	{
		header: '7d Inflows',
		accessorKey: 'inflows_1w',
		size: 120,
		cell: (info) => {
			const value = info.getValue<number | null>()
			return (
				<span className={value == null ? '' : value < 0 ? 'text-(--error)' : value > 0 ? 'text-(--success)' : ''}>
					{value != null ? formattedNum(value, true) : ''}
				</span>
			)
		},
		meta: {
			align: 'end'
		}
	},
	{
		header: '1m Inflows',
		accessorKey: 'inflows_1m',
		size: 120,
		cell: (info) => {
			const value = info.getValue<number | null>()
			return (
				<span className={value == null ? '' : value < 0 ? 'text-(--error)' : value > 0 ? 'text-(--success)' : ''}>
					{value != null ? formattedNum(value, true) : ''}
				</span>
			)
		},
		meta: {
			align: 'end'
		}
	},
	{
		header: 'Spot Volume',
		accessorKey: 'spotVolume',
		cell: (info) => {
			const value = info.getValue<number | null>()
			return value != null ? formattedNum(value, true) : null
		},
		size: 125,
		meta: {
			align: 'end'
		}
	},
	{
		header: '24h Open Interest',
		accessorKey: 'oi',
		cell: (info) => {
			const value = info.getValue<number | null>()
			return value != null ? formattedNum(value, true) : null
		},
		size: 160,
		meta: {
			align: 'end'
		}
	},
	{
		header: 'Avg Leverage',
		accessorKey: 'leverage',
		cell: (info) => {
			const value = info.getValue<number | null>()
			return value != null ? Number(Number(value).toFixed(2)) + 'x' : null
		},
		size: 130,
		meta: {
			align: 'end'
		}
	},
	{
		header: 'Custom range Inflows',
		accessorKey: 'customRange',
		accessorFn: (row) => row.customRange ?? undefined,
		size: 200,
		cell: (info) => {
			const value = info.getValue<number | undefined>()
			return (
				<span className={value == null ? '' : value < 0 ? 'text-(--error)' : value > 0 ? 'text-(--success)' : ''}>
					{value != null ? formattedNum(value, true) : ''}
				</span>
			)
		},
		meta: {
			align: 'end'
		}
	},
	{
		header: 'Auditor',
		accessorKey: 'auditor',
		cell: ({ getValue }) => <>{getValue<string | null>() ?? null}</>,
		size: 100,
		meta: {
			align: 'end'
		}
	},
	{
		header: 'Last audit date',
		accessorKey: 'lastAuditDate',
		cell: ({ getValue }) => {
			const value = getValue<number | undefined>()
			return <>{value === undefined ? null : toNiceDayMonthAndYear(value)}</>
		},
		size: 130,
		meta: {
			align: 'end'
		}
	}
	/*
	{
		header: 'Audit link',
		accessorKey: 'auditLink',
		size: 80,
		enableSorting: false,
		cell: ({ getValue }) => (
			<>
				{getValue() === undefined ? null : (
					<a
					href={getValue() as string}
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
				{getValue() === undefined ? (
					<QuestionHelper text="This CEX has no published their wallet addresses" />
				) : (
					<a
					href={getValue() as string}
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
