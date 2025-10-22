import { useMemo } from 'react'
import { useRouter } from 'next/router'
import { useQuery } from '@tanstack/react-query'
import { ColumnDef } from '@tanstack/react-table'
import toast from 'react-hot-toast'
import { BasicLink } from '~/components/Link'
import { QuestionHelper } from '~/components/QuestionHelper'
import { TableWithSearch } from '~/components/Table/TableWithSearch'
import { INFLOWS_API } from '~/constants'
import { formattedNum, slug, toNiceDayMonthAndYear } from '~/utils'
import { fetchJson } from '~/utils/async'
import { DateFilter } from './DateFilter'

const getOutflowsByTimerange = async (startTime, endTime, cexData) => {
	let loadingToastId
	try {
		if (startTime && endTime) {
			loadingToastId = toast.loading('Fetching inflows data...')

			const cexsApiResults = await Promise.allSettled(
				cexData.map(async (c) => {
					if (c.slug === undefined) {
						return [null, null]
					} else {
						const res = await fetchJson(
							`${INFLOWS_API}/${c.slug}/${startTime / 1e3}?end=${endTime / 1e3}&tokensToExclude=${c.coin ?? ''}`
						)

						return [c.slug, res]
					}
				})
			)

			const cexs = cexsApiResults
				.map((result) => {
					if (result.status === 'fulfilled') {
						return result.value
					}
				})
				.filter(Boolean)

			toast.dismiss(loadingToastId)

			return cexs.length ? Object.fromEntries(cexs) : {}
		}
	} catch (error) {
		toast.dismiss(loadingToastId)
		toast.error('Failed to fetch inflows data')
		return {}
	}
}

const getDateTimestamp = (dateString: string | string[] | undefined): number | null => {
	if (!dateString || typeof dateString !== 'string') return null
	return Number.isNaN(Number(dateString)) ? null : Number(dateString)
}

export const Cexs = ({ cexs }) => {
	const router = useRouter()

	const startDate = getDateTimestamp(router.query.startDate)
	const endDate = getDateTimestamp(router.query.endDate)

	const { data: customRangeInflows = {} } = useQuery({
		queryKey: ['cexs', startDate, endDate],
		queryFn: () => getOutflowsByTimerange(startDate, endDate, cexs),
		staleTime: 60 * 60 * 1000,
		enabled: !!startDate && !!endDate,
		retry: false
	})

	const cexsWithCustomRange = useMemo(() => {
		return cexs.map((cex) => ({
			...cex,
			customRange: customRangeInflows[cex.slug]?.outflows
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
				sortingState={[{ id: 'cleanTvl', desc: true }]}
			/>
		</>
	)
}

const columns: ColumnDef<any>[] = [
	{
		header: 'Name',
		accessorKey: 'name',
		enableSorting: false,
		cell: ({ getValue, row, table }) => {
			const index = row.depth === 0 ? table.getSortedRowModel().rows.findIndex((x) => x.id === row.id) : row.index

			return (
				<span className="relative flex items-center gap-2">
					<span className="shrink-0">{index + 1}</span>
					{row.original.slug === undefined ? (
						(getValue() as string | null)
					) : (
						<BasicLink
							href={`/cex/${slug(row.original.slug)}`}
							className="overflow-hidden text-sm font-medium text-ellipsis whitespace-nowrap text-(--link-text) hover:underline"
						>
							{getValue() as string | null}
						</BasicLink>
					)}
				</span>
			)
		}
	},
	{
		header: 'Assets',
		accessorKey: 'tvl',
		accessorFn: (row) => row.tvl ?? undefined,
		cell: (info) => {
			if (info.row.original.slug == null) {
				return (
					<QuestionHelper text="This CEX has not published a list of all hot and cold wallets" className="ml-auto" />
				)
			}
			return <>{info.getValue() ? formattedNum(info.getValue(), true) : null}</>
		},
		sortUndefined: 'last',
		size: 120,
		meta: {
			align: 'end',
			headerHelperText:
				'This excludes IOU assets issued by the CEX that are already counted on another chain, such as Binance-pegged BTC in BSC, which is already counted in Bitcoin chain'
		}
	},
	{
		header: 'Clean Assets',
		accessorKey: 'cleanTvl',
		accessorFn: (row) => row.cleanTvl ?? undefined,
		cell: (info) => {
			const coinSymbol = info.row.original.coinSymbol
			if (info.row.original.slug == null) {
				return <QuestionHelper text="This CEX has not published a list of all hot and cold wallets" />
			}
			return (
				<span className="flex items-center justify-end gap-1">
					{info.getValue() ? (
						<>
							{coinSymbol === undefined ? (
								<QuestionHelper text={`Original TVL doesn't contain any coin issued by this CEX`} />
							) : (
								<QuestionHelper
									text={`This excludes all TVL from ${info.row.original.coinSymbol}, which is a token issued by this CEX`}
								/>
							)}
							<span>{formattedNum(info.getValue(), true)}</span>
						</>
					) : null}
				</span>
			)
		},
		sortUndefined: 'last',
		size: 145,
		meta: {
			align: 'end',
			headerHelperText: 'TVL of the CEX excluding all assets issued by itself, such as their own token'
		}
	},
	{
		header: '24h Inflows',
		accessorKey: '24hInflows',
		accessorFn: (row) => row['24hInflows'] ?? undefined,
		size: 120,
		cell: (info) => (
			<span
				className={`${
					(info.getValue() as number) < 0 ? 'text-(--error)' : (info.getValue() as number) > 0 ? 'text-(--success)' : ''
				}`}
			>
				{info.getValue() ? formattedNum(info.getValue(), true) : ''}
			</span>
		),
		sortUndefined: 'last',
		meta: {
			align: 'end'
		}
	},
	{
		header: '7d Inflows',
		accessorKey: '7dInflows',
		accessorFn: (row) => row['7dInflows'] ?? undefined,
		size: 120,
		cell: (info) => (
			<span
				className={`${
					(info.getValue() as number) < 0 ? 'text-(--error)' : (info.getValue() as number) > 0 ? 'text-(--success)' : ''
				}`}
			>
				{info.getValue() ? formattedNum(info.getValue(), true) : ''}
			</span>
		),
		sortUndefined: 'last',
		meta: {
			align: 'end'
		}
	},
	{
		header: '1m Inflows',
		accessorKey: '1mInflows',
		accessorFn: (row) => row['1mInflows'] ?? undefined,
		size: 120,
		cell: (info) => (
			<span
				className={`${
					(info.getValue() as number) < 0 ? 'text-(--error)' : (info.getValue() as number) > 0 ? 'text-(--success)' : ''
				}`}
			>
				{info.getValue() ? formattedNum(info.getValue(), true) : ''}
			</span>
		),
		sortUndefined: 'last',
		meta: {
			align: 'end'
		}
	},
	{
		header: 'Spot Volume',
		accessorKey: 'spotVolume',
		accessorFn: (row) => row.spotVolume ?? undefined,
		cell: (info) => (info.getValue() ? formattedNum(info.getValue(), true) : null),
		sortUndefined: 'last',
		size: 125,
		meta: {
			align: 'end'
		}
	},
	{
		header: '24h Open Interest',
		accessorKey: 'oi',
		accessorFn: (row) => row.oi ?? undefined,
		cell: (info) => (info.getValue() ? formattedNum(info.getValue(), true) : null),
		sortUndefined: 'last',
		size: 160,
		meta: {
			align: 'end'
		}
	},
	{
		header: 'Avg Leverage',
		accessorKey: 'leverage',
		accessorFn: (row) => row.leverage ?? undefined,
		cell: (info) => (info.getValue() ? Number(Number(info.getValue()).toFixed(2)) + 'x' : null),
		sortUndefined: 'last',
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
		cell: (info) => (
			<span
				className={`${
					(info.getValue() as number) < 0 ? 'text-(--error)' : (info.getValue() as number) > 0 ? 'text-(--success)' : ''
				}`}
			>
				{info.getValue() ? formattedNum(info.getValue(), true) : ''}
			</span>
		),
		sortUndefined: 'last',
		meta: {
			align: 'end'
		}
	},
	{
		header: 'Auditor',
		accessorKey: 'auditor',
		cell: ({ getValue }) => <>{(getValue() ?? null) as string | null}</>,
		size: 100,
		meta: {
			align: 'end'
		}
	},
	{
		header: 'Last audit date',
		accessorKey: 'lastAuditDate',
		cell: ({ getValue }) => <>{getValue() === undefined ? null : toNiceDayMonthAndYear(getValue())}</>,
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
