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
import { getDATOverviewDataByAsset, IDATInstitutions, IDATOverviewDataByAssetProps } from '~/containers/DAT/queries'
import Layout from '~/layout'
import { formattedNum, slug } from '~/utils'
import { fetchJson } from '~/utils/async'
import { withPerformanceLogging } from '~/utils/perf'

const LineAndBarChart = lazy(() => import('~/components/ECharts/LineAndBarChart')) as React.FC<ILineAndBarChartProps>

export const getStaticProps = withPerformanceLogging(
	'digital-asset-treasuries/[...asset]',
	async ({
		params: {
			asset: [assetName]
		}
	}) => {
		const asset = slug(assetName)

		const props = await getDATOverviewDataByAsset(asset)

		if (!props) {
			return { notFound: true, props: null }
		}

		return {
			props,
			revalidate: maxAgeForNext([22])
		}
	}
)

export async function getStaticPaths() {
	const res: IDATInstitutions = await fetchJson(`${TRADFI_API}/institutions`)

	const paths = []

	for (const asset in res.assetMetadata) {
		paths.push(`/digital-asset-treasuries/${slug(asset)}`)
	}

	return { paths, fallback: false }
}

const pageName = ['Digital Asset Treasuries', 'by', 'Institution']

const prepareAssetBreakdownCsv = (
	institutions: IDATOverviewDataByAssetProps['institutions'],
	name: string,
	symbol: string
) => {
	const headers = [
		'Institution',
		'Ticker',
		'Type',
		`Holdings (${symbol})`,
		"Today's Holdings Value",
		'Stock Price',
		'24h Price Change (%)',
		`% of ${symbol} Circulating Supply`,
		'Realized mNAV',
		'Realistic mNAV',
		'Max mNAV',
		`Average Purchase Price (${symbol})`,
		'Last Updated'
	]

	const rows = institutions.map((institution) => {
		return [
			institution.name,
			institution.ticker,
			institution.type,
			institution.holdings.amount ?? '',
			institution.holdings.usdValue ?? '',
			institution.price ?? '',
			institution.priceChange24h ?? '',
			institution.holdings.supplyPercentage ?? '',
			institution.realized_mNAV ?? '',
			institution.realistic_mNAV ?? '',
			institution.max_mNAV ?? '',
			institution.holdings.avgPrice ?? '',
			institution.holdings.lastAnnouncementDate
				? new Date(institution.holdings.lastAnnouncementDate).toLocaleDateString()
				: ''
		]
	})

	const date = new Date().toISOString().split('T')[0]
	return {
		filename: `${name.toLowerCase().replace(/\s+/g, '-')}-treasury-holdings-${date}.csv`,
		rows: [headers, ...rows]
	}
}

export default function TreasuriesByAsset({
	asset,
	allAssets,
	metadata,
	dailyFlowsChart,
	institutions,
	mNAVRealizedChart
}: IDATOverviewDataByAssetProps) {
	return (
		<Layout
			title={`${metadata.name} Treasury Holdings - DefiLlama`}
			description={`Track institutions that own ${metadata.name} (${metadata.ticker}) as part of their corporate treasury. DefiLlama is committed to providing accurate data without ads or sponsored content, as well as transparency.`}
			keywords={`${metadata.name} (${metadata.ticker}) treasury holdings, ${metadata.name} (${metadata.ticker}) corporate treasury, ${metadata.name} (${metadata.ticker}) treasury holdings by institution, ${metadata.name} (${metadata.ticker}) treasury holdings by company, ${metadata.name} (${metadata.ticker}) DATs, ${metadata.name} (${metadata.ticker}) digital asset treasury`}
			canonicalUrl={`/digital-asset-treasuries/${asset}`}
			pageName={pageName}
		>
			<RowLinksWithDropdown links={allAssets} activeLink={metadata.name} />
			<div className="relative isolate grid grid-cols-2 gap-2 xl:grid-cols-3">
				<div className="col-span-2 flex w-full flex-col gap-6 overflow-x-auto rounded-md border border-(--cards-border) bg-(--cards-bg) p-2 xl:col-span-1">
					<Tooltip
						render={<h1 />}
						content={`Institutions that own ${metadata.name} as part of their corporate treasury`}
						className="text-xl font-semibold"
					>
						{metadata.name} Treasury Holdings
					</Tooltip>
					<div className="flex flex-col">
						<p className="group flex flex-wrap justify-start gap-4 border-b border-(--cards-border) py-1 last:border-none">
							<span className="text-(--text-label)">Total Institution</span>
							<span className="font-jetbrains ml-auto">{metadata.companies}</span>
						</p>
						<p className="group flex flex-wrap justify-start gap-4 border-b border-(--cards-border) py-1 last:border-none">
							<span className="text-(--text-label)">Total Holdings</span>
							<span className="font-jetbrains ml-auto">{`${formattedNum(metadata.totalAmount, false)} ${metadata.ticker}`}</span>
						</p>
						<p className="group flex flex-wrap justify-start gap-4 border-b border-(--cards-border) py-1 last:border-none">
							<span className="text-(--text-label)">Total USD Value</span>
							<span className="font-jetbrains ml-auto">{formattedNum(metadata.totalUsdValue, true)}</span>
						</p>
						{metadata.circSupplyPerc != null ? (
							<p className="group flex flex-wrap justify-start gap-4 border-b border-(--cards-border) py-1 last:border-none">
								<span className="text-(--text-label)">% of {metadata.ticker} Circulating Supply</span>
								<span className="font-jetbrains ml-auto">
									{metadata.circSupplyPerc.toLocaleString(undefined, { maximumFractionDigits: 3 })}%
								</span>
							</p>
						) : null}
					</div>
					<BasicLink href="/report-error" className="mt-auto mr-auto pt-4 text-left text-(--text-form) underline">
						Report incorrect data
					</BasicLink>
				</div>
				<div className="col-span-2 flex min-h-[406px] flex-col rounded-md border border-(--cards-border) bg-(--cards-bg)">
					<h2 className="p-2 text-lg font-medium">Inflows</h2>
					<Suspense>
						<LineAndBarChart
							charts={dailyFlowsChart}
							valueSymbol={metadata.ticker}
							hideDataZoom={dailyFlowsChart[metadata.name].data.length < 2}
						/>
					</Suspense>
				</div>
			</div>
			<TableWithSearch
				data={institutions}
				columns={columns({ name: metadata.name, symbol: metadata.ticker })}
				placeholder="Search institutions"
				columnToSearch="name"
				sortingState={[{ id: 'totalAssetAmount', desc: true }]}
				customFilters={
					<CSVDownloadButton
						prepareCsv={() => prepareAssetBreakdownCsv(institutions, metadata.name, metadata.ticker)}
					/>
				}
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
}): ColumnDef<IDATOverviewDataByAssetProps['institutions'][number]>[] => [
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
		accessorKey: 'holdings.amount',
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
		accessorKey: 'holdings.usdValue',
		cell: ({ getValue }) => {
			const usdValue = getValue() as number
			if (usdValue == null) return null
			return <>{formattedNum(usdValue, true)}</>
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
		accessorKey: 'holdings.supplyPercentage',
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
		accessorKey: 'holdings.avgPrice',
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
		accessorKey: 'holdings.lastAnnouncementDate',
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
