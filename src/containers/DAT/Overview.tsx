import type { ColumnDef } from '@tanstack/react-table'
import { lazy, Suspense, useMemo, useState } from 'react'
import { ChartExportButtons } from '~/components/ButtonStyled/ChartExportButtons'
import { formatTooltipChartDate } from '~/components/ECharts/formatters'
import { ensureChronologicalRows } from '~/components/ECharts/utils'
import { BasicLink } from '~/components/Link'
import { RowLinksWithDropdown } from '~/components/RowLinksWithDropdown'
import { TableWithSearch } from '~/components/Table/TableWithSearch'
import { TagGroup } from '~/components/TagGroup'
import { Tooltip } from '~/components/Tooltip'
import { useGetChartInstance } from '~/hooks/useGetChartInstance'
import { firstDayOfMonth, formattedNum, lastDayOfWeek, slug } from '~/utils'
import type { IDATOverviewPageProps } from './types'

const MultiSeriesChart2 = lazy(() => import('~/components/ECharts/MultiSeriesChart2'))

const GROUP_BY = ['Daily', 'Weekly', 'Monthly'] as const
type GroupByType = (typeof GROUP_BY)[number]

function isGroupByType(value: string): value is GroupByType {
	return (GROUP_BY as readonly string[]).includes(value)
}

/** Narrow an unknown echarts tooltip param to a record, or return undefined. */
function asRecord(value: unknown): Record<string, unknown> | undefined {
	return typeof value === 'object' && value != null ? (value as Record<string, unknown>) : undefined
}

const DEFAULT_SORTING_STATE = [{ id: 'totalUsdValue', desc: true }]

export function DATOverview({ allAssets, institutions, dailyFlowsByAsset }: IDATOverviewPageProps) {
	const [groupBy, setGroupBy] = useState<GroupByType>('Weekly')

	const chartOptions = useMemo(() => {
		const groupByLower: 'daily' | 'weekly' | 'monthly' =
			groupBy === 'Daily' ? 'daily' : groupBy === 'Monthly' ? 'monthly' : 'weekly'
		return {
			tooltip: {
				formatter: (params: unknown) => {
					const paramsArray = Array.isArray(params) ? params : [params]
					const firstParam = asRecord(paramsArray[0])
					if (!firstParam) return ''
					const data = asRecord(firstParam.data) ?? {}
					const valueArray = Array.isArray(firstParam.value) ? firstParam.value : undefined
					const firstTimestamp = data.timestamp ?? valueArray?.[0] ?? firstParam.axisValue
					const chartdate = formatTooltipChartDate(Number(firstTimestamp), groupByLower)
					let vals = ''
					let total = 0
					for (const param of paramsArray) {
						const p = asRecord(param)
						if (!p) continue
						const pData = asRecord(p.data) ?? {}
						const pValueArray = Array.isArray(p.value) ? p.value : undefined
						const seriesValue = (typeof p.seriesName === 'string' ? pData[p.seriesName] : undefined) ?? pValueArray?.[1]
						if (!seriesValue) continue
						const numericValue = typeof seriesValue === 'number' ? seriesValue : Number(seriesValue)
						if (!numericValue) continue
						total += numericValue
						const marker = typeof p.marker === 'string' ? p.marker : ''
						const seriesName = typeof p.seriesName === 'string' ? p.seriesName : ''
						vals += `<li style="list-style:none;">${marker} ${seriesName}: ${formattedNum(numericValue, true)}</li>`
					}
					vals += `<li style="list-style:none;">Total: ${formattedNum(total, true)}</li>`
					return chartdate + vals
				}
			}
		}
	}, [groupBy])

	const { chartData } = useMemo(() => {
		const assetKeys: string[] = []
		for (const asset in dailyFlowsByAsset) {
			assetKeys.push(asset)
		}
		const rowMap = new Map<number, Record<string, number | null>>()

		if (['Weekly', 'Monthly'].includes(groupBy)) {
			for (const asset of assetKeys) {
				const sumByDate: Record<number, { purchasePrice: number; assetQuantity: number }> = {}
				for (const [date, purchasePrice, assetQuantity] of dailyFlowsByAsset[asset].data) {
					if (date == null) continue
					const dateKey =
						groupBy === 'Monthly' ? firstDayOfMonth(date / 1000) * 1000 : lastDayOfWeek(date / 1000) * 1000
					sumByDate[dateKey] = sumByDate[dateKey] ?? { purchasePrice: 0, assetQuantity: 0 }
					sumByDate[dateKey].purchasePrice += purchasePrice ?? 0
					sumByDate[dateKey].assetQuantity += assetQuantity ?? 0
				}
				for (const dateStr in sumByDate) {
					const dateNum = +dateStr
					const row = rowMap.get(dateNum) ?? { timestamp: dateNum }
					row[dailyFlowsByAsset[asset].name] = sumByDate[dateNum].purchasePrice
					rowMap.set(dateNum, row)
				}
			}
		} else {
			for (const asset of assetKeys) {
				for (const [date, purchasePrice] of dailyFlowsByAsset[asset].data) {
					if (date == null) continue
					const row = rowMap.get(date) ?? { timestamp: date }
					row[dailyFlowsByAsset[asset].name] = purchasePrice
					rowMap.set(date, row)
				}
			}
		}

		const source = ensureChronologicalRows(Array.from(rowMap.values()))
		const seriesNames = assetKeys.map((a) => dailyFlowsByAsset[a].name)
		const dimensions = ['timestamp', ...seriesNames]
		const charts = assetKeys.map((asset) => ({
			type: 'bar' as const,
			name: dailyFlowsByAsset[asset].name,
			encode: { x: 'timestamp', y: dailyFlowsByAsset[asset].name },
			stack: dailyFlowsByAsset[asset].stack,
			color: dailyFlowsByAsset[asset].color
		}))

		return {
			chartData: { dataset: { source, dimensions }, charts }
		}
	}, [dailyFlowsByAsset, groupBy])

	const { chartInstance, handleChartReady } = useGetChartInstance()

	return (
		<>
			<RowLinksWithDropdown links={allAssets} activeLink={'All'} />
			<div className="col-span-2 flex flex-col rounded-md border border-(--cards-border) bg-(--cards-bg)">
				<div className="flex flex-wrap items-center justify-between gap-2 p-2 pb-0">
					<h1 className="text-lg font-semibold">DAT Inflows by Asset</h1>
					<TagGroup
						selectedValue={groupBy}
						setValue={(period) => {
							if (isGroupByType(period)) setGroupBy(period)
						}}
						values={GROUP_BY}
						className="ml-auto"
					/>
					<ChartExportButtons
						chartInstance={chartInstance}
						filename="digital-asset-treasuries-inflows-by-asset"
						title="DAT Inflows by Asset"
					/>
				</div>
				<Suspense fallback={<div className="min-h-[360px]" />}>
					<MultiSeriesChart2
						dataset={chartData.dataset}
						charts={chartData.charts}
						valueSymbol="$"
						chartOptions={chartOptions}
						onReady={handleChartReady}
					/>
				</Suspense>
			</div>
			<TableWithSearch
				data={institutions}
				columns={overviewColumns}
				placeholder="Search institutions"
				columnToSearch="name"
				sortingState={DEFAULT_SORTING_STATE}
				csvFileName="digital-asset-treasuries"
			/>
		</>
	)
}

// ── Table columns ───────────────────────────────────────────────────────

const overviewColumns: ColumnDef<IDATOverviewPageProps['institutions'][0]>[] = [
	{
		header: 'Institution',
		accessorKey: 'name',
		enableSorting: false,
		cell: ({ getValue, row }) => {
			const name = getValue<string>()

			return (
				<span className="relative flex items-center gap-2">
					<span className="vf-row-index shrink-0" aria-hidden="true" />
					<BasicLink
						href={`/digital-asset-treasury/${slug(row.original.ticker)}`}
						title={name}
						className="overflow-hidden text-sm font-medium text-ellipsis whitespace-nowrap text-(--link-text)"
					>
						{name}
					</BasicLink>
				</span>
			)
		},
		size: 228,
		meta: {
			align: 'start'
		}
	},
	{
		header: 'Assets',
		id: 'holdings',
		accessorFn: (row) =>
			row.holdings.map((asset) => `${asset.name} (${(Number(asset.dominance) || 0).toFixed(2)}%)`).join(', '),
		enableSorting: false,
		cell: (info) => {
			const assetBreakdown = info.row.original.holdings

			return (
				<Tooltip
					content={<AssetTooltipContent assetBreakdown={assetBreakdown} protocolName={info.row.original.name} />}
					render={<button />}
					className="ml-auto flex h-5 w-full! flex-nowrap items-center bg-white"
				>
					{assetBreakdown.map((asset) => {
						return (
							<div
								key={asset.name + asset.dominance + info.row.original.name}
								style={{ width: `${asset.dominance}%`, background: asset.color }}
								className="h-5"
							/>
						)
					})}
				</Tooltip>
			)
		},
		size: 120,
		meta: {
			align: 'end'
		}
	},
	{
		header: 'Cost Basis',
		accessorKey: 'totalCost',
		cell: ({ getValue }) => {
			const totalCost = getValue<number>()
			if (totalCost == null) return null
			return <>{formattedNum(totalCost, true)}</>
		},
		size: 120,
		meta: {
			align: 'end'
		}
	},
	{
		header: "Today's Holdings Value",
		accessorKey: 'totalUsdValue',
		cell: ({ getValue }) => {
			const totalUsdValue = getValue<number>()
			if (totalUsdValue == null) return null
			return <>{formattedNum(totalUsdValue, true)}</>
		},
		size: 196,
		meta: {
			align: 'end'
		}
	},
	{
		header: 'Stock Price',
		accessorKey: 'price',
		cell: ({ getValue, row }) => {
			const price = getValue<number>()
			if (price == null) return null
			const priceChange24h = row.original.priceChange24h
			if (priceChange24h == null) return <>{formattedNum(price, true)}</>
			return (
				<Tooltip
					content={
						<>
							24h change:{' '}
							<span
								className={priceChange24h > 0 ? 'text-(--success)' : priceChange24h < 0 ? 'text-(--error)' : ''}
							>{`${priceChange24h > 0 ? '+' : ''}${priceChange24h.toFixed(2)}%`}</span>
						</>
					}
					className="justify-end underline decoration-dotted"
				>
					{formattedNum(price, true)}
				</Tooltip>
			)
		},
		size: 120,
		meta: {
			align: 'end'
		}
	},
	{
		header: 'Realized mNAV',
		accessorKey: 'realized_mNAV',
		cell: ({ getValue }) => {
			const realized_mNAV = getValue<number>()
			if (realized_mNAV == null) return null
			return <>{formattedNum(realized_mNAV, false)}</>
		},
		size: 140,
		meta: {
			align: 'end',
			headerHelperText:
				'Market Net Asset Value based only on the current outstanding common shares, with no dilution considered.'
		}
	},
	{
		header: 'Realistic mNAV',
		accessorKey: 'realistic_mNAV',
		cell: ({ getValue }) => {
			const realistic_mNAV = getValue<number>()
			if (realistic_mNAV == null) return null
			return <>{formattedNum(realistic_mNAV, false)}</>
		},
		size: 140,
		meta: {
			align: 'end',
			headerHelperText:
				'Market Net Asset Value adjusted for expected dilution from in-the-money options and convertibles that are likely to be exercised'
		}
	},
	{
		header: 'Max mNAV',
		accessorKey: 'max_mNAV',
		cell: ({ getValue }) => {
			const max_mNAV = getValue<number>()
			if (max_mNAV == null) return null
			return <>{formattedNum(max_mNAV, false)}</>
		},
		size: 120,
		meta: {
			align: 'end',
			headerHelperText:
				'Market Net Asset Value under the fully diluted scenario, assuming every warrant, option, and convertible is exercised (the most conservative/worst-case view)'
		}
	}
]

// ── Tooltip helpers ─────────────────────────────────────────────────────

interface BreakdownData {
	name: string
	amount?: number | null
	ticker?: string
	cost?: number | null
	usdValue?: number | null
	avgPrice?: number | null
	dominance: number
	color: string
}

function Breakdown({ data }: { data: BreakdownData }) {
	const name = `${data.name} (${data.dominance}%)`

	return (
		<span className="flex flex-col gap-1 border-l-3 pl-1 text-xs" style={{ borderColor: data.color }}>
			<span>{name}</span>
			{data.amount != null ? <span>{`Amount: ${formattedNum(data.amount, false)} ${data.ticker}`}</span> : null}
			{data.usdValue != null ? <span>{`Today's Value: ${formattedNum(data.usdValue, true)}`}</span> : null}
			{data.cost != null ? <span>{`Cost Basis: ${formattedNum(data.cost, true)}`}</span> : null}
			{data.avgPrice != null ? <span>{`Average Purchase Price: ${formattedNum(data.avgPrice, true)}`}</span> : null}
		</span>
	)
}

function AssetTooltipContent({
	assetBreakdown,
	protocolName
}: {
	assetBreakdown: BreakdownData[]
	protocolName: string
}) {
	return (
		<span className="flex flex-col gap-4">
			{assetBreakdown.map((breakdown) => (
				<Breakdown data={breakdown} key={breakdown.name + breakdown.usdValue + protocolName + 'tooltip-content'} />
			))}
		</span>
	)
}
