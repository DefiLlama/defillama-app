import { lazy, Suspense, useMemo, useState } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import dayjs from 'dayjs'
import { maxAgeForNext } from '~/api'
import { ISingleSeriesChartProps } from '~/components/ECharts/types'
import { Icon } from '~/components/Icon'
import { TableWithSearch } from '~/components/Table/TableWithSearch'
import { TagGroup } from '~/components/TagGroup'
import { Tooltip } from '~/components/Tooltip'
import { CHART_COLORS } from '~/constants/colors'
import Layout from '~/layout'
import { capitalizeFirstLetter, formattedNum, slug } from '~/utils'
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
}

const SYMBOL_MAP = {
	bitcoin: 'BTC',
	ethereum: 'ETH',
	solana: 'SOL'
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

		const chartByAsset = data.assets.map((asset) => {
			let totalAmount = 0
			return {
				assetName: capitalizeFirstLetter(asset),
				assetSymbol: SYMBOL_MAP[asset] ?? asset,
				chart: data.transactions
					.filter((item) => item.asset === asset)
					.map((item) => [
						Math.floor(new Date(item.end_date ?? item.start_date).getTime() / 1000),
						Number(item.amount),
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
				assets: data.assets.map((asset) => capitalizeFirstLetter(asset)),
				assetsBreakdown: Object.entries(data.totalAssetsByAsset).map(([asset, { amount, cost, usdValue }]) => ({
					assetName: capitalizeFirstLetter(asset),
					assetSymbol: SYMBOL_MAP[asset] ?? asset,
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
	return { paths: [], fallback: 'blocking' }
}

interface IProps extends IDigitalAssetTreasuryCompany {
	assetsBreakdown: Array<{
		assetName: string
		assetSymbol: string
		amount: number
		cost: number | null
		usdValue: number | null
	}>
	chartByAsset: Array<{
		assetName: string
		assetSymbol: string
		chart: Array<[number, number, number, number | null, number | null]>
	}>
}

export default function DigitalAssetTreasury(props: IProps) {
	const [selectedAsset, setSelectedAsset] = useState<string | null>(props.assets[0])
	const chartData = useMemo(() => {
		return props.chartByAsset.find((asset) => asset.assetName === selectedAsset)
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
								key={`${props.ticker}-${asset.assetName}`}
								open={props.assetsBreakdown.length === 1 && index === 0}
							>
								<summary className="flex flex-wrap justify-start gap-4 border-b border-(--cards-border) py-1 group-last:border-none group-open:border-none group-open:font-semibold">
									<span className="text-(--text-label)">Total {asset.assetName}</span>
									<Icon
										name="chevron-down"
										height={16}
										width={16}
										className="relative top-0.5 -ml-3 transition-transform duration-100 group-open:rotate-180"
									/>
									<span className="font-jetbrains ml-auto">
										{formattedNum(asset.amount, false)} {asset.assetSymbol}
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
					</div>
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
							chartName={chartData.assetSymbol}
							chartType="line"
							chartData={chartData.chart}
							valueSymbol={chartData.assetSymbol}
							color={CHART_COLORS[0]}
							chartOptions={chartOptions}
							symbolOnChart="circle"
						/>
					</Suspense>
				</div>
			</div>
			<TableWithSearch
				data={props.transactions}
				columns={columns}
				placeholder="Search transactions"
				columnToSearch="asset"
				sortingState={[{ id: 'report_date', desc: true }]}
			/>
		</Layout>
	)
}

const columns: ColumnDef<IDigitalAssetTreasuryCompany['transactions'][0]>[] = [
	{
		header: 'Asset',
		accessorKey: 'asset',
		enableSorting: false,
		cell: ({ getValue }) => {
			return <>{getValue()}</>
		}
	},
	{
		header: 'Amount',
		accessorKey: 'amount',
		cell: ({ getValue }) => {
			return <>{formattedNum(getValue(), false)}</>
		},
		meta: {
			align: 'end'
		}
	},
	{
		header: 'Avg Price',
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
		header: 'Start Date',
		accessorKey: 'start_date',
		cell: ({ getValue }) => {
			if (getValue() == null) return null
			return <>{dayjs(getValue() as string).format('MMM D, YYYY')}</>
		},
		meta: {
			align: 'end'
		}
	},
	{
		header: 'End Date',
		accessorKey: 'end_date',
		cell: ({ getValue }) => {
			if (getValue() == null) return null
			return <>{dayjs(getValue() as string).format('MMM D, YYYY')}</>
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
			let val =
				dayjs(params[0].value[0]).format('MMM D, YYYY') +
				'<li style="list-style:none">' +
				'Purchased:' +
				'&nbsp;&nbsp;' +
				'<span style="font-weight:600;">' +
				formattedNum(params[0].value[2], false) +
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
					`Purchase value:` +
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
