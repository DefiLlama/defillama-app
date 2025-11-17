import { lazy, Suspense, useMemo, useState } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import dayjs from 'dayjs'
import { maxAgeForNext } from '~/api'
import { ICandlestickChartProps, ILineAndBarChartProps, ISingleSeriesChartProps } from '~/components/ECharts/types'
import { Icon } from '~/components/Icon'
import { BasicLink } from '~/components/Link'
import { TableWithSearch } from '~/components/Table/TableWithSearch'
import { TagGroup } from '~/components/TagGroup'
import { Tooltip } from '~/components/Tooltip'
import { TRADFI_API } from '~/constants'
import { CHART_COLORS } from '~/constants/colors'
import Layout from '~/layout'
import { formattedNum, slug } from '~/utils'
import { fetchJson } from '~/utils/async'
import { withPerformanceLogging } from '~/utils/perf'

const SingleSeriesChart = lazy(
	() => import('~/components/ECharts/SingleSeriesChart')
) as React.FC<ISingleSeriesChartProps>
const LineAndBarChart = lazy(() => import('~/components/ECharts/LineAndBarChart')) as React.FC<ILineAndBarChartProps>
const CandlestickChart = lazy(() => import('~/components/ECharts/CandlestickChart')) as React.FC<ICandlestickChartProps>

interface IDATInstitution {
	institutionId: number
	ticker: string
	name: string
	type: string
	rank: number
	price: number
	priceChange24h: number | null
	volume24h: number
	totalCost: number
	totalUsdValue: number
	assets: {
		[asset: string]: {
			amount: number
			avgPrice: number
			usdValue: number
			cost: number
		}
	}
	assetsMeta: {
		[asset: string]: {
			name: string
			ticker: string
		}
	}
	ohlcv: Array<[number, number, number, number, number, number]> // [timestamp, open, high, low, close, volume]
	assetValue: Array<[number, number]>
	stats: Array<[number, string, string, string, number, number, number, number, number, number]> // [timestamp, fd_realized, fd_realistic, fd_maximum, mcap_realized, mcap_realistic, mcap_max, mNAV_realized, mNAV_realistic, mNAV_max]
	transactions: Array<{
		id: number
		asset: string
		amount: string
		avg_price: string
		usd_value: string
		start_date: string
		end_date: string
		report_date: string
		type: string
		source_type: string
		source_url: string
		source_note: string
		is_approved: boolean
		reject_reason: string | null
		last_updated: string
		ticker: string
		assetName: string
		assetTicker: string
	}>
	lastUpdated: string
}

export const getStaticProps = withPerformanceLogging(
	'digital-asset-treasury/[...company]',
	async ({
		params: {
			company: [company]
		}
	}) => {
		const data2: IDATInstitution | null = await fetchJson(`${TRADFI_API}/institutions/${company}`).catch(() => null)

		if (!data2) {
			return { notFound: true, props: null }
		}

		const chartByAsset = Object.keys(data2.assets).map((assetKey) => {
			let totalAmount = 0
			const assetMeta = data2.assetsMeta[assetKey]
			return {
				asset: assetKey,
				name: assetMeta.name,
				ticker: assetMeta.ticker,
				chart: data2.transactions
					.filter((item) => item.asset === assetKey)
					.map((item) => [
						Math.floor(new Date(item.end_date ?? item.start_date).getTime() / 1000),
						item.type === 'sale' ? -Number(item.amount) : Number(item.amount),
						item.avg_price ? Number(item.avg_price) : null,
						item.usd_value ? Number(item.usd_value) : null
					])
					.sort((a, b) => a[0] - b[0])
					.map(([timestamp, amount, avg_price, usd_value]) => [
						timestamp,
						(totalAmount += amount),
						amount,
						avg_price,
						usd_value
					])
			}
		})

		const mNAVChart: ILineAndBarChartProps['charts'] = {
			'Realized mNAV': {
				name: 'Realized mNAV',
				stack: 'Realized mNAV',
				type: 'line',
				color: CHART_COLORS[0],
				data: []
			},
			'Realistic mNAV': {
				name: 'Realistic mNAV',
				stack: 'Realistic mNAV',
				type: 'line',
				color: CHART_COLORS[1],
				data: []
			},
			'Max mNAV': {
				name: 'Max mNAV',
				stack: 'Max mNAV',
				type: 'line',
				color: CHART_COLORS[2],
				data: []
			}
		}

		const fdChart: ILineAndBarChartProps['charts'] = {
			'FD Realized': {
				name: 'FD Realized',
				stack: 'FD Realized',
				type: 'line',
				color: CHART_COLORS[3],
				data: []
			},
			'FD Realistic': {
				name: 'FD Realistic',
				stack: 'FD Realistic',
				type: 'line',
				color: CHART_COLORS[4],
				data: []
			},
			'FD Max': {
				name: 'FD Max',
				stack: 'FD Max',
				type: 'line',
				color: CHART_COLORS[5],
				data: []
			}
		}

		for (const item of data2.stats) {
			const [
				date,
				fd_realized,
				fd_realistic,
				fd_maximum,
				mcap_realized,
				mcap_realistic,
				mcap_max,
				mNAV_realized,
				mNAV_realistic,
				mNAV_max
			] = item
			mNAVChart['Realized mNAV'].data.push([date, mNAV_realized])
			mNAVChart['Realistic mNAV'].data.push([date, mNAV_realistic])
			mNAVChart['Max mNAV'].data.push([date, mNAV_max])
			fdChart['FD Realized'].data.push([date, +fd_realized])
			fdChart['FD Realistic'].data.push([date, +fd_realistic])
			fdChart['FD Max'].data.push([date, +fd_maximum])
		}

		const totalAssetValueChart: ILineAndBarChartProps['charts'] = {
			'Total Asset Value': {
				name: 'Total Asset Value',
				stack: 'Total Asset Value',
				type: 'line',
				color: CHART_COLORS[6],
				data: data2.assetValue
			}
		}

		const ohlcvChartData = data2.ohlcv.map(([date, open, high, low, close, volume]) => [
			date,
			open,
			close,
			low,
			high,
			volume
		])

		return {
			props: {
				name: data2.name,
				ticker: data2.ticker,
				transactions: data2.transactions,
				price: data2.price,
				priceChange24h: data2.priceChange24h,
				totalCost: data2.totalCost,
				totalUsdValue: data2.totalUsdValue,
				firstAnnouncementDate: data2.transactions[data2.transactions.length - 1].report_date,
				lastAnnouncementDate: data2.transactions[0].report_date,
				realized_mNAV: data2.stats[data2.stats.length - 1][7],
				realistic_mNAV: data2.stats[data2.stats.length - 1][8],
				max_mNAV: data2.stats[data2.stats.length - 1][9],
				assets: Object.entries(data2.assets)
					.sort((a, b) => (b[1].usdValue ?? 0) - (a[1].usdValue ?? 0))
					.map(([asset]) => data2.assetsMeta[asset].ticker),
				assetsBreakdown: Object.entries(data2.assets)
					.map(([asset, { amount, cost, usdValue, avgPrice }]) => ({
						name: data2.assetsMeta[asset].name,
						ticker: data2.assetsMeta[asset].ticker,
						amount: amount,
						cost: cost ?? null,
						usdValue: usdValue ?? null,
						avgPrice: avgPrice ?? null
					}))
					.sort((a, b) => (b.usdValue ?? 0) - (a.usdValue ?? 0)),
				chartByAsset,
				mNAVChart: data2.stats.length > 0 ? mNAVChart : null,
				fdChart: data2.stats.length > 0 ? fdChart : null,
				totalAssetValueChart: data2.assetValue.length > 0 ? totalAssetValueChart : null,
				ohlcvChartData: data2.ohlcv.length > 0 ? ohlcvChartData : null
			},
			revalidate: maxAgeForNext([22])
		}
	}
)

export async function getStaticPaths() {
	const data = await fetchJson(`${TRADFI_API}/institutions`)
	const tickers = new Set<string>()
	for (const institutionId in data.institutionMetadata) {
		tickers.add(data.institutionMetadata[institutionId].ticker)
	}
	const paths = Array.from(tickers).map((ticker) => ({
		params: { company: [slug(ticker)] }
	}))
	return { paths, fallback: false }
}

interface IProps
	extends Pick<
		IDATInstitution,
		'name' | 'ticker' | 'price' | 'priceChange24h' | 'transactions' | 'totalCost' | 'totalUsdValue'
	> {
	firstAnnouncementDate: string
	lastAnnouncementDate: string
	realized_mNAV: number | null
	realistic_mNAV: number | null
	max_mNAV: number | null
	assets: Array<string>
	assetsBreakdown: Array<{
		name: string
		ticker: string
		amount: number
		cost: number | null
		usdValue: number | null
		avgPrice: number | null
	}>
	chartByAsset: Array<{
		asset: string
		name: string
		ticker: string
		chart: Array<[number, number, number, number | null, number | null]>
	}>
	mNAVChart?: ILineAndBarChartProps['charts']
	fdChart?: ILineAndBarChartProps['charts']
	totalAssetValueChart?: ILineAndBarChartProps['charts']
	ohlcvChartData?: Array<[number, number, number, number, number, number]>
}

export default function DigitalAssetTreasury(props: IProps) {
	const [selectedAsset, setSelectedAsset] = useState<string | null>(props.assets[0])
	const chartData = useMemo(() => {
		return props.chartByAsset.find((asset) => asset.ticker === selectedAsset)
	}, [selectedAsset, props.chartByAsset])

	return (
		<Layout
			title={`${props.name} Digital Asset Treasury - DefiLlama`}
			description={`Track ${props.name}'s digital asset treasury holdings. DefiLlama is committed to providing accurate data without ads or sponsored content, as well as transparency.`}
			keywords={`${props.name} digital asset treasury holdings, ${props.name} DATs`}
			canonicalUrl={`/digital-asset-treasury/${slug(props.ticker)}`}
		>
			<div className="relative isolate grid grid-cols-2 gap-2 xl:grid-cols-3">
				<div className="col-span-2 flex w-full flex-col gap-6 overflow-x-auto rounded-md border border-(--cards-border) bg-(--cards-bg) p-2 xl:col-span-1">
					<h1 className="text-xl font-semibold">{props.name}</h1>
					<div className="flex flex-col">
						{props.assetsBreakdown.length > 1 && (
							<>
								<p className="group flex flex-wrap justify-start gap-4 border-b border-(--cards-border) py-1 last:border-none">
									<span className="text-(--text-label)">Assets in Holdings</span>
									<span className="font-jetbrains ml-auto">{props.assets.join(', ')}</span>
								</p>
								{props.totalUsdValue != null ? (
									<p className="group flex flex-wrap justify-start gap-4 border-b border-(--cards-border) py-1 last:border-none">
										<span className="text-(--text-label)">Assets Today's Value (USD)</span>
										<span className="font-jetbrains ml-auto">{formattedNum(props.totalUsdValue, true)}</span>
									</p>
								) : null}
								{props.totalCost != null && (
									<p className="group flex flex-wrap justify-start gap-4 border-b border-(--cards-border) py-1 last:border-none">
										<span className="text-(--text-label)">Assets Cost Basis</span>
										<span className="font-jetbrains ml-auto">
											{props.totalCost != null ? formattedNum(props.totalCost, true) : '-'}
										</span>
									</p>
								)}
							</>
						)}
						{props.assetsBreakdown.map((asset, index) => (
							<details
								className="group"
								key={`${props.ticker}-${asset.name}`}
								open={props.assetsBreakdown.length === 1 && index === 0}
							>
								<summary className="flex flex-wrap justify-start gap-4 border-b border-(--cards-border) py-1 group-last:border-none group-open:border-none group-open:font-semibold">
									<span className="text-(--text-label)">Total {asset.name}</span>
									<Icon
										name="chevron-down"
										height={16}
										width={16}
										className="relative top-0.5 -ml-3 transition-transform duration-100 group-open:rotate-180"
									/>
									<span className="font-jetbrains ml-auto">
										{formattedNum(asset.amount, false)} {asset.ticker}
									</span>
								</summary>
								<div className="mb-3 flex flex-col">
									<p className="justify-stat flex flex-wrap gap-4 border-b border-dashed border-(--cards-border) py-1 last:border-none">
										<span className="text-(--text-label)">Today's Value (USD)</span>
										<span className="font-jetbrains ml-auto justify-end overflow-hidden text-ellipsis whitespace-nowrap">
											{asset.usdValue != null ? formattedNum(asset.usdValue, true) : null}
										</span>
									</p>
									<p className="justify-stat flex flex-wrap gap-4 border-b border-dashed border-(--cards-border) py-1 last:border-none">
										<span className="text-(--text-label)">Cost Basis</span>
										<span className="font-jetbrains ml-auto justify-end overflow-hidden text-ellipsis whitespace-nowrap">
											{asset.cost != null ? formattedNum(asset.cost, true) : '-'}
										</span>
									</p>
									<p className="justify-stat flex flex-wrap gap-4 border-b border-dashed border-(--cards-border) py-1 last:border-none">
										<span className="text-(--text-label)">Average Purchase Price</span>
										<span className="font-jetbrains ml-auto justify-end overflow-hidden text-ellipsis whitespace-nowrap">
											{asset.avgPrice != null ? formattedNum(asset.avgPrice, true) : '-'}
										</span>
									</p>
								</div>
							</details>
						))}
						<p className="group flex flex-wrap justify-start gap-4 border-b border-(--cards-border) py-1 last:border-none">
							<span className="text-(--text-label)">First Announcement</span>
							<span className="font-jetbrains ml-auto">
								{props.firstAnnouncementDate != null ? dayjs(props.firstAnnouncementDate).format('MMM D, YYYY') : null}
							</span>
						</p>
						<p className="group flex flex-wrap justify-start gap-4 border-b border-(--cards-border) py-1 last:border-none">
							<span className="text-(--text-label)">Latest Announcement</span>
							<span className="font-jetbrains ml-auto">
								{props.lastAnnouncementDate != null ? dayjs(props.lastAnnouncementDate).format('MMM D, YYYY') : null}
							</span>
						</p>
						<p className="group flex flex-wrap justify-start gap-4 border-b border-(--cards-border) py-1 last:border-none">
							<span className="text-(--text-label)">Total Transactions</span>
							<span className="font-jetbrains ml-auto">{props.transactions.length}</span>
						</p>
						{props.price != null ? (
							<p className="group flex flex-wrap justify-start gap-4 border-b border-(--cards-border) py-1 last:border-none">
								<span className="text-(--text-label)">${props.ticker} price</span>
								{props.priceChange24h != null ? (
									<Tooltip
										content={
											<>
												24h change:{' '}
												<span
													className={props.priceChange24h > 0 ? 'text-(--success)' : 'text-(--error)'}
												>{`${props.priceChange24h > 0 ? '+' : ''}${props.priceChange24h.toFixed(2)}%`}</span>
											</>
										}
										className="font-jetbrains ml-auto underline decoration-dotted"
									>
										${props.price}
									</Tooltip>
								) : (
									<span className="font-jetbrains ml-auto">${props.price}</span>
								)}
							</p>
						) : null}
						{props.realized_mNAV != null ? (
							<p className="group flex flex-wrap justify-start gap-4 border-b border-(--cards-border) py-1 last:border-none">
								<Tooltip
									content="Market Net Asset Value based only on the current outstanding common shares, with no dilution considered"
									className="text-(--text-label) underline decoration-dotted"
								>
									Realized mNAV
								</Tooltip>
								<span className="font-jetbrains ml-auto">{formattedNum(props.realized_mNAV, false)}</span>
							</p>
						) : null}
						{props.realistic_mNAV != null ? (
							<p className="group flex flex-wrap justify-start gap-4 border-b border-(--cards-border) py-1 last:border-none">
								<Tooltip
									content="Market Net Asset Value adjusted for expected dilution from in-the-money options and convertibles that are likely to be exercised"
									className="text-(--text-label) underline decoration-dotted"
								>
									Realistic mNAV
								</Tooltip>
								<span className="font-jetbrains ml-auto">{formattedNum(props.realistic_mNAV, false)}</span>
							</p>
						) : null}
						{props.max_mNAV != null ? (
							<p className="group flex flex-wrap justify-start gap-4 border-b border-(--cards-border) py-1 last:border-none">
								<Tooltip
									content={`Market Net Asset Value under the fully diluted scenario, assuming every warrant, option, and convertible is exercised (the most conservative/worst-case view)`}
									className="text-(--text-label) underline decoration-dotted"
								>
									Max mNAV
								</Tooltip>
								<span className="font-jetbrains ml-auto">{formattedNum(props.max_mNAV, false)}</span>
							</p>
						) : null}
					</div>
					<BasicLink href="/report-error" className="mt-auto mr-auto pt-4 text-left text-(--text-form) underline">
						Report incorrect data
					</BasicLink>
				</div>
				<div className="col-span-2 flex min-h-[402px] flex-col rounded-md border border-(--cards-border) bg-(--cards-bg)">
					<div className="flex items-center justify-between p-2">
						<h2 className="text-base font-medium">Cumulative Holdings Over Time</h2>
						{props.assets.length > 1 && (
							<TagGroup
								selectedValue={selectedAsset}
								setValue={setSelectedAsset}
								values={props.assets}
								className="max-sm:w-full"
								triggerClassName="inline-flex max-sm:flex-1 items-center justify-center whitespace-nowrap"
							/>
						)}
					</div>
					<Suspense fallback={<div className="h-[360px]" />}>
						<SingleSeriesChart
							chartName={chartData.ticker}
							chartType={chartData.chart.length < 2 ? 'bar' : 'line'}
							chartData={chartData.chart}
							valueSymbol={chartData.ticker}
							color={CHART_COLORS[0]}
							chartOptions={chartOptions}
							symbolOnChart="circle"
							hideDataZoom={chartData.chart.length < 2}
						/>
					</Suspense>
				</div>
			</div>
			<div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
				{props.mNAVChart != null && (
					<div className="col-span-1 min-h-[360px] rounded-md border border-(--cards-border) bg-(--cards-bg) xl:[&:last-child:nth-child(2n-1)]:col-span-full">
						<h2 className="p-2 text-lg font-bold">mNAV</h2>
						<Suspense fallback={<div className="h-[360px]" />}>
							<LineAndBarChart charts={props.mNAVChart} valueSymbol="" hideDefaultLegend={false} />
						</Suspense>
					</div>
				)}
				{props.fdChart != null && (
					<div className="col-span-1 min-h-[360px] rounded-md border border-(--cards-border) bg-(--cards-bg) xl:[&:last-child:nth-child(2n-1)]:col-span-full">
						<h2 className="p-2 text-lg font-bold">Fully Diluted Shares</h2>
						<Suspense fallback={<div className="h-[360px]" />}>
							<LineAndBarChart charts={props.fdChart} valueSymbol="" hideDefaultLegend={false} />
						</Suspense>
					</div>
				)}
				{props.ohlcvChartData != null && (
					<div className="col-span-full min-h-[480px] rounded-md border border-(--cards-border) bg-(--cards-bg)">
						<h2 className="p-2 text-lg font-bold">Share Price</h2>
						<Suspense fallback={<div className="h-[480px]" />}>
							<CandlestickChart data={props.ohlcvChartData} />
						</Suspense>
						<p className="p-2 text-xs text-(--text-disabled)">Source: Yahoo Finance</p>
					</div>
				)}
				{props.totalAssetValueChart != null && (
					<div className="col-span-full min-h-[360px] rounded-md border border-(--cards-border) bg-(--cards-bg)">
						<h2 className="p-2 text-lg font-bold">Total Asset Value</h2>
						<Suspense fallback={<div className="h-[360px]" />}>
							<LineAndBarChart charts={props.totalAssetValueChart} valueSymbol="$" />
						</Suspense>
					</div>
				)}
			</div>
			<TableWithSearch
				data={props.transactions}
				columns={columns}
				placeholder="Search assets"
				columnToSearch="assetName"
				sortingState={[{ id: 'report_date', desc: true }]}
			/>
		</Layout>
	)
}

const columns: ColumnDef<IDATInstitution['transactions'][0]>[] = [
	{
		header: 'Asset',
		accessorKey: 'assetName',
		enableSorting: false,
		cell: ({ getValue }) => {
			return <>{getValue()}</>
		}
	},
	{
		header: 'Amount',
		id: 'amount',
		accessorFn: (row) => {
			return row.type === 'sale' ? -Number(row.amount) : Number(row.amount)
		},
		cell: ({ getValue, row }) => {
			const value = getValue() as number
			return (
				<span className={value < 0 ? 'text-(--error)' : 'text-(--success)'}>
					{`${value < 0 ? '-' : '+'}${formattedNum(Math.abs(value), false)} ${row.original.assetTicker}`}
				</span>
			)
		},
		meta: {
			align: 'end'
		}
	},
	{
		header: 'Avg Purchase Price',
		accessorKey: 'avg_price',
		cell: ({ getValue }) => {
			if (getValue() == null) return null
			return <>{formattedNum(getValue(), true)}</>
		},
		meta: {
			align: 'end'
		}
	},
	{
		header: 'USD Value',
		accessorKey: 'usd_value',
		cell: ({ getValue }) => {
			if (getValue() == null) return null
			return <>{formattedNum(getValue(), true)}</>
		},
		meta: {
			align: 'end'
		}
	},
	{
		header: 'Report Date',
		accessorKey: 'report_date',
		cell: ({ getValue }) => {
			if (getValue() == null) return null
			return <>{dayjs(getValue() as string).format('MMM D, YYYY')}</>
		},
		meta: {
			align: 'end'
		}
	},
	{
		header: 'Type',
		accessorKey: 'type',
		cell: ({ getValue }) => {
			function getType(type: string) {
				switch (type) {
					case 'purchase':
						return 'Purchase'
					case 'sale':
						return 'Sale'
					case 'mined':
						return 'Mined'
					case 'staking_reward':
						return 'Staking Reward'
					default:
						return type
				}
			}
			return <>{getType(getValue() as string)}</>
		},
		enableSorting: false,
		meta: {
			align: 'end'
		}
	},
	{
		header: 'Source Type',
		accessorKey: 'source_type',
		cell: ({ getValue }) => {
			function getSourceType(sourceType: string) {
				switch (sourceType) {
					case 'filing':
						return 'Filing'
					case 'twitter':
						return 'Twitter'
					case 'press-release':
						return 'Press Release'
					case 'site':
						return 'Site'
					case 'other':
						return 'Other'
					default:
						return sourceType
				}
			}
			return <>{getSourceType(getValue() as string)}</>
		},
		enableSorting: false,
		meta: {
			align: 'end'
		}
	},
	{
		header: 'Source URL',
		accessorKey: 'source_url',
		cell: ({ getValue }) => {
			return (
				<a
					className="flex items-center justify-center gap-4 rounded-md bg-(--btn2-bg) p-1.5 hover:bg-(--btn2-hover-bg)"
					href={getValue() as string}
					target="_blank"
					rel="noopener noreferrer"
				>
					<Icon name="arrow-up-right" height={14} width={14} />
					<span className="sr-only">open in new tab</span>
				</a>
			)
		},
		enableSorting: false
	},
	{
		header: 'Source Note',
		accessorKey: 'source_note',
		cell: ({ getValue }) => {
			return (
				<Tooltip className="inline overflow-hidden text-ellipsis whitespace-nowrap" content={getValue() as string}>
					{getValue() as string}
				</Tooltip>
			)
		},
		enableSorting: false,
		size: 1000
	}
]

const chartOptions = {
	tooltip: {
		formatter: (params: any) => {
			const label = params[0].value[2] < 0 ? 'Sold' : 'Purchased'
			const valueLabel = params[0].value[2] < 0 ? 'Sale value' : 'Purchase value'
			let val =
				dayjs(params[0].value[0]).format('MMM D, YYYY') +
				'<li style="list-style:none">' +
				`${label}:` +
				'&nbsp;&nbsp;' +
				'<span style="font-weight:600;">' +
				formattedNum(Math.abs(params[0].value[2]), false) +
				'&nbsp;' +
				params[0].seriesName +
				'</span>' +
				'</li>'

			if (params[0].value[3] != null) {
				val +=
					'<li style="list-style:none">' +
					`Cost basis per unit:` +
					'&nbsp;&nbsp;' +
					'<span style="font-weight:600;">' +
					formattedNum(params[0].value[3], true) +
					'</span>' +
					'</li>'
			}

			if (params[0].value[4] != null) {
				val +=
					'<li style="list-style:none">' +
					`${valueLabel}:` +
					'&nbsp;&nbsp;' +
					'<span style="font-weight:600;">' +
					formattedNum(params[0].value[4], true) +
					'</span>' +
					'</li>'
			}

			val +=
				'<li style="list-style:none">' +
				`Holdings till date:` +
				'&nbsp;&nbsp;' +
				'<span style="font-weight:600;">' +
				formattedNum(params[0].value[1], false) +
				'&nbsp;' +
				params[0].seriesName +
				'</span>' +
				'</li>'
			return val
		}
	}
}
