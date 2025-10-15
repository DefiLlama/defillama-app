import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ColumnDef } from '@tanstack/react-table'
import { BasicLink } from '~/components/Link'
import { QuestionHelper } from '~/components/QuestionHelper'
import { TableWithSearch } from '~/components/Table/TableWithSearch'
import { INFLOWS_API } from '~/constants'
import { useDateRangeValidation } from '~/hooks/useDateRangeValidation'
import { formattedNum, slug, toNiceDayMonthAndYear } from '~/utils'
import { fetchJson } from '~/utils/async'
import { DateFilter } from './DateFilter'

const getOutflowsByTimerange = async (startTime, endTime, cexData) => {
	if (startTime && endTime) {
		const cexsApiResults = await Promise.allSettled(
			cexData.map(async (c) => {
				if (c.slug === undefined) {
					return [null, null]
				} else {
					const res = await fetchJson(
						`${INFLOWS_API}/${c.slug}/${startTime}?end=${endTime}&tokensToExclude=${c.coin ?? ''}`
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

		return Object.fromEntries(cexs)
	}
}

const SECONDS_IN_HOUR = 3600

const dateStringToUnix = (dateString) => {
	if (!dateString) return 0
	return Math.floor(new Date(dateString).getTime() / 1000)
}

const unixToDateString = (unixTimestamp) => {
	if (!unixTimestamp) return ''
	const date = new Date(unixTimestamp * 1000)
	return date.toISOString().split('T')[0]
}

export const Cexs = ({ cexs }) => {
	// Initialize with date strings instead of Date objects
	const initialStartDate = (() => {
		const date = new Date()
		date.setMonth(date.getMonth() - 1)
		return unixToDateString(Math.floor(date.getTime() / 1000))
	})()

	const initialEndDate = (() => {
		const date = new Date()
		date.setDate(date.getDate() - 1)
		return unixToDateString(Math.floor(date.getTime() / 1000))
	})()

	const [hours, setHours] = useState([12, 12])

	const { startDate, endDate, dateError, handleStartDateChange, handleEndDateChange } = useDateRangeValidation({
		initialStartDate,
		initialEndDate
	})

	const handleStartChange = (value: string) => {
		handleStartDateChange(value)
		if (endDate && value && new Date(value) > new Date(endDate)) {
			handleEndDateChange(value)
		}
	}

	const handleEndChange = (value: string) => {
		handleEndDateChange(value)
		if (startDate && value && new Date(startDate) > new Date(value)) {
			handleStartDateChange(value)
		}
	}

	const startTs = (dateStringToUnix(startDate) + Number(hours[0] || 0) * SECONDS_IN_HOUR).toFixed(0)
	const endTs = (dateStringToUnix(endDate) + Number(hours[1] || 0) * SECONDS_IN_HOUR).toFixed(0)

	const { data: customRangeInflows = {} } = useQuery({
		queryKey: ['cexs', startTs, endTs],
		queryFn: () => getOutflowsByTimerange(startTs, endTs, cexs),
		staleTime: 60 * 60 * 1000
	})

	const cexsWithCustomRange = cexs.map((cex) => ({
		...cex,
		customRange: customRangeInflows[cex.slug]?.outflows
	}))

	const onHourChange = (hours) => {
		const isValid = hours
			.map((hour) => (hour === '' ? 0 : hour))
			.every((hour) => /^([01]?[0-9]|2[0-3])$/.test(hour) || hour === '')

		if (isValid) {
			const newStartTs = (dateStringToUnix(startDate) + Number(hours[0] || 0) * SECONDS_IN_HOUR).toFixed(0)
			const newEndTs = (dateStringToUnix(endDate) + Number(hours[1] || 0) * SECONDS_IN_HOUR).toFixed(0)

			if (Number(newStartTs) <= Number(newEndTs)) {
				setHours(hours)
			}
		}
	}

	return (
		<>
			<TableWithSearch
				data={cexsWithCustomRange}
				columns={columns}
				columnToSearch={'name'}
				placeholder={'Search exchange...'}
				header={'CEX Transparency'}
				customFilters={
					<DateFilter
						startDate={startDate}
						endDate={endDate}
						onStartChange={handleStartChange}
						onEndChange={handleEndChange}
						hours={hours}
						setHours={onHourChange}
						dateError={dateError}
					/>
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
