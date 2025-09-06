import { ColumnDef } from '@tanstack/react-table'
import { maxAgeForNext } from '~/api'
import { RowLinksWithDropdown } from '~/components/RowLinksWithDropdown'
import { TableWithSearch } from '~/components/Table/TableWithSearch'
import { Tooltip } from '~/components/Tooltip'
import Layout from '~/layout'
import { capitalizeFirstLetter, formattedNum } from '~/utils'
import { fetchJson } from '~/utils/async'
import { withPerformanceLogging } from '~/utils/perf'

interface ITreasuryCompanies {
	breakdownByAsset: {
		[asset: string]: Array<{
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
			supplyPercentage: number
			avgPrice?: number | null
		}>
	}
	totalCompanies: number
	statsByAsset: {
		[asset: string]: {
			totalCompanies: number
			totalHoldings: number
			totalUsdValue: number
			circSupplyPerc: number
		}
	}
	lastUpdated: string
}

const SYMBOL_MAP = {
	bitcoin: 'BTC',
	ethereum: 'ETH'
}

export const getStaticProps = withPerformanceLogging(
	'treasuries/[...asset]',
	async ({
		params: {
			asset: [asset]
		}
	}) => {
		const res: ITreasuryCompanies = await fetchJson(
			'http://pkg0k8088o4cckkoww44scwo.37.27.48.106.sslip.io/v1/companies'
		)
		const breakdown = res.breakdownByAsset[asset]
		const stats = res.statsByAsset[asset]
		let name = capitalizeFirstLetter(asset)
		let symbol = ''
		if (asset in SYMBOL_MAP) {
			symbol = SYMBOL_MAP[asset].toUpperCase()
		}

		const allAssets = []
		for (const asset in res.breakdownByAsset) {
			allAssets.push({ label: capitalizeFirstLetter(asset), to: `/treasuries/${asset}` })
		}

		if (!breakdown || !stats) {
			return { notFound: true, props: null }
		}

		return { props: { breakdown, stats, name, symbol, asset, allAssets }, revalidate: maxAgeForNext([22]) }
	}
)

export async function getStaticPaths() {
	const res: ITreasuryCompanies = await fetchJson('http://pkg0k8088o4cckkoww44scwo.37.27.48.106.sslip.io/v1/companies')

	const paths = []

	for (const asset in res.breakdownByAsset) {
		paths.push(`/treasuries/${asset}`)
	}

	return { paths, fallback: false }
}

const pageName = ['Digital Asset Treasuries (DATs)', 'by', 'Institution']

export default function TreasuriesByAsset({
	name,
	breakdown,
	stats,
	symbol,
	asset,
	allAssets
}: {
	name: string
	breakdown: ITreasuryCompanies['breakdownByAsset'][string]
	stats: ITreasuryCompanies['statsByAsset'][string]
	symbol: string
	asset: string
	allAssets: Array<{ label: string; to: string }>
}) {
	return (
		<Layout
			title={`${name} Treasury Holdings - DefiLlama`}
			description={`Track institutions that own ${name} ($${symbol}) as part of their corporate treasury. DefiLlama is committed to providing accurate data without ads or sponsored content, as well as transparency.`}
			keywords={`${name} (${symbol}) treasury holdings, ${name} (${symbol}) corporate treasury, ${name} (${symbol}) treasury holdings by institution, ${name} (${symbol}) treasury holdings by company, ${name} (${symbol}) DATs, ${name} (${symbol}) digital asset treasury`}
			canonicalUrl={`/treasuries/${asset}`}
			pageName={pageName}
		>
			<RowLinksWithDropdown links={allAssets} activeLink={name} />
			<div className="flex flex-col gap-1 rounded-md border border-(--cards-border) bg-(--cards-bg) p-1 md:p-3">
				<h1 className="text-xl font-semibold">{name} Treasury Holdings</h1>
				<p className="text-(--text-label)">Institutions that own {name} as part of their corporate treasury.</p>
			</div>
			<div className="flex flex-col gap-2 md:flex-row md:flex-wrap">
				<p className="flex flex-1 flex-col gap-1 rounded-md border border-(--cards-border) bg-(--cards-bg) p-1 md:p-3">
					<span className="font-jetbrains text-lg">{stats.totalCompanies}</span>
					<span className="text-(--text-label)">Total Institutions</span>
				</p>
				<p className="flex flex-1 flex-col gap-1 rounded-md border border-(--cards-border) bg-(--cards-bg) p-1 md:p-3">
					<span className="font-jetbrains text-lg">{`${formattedNum(stats.totalHoldings, false)} ${symbol}`}</span>
					<span className="text-(--text-label)">Total Holdings</span>
				</p>
				<p className="flex flex-1 flex-col gap-1 rounded-md border border-(--cards-border) bg-(--cards-bg) p-1 md:p-3">
					<span className="font-jetbrains text-lg">{formattedNum(stats.totalUsdValue, true)}</span>
					<span className="text-(--text-label)">Total USD Value</span>
				</p>
				<p className="flex flex-1 flex-col gap-1 rounded-md border border-(--cards-border) bg-(--cards-bg) p-1 md:p-3">
					<span className="font-jetbrains text-lg">
						{stats.circSupplyPerc.toLocaleString(undefined, { maximumFractionDigits: 3 })}%
					</span>
					<Tooltip
						content={`Percentage of ${name} circulating supply that is held by the companies`}
						className="text-(--text-label) underline decoration-dotted"
					>
						% of {symbol} Circulating Supply
					</Tooltip>
				</p>
			</div>
			<TableWithSearch
				data={breakdown}
				columns={columns({ name, symbol })}
				placeholder="Search companies"
				columnToSearch="name"
				sortingState={[{ id: 'totalUsdValue', desc: true }]}
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
		size: 228,
		meta: {
			align: 'start'
		}
	},
	{
		header: 'Type',
		accessorKey: 'type',
		enableSorting: false,
		size: 120,
		meta: {
			align: 'end'
		}
	},
	{
		header: `Total ${name}`,
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
		header: 'Total Cost (USD)',
		accessorKey: 'totalCost',
		cell: ({ getValue }) => {
			const totalCost = getValue() as number
			if (totalCost == null) return null
			return <>{formattedNum(totalCost, true)}</>
		},
		size: 148,
		meta: {
			align: 'end'
		}
	},
	{
		header: "Today's Value (USD)",
		accessorKey: 'totalUsdValue',
		cell: ({ getValue }) => {
			const totalUsdValue = getValue() as number
			if (totalUsdValue == null) return null
			return <>{formattedNum(totalUsdValue, true)}</>
		},
		size: 180,
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
			return <>{supplyPercentage.toLocaleString(undefined, { maximumFractionDigits: 3 })}%</>
		},
		size: 228,
		meta: {
			align: 'end'
		}
	},
	{
		header: 'Avg Price (USD)',
		accessorKey: 'avgPrice',
		cell: ({ getValue }) => {
			const avgPrice = getValue() as number
			if (avgPrice == null) return null
			return <>{formattedNum(avgPrice, true)}</>
		},
		size: 148,
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
