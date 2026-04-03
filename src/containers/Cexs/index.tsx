import { useQuery } from '@tanstack/react-query'
import { createColumnHelper } from '@tanstack/react-table'
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
): Promise<Record<string, { outflows?: number | null }>> => {
	let loadingToastId: string | undefined
	try {
		if (startTime && endTime) {
			loadingToastId = toast.loading('Fetching inflows data...')

			const cexsApiResults = await Promise.allSettled(
				cexData.map(async (c) => {
					if (c.slug == null) {
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
				.filter((item): item is readonly [string, { outflows?: number | null }] => item != null && item[0] != null)

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
			customRange: cex.slug != null ? (customRangeInflows[cex.slug]?.outflows ?? undefined) : undefined
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

const columnHelper = createColumnHelper<ICex>()

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
	columnHelper.accessor((row) => row.customRange ?? undefined, {
		id: 'customRange',
		header: 'Custom range Inflows',
		size: 200,
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
