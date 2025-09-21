import { lazy, Suspense } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { maxAgeForNext } from '~/api'
import { ILineAndBarChartProps } from '~/components/ECharts/types'
import { BasicLink } from '~/components/Link'
import { RowLinksWithDropdown } from '~/components/RowLinksWithDropdown'
import { TableWithSearch } from '~/components/Table/TableWithSearch'
import { Tooltip } from '~/components/Tooltip'
import { oldBlue } from '~/constants/colors'
import Layout from '~/layout'
import { formattedNum, slug } from '~/utils'
import { fetchJson } from '~/utils/async'
import { withPerformanceLogging } from '~/utils/perf'

const LineAndBarChart = lazy(() => import('~/components/ECharts/LineAndBarChart')) as React.FC<ILineAndBarChartProps>

interface ITreasuryCompanies {
	breakdownByAsset: {
		[asset: string]: Array<{
			ticker: string
			name: string
			type: string
			assets: Array<string>
			assetName: string
			assetTicker: string
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
			supplyPercentage: number
			avgPrice?: number | null
			realized_mNAV?: number | null
			realistic_mNAV?: number | null
			max_mNAV?: number | null
			price?: number | null
			priceChange24h?: number | null
		}>
	}
	totalCompanies: number
	statsByAsset: {
		[asset: string]: {
			totalCompanies: number
			totalHoldings: number
			totalUsdValue: number
			circSupplyPerc?: number | null
		}
	}
	dailyFlows: Array<[number, number]>
	lastUpdated: string
}

export const getStaticProps = withPerformanceLogging(
	'digital-asset-treasuries/[...asset]',
	async ({
		params: {
			asset: [assetName]
		}
	}) => {
		const asset = slug(assetName)
		const res: ITreasuryCompanies = await fetchJson(
			'http://pkg0k8088o4cckkoww44scwo.37.27.48.106.sslip.io/v1/companies'
		)
		const breakdown = res.breakdownByAsset[asset]
		const stats = res.statsByAsset[asset]
		const dailyFlows = res.dailyFlows[asset]
		const name = breakdown[0].assetName
		const symbol = breakdown[0].assetTicker

		const allAssets = [{ label: 'All', to: '/digital-asset-treasuries' }]
		for (const asset in res.breakdownByAsset) {
			allAssets.push({ label: res.breakdownByAsset[asset][0].assetName, to: `/digital-asset-treasuries/${asset}` })
		}

		if (!breakdown || !stats) {
			return { notFound: true, props: null }
		}

		return {
			props: {
				breakdown,
				stats,
				asset,
				name,
				symbol,
				allAssets,
				dailyFlowsChart: {
					[name]: {
						name: name,
						stack: name,
						type: 'bar',
						color: oldBlue,
						data: dailyFlows
					}
				}
			},
			revalidate: maxAgeForNext([22])
		}
	}
)

export async function getStaticPaths() {
	const res: ITreasuryCompanies = await fetchJson('http://pkg0k8088o4cckkoww44scwo.37.27.48.106.sslip.io/v1/companies')

	const paths = []

	for (const asset in res.breakdownByAsset) {
		paths.push(`/digital-asset-treasuries/${asset}`)
	}

	return { paths, fallback: false }
}

const pageName = ['Digital Asset Treasuries', 'by', 'Institution']

export default function TreasuriesByAsset({
	name,
	breakdown,
	stats,
	symbol,
	asset,
	allAssets,
	dailyFlowsChart
}: {
	name: string
	breakdown: ITreasuryCompanies['breakdownByAsset'][string]
	stats: ITreasuryCompanies['statsByAsset'][string]
	symbol: string
	asset: string
	allAssets: Array<{ label: string; to: string }>
	dailyFlowsChart: ILineAndBarChartProps['charts']
}) {
	return (
		<Layout
			title={`${name} Treasury Holdings - DefiLlama`}
			description={`Track institutions that own ${name} ($${symbol}) as part of their corporate treasury. DefiLlama is committed to providing accurate data without ads or sponsored content, as well as transparency.`}
			keywords={`${name} (${symbol}) treasury holdings, ${name} (${symbol}) corporate treasury, ${name} (${symbol}) treasury holdings by institution, ${name} (${symbol}) treasury holdings by company, ${name} (${symbol}) DATs, ${name} (${symbol}) digital asset treasury`}
			canonicalUrl={`/digital-asset-treasuries/${asset}`}
			pageName={pageName}
		>
			<RowLinksWithDropdown links={allAssets} activeLink={name} />
			<div className="relative isolate grid grid-cols-2 gap-2 xl:grid-cols-3">
				<div className="col-span-2 flex w-full flex-col gap-6 overflow-x-auto rounded-md border border-(--cards-border) bg-(--cards-bg) p-2 xl:col-span-1">
					<Tooltip
						render={<h1 />}
						content={`Institutions that own ${name} as part of their corporate treasury`}
						className="text-xl font-semibold"
					>
						{name} Treasury Holdings
					</Tooltip>
					<div className="flex flex-col">
						<p className="group flex flex-wrap justify-start gap-4 border-b border-(--cards-border) py-1 last:border-none">
							<span className="text-(--text-label)">Total Institution</span>
							<span className="font-jetbrains ml-auto">{stats.totalCompanies}</span>
						</p>
						<p className="group flex flex-wrap justify-start gap-4 border-b border-(--cards-border) py-1 last:border-none">
							<span className="text-(--text-label)">Total Holdings</span>
							<span className="font-jetbrains ml-auto">{`${formattedNum(stats.totalHoldings, false)} ${symbol}`}</span>
						</p>
						<p className="group flex flex-wrap justify-start gap-4 border-b border-(--cards-border) py-1 last:border-none">
							<span className="text-(--text-label)">Total USD Value</span>
							<span className="font-jetbrains ml-auto">{formattedNum(stats.totalUsdValue, true)}</span>
						</p>
						{stats.circSupplyPerc != null ? (
							<p className="group flex flex-wrap justify-start gap-4 border-b border-(--cards-border) py-1 last:border-none">
								<span className="text-(--text-label)">% of {symbol} Circulating Supply</span>
								<span className="font-jetbrains ml-auto">
									{stats.circSupplyPerc.toLocaleString(undefined, { maximumFractionDigits: 3 })}%
								</span>
							</p>
						) : null}
					</div>
					<BasicLink href="/report-error" className="mt-auto pt-4 text-left text-(--text-form) underline">
						Report incorrect data
					</BasicLink>
				</div>
				<div className="col-span-2 flex min-h-[406px] flex-col rounded-md border border-(--cards-border) bg-(--cards-bg)">
					<h2 className="p-2 text-lg font-medium">Inflows</h2>
					<Suspense>
						<LineAndBarChart
							charts={dailyFlowsChart}
							valueSymbol={symbol}
							hideDataZoom={dailyFlowsChart[name].data.length < 2}
						/>
					</Suspense>
				</div>
			</div>
			<TableWithSearch
				data={breakdown}
				columns={columns({ name, symbol })}
				placeholder="Search institutions"
				columnToSearch="name"
				sortingState={[{ id: 'totalAssetAmount', desc: true }]}
			/>
		</Layout>
	)
}

const columns = ({
	name,
	symbol
}: {
	name: string
	symbol: string
}): ColumnDef<ITreasuryCompanies['breakdownByAsset'][string][0]>[] => [
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
		header: 'Holdings',
		accessorKey: 'totalAssetAmount',
		cell: ({ getValue }) => {
			const totalAssetAmount = getValue() as number
			if (totalAssetAmount == null) return null
			return <>{`${formattedNum(totalAssetAmount, false)} ${symbol}`}</>
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
		header: `% of ${symbol} Circulating Supply`,
		accessorKey: 'supplyPercentage',
		cell: ({ getValue }) => {
			const supplyPercentage = getValue() as number
			if (supplyPercentage == null) return null
			return <>{formattedNum(supplyPercentage, false)}%</>
		},
		size: 228,
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
	},
	{
		header: 'Avg Purchase Price',
		accessorKey: 'avgPrice',
		cell: ({ getValue }) => {
			const avgPrice = getValue() as number
			if (avgPrice == null) return null
			return <>{formattedNum(avgPrice, true)}</>
		},
		size: 168,
		meta: {
			align: 'end',
			headerHelperText: `Average cost per ${symbol} of the institution's holdings`
		}
	},
	{
		header: 'Last Updated',
		accessorKey: 'lastAnnouncementDate',
		cell: ({ getValue }) => {
			const lastUpdated = getValue() as string
			if (lastUpdated == null) return null
			return <>{new Date(lastUpdated).toLocaleDateString()}</>
		},
		size: 120,
		meta: {
			align: 'end',
			headerHelperText:
				'Some companies do not update their holdings frequently, so the last announcement date may not be the most recent'
		}
	}
]
