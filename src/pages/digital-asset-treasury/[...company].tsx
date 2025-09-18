import { lazy, Suspense, useMemo, useState } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import dayjs from 'dayjs'
import { maxAgeForNext } from '~/api'
import { ISingleSeriesChartProps } from '~/components/ECharts/types'
import { Icon } from '~/components/Icon'
import { BasicLink } from '~/components/Link'
import { TableWithSearch } from '~/components/Table/TableWithSearch'
import { TagGroup } from '~/components/TagGroup'
import { Tooltip } from '~/components/Tooltip'
import { CHART_COLORS } from '~/constants/colors'
import Layout from '~/layout'
import { formattedNum, slug } from '~/utils'
import { fetchJson } from '~/utils/async'
import { withPerformanceLogging } from '~/utils/perf'

const SingleSeriesChart = lazy(
	() => import('~/components/ECharts/SingleSeriesChart')
) as React.FC<ISingleSeriesChartProps>

interface IDigitalAssetTreasuryCompany {
	ticker: string
	name: string
	type: string
	assets: Array<string>
	totalAssetsByAsset: {
		[asset: string]: {
			amount: number
			usdValue?: number | null
			cost?: number | null
		}
	}
	last30dChanges: Array<{
		date: string
		asset: string
		amount: number
		type: string
		usd_value: number | null
	}>
	totalAssetAmount: number
	totalCost?: number | null
	totalUsdValue?: number | null
	transactionCount: number
	firstAnnouncementDate: string
	lastAnnouncementDate: string
	transactions: Array<{
		ticker: string
		asset: string
		assetName: string
		assetTicker: string
		amount: number // DECIMAL(20, 8)
		avg_price?: number // DECIMAL(20, 8)
		usd_value?: number // DECIMAL(20, 2)
		start_date: string // DATEONLY (YYYY-MM-DD)
		end_date: string // DATEONLY (YYYY-MM-DD)
		report_date?: string // DATEONLY (YYYY-MM-DD)
		type: 'purchase' | 'sale' | 'mined' | 'staking_reward'
		source_type: 'filing' | 'twitter' | 'press-release' | 'site' | 'other'
		source_url?: string
		source_note?: string
		is_approved?: boolean
		reject_reason?: string
		last_updated?: Date
	}>
	realized_mNAV?: number | null
	realistic_mNAV?: number | null
	max_mNAV?: number | null
	price?: number | null
	priceChange24h?: number | null
}

export const getStaticProps = withPerformanceLogging(
	'digital-asset-treasury/[...company]',
	async ({
		params: {
			company: [company]
		}
	}) => {
		const data: IDigitalAssetTreasuryCompany | null = await fetchJson(
			`http://pkg0k8088o4cckkoww44scwo.37.27.48.106.sslip.io/v1/companies/${company}`
		).catch(() => null)

		if (!data) {
			return { notFound: true, props: null }
		}

		const assetsByNameAndTicker = Object.fromEntries(
			data.assets.map((asset) => {
				const assetTx = data.transactions.find((a) => a.asset === asset)
				return [asset, { name: assetTx?.assetName ?? null, ticker: assetTx?.assetTicker ?? null }]
			})
		)

		const chartByAsset = data.assets.map((asset) => {
			let totalAmount = 0
			return {
				asset,
				name: assetsByNameAndTicker[asset].name,
				ticker: assetsByNameAndTicker[asset].ticker,
				chart: data.transactions
					.filter((item) => item.asset === asset)
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

		return {
			props: {
				...data,
				assets: data.assets,
				assetsBreakdown: Object.entries(data.totalAssetsByAsset).map(([asset, { amount, cost, usdValue }]) => ({
					name: assetsByNameAndTicker[asset].name,
					ticker: assetsByNameAndTicker[asset].ticker,
					amount: amount,
					cost: cost ?? null,
					usdValue: usdValue ?? null
				})),
				chartByAsset
			},
			revalidate: maxAgeForNext([22])
		}
	}
)

export async function getStaticPaths() {
	const data = await fetchJson('http://pkg0k8088o4cckkoww44scwo.37.27.48.106.sslip.io/v1/companies')
	const tickers = new Set<string>()
	for (const asset in data.breakdownByAsset) {
		for (const company of data.breakdownByAsset[asset]) {
			tickers.add(company.ticker)
		}
	}
	const paths = Array.from(tickers).map((ticker) => ({
		params: { company: [slug(ticker)] }
	}))
	return { paths, fallback: false }
}

interface IProps extends IDigitalAssetTreasuryCompany {
	assetsBreakdown: Array<{
		name: string
		ticker: string
		amount: number
		cost: number | null
		usdValue: number | null
	}>
	chartByAsset: Array<{
		asset: string
		name: string
		ticker: string
		chart: Array<[number, number, number, number | null, number | null]>
	}>
}

export default function DigitalAssetTreasury(props: IProps) {
	const [selectedAsset, setSelectedAsset] = useState<string | null>(props.assets[0])
	const chartData = useMemo(() => {
		return props.chartByAsset.find((asset) => asset.asset === selectedAsset)
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
								<p className="group flex flex-wrap justify-start gap-4 border-b border-(--cards-border) py-1 last:border-none">
									<span className="text-(--text-label)">Assets Cost Basis</span>
									<span className="font-jetbrains ml-auto">
										{props.totalCost != null ? formattedNum(props.totalCost, true) : null}
									</span>
								</p>
								<p className="group flex flex-wrap justify-start gap-4 border-b border-(--cards-border) py-1 last:border-none">
									<span className="text-(--text-label)">Assets Today's Value (USD)</span>
									<span className="font-jetbrains ml-auto">
										{props.totalUsdValue != null ? formattedNum(props.totalUsdValue, true) : null}
									</span>
								</p>
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
										<span className="text-(--text-label)">Cost Basis</span>
										<span className="font-jetbrains ml-auto justify-end overflow-hidden text-ellipsis whitespace-nowrap">
											{asset.cost != null ? formattedNum(asset.cost, true) : null}
										</span>
									</p>
									<p className="justify-stat flex flex-wrap gap-4 border-b border-dashed border-(--cards-border) py-1 last:border-none">
										<span className="text-(--text-label)">Today's Value (USD)</span>
										<span className="font-jetbrains ml-auto justify-end overflow-hidden text-ellipsis whitespace-nowrap">
											{asset.usdValue != null ? formattedNum(asset.usdValue, true) : null}
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
							<span className="font-jetbrains ml-auto">{props.transactionCount}</span>
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
					<BasicLink href="/report-error" className="mt-auto pt-4 text-left text-(--text-form) underline">
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

const columns: ColumnDef<IDigitalAssetTreasuryCompany['transactions'][0]>[] = [
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
