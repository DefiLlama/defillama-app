import type { ColumnDef } from '@tanstack/react-table'
import * as React from 'react'
import { preparePieChartData } from '~/components/ECharts/formatters'
import { tvlOptions } from '~/components/Filters/options'
import { IconsRow } from '~/components/IconsRow'
import { BasicLink } from '~/components/Link'
import { RowLinksWithDropdown } from '~/components/RowLinksWithDropdown'
import { TableWithSearch } from '~/components/Table/TableWithSearch'
import Layout from '~/layout'
import { formattedNum, slug } from '~/utils'
import { useOraclesData, type IOracleTableRow } from './useOraclesData'

const PieChart = React.lazy(() => import('~/components/ECharts/PieChart'))
const MultiSeriesChart2 = React.lazy(() => import('~/components/ECharts/MultiSeriesChart2'))

const pageName = ['Oracles', 'ranked by', 'TVS']
const DEFAULT_SORTING_STATE = [{ id: 'tvs', desc: true }]

interface IOraclesByChainProps {
	chartData: Array<[number, Record<string, { tvl: number }>]>
	tokensProtocols: Record<string, number>
	tokens: Array<string>
	tokenLinks: Array<{ label: string; to: string }>
	oraclesColors: Record<string, string>
	chainsByOracle: Record<string, Array<string>>
	chain: string | null
}

export const OraclesByChain = ({
	chartData,
	tokensProtocols,
	tokens,
	tokenLinks,
	oraclesColors,
	chainsByOracle,
	chain
}: IOraclesByChainProps) => {
	const oraclesData = useOraclesData({
		chartData,
		tokens,
		tokensProtocols,
		oraclesColors
	})
	const { tableData, pieChartData, dominanceCharts, dataset } = oraclesData

	// Merge chains data into table rows
	const tableDataWithChains = React.useMemo(() => {
		return tableData.map((row) => ({
			...row,
			chains: chainsByOracle[row.name] ?? [],
			chainsCount: (chainsByOracle[row.name] ?? []).length
		}))
	}, [tableData, chainsByOracle])

	// Prepare pie chart data with colors
	const pieData = React.useMemo(() => {
		return preparePieChartData({
			data: pieChartData,
			limit: 5
		})
	}, [pieChartData])

	const activeLink = chain ?? 'All'

	return (
		<Layout
			title={`Oracles - DefiLlama`}
			description={`Track total value secured by oracles on all chains. View protocols secured by the oracle, breakdown by chain, and DeFi oracles on DefiLlama.`}
			keywords={`oracles, oracles on all chains, oracles on DeFi protocols, DeFi oracles, protocols secured by the oracle`}
			canonicalUrl={`/oracles`}
			metricFilters={tvlOptions}
			pageName={pageName}
		>
			<RowLinksWithDropdown links={tokenLinks} activeLink={activeLink} />

			<div className="flex flex-col gap-1 xl:flex-row">
				<div className="relative isolate flex flex-1 flex-col rounded-md border border-(--cards-border) bg-(--cards-bg)">
					<React.Suspense fallback={<div className="min-h-[398px]" />}>
						<PieChart
							chartData={pieData}
							stackColors={oraclesColors}
							exportButtons={{ png: true, csv: true, filename: 'oracles-tvs-pie', pngTitle: 'Oracles TVS' }}
						/>
					</React.Suspense>
				</div>
				<div className="flex-1 rounded-md border border-(--cards-border) bg-(--cards-bg)">
					<React.Suspense fallback={<div className="min-h-[398px]" />}>
						<MultiSeriesChart2
							dataset={dataset}
							charts={dominanceCharts}
							stacked={true}
							expandTo100Percent={true}
							hideDefaultLegend
							valueSymbol="%"
						/>
					</React.Suspense>
				</div>
			</div>

			<React.Suspense
				fallback={
					<div
						style={{ minHeight: `${tableDataWithChains.length * 50 + 200}px` }}
						className="rounded-md border border-(--cards-border) bg-(--cards-bg)"
					/>
				}
			>
				<TableWithSearch
					data={tableDataWithChains}
					columns={columns}
					columnToSearch="name"
					placeholder="Search oracles..."
					header="Oracle Rankings"
					sortingState={DEFAULT_SORTING_STATE}
				/>
			</React.Suspense>
		</Layout>
	)
}

const columns: ColumnDef<IOracleTableRow>[] = [
	{
		header: 'Name',
		accessorKey: 'name',
		enableSorting: false,
		cell: ({ getValue }) => {
			const name = getValue<string>()
			return (
				<span className="relative flex items-center gap-2">
					<BasicLink
						href={`/oracles/${slug(name)}`}
						className="overflow-hidden text-sm font-medium text-ellipsis whitespace-nowrap text-(--link-text)"
					>
						{name}
					</BasicLink>
				</span>
			)
		}
	},
	{
		header: 'Chains',
		accessorKey: 'chains',
		enableSorting: false,
		size: 200,
		cell: ({ row }) => {
			const chains = row.original.chains ?? []
			return (
				<div className="flex items-center justify-end gap-1 overflow-hidden">
					<IconsRow links={chains} url="/oracles/chain" iconType="chain" />
				</div>
			)
		},
		meta: {
			align: 'end',
			headerHelperText: 'Chains secured by the oracle'
		}
	},
	{
		header: 'Protocols',
		accessorKey: 'protocolsSecured',
		size: 100,
		meta: {
			align: 'end'
		}
	},
	{
		header: 'TVS',
		accessorKey: 'tvs',
		enableSorting: true,
		size: 140,
		cell: ({ getValue }) => {
			const value = getValue<number>()
			return <span>{formattedNum(value, true)}</span>
		},
		meta: {
			align: 'end',
			headerHelperText: 'Total Value Secured by the Oracle'
		}
	}
]
