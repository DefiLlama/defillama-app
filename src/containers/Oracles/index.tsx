import type { ColumnDef } from '@tanstack/react-table'
import * as React from 'react'
import { preparePieChartData } from '~/components/ECharts/formatters'
import type { IPieChartProps } from '~/components/ECharts/types'
import { tvlOptions } from '~/components/Filters/options'
import { IconsRow } from '~/components/IconsRow'
import { BasicLink } from '~/components/Link'
import { RowLinksWithDropdown } from '~/components/RowLinksWithDropdown'
import { TableWithSearch } from '~/components/Table/TableWithSearch'
import { useCalcGroupExtraTvlsByDay } from '~/hooks/data'
import Layout from '~/layout'
import { formattedNum } from '~/utils'

const PieChart = React.lazy(() => import('~/components/ECharts/PieChart')) as React.FC<IPieChartProps>

const MultiSeriesChart2 = React.lazy(() => import('~/components/ECharts/MultiSeriesChart2'))

const pageName = ['Oracles', 'ranked by', 'TVS']
const DEFAULT_SORTING_STATE = [{ id: 'tvs', desc: true }]

const OraclesByChain = ({ chartData, tokensProtocols, tokens, tokenLinks, oraclesColors, chainsByOracle, chain }) => {
	const { chainsWithExtraTvlsByDay, chainsWithExtraTvlsAndDominanceByDay } = useCalcGroupExtraTvlsByDay(chartData)
	const { tokenTvls, tokensList } = React.useMemo(() => {
		const tvls = Object.entries(chainsWithExtraTvlsByDay[chainsWithExtraTvlsByDay.length - 1])
			.filter((item) => item[0] !== 'date')
			.map((token) => ({ name: token[0], value: token[1] ?? 0 }) as { name: string; value: number })
			.sort((a, b) => b.value - a.value)

		const tokenTvls = preparePieChartData({
			data: tvls,
			limit: 5
		})
		const tokensList = tvls.map(({ name, value }) => {
			return {
				name,
				protocolsSecured: tokensProtocols[name],
				tvs: value,
				chains: chainsByOracle[name]
			}
		})

		return { tokenTvls, tokensList }
	}, [chainsWithExtraTvlsByDay, tokensProtocols, chainsByOracle])

	const { dominanceDataset, dominanceCharts } = React.useMemo(() => {
		return {
			dominanceDataset: {
				source: chainsWithExtraTvlsAndDominanceByDay.map(({ date, ...rest }) => ({ timestamp: +date * 1e3, ...rest })),
				dimensions: ['timestamp', ...tokens]
			},
			dominanceCharts: tokens.map((name) => ({
				type: 'line' as const,
				name,
				encode: { x: 'timestamp', y: name },
				color: oraclesColors[name],
				stack: 'dominance'
			}))
		}
	}, [chainsWithExtraTvlsAndDominanceByDay, tokens, oraclesColors])

	return (
		<Layout
			title={`Oracles - DefiLlama`}
			description={`Track total value secured by oracles on all chains. View protocols secured by the oracle, breakdown by chain, and DeFi oracles on DefiLlama.`}
			keywords={`oracles, oracles on all chains, oracles on DeFi protocols, DeFi oracles, protocols secured by the oracle`}
			canonicalUrl={`/oracles`}
			metricFilters={tvlOptions}
			pageName={pageName}
		>
			<RowLinksWithDropdown links={tokenLinks} activeLink={chain || 'All'} />

			<div className="flex flex-col gap-1 xl:flex-row">
				<div className="relative isolate flex flex-1 flex-col rounded-md border border-(--cards-border) bg-(--cards-bg)">
					<React.Suspense fallback={<div className="min-h-[398px]" />}>
						<PieChart
							chartData={tokenTvls}
							stackColors={oraclesColors}
							exportButtons={{ png: true, csv: true, filename: 'oracles-tvs-pie', pngTitle: 'Oracles TVS' }}
						/>
					</React.Suspense>
				</div>
				<div className="flex-1 rounded-md border border-(--cards-border) bg-(--cards-bg)">
					<React.Suspense fallback={<div className="min-h-[398px]" />}>
						<MultiSeriesChart2
							dataset={dominanceDataset}
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
						style={{ minHeight: `${tokensList.length * 50 + 200}px` }}
						className="rounded-md border border-(--cards-border) bg-(--cards-bg)"
					/>
				}
			>
				<TableWithSearch
					data={tokensList}
					columns={columns}
					columnToSearch={'name'}
					placeholder={'Search oracles...'}
					header={'Oracle Rankings'}
					sortingState={DEFAULT_SORTING_STATE}
				/>
			</React.Suspense>
		</Layout>
	)
}

interface IOraclesRow {
	name: string
	protocolsSecured: number
	tvs: number
}

const columns: ColumnDef<IOraclesRow>[] = [
	{
		header: 'Name',
		accessorKey: 'name',
		enableSorting: false,
		cell: ({ getValue }) => {
			return (
				<span className="relative flex items-center gap-2">
					<span className="vf-row-index shrink-0" aria-hidden="true" />
					<BasicLink
						href={`/oracles/${getValue()}`}
						className="overflow-hidden text-sm font-medium text-ellipsis whitespace-nowrap text-(--link-text)"
					>
						{getValue() as string}
					</BasicLink>
				</span>
			)
		}
	},
	{
		header: 'Chains',
		accessorKey: 'chains',
		enableSorting: false,
		cell: ({ getValue }) => {
			return <IconsRow links={getValue() as Array<string>} url="/oracles/chain" iconType="chain" />
		},
		size: 200,
		meta: {
			align: 'end',
			headerHelperText: 'Chains secured by the oracle'
		}
	},
	{
		header: 'Protocols Secured',
		accessorKey: 'protocolsSecured',
		meta: {
			align: 'end'
		}
	},
	{
		header: 'TVS',
		accessorKey: 'tvs',
		cell: ({ getValue }) => <>{formattedNum(getValue(), true)}</>,
		meta: {
			align: 'end',
			headerHelperText: 'Total Value Secured by the Oracle. Excludes CeFi'
		}
	}
]
