import { ColumnDef } from '@tanstack/react-table'
import dayjs from 'dayjs'
import type { GetStaticPropsContext } from 'next'
import { lazy, Suspense, useMemo, useState } from 'react'
import { maxAgeForNext } from '~/api'
import { ChartCsvExportButton } from '~/components/ButtonStyled/ChartCsvExportButton'
import { ChartExportButton } from '~/components/ButtonStyled/ChartExportButton'
import { IMultiSeriesChart2Props } from '~/components/ECharts/types'
import { Icon } from '~/components/Icon'
import { BasicLink } from '~/components/Link'
import { TableWithSearch } from '~/components/Table/TableWithSearch'
import { TagGroup } from '~/components/TagGroup'
import { Tooltip } from '~/components/Tooltip'
import { TRADFI_API } from '~/constants'
import { CHART_COLORS } from '~/constants/colors'
import { useChartCsvExport } from '~/hooks/useChartCsvExport'
import { useChartImageExport } from '~/hooks/useChartImageExport'
import Layout from '~/layout'
import { formattedNum, slug } from '~/utils'
import { fetchJson } from '~/utils/async'
import { withPerformanceLogging } from '~/utils/perf'

const DEFAULT_SORTING_STATE = [{ id: 'report_date', desc: true }]

const MultiSeriesChart2 = lazy(() => import('~/components/ECharts/MultiSeriesChart2'))
const CandlestickChart = lazy(() => import('~/components/ECharts/CandlestickChart')) as React.FC<any>

const getType = (type: string) => {
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

const getSourceType = (sourceType: string) => {
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

const ensureChronologicalPairs = <T extends [number, ...unknown[]]>(rows: T[]) => {
	if (rows.length < 2) return rows

	let prev = rows[0][0]
	for (let i = 1; i < rows.length; i++) {
		const curr = rows[i][0]
		if (curr < prev) {
			return rows.toSorted((a, b) => a[0] - b[0])
		}
		prev = curr
	}

	return rows
}

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
	stats: Array<[number, number, number, number, number, number, number, number, number, number]> // [timestamp, fd_realized, fd_realistic, fd_maximum, mcap_realized, mcap_realistic, mcap_max, mNAV_realized, mNAV_realistic, mNAV_max]
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
	'digital-asset-treasury/[company]',
	async ({ params }: GetStaticPropsContext<{ company: string }>) => {
		if (!params?.company) {
			return { notFound: true, props: null }
		}

		const company = params.company
		const data: IDATInstitution | null = await fetchJson(`${TRADFI_API}/institutions/${company}`).catch(() => null)

		if (!data) {
			return { notFound: true, props: null }
		}

		const chartByAsset = []
		for (const assetKey in data.assets) {
			const assetMeta = data.assetsMeta[assetKey]
			const transactionRows = ensureChronologicalPairs(
				data.transactions
					.filter((item) => item.asset === assetKey)
					.map((item) => [
						Math.floor(new Date(item.end_date ?? item.start_date).getTime() / 1000),
						item.type === 'sale' ? -Number(item.amount) : Number(item.amount),
						item.avg_price ? Number(item.avg_price) : null,
						item.usd_value ? Number(item.usd_value) : null
					])
			)

			let totalAmount = 0
			const seriesName = assetMeta.ticker
			const source = transactionRows.map(([timestamp, amount, avgPrice, usdValue]) => {
				totalAmount += amount
				return {
					timestamp: timestamp * 1000,
					[seriesName]: totalAmount,
					delta: amount,
					avgPrice,
					usdValue
				}
			})
			const holdingsChart = {
				dataset: {
					source,
					dimensions: ['timestamp', seriesName, 'delta', 'avgPrice', 'usdValue']
				},
				charts: [
					{
						type: (source.length < 2 ? 'bar' : 'line') as 'bar' | 'line',
						name: seriesName,
						encode: { x: 'timestamp', y: seriesName },
						stack: seriesName,
						color: CHART_COLORS[0],
						// Show point markers for this single-series holdings chart.
						showSymbol: true,
						symbol: 'circle',
						symbolSize: 6
					}
				]
			}

			chartByAsset.push({
				asset: assetKey,
				name: assetMeta.name,
				ticker: assetMeta.ticker,
				holdingsChart
			})
		}

		const mNAVChart = {
			dataset: {
				source: data.stats.map((item) => ({
					timestamp: item[0],
					'Realized mNAV': item[7],
					'Realistic mNAV': item[8],
					'Max mNAV': item[9]
				})),
				dimensions: ['timestamp', 'Realized mNAV', 'Realistic mNAV', 'Max mNAV']
			},
			charts: [
				{
					type: 'line' as const,
					name: 'Realized mNAV',
					encode: { x: 'timestamp', y: 'Realized mNAV' },
					stack: 'Realized mNAV',
					color: CHART_COLORS[0]
				},
				{
					type: 'line' as const,
					name: 'Realistic mNAV',
					encode: { x: 'timestamp', y: 'Realistic mNAV' },
					stack: 'Realistic mNAV',
					color: CHART_COLORS[1]
				},
				{
					type: 'line' as const,
					name: 'Max mNAV',
					encode: { x: 'timestamp', y: 'Max mNAV' },
					stack: 'Max mNAV',
					color: CHART_COLORS[2]
				}
			]
		}

		const fdChart = {
			dataset: {
				source: data.stats.map((item) => ({
					timestamp: item[0],
					'FD Realized': item[1],
					'FD Realistic': item[2],
					'FD Max': item[3]
				})),
				dimensions: ['timestamp', 'FD Realized', 'FD Realistic', 'FD Max']
			},
			charts: [
				{
					type: 'line' as const,
					name: 'FD Realized',
					encode: { x: 'timestamp', y: 'FD Realized' },
					stack: 'FD Realized',
					color: CHART_COLORS[3]
				},
				{
					type: 'line' as const,
					name: 'FD Realistic',
					encode: { x: 'timestamp', y: 'FD Realistic' },
					stack: 'FD Realistic',
					color: CHART_COLORS[4]
				},
				{
					type: 'line' as const,
					name: 'FD Max',
					encode: { x: 'timestamp', y: 'FD Max' },
					stack: 'FD Max',
					color: CHART_COLORS[5]
				}
			]
		}

		const totalAssetValueChart = {
			dataset: {
				source: data.assetValue.map(([timestamp, value]) => ({ timestamp, 'Total Asset Value': value })),
				dimensions: ['timestamp', 'Total Asset Value']
			},
			charts: [
				{
					type: 'line' as const,
					name: 'Total Asset Value',
					encode: { x: 'timestamp', y: 'Total Asset Value' },
					stack: 'Total Asset Value',
					color: CHART_COLORS[6]
				}
			]
		}

		const ohlcvChartData = data.ohlcv.map(([date, open, high, low, close, volume]) => [
			date,
			open,
			close,
			low,
			high,
			volume
		])

		// Compute sorted assets
		const assetEntries: [string, (typeof data.assets)[string]][] = []
		for (const key in data.assets) {
			assetEntries.push([key, data.assets[key]])
		}
		assetEntries.sort((a, b) => (b[1].usdValue ?? 0) - (a[1].usdValue ?? 0))
		const sortedAssetTickers: string[] = []
		for (const [asset] of assetEntries) {
			sortedAssetTickers.push(data.assetsMeta[asset].ticker)
		}

		// Compute assets breakdown
		const assetsBreakdownData: Array<{
			name: string
			ticker: string
			amount: number
			cost: number | null
			usdValue: number | null
			avgPrice: number | null
		}> = []
		for (const asset in data.assets) {
			const { amount, cost, usdValue, avgPrice } = data.assets[asset]
			assetsBreakdownData.push({
				name: data.assetsMeta[asset].name,
				ticker: data.assetsMeta[asset].ticker,
				amount: amount,
				cost: cost ?? null,
				usdValue: usdValue ?? null,
				avgPrice: avgPrice ?? null
			})
		}
		assetsBreakdownData.sort((a, b) => (b.usdValue ?? 0) - (a.usdValue ?? 0))

		return {
			props: {
				name: data.name,
				ticker: data.ticker,
				transactions: data.transactions,
				price: data.price,
				priceChange24h: data.priceChange24h,
				totalCost: data.totalCost,
				totalUsdValue: data.totalUsdValue,
				firstAnnouncementDate: data.transactions[data.transactions.length - 1]?.report_date ?? null,
				lastAnnouncementDate: data.transactions[0]?.report_date ?? null,
				realized_mNAV: data.stats.length > 0 ? data.stats[data.stats.length - 1][7] : null,
				realistic_mNAV: data.stats.length > 0 ? data.stats[data.stats.length - 1][8] : null,
				max_mNAV: data.stats.length > 0 ? data.stats[data.stats.length - 1][9] : null,
				assets: sortedAssetTickers,
				assetsBreakdown: assetsBreakdownData,
				chartByAsset,
				mNAVChart: data.stats.length > 0 ? mNAVChart : null,
				fdChart: data.stats.length > 0 ? fdChart : null,
				totalAssetValueChart: data.assetValue.length > 0 ? totalAssetValueChart : null,
				ohlcvChartData: data.ohlcv.length > 0 ? ohlcvChartData : null
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
		params: { company: slug(ticker) }
	}))
	return { paths, fallback: false }
}

interface IProps extends Pick<
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
		holdingsChart: { dataset: IMultiSeriesChart2Props['dataset']; charts: IMultiSeriesChart2Props['charts'] }
	}>
	mNAVChart?: { dataset: IMultiSeriesChart2Props['dataset']; charts: IMultiSeriesChart2Props['charts'] }
	fdChart?: { dataset: IMultiSeriesChart2Props['dataset']; charts: IMultiSeriesChart2Props['charts'] }
	totalAssetValueChart?: { dataset: IMultiSeriesChart2Props['dataset']; charts: IMultiSeriesChart2Props['charts'] }
	ohlcvChartData?: Array<[number, number, number, number, number, number]>
}

export default function DigitalAssetTreasury(props: IProps) {
	const [selectedAsset, setSelectedAsset] = useState<string | null>(props.assets[0])
	const { chartInstance: exportChartInstance, handleChartReady } = useChartImageExport()
	const { chartInstance: exportChartCsvInstance, handleChartReady: handleChartCsvReady } = useChartCsvExport()
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
									<span className="ml-auto font-jetbrains">{props.assets.join(', ')}</span>
								</p>
								{props.totalUsdValue != null ? (
									<p className="group flex flex-wrap justify-start gap-4 border-b border-(--cards-border) py-1 last:border-none">
										<span className="text-(--text-label)">Assets Today's Value (USD)</span>
										<span className="ml-auto font-jetbrains">{formattedNum(props.totalUsdValue, true)}</span>
									</p>
								) : null}
								{props.totalCost != null && (
									<p className="group flex flex-wrap justify-start gap-4 border-b border-(--cards-border) py-1 last:border-none">
										<span className="text-(--text-label)">Assets Cost Basis</span>
										<span className="ml-auto font-jetbrains">
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
									<span className="ml-auto font-jetbrains">
										{formattedNum(asset.amount, false)} {asset.ticker}
									</span>
								</summary>
								<div className="mb-3 flex flex-col">
									<p className="justify-stat flex flex-wrap gap-4 border-b border-dashed border-(--cards-border) py-1 last:border-none">
										<span className="text-(--text-label)">Today's Value (USD)</span>
										<span className="ml-auto justify-end overflow-hidden font-jetbrains text-ellipsis whitespace-nowrap">
											{asset.usdValue != null ? formattedNum(asset.usdValue, true) : null}
										</span>
									</p>
									<p className="justify-stat flex flex-wrap gap-4 border-b border-dashed border-(--cards-border) py-1 last:border-none">
										<span className="text-(--text-label)">Cost Basis</span>
										<span className="ml-auto justify-end overflow-hidden font-jetbrains text-ellipsis whitespace-nowrap">
											{asset.cost != null ? formattedNum(asset.cost, true) : '-'}
										</span>
									</p>
									<p className="justify-stat flex flex-wrap gap-4 border-b border-dashed border-(--cards-border) py-1 last:border-none">
										<span className="text-(--text-label)">Average Purchase Price</span>
										<span className="ml-auto justify-end overflow-hidden font-jetbrains text-ellipsis whitespace-nowrap">
											{asset.avgPrice != null ? formattedNum(asset.avgPrice, true) : '-'}
										</span>
									</p>
								</div>
							</details>
						))}
						<p className="group flex flex-wrap justify-start gap-4 border-b border-(--cards-border) py-1 last:border-none">
							<span className="text-(--text-label)">First Announcement</span>
							<span className="ml-auto font-jetbrains">
								{props.firstAnnouncementDate != null ? dayjs(props.firstAnnouncementDate).format('MMM D, YYYY') : null}
							</span>
						</p>
						<p className="group flex flex-wrap justify-start gap-4 border-b border-(--cards-border) py-1 last:border-none">
							<span className="text-(--text-label)">Latest Announcement</span>
							<span className="ml-auto font-jetbrains">
								{props.lastAnnouncementDate != null ? dayjs(props.lastAnnouncementDate).format('MMM D, YYYY') : null}
							</span>
						</p>
						<p className="group flex flex-wrap justify-start gap-4 border-b border-(--cards-border) py-1 last:border-none">
							<span className="text-(--text-label)">Total Transactions</span>
							<span className="ml-auto font-jetbrains">{props.transactions.length}</span>
						</p>
						{props.price != null ? (
							<p className="group flex flex-wrap justify-start gap-4 border-b border-(--cards-border) py-1 last:border-none">
								<span className="text-(--text-label)">${props.ticker} price</span>
								{props.priceChange24h != null ? (
									<Tooltip
										content={
											<>
												24h change:{' '}
												<span className={props.priceChange24h > 0 ? 'text-(--success)' : 'text-(--error)'}>
													{`${props.priceChange24h > 0 ? '+' : ''}${props.priceChange24h.toFixed(2)}%`}
												</span>
											</>
										}
										className="ml-auto font-jetbrains underline decoration-dotted"
									>
										${props.price}
									</Tooltip>
								) : (
									<span className="ml-auto font-jetbrains">${props.price}</span>
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
								<span className="ml-auto font-jetbrains">{formattedNum(props.realized_mNAV, false)}</span>
							</p>
						) : null}
						{props.realistic_mNAV != null ? (
							<p className="group flex flex-wrap justify-start gap-4 border-b border-(--cards-border) py-1 last:border-none">
								<Tooltip
									content="Market Net asset value adjusted for expected dilution from in-the-money options and convertibles that are likely to be exercised"
									className="text-(--text-label) underline decoration-dotted"
								>
									Realistic mNAV
								</Tooltip>
								<span className="ml-auto font-jetbrains">{formattedNum(props.realistic_mNAV, false)}</span>
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
								<span className="ml-auto font-jetbrains">{formattedNum(props.max_mNAV, false)}</span>
							</p>
						) : null}
					</div>
					<BasicLink href="/report-error" className="mt-auto mr-auto pt-4 text-left text-(--text-form) underline">
						Report incorrect data
					</BasicLink>
				</div>
				<div className="col-span-2 flex flex-col rounded-md border border-(--cards-border) bg-(--cards-bg)">
					<div className="flex items-center justify-end gap-2 p-2">
						<h1 className="mr-auto text-base font-semibold">Cumulative Holdings Over Time</h1>
						{props.assets.length > 1 && (
							<TagGroup
								selectedValue={selectedAsset}
								setValue={setSelectedAsset}
								values={props.assets}
								className="max-sm:w-full"
								triggerClassName="inline-flex max-sm:flex-1 items-center justify-center whitespace-nowrap"
							/>
						)}
						<ChartCsvExportButton
							chartInstance={exportChartCsvInstance}
							filename={`${slug(props.name)}-holdings`}
							className="flex items-center justify-center gap-1 rounded-md border border-(--form-control-border) px-2 py-1.5 text-xs text-(--text-form) hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) disabled:text-(--text-disabled)"
							smol
						/>
						<ChartExportButton
							chartInstance={exportChartInstance}
							filename={`${slug(props.name)}-holdings`}
							title="Cumulative Holdings Over Time"
							className="flex items-center justify-center gap-1 rounded-md border border-(--form-control-border) px-2 py-1.5 text-xs text-(--text-form) hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) disabled:text-(--text-disabled)"
							smol
						/>
					</div>
					<Suspense fallback={<div className="h-[360px]" />}>
						{chartData ? (
							<MultiSeriesChart2
								dataset={chartData.holdingsChart.dataset}
								charts={chartData.holdingsChart.charts}
								valueSymbol={chartData.ticker}
								hideDataZoom={chartData.holdingsChart.dataset.source.length < 2}
								chartOptions={chartOptions}
								onReady={(instance) => {
									handleChartReady(instance)
									handleChartCsvReady(instance)
								}}
							/>
						) : (
							<div className="h-[360px]" />
						)}
					</Suspense>
				</div>
			</div>
			<div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
				{props.mNAVChart != null && (
					<div className="col-span-1 min-h-[408px] rounded-md border border-(--cards-border) bg-(--cards-bg) pt-2 xl:[&:last-child:nth-child(2n-1)]:col-span-full">
						<Suspense fallback={<></>}>
							<MultiSeriesChart2
								dataset={props.mNAVChart.dataset}
								charts={props.mNAVChart.charts}
								valueSymbol=""
								hideDefaultLegend={false}
								title="mNAV"
								shouldEnableImageExport
								shouldEnableCSVDownload
								imageExportFilename={`${slug(props.name)}-mnav`}
								imageExportTitle="mNAV"
							/>
						</Suspense>
					</div>
				)}
				{props.fdChart != null && (
					<div className="col-span-1 min-h-[408px] rounded-md border border-(--cards-border) bg-(--cards-bg) pt-2 xl:[&:last-child:nth-child(2n-1)]:col-span-full">
						<Suspense fallback={<></>}>
							<MultiSeriesChart2
								dataset={props.fdChart.dataset}
								charts={props.fdChart.charts}
								valueSymbol=""
								hideDefaultLegend={false}
								title="Fully Diluted Shares"
								shouldEnableImageExport
								shouldEnableCSVDownload
								imageExportFilename={`${slug(props.name)}-fully-diluted-shares`}
								imageExportTitle="Fully Diluted Shares"
							/>
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
					<div className="col-span-full min-h-[408px] rounded-md border border-(--cards-border) bg-(--cards-bg) pt-2">
						<Suspense fallback={<></>}>
							<MultiSeriesChart2
								dataset={props.totalAssetValueChart.dataset}
								charts={props.totalAssetValueChart.charts}
								valueSymbol="$"
								title="Total Asset Value"
								shouldEnableImageExport
								shouldEnableCSVDownload
								imageExportFilename={`${slug(props.name)}-total-asset-value`}
								imageExportTitle="Total Asset Value"
							/>
						</Suspense>
					</div>
				)}
			</div>
			<TableWithSearch
				data={props.transactions}
				columns={columns}
				placeholder="Search assets"
				columnToSearch="assetName"
				sortingState={DEFAULT_SORTING_STATE}
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
			const firstParam = Array.isArray(params) ? params[0] : params
			if (!firstParam) return ''
			const row = firstParam?.data ?? {}
			const timestamp =
				row?.timestamp ?? (Array.isArray(firstParam?.value) ? firstParam.value[0] : undefined) ?? firstParam?.axisValue
			const holdings =
				row?.[firstParam?.seriesName] ?? (Array.isArray(firstParam?.value) ? firstParam.value[1] : undefined)
			const deltaRaw = row?.delta ?? (Array.isArray(firstParam?.value) ? firstParam.value[2] : undefined)
			const avgPrice = row?.avgPrice ?? (Array.isArray(firstParam?.value) ? firstParam.value[3] : undefined)
			const usdValue = row?.usdValue ?? (Array.isArray(firstParam?.value) ? firstParam.value[4] : undefined)
			const deltaValue = typeof deltaRaw === 'number' ? deltaRaw : Number(deltaRaw ?? 0)
			const label = deltaValue < 0 ? 'Sold' : 'Purchased'
			const valueLabel = deltaValue < 0 ? 'Sale value' : 'Purchase value'
			let val =
				dayjs(timestamp).format('MMM D, YYYY') +
				'<li style="list-style:none">' +
				`${label}:` +
				'&nbsp;&nbsp;' +
				'<span style="font-weight:600;">' +
				formattedNum(Math.abs(deltaValue), false) +
				'&nbsp;' +
				firstParam.seriesName +
				'</span>' +
				'</li>'

			if (avgPrice != null) {
				val +=
					'<li style="list-style:none">' +
					`Cost basis per unit:` +
					'&nbsp;&nbsp;' +
					'<span style="font-weight:600;">' +
					formattedNum(Number(avgPrice), true) +
					'</span>' +
					'</li>'
			}

			if (usdValue != null) {
				val +=
					'<li style="list-style:none">' +
					`${valueLabel}:` +
					'&nbsp;&nbsp;' +
					'<span style="font-weight:600;">' +
					formattedNum(Number(usdValue), true) +
					'</span>' +
					'</li>'
			}

			val +=
				'<li style="list-style:none">' +
				`Holdings till date:` +
				'&nbsp;&nbsp;' +
				'<span style="font-weight:600;">' +
				formattedNum(typeof holdings === 'number' ? holdings : Number(holdings ?? 0), false) +
				'&nbsp;' +
				firstParam.seriesName +
				'</span>' +
				'</li>'
			return val
		}
	}
}
