import { ColumnDef } from '@tanstack/react-table'
import * as React from 'react'
import { getETFData } from '~/api/categories/protocols'
import { ChartCsvExportButton } from '~/components/ButtonStyled/ChartCsvExportButton'
import { ChartExportButton } from '~/components/ButtonStyled/ChartExportButton'
import { IconsRow } from '~/components/IconsRow'
import { BasicLink } from '~/components/Link'
import { Select } from '~/components/Select'
import { TableWithSearch } from '~/components/Table/TableWithSearch'
import { TagGroup } from '~/components/TagGroup'
import { useChartCsvExport } from '~/hooks/useChartCsvExport'
import { useChartImageExport } from '~/hooks/useChartImageExport'
import Layout from '~/layout'
import { firstDayOfMonth, formattedNum, lastDayOfWeek } from '~/utils'
import { withPerformanceLogging } from '~/utils/perf'

const MultiSeriesChart2 = React.lazy(() => import('~/components/ECharts/MultiSeriesChart2'))

interface AssetSectionProps {
	name: string
	iconUrl: string
	flows: number
	aum: number
}

interface TransformedFlow {
	date: string
	[key: string]: string | number
}

interface AssetTotals {
	[key: string]: {
		aum: number
		flows: number
	}
}

const AssetSection = ({ name, iconUrl, flows, aum }: AssetSectionProps) => (
	<div className="flex flex-col gap-2 rounded-lg bg-(--bg2) p-3">
		<div className="flex items-center gap-2">
			<img src={iconUrl} alt={name} width={24} height={24} className="rounded-full" />
			<span className="font-semibold">{name}</span>
		</div>
		<div className="grid grid-cols-2 gap-2 text-sm">
			<div className="flex flex-col">
				<span className="text-xs opacity-60">Flows</span>
				<span
					className={`font-jetbrains font-medium ${flows > 0 ? 'text-green-500' : flows < 0 ? 'text-red-500' : ''}`}
				>
					{formattedNum(flows || 0, true)}
				</span>
			</div>
			<div className="flex flex-col">
				<span className="text-xs opacity-60">AUM</span>
				<span className="font-jetbrains font-medium">{formattedNum(aum || 0, true)}</span>
			</div>
		</div>
	</div>
)

export const getStaticProps = withPerformanceLogging('etfs', async () => {
	const data = await getETFData()

	return {
		props: {
			...data
		},
		revalidate: 5 * 60
	}
})

interface PageViewProps {
	snapshot: Array<{
		asset: string
		aum: number
		flows: number
		ticker: string
	}>
	flows: TransformedFlow[]
	lastUpdated: string
	totalsByAsset: AssetTotals
}

const groupByList = ['Daily', 'Weekly', 'Monthly', 'Cumulative']
const ASSET_VALUES = ['Bitcoin', 'Ethereum', 'Solana'] as const
const DEFAULT_SORTING_STATE = [{ id: 'aum', desc: true }]
const PageView = ({ snapshot, flows, totalsByAsset, lastUpdated }: PageViewProps) => {
	const [groupBy, setGroupBy] = React.useState<(typeof groupByList)[number]>('Weekly')
	const [tickers, setTickers] = React.useState(['Bitcoin', 'Ethereum', 'Solana'])
	const { chartInstance: exportChartInstance, handleChartReady } = useChartImageExport()
	const { chartInstance: exportChartCsvInstance, handleChartReady: handleChartCsvReady } = useChartCsvExport()

	const chartData = React.useMemo(() => {
		const bitcoin = {}
		const ethereum = {}
		const solana = {}

		let totalBitcoin = 0
		let totalEthereum = 0
		let totalSolana = 0
		for (const flowDate in flows) {
			const date = ['Daily', 'Cumulative'].includes(groupBy)
				? flowDate
				: groupBy === 'Weekly'
					? lastDayOfWeek(+flowDate * 1000)
					: firstDayOfMonth(+flowDate * 1000)

			bitcoin[date] = (bitcoin[date] || 0) + (flows[flowDate]['Bitcoin'] ?? 0) + totalBitcoin
			if (flows[flowDate]['Ethereum']) {
				ethereum[date] = (ethereum[date] || 0) + (flows[flowDate]['Ethereum'] ?? 0) + totalEthereum
			}
			if (flows[flowDate]['Solana']) {
				solana[date] = (solana[date] || 0) + (flows[flowDate]['Solana'] ?? 0) + totalSolana
			}

			if (groupBy === 'Cumulative') {
				totalBitcoin += +(flows[flowDate]['Bitcoin'] ?? 0)
				totalEthereum += +(flows[flowDate]['Ethereum'] ?? 0)
				totalSolana += +(flows[flowDate]['Solana'] ?? 0)
			}
		}

		const seriesType = (groupBy === 'Cumulative' ? 'line' : 'bar') as 'line' | 'bar'
		const source: Array<Record<string, number | null>> = []
		for (const date in bitcoin) {
			source.push({
				timestamp: +date * 1000,
				Bitcoin: bitcoin[date] ?? null,
				Ethereum: ethereum[date] ?? null,
				Solana: solana[date] ?? null
			})
		}

		return {
			source,
			allCharts: [
				{
					type: seriesType,
					name: 'Bitcoin',
					encode: { x: 'timestamp', y: 'Bitcoin' },
					stack: 'Bitcoin',
					color: '#F7931A'
				},
				{
					type: seriesType,
					name: 'Ethereum',
					encode: { x: 'timestamp', y: 'Ethereum' },
					stack: 'Ethereum',
					color: '#6B7280'
				},
				{ type: seriesType, name: 'Solana', encode: { x: 'timestamp', y: 'Solana' }, stack: 'Solana', color: '#9945FF' }
			]
		}
	}, [flows, groupBy])

	const finalCharts = React.useMemo(() => {
		const filteredCharts = chartData.allCharts.filter((c) => tickers.includes(c.name))
		const dimensions = ['timestamp', ...filteredCharts.map((c) => c.name)]
		return {
			dataset: { source: chartData.source, dimensions },
			charts: filteredCharts
		}
	}, [chartData, tickers])

	return (
		<>
			<div className="flex min-h-[408px] flex-col gap-1 md:flex-row">
				<div className="flex w-full flex-col rounded-md border border-(--cards-border) bg-(--cards-bg) md:w-80">
					<div className="flex flex-col gap-1 p-3">
						<h1 className="text-xl font-semibold">Daily Stats</h1>
						<span className="text-xs opacity-70">{lastUpdated}</span>
					</div>

					<div className="flex flex-col gap-2 p-3 pt-0">
						<AssetSection
							name="Bitcoin"
							iconUrl="https://icons.llamao.fi/icons/protocols/bitcoin"
							flows={totalsByAsset.bitcoin?.flows ?? 0}
							aum={totalsByAsset.bitcoin?.aum ?? 0}
						/>
						<AssetSection
							name="Ethereum"
							iconUrl="https://icons.llamao.fi/icons/protocols/ethereum"
							flows={totalsByAsset.ethereum?.flows ?? 0}
							aum={totalsByAsset.ethereum?.aum ?? 0}
						/>
						<AssetSection
							name="Solana"
							iconUrl="https://icons.llamao.fi/icons/protocols/solana"
							flows={totalsByAsset.solana?.flows ?? 0}
							aum={totalsByAsset.solana?.aum ?? 0}
						/>
					</div>
				</div>
				<div className="flex w-full flex-1 flex-col rounded-md border border-(--cards-border) bg-(--cards-bg)">
					<div className="flex flex-wrap justify-end gap-2 p-2">
						<h2 className="mr-auto text-lg font-semibold">Flows (Source: Farside)</h2>
						<TagGroup setValue={(val) => setGroupBy(val)} values={groupByList} selectedValue={groupBy} />
						<Select
							allValues={ASSET_VALUES}
							selectedValues={tickers}
							setSelectedValues={setTickers}
							label={'ETF'}
							labelType="smol"
							variant="filter-responsive"
							portal
						/>
						<ChartCsvExportButton chartInstance={exportChartCsvInstance} filename="etf-flows" />
						<ChartExportButton chartInstance={exportChartInstance} filename="etf-flows" title="ETF Flows" />
					</div>
					<React.Suspense fallback={<div className="min-h-[360px]" />}>
						<MultiSeriesChart2
							dataset={finalCharts.dataset}
							charts={finalCharts.charts}
							groupBy={groupBy === 'Cumulative' ? 'daily' : (groupBy.toLowerCase() as 'daily' | 'weekly' | 'monthly')}
							onReady={(instance) => {
								handleChartReady(instance)
								handleChartCsvReady(instance)
							}}
						/>
					</React.Suspense>
				</div>
			</div>
			<TableWithSearch
				data={snapshot}
				columns={columns}
				columnToSearch={'ticker'}
				placeholder={'Search ETF...'}
				header="Exchange Traded Funds"
				sortingState={DEFAULT_SORTING_STATE}
			/>
		</>
	)
}

const pageName = ['ETFs: Overview']

export default function ETFs(props: PageViewProps) {
	return (
		<Layout
			title={`Exchange Traded Funds - DefiLlama`}
			description={`Exchange Traded Funds on DefiLlama. DefiLlama is committed to providing accurate data without ads or sponsored content, as well as transparency.`}
			keywords={`etfs, crypto etfs, exchange traded funds`}
			canonicalUrl={`/etfs`}
			pageName={pageName}
		>
			<PageView {...props} />
		</Layout>
	)
}

interface IETFRow {
	ticker: string
	issuer: string
	etf_name: string
	custodian: string
	pct_fee: number
	url: string
	price: number
	volume: number
	aum: number
	shares: number
	btc: number
	flows: number
}

export const columns: ColumnDef<IETFRow>[] = [
	{
		header: 'Ticker',
		accessorKey: 'ticker',
		enableSorting: false,
		cell: ({ getValue, row }) => {
			return (
				<span className="relative flex items-center gap-2">
					<span className="vf-row-index shrink-0" aria-hidden="true" />
					<BasicLink
						href={row.original.url}
						className="overflow-hidden text-sm font-medium text-ellipsis whitespace-nowrap text-(--link-text) hover:underline"
					>
						{getValue() as string | null}
					</BasicLink>
				</span>
			)
		},
		size: 100
	},
	{
		header: 'Issuer',
		accessorKey: 'issuer',
		meta: {
			align: 'end'
		},
		size: 160
	},
	{
		header: 'Coin',
		accessorKey: 'chain',
		enableSorting: true,
		cell: ({ getValue }) => (
			<IconsRow links={getValue() as Array<string>} url="" iconType="chain" disableLinks={true} />
		),
		meta: {
			align: 'end'
		},
		size: 160
	},
	{
		header: 'Flows',
		accessorKey: 'flows',
		cell: ({ getValue }) => {
			const value = getValue() as number | null
			const formattedValue = value != null ? formattedNum(value, true) : null

			return (
				<span className={`${value && value > 0 ? 'text-(--success)' : value && value < 0 ? 'text-(--error)' : ''}`}>
					{formattedValue}
				</span>
			)
		},
		meta: {
			align: 'end'
		},
		size: 120
	},
	{
		header: 'AUM',
		accessorKey: 'aum',
		cell: ({ getValue }) => <>{getValue() !== null ? formattedNum(getValue(), true) : null}</>,
		meta: {
			align: 'end'
		},
		size: 120
	},
	{
		header: 'Volume',
		accessorKey: 'volume',
		cell: ({ getValue }) => <>{formattedNum(getValue(), true)}</>,
		meta: {
			align: 'end'
		},
		size: 120
	}
]
