import { lazy, Suspense } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { maxAgeForNext } from '~/api'
import { CSVDownloadButton } from '~/components/ButtonStyled/CsvButton'
import { ILineAndBarChartProps } from '~/components/ECharts/types'
import { BasicLink } from '~/components/Link'
import { RowLinksWithDropdown } from '~/components/RowLinksWithDropdown'
import { TableWithSearch } from '~/components/Table/TableWithSearch'
import { Tooltip } from '~/components/Tooltip'
import { TRADFI_API } from '~/constants'
import Layout from '~/layout'
import { formattedNum, getDominancePercent, getNDistinctColors, slug, toNiceCsvDate } from '~/utils'
import { fetchJson } from '~/utils/async'
import { withPerformanceLogging } from '~/utils/perf'

const LineAndBarChart = lazy(() => import('~/components/ECharts/LineAndBarChart')) as React.FC<ILineAndBarChartProps>

interface ITreasuryCompanies {
	breakdownByAsset: {
		[asset: string]: Array<{
			assetName: string
		}>
	}
	statsByAsset: {
		[asset: string]: {
			assetName: string
			assetTicker: string
		}
	}
	institutions: Array<{
		ticker: string
		name: string
		type: string
		price: number
		priceChange24h: number
		volume24h: number
		fd_realized: number
		fd_realistic: number
		fd_max: number
		mcap_realized: number
		mcap_realistic: number
		mcap_max: number
		realized_mNAV: number
		realistic_mNAV: number
		max_mNAV: number
		totalCost: number
		totalUsdValue: number
		totalAssetsByAsset: Record<
			string,
			{
				amount: number
				usdValue?: number | null
				cost?: number | null
				avgPrice?: number | null
			}
		>
	}>
	dailyFlows: Record<string, Array<[number, number, number, number]>>
}

const breakdownColor = (type) => {
	switch (type) {
		case 'Bitcoin':
			return '#f97316'
		case 'Ethereum':
			return '#2563eb'
		case 'Solana':
			return '#6d28d9'
		case 'Hyperliquid':
			return '#16a34a'
		case 'XRP':
			return '#6b7280'
		case 'Tron':
			return '#E91E63'
		default:
			return null
	}
}

export const getStaticProps = withPerformanceLogging('digital-asset-treasuries/index', async () => {
	const res: ITreasuryCompanies = await fetchJson(`${TRADFI_API}/v1/companies`)

	const allAssets = [{ label: 'All', to: '/digital-asset-treasuries' }]
	for (const asset in res.breakdownByAsset) {
		allAssets.push({ label: res.breakdownByAsset[asset][0].assetName, to: `/digital-asset-treasuries/${asset}` })
	}

	const colorByAsset = {}
	let i = 0
	const colors = getNDistinctColors(allAssets.length + 6)
	for (const asset in res.breakdownByAsset) {
		const color = breakdownColor(res.breakdownByAsset[asset][0].assetName)
		if (color) {
			colorByAsset[asset] = color
		} else {
			colorByAsset[asset] = colors[i + 6]
		}
		i++
	}

	const inflowsByAssetByDate: Record<string, Record<string, [number, number]>> = {}
	const dailyFlowsByAsset = {}
	for (const asset in res.dailyFlows) {
		const name = res.statsByAsset[asset]?.assetName ?? asset
		dailyFlowsByAsset[asset] = {
			name: name,
			stack: 'asset',
			type: 'bar',
			color: colorByAsset[asset],
			data: []
		}
		for (let i = 0; i < res.dailyFlows[asset].length; i++) {
			const [date, value, purchasePrice, usdValueOfPurchase] = res.dailyFlows[asset][i]
			const prev = res.dailyFlows[asset][i - 1]
			inflowsByAssetByDate[date] = inflowsByAssetByDate[date] ?? {}
			inflowsByAssetByDate[date][asset] = [
				(prev?.[2] || prev?.[3] || 0) + (purchasePrice || usdValueOfPurchase || 0),
				(prev?.[1] ?? 0) + value
			]
		}
	}

	for (const date in inflowsByAssetByDate) {
		for (const asset in res.dailyFlows) {
			dailyFlowsByAsset[asset].data.push([
				+date,
				inflowsByAssetByDate[date][asset]?.[0] ?? null,
				inflowsByAssetByDate[date][asset]?.[1] ?? null
			])
		}
	}

	return {
		props: {
			allAssets,
			institutions: res.institutions.map((institute) => {
				const totalUsdValue = Object.entries(institute.totalAssetsByAsset).reduce(
					(acc, [asset, { usdValue }]) => acc + (usdValue ?? 0),
					0
				)

				return {
					...institute,
					assetBreakdown: Object.entries(institute.totalAssetsByAsset)
						.map(([asset, { amount, cost, usdValue, avgPrice }]) => ({
							name: res.statsByAsset[asset].assetName,
							ticker: res.statsByAsset[asset].assetTicker,
							amount: amount,
							cost: cost ?? null,
							usdValue: usdValue ?? null,
							avgPrice: avgPrice ?? null,
							dominance: getDominancePercent(usdValue ?? 0, totalUsdValue),
							color: colorByAsset[asset]
						}))
						.sort((a, b) => (b.usdValue ?? 0) - (a.usdValue ?? 0))
				}
			}),
			dailyFlowsByAsset
		},
		revalidate: maxAgeForNext([22])
	}
})

const pageName = ['Digital Asset Treasuries', 'by', 'Institution']

const prepareInstitutionsCsv = (institutions) => {
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
		const assetBreakdownStr = institution.assetBreakdown
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
export default function TreasuriesByInstitution({ allAssets, institutions, dailyFlowsByAsset }) {
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
					<CSVDownloadButton prepareCsv={() => prepareDailyFlowsCsv(dailyFlowsByAsset)} smol />
				</div>
				<Suspense fallback={<></>}>
					<LineAndBarChart charts={dailyFlowsByAsset} valueSymbol="$" />
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

const columns: ColumnDef<ITreasuryCompanies['institutions'][0]>[] = [
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
		accessorKey: 'assetBreakdown',
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
