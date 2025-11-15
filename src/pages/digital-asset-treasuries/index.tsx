import { lazy, Suspense, useMemo, useState } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { maxAgeForNext } from '~/api'
import { CSVDownloadButton } from '~/components/ButtonStyled/CsvButton'
import { ILineAndBarChartProps } from '~/components/ECharts/types'
import { formatTooltipChartDate } from '~/components/ECharts/useDefaults'
import { BasicLink } from '~/components/Link'
import { RowLinksWithDropdown } from '~/components/RowLinksWithDropdown'
import { TableWithSearch } from '~/components/Table/TableWithSearch'
import { TagGroup } from '~/components/TagGroup'
import { Tooltip } from '~/components/Tooltip'
import { getDATOverviewData, IDATOverviewPageProps } from '~/containers/DAT/queries'
import Layout from '~/layout'
import { firstDayOfMonth, formattedNum, lastDayOfWeek, slug, toNiceCsvDate } from '~/utils'
import { withPerformanceLogging } from '~/utils/perf'

const LineAndBarChart = lazy(() => import('~/components/ECharts/LineAndBarChart')) as React.FC<ILineAndBarChartProps>

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

const prepareDailyFlowsCsv = (dailyFlowsByAsset) => {
	const headers = ['Timestamp', 'Date']
	const assetOrder = Object.keys(dailyFlowsByAsset)
	for (const asset of assetOrder) {
		const name = dailyFlowsByAsset[asset].name
		headers.push(`${name} Buy/Sell Price`)
		headers.push(`${name} Buy/Sell Quantity`)
	}
	const inflowsByAssetByDate = {}
	for (const asset in dailyFlowsByAsset) {
		for (const [date, purchasePrice, assetQuantity] of dailyFlowsByAsset[asset].data) {
			if (purchasePrice != null || assetQuantity != null) {
				const dateKey = String(date)
				inflowsByAssetByDate[dateKey] = inflowsByAssetByDate[dateKey] ?? {}
				inflowsByAssetByDate[dateKey][asset] = [purchasePrice, assetQuantity]
			}
		}
	}
	const rows = []
	const sortedDates = Object.keys(inflowsByAssetByDate)
		.map(Number)
		.sort((a, b) => a - b)
	for (const date of sortedDates) {
		const dateKey = String(date)
		const row = [String(date), toNiceCsvDate(date / 1000)]
		for (const asset of assetOrder) {
			const data = inflowsByAssetByDate[dateKey]?.[asset]
			row.push(data?.[0] ?? '')
			row.push(data?.[1] ?? '')
		}
		rows.push(row)
	}
	return { filename: 'digital-asset-treasuries-daily-flows.csv', rows: [headers, ...rows] }
}

export default function TreasuriesByInstitution({ allAssets, institutions, dailyFlowsByAsset }: IDATOverviewPageProps) {
	const [groupBy, setGroupBy] = useState<GroupByType>('Weekly')

	const chartOptions = useMemo(() => {
		return {
			tooltip: {
				formatter: (params: any) => {
					let chartdate = formatTooltipChartDate(params[0].value[0], groupBy.toLowerCase() as any)
					let vals = ''
					let total = 0
					for (const param of params) {
						if (!param.value[1]) continue
						total += param.value[1]
						vals += `<li style="list-style:none;">${param.marker} ${param.seriesName}: ${formattedNum(param.value[1], true)}</li>`
					}
					vals += `<li style="list-style:none;">Total: ${formattedNum(total, true)}</li>`
					return chartdate + vals
				}
			}
		}
	}, [groupBy])
	const charts = useMemo(() => {
		if (['Weekly', 'Monthly'].includes(groupBy)) {
			const final = {}
			for (const asset in dailyFlowsByAsset) {
				final[asset] = {
					name: dailyFlowsByAsset[asset].name,
					stack: dailyFlowsByAsset[asset].stack,
					type: dailyFlowsByAsset[asset].type,
					color: dailyFlowsByAsset[asset].color,
					data: []
				}
				const sumByDate = {}
				for (const [date, purchasePrice, assetQuantity] of dailyFlowsByAsset[asset].data) {
					const dateKey = groupBy === 'Monthly' ? +firstDayOfMonth(date) * 1000 : +lastDayOfWeek(date) * 1000
					sumByDate[dateKey] = sumByDate[dateKey] ?? {}
					sumByDate[dateKey].purchasePrice = (sumByDate[dateKey].purchasePrice ?? 0) + (purchasePrice ?? 0)
					sumByDate[dateKey].assetQuantity = (sumByDate[dateKey].assetQuantity ?? 0) + (assetQuantity ?? 0)
				}
				for (const date in sumByDate) {
					final[asset].data.push([+date, sumByDate[date].purchasePrice, sumByDate[date].assetQuantity])
				}
			}
			return final
		}
		// if (groupBy === 'Cumulative') {
		// 	const final = {}
		// 	for (const asset in dailyFlowsByAsset) {
		// 		final[asset] = {
		// 			name: dailyFlowsByAsset[asset].name,
		// 			stack: dailyFlowsByAsset[asset].stack,
		// 			type: 'line',
		// 			color: dailyFlowsByAsset[asset].color,
		// 			data: []
		// 		}
		// 		let totalPurchasePrice = 0
		// 		let totalAssetQuantity = 0
		// 		dailyFlowsByAsset[asset].data.forEach(([date, purchasePrice, assetQuantity]) => {
		// 			totalPurchasePrice += purchasePrice ?? 0
		// 			totalAssetQuantity += assetQuantity ?? 0
		// 			final[asset].data.push([date, totalPurchasePrice, totalAssetQuantity])
		// 		})
		// 	}
		// 	return final
		// }
		return dailyFlowsByAsset
	}, [dailyFlowsByAsset, groupBy])

	return (
		<Layout
			title={`Digital Asset Treasuries - DefiLlama`}
			description={`Track institutions that own digital assets as part of their corporate treasury. DefiLlama is committed to providing accurate data without ads or sponsored content, as well as transparency.`}
			keywords={`digital asset treasury, digital asset treasuries, digital asset treasury by institution, digital asset treasury by company, digital asset treasury by asset`}
			canonicalUrl={`/digital-asset-treasuries`}
			pageName={pageName}
		>
			<RowLinksWithDropdown links={allAssets} activeLink={'All'} />
			<div className="col-span-2 flex min-h-[406px] flex-col rounded-md border border-(--cards-border) bg-(--cards-bg)">
				<div className="flex flex-wrap items-center justify-between p-2 pb-0">
					<h1 className="text-lg font-semibold">DAT Inflows by Asset</h1>
					<TagGroup
						selectedValue={groupBy}
						setValue={(period) => setGroupBy(period as GroupByType)}
						values={GROUP_BY}
						className="ml-auto"
					/>
					<CSVDownloadButton prepareCsv={() => prepareDailyFlowsCsv(charts)} smol />
				</div>
				<Suspense fallback={<></>}>
					<LineAndBarChart charts={charts} valueSymbol="$" chartOptions={chartOptions} />
				</Suspense>
			</div>
			<TableWithSearch
				data={institutions}
				columns={columns}
				placeholder="Search institutions"
				columnToSearch="name"
				sortingState={[{ id: 'totalAssetAmount', desc: true }]}
				customFilters={<CSVDownloadButton prepareCsv={() => prepareInstitutionsCsv(institutions)} />}
			/>
		</Layout>
	)
}

const columns: ColumnDef<IDATOverviewPageProps['institutions'][0]>[] = [
	{
		header: 'Institution',
		accessorKey: 'name',
		enableSorting: false,
		cell: ({ getValue, row, table }) => {
			const name = getValue() as string
			const index = row.depth === 0 ? table.getSortedRowModel().rows.findIndex((x) => x.id === row.id) : row.index
			return (
				<span className="relative flex items-center gap-2">
					<span className="shrink-0">{index + 1}</span>
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
			{data.amount && <span>{`Amount: ${formattedNum(data.amount, false)} ${data.ticker}`}</span>}
			{data.usdValue && <span>{`Today's Value: ${formattedNum(data.usdValue, true)}`}</span>}
			{data.cost && <span>{`Cost Basis: ${formattedNum(data.cost, true)}`}</span>}
			{data.avgPrice && <span>{`Average Purchase Price: ${formattedNum(data.avgPrice, true)}`}</span>}
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
