import type { ColumnDef } from '@tanstack/react-table'
import { lazy, Suspense, useMemo, useState } from 'react'
import { maxAgeForNext } from '~/api'
import { ChartExportButtons } from '~/components/ButtonStyled/ChartExportButtons'
import { CSVDownloadButton } from '~/components/ButtonStyled/CsvButton'
import { formatTooltipChartDate } from '~/components/ECharts/formatters'
import { ensureChronologicalRows } from '~/components/ECharts/utils'
import { BasicLink } from '~/components/Link'
import { RowLinksWithDropdown } from '~/components/RowLinksWithDropdown'
import { TableWithSearch } from '~/components/Table/TableWithSearch'
import { TagGroup } from '~/components/TagGroup'
import { Tooltip } from '~/components/Tooltip'
import { getDATOverviewData, type IDATOverviewPageProps } from '~/containers/DAT/queries'
import { useGetChartInstance } from '~/hooks/useGetChartInstance'
import Layout from '~/layout'
import { firstDayOfMonth, formattedNum, lastDayOfWeek, slug } from '~/utils'
import { withPerformanceLogging } from '~/utils/perf'

const MultiSeriesChart2 = lazy(() => import('~/components/ECharts/MultiSeriesChart2'))

const GROUP_BY = ['Daily', 'Weekly', 'Monthly'] as const
type GroupByType = (typeof GROUP_BY)[number]

export const getStaticProps = withPerformanceLogging('digital-asset-treasuries/index', async () => {
	const props = await getDATOverviewData()

	return {
		props,
		revalidate: maxAgeForNext([22])
	}
})

const pageName = ['Digital Asset Treasuries', 'by', 'Institution']
const DEFAULT_SORTING_STATE = [{ id: 'totalUsdValue', desc: true }]

const prepareInstitutionsCsv = (institutions: IDATOverviewPageProps['institutions']) => {
	const headers = [
		'Institution',
		'Ticker',
		'Type',
		'Cost Basis',
		"Today's Holdings Value",
		'Stock Price',
		'24h Price Change (%)',
		'Realized mNAV',
		'Realistic mNAV',
		'Max mNAV',
		'Asset Breakdown'
	]

	const rows = institutions.map((institution) => {
		const assetBreakdownStr = institution.holdings
			.map((asset) => {
				const parts = [`${asset.name} (${asset.ticker})`]
				if (asset.usdValue != null) parts.push(`Value: $${asset.usdValue.toLocaleString()}`)
				if (asset.amount != null) parts.push(`Amount: ${asset.amount.toLocaleString()} ${asset.ticker}`)
				if (asset.dominance != null) parts.push(`${asset.dominance}%`)
				return parts.join(' - ')
			})
			.join(' | ')

		return [
			institution.name,
			institution.ticker,
			institution.type,
			institution.totalCost ?? '',
			institution.totalUsdValue ?? '',
			institution.price ?? '',
			institution.priceChange24h ?? '',
			institution.realized_mNAV ?? '',
			institution.realistic_mNAV ?? '',
			institution.max_mNAV ?? '',
			assetBreakdownStr
		]
	})

	const date = new Date().toISOString().split('T')[0]
	return {
		filename: `digital-asset-treasuries-${date}.csv`,
		rows: [headers, ...rows]
	}
}

export default function TreasuriesByInstitution({ allAssets, institutions, dailyFlowsByAsset }: IDATOverviewPageProps) {
	const [groupBy, setGroupBy] = useState<GroupByType>('Weekly')

	const chartOptions = useMemo(() => {
		return {
			tooltip: {
				formatter: (params: any) => {
					const firstParam = Array.isArray(params) ? params[0] : params
					const firstTimestamp =
						firstParam?.data?.timestamp ??
						(Array.isArray(firstParam?.value) ? firstParam.value[0] : undefined) ??
						firstParam?.axisValue
					let chartdate = formatTooltipChartDate(Number(firstTimestamp), groupBy.toLowerCase() as any)
					let vals = ''
					let total = 0
					for (const param of params) {
						const seriesValue =
							param?.data?.[param.seriesName] ?? (Array.isArray(param?.value) ? param.value[1] : undefined)
						if (!seriesValue) continue
						const numericValue = typeof seriesValue === 'number' ? seriesValue : Number(seriesValue)
						if (!numericValue) continue
						total += numericValue
						vals += `<li style="list-style:none;">${param.marker} ${param.seriesName}: ${formattedNum(numericValue, true)}</li>`
					}
					vals += `<li style="list-style:none;">Total: ${formattedNum(total, true)}</li>`
					return chartdate + vals
				}
			}
		}
	}, [groupBy])

	const { chartData } = useMemo(() => {
		const assetKeys = Object.keys(dailyFlowsByAsset)
		const rowMap = new Map<number, Record<string, number | null>>()

		if (['Weekly', 'Monthly'].includes(groupBy)) {
			for (const asset of assetKeys) {
				const sumByDate = {}
				for (const [date, purchasePrice, assetQuantity] of dailyFlowsByAsset[asset].data) {
					const dateKey =
						groupBy === 'Monthly' ? firstDayOfMonth(date / 1000) * 1000 : lastDayOfWeek(date / 1000) * 1000
					sumByDate[dateKey] = sumByDate[dateKey] ?? {}
					sumByDate[dateKey].purchasePrice = (sumByDate[dateKey].purchasePrice ?? 0) + (purchasePrice ?? 0)
					sumByDate[dateKey].assetQuantity = (sumByDate[dateKey].assetQuantity ?? 0) + (assetQuantity ?? 0)
				}
				for (const date in sumByDate) {
					const row = rowMap.get(+date) ?? { timestamp: +date }
					row[dailyFlowsByAsset[asset].name] = sumByDate[date].purchasePrice
					rowMap.set(+date, row)
				}
			}
		} else {
			for (const asset of assetKeys) {
				for (const [date, purchasePrice] of dailyFlowsByAsset[asset].data) {
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
	const handlePrepareInstitutionsCsv = () => prepareInstitutionsCsv(institutions)

	return (
		<Layout
			title={`Digital Asset Treasuries - DefiLlama`}
			description={`Track institutions that own digital assets as part of their corporate treasury. DefiLlama is committed to providing accurate data without ads or sponsored content, as well as transparency.`}
			keywords={`digital asset treasury, digital asset treasuries, digital asset treasury by institution, digital asset treasury by company, digital asset treasury by asset`}
			canonicalUrl={`/digital-asset-treasuries`}
			pageName={pageName}
		>
			<RowLinksWithDropdown links={allAssets} activeLink={'All'} />
			<div className="col-span-2 flex flex-col rounded-md border border-(--cards-border) bg-(--cards-bg)">
				<div className="flex flex-wrap items-center justify-between gap-2 p-2 pb-0">
					<h1 className="text-lg font-semibold">DAT Inflows by Asset</h1>
					<TagGroup
						selectedValue={groupBy}
						setValue={(period) => setGroupBy(period as GroupByType)}
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
				columns={columns}
				placeholder="Search institutions"
				columnToSearch="name"
				sortingState={DEFAULT_SORTING_STATE}
				customFilters={<CSVDownloadButton prepareCsv={handlePrepareInstitutionsCsv} />}
			/>
		</Layout>
	)
}

const columns: ColumnDef<IDATOverviewPageProps['institutions'][0]>[] = [
	{
		header: 'Institution',
		accessorKey: 'name',
		enableSorting: false,
		cell: ({ getValue, row }) => {
			const name = getValue() as string

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
	// {
	// 	header: 'Type',
	// 	accessorKey: 'type',
	// 	enableSorting: false,
	// 	size: 120,
	// 	meta: {
	// 		align: 'end'
	// 	}
	// },
	{
		header: 'Assets',
		accessorKey: 'holdings',
		enableSorting: false,
		cell: (info) => {
			const assetBreakdown = info.getValue() as Array<{
				name: string
				ticker: string
				amount?: number | null
				usdValue?: number | null
				cost?: number | null
				avgPrice?: number | null
				dominance: number
				color: string
			}>

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
			const totalCost = getValue() as number
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
			const totalUsdValue = getValue() as number
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
			const price = getValue() as number
			if (price == null) return null
			if (row.original.priceChange24h == null) return <>{formattedNum(price, true)}</>
			return (
				<Tooltip
					content={
						<>
							24h change:{' '}
							<span
								className={row.original.priceChange24h > 0 ? 'text-(--success)' : 'text-(--error)'}
							>{`${row.original.priceChange24h > 0 ? '+' : ''}${row.original.priceChange24h.toFixed(2)}%`}</span>
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
			const realized_mNAV = getValue() as number
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
			const realistic_mNAV = getValue() as number
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
			const max_mNAV = getValue() as number
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

const Breakdown = ({
	data
}: {
	data: {
		name: string
		amount?: number
		ticker?: string
		cost?: number | null
		usdValue?: number | null
		avgPrice?: number | null
		dominance: number
		color: string
	}
}) => {
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

const AssetTooltipContent = ({ assetBreakdown, protocolName }) => {
	return (
		<span className="flex flex-col gap-4">
			{assetBreakdown.map((breakdown) => (
				<Breakdown data={breakdown} key={breakdown.name + breakdown.usdValue + protocolName + 'tooltip-content'} />
			))}
		</span>
	)
}
