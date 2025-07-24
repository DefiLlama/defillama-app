import * as React from 'react'
import { download, formattedNum, preparePieChartData } from '~/utils'
import { RowLinksWithDropdown } from '~/components/RowLinksWithDropdown'
import { useCalcGroupExtraTvlsByDay } from '~/hooks/data'
import type { IChartProps, IPieChartProps } from '~/components/ECharts/types'
import { TableWithSearch } from '~/components/Table/TableWithSearch'
import Layout from '~/layout'
import { CSVDownloadButton } from '~/components/ButtonStyled/CsvButton'
import { BasicLink } from '~/components/Link'
import { IconsRow } from '~/components/IconsRow'
import type { ColumnDef } from '@tanstack/react-table'
import { ProtocolsChainsSearch } from '~/components/Search/ProtocolsChains'
import { Metrics } from '~/components/Metrics'

const PieChart = React.lazy(() => import('~/components/ECharts/PieChart')) as React.FC<IPieChartProps>

const AreaChart = React.lazy(() => import('~/components/ECharts/AreaChart')) as React.FC<IChartProps>

export const OraclesByChain = ({
	chartData,
	tokensProtocols,
	tokens,
	tokenLinks,
	oraclesColors,
	chainsByOracle,
	chain
}) => {
	const { chainsWithExtraTvlsByDay, chainsWithExtraTvlsAndDominanceByDay } = useCalcGroupExtraTvlsByDay(chartData)
	const { tokenTvls, tokensList } = React.useMemo(() => {
		const tvls = Object.entries(chainsWithExtraTvlsByDay[chainsWithExtraTvlsByDay.length - 1])
			.filter((item) => item[0] !== 'date')
			.map((token) => ({ name: token[0], value: token[1] ?? 0 } as { name: string; value: number }))
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

	const downloadCsv = () => {
		const header = Object.keys(tokensList[0]).join(',')
		download('oracles.csv', [header, ...tokensList.map((r) => Object.values(r).join(','))].join('\n'))
	}

	return (
		<Layout title={`Oracles - DefiLlama`} defaultSEO>
			<ProtocolsChainsSearch />

			<Metrics currentMetric="Oracle TVS" />

			<RowLinksWithDropdown links={tokenLinks} activeLink={chain || 'All'} />

			<div className="flex flex-col gap-1 xl:flex-row">
				<div className="isolate relative rounded-md p-3 bg-(--cards-bg) flex-1 min-h-[360px] flex flex-col">
					<CSVDownloadButton onClick={downloadCsv} className="ml-auto absolute right-3 top-3 z-10" />
					<React.Suspense fallback={<></>}>
						<PieChart chartData={tokenTvls} stackColors={oraclesColors} />
					</React.Suspense>
				</div>
				<div className="rounded-md p-3 bg-(--cards-bg) flex-1 min-h-[360px]">
					<React.Suspense fallback={<></>}>
						<AreaChart
							chartData={chainsWithExtraTvlsAndDominanceByDay}
							stacks={tokens}
							stackColors={oraclesColors}
							hideDefaultLegend
							valueSymbol="%"
							title=""
							expandTo100Percent={true}
							chartOptions={chartOptions}
						/>
					</React.Suspense>
				</div>
			</div>
			<React.Suspense
				fallback={
					<div
						style={{ minHeight: `${tokensList.length * 50 + 200}px` }}
						className="bg-(--cards-bg) border border-(--cards-border) rounded-md"
					/>
				}
			>
				<TableWithSearch
					data={tokensList}
					columns={columns}
					columnToSearch={'name'}
					placeholder={'Search oracles...'}
					header={'Oracle Rankings'}
				/>
			</React.Suspense>
		</Layout>
	)
}

const chartOptions = {
	grid: {
		top: 10,
		bottom: 60,
		left: 0,
		right: 0
	},
	dataZoom: [{}, { bottom: 32, right: 6 }]
} as any

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
		cell: ({ getValue, row, table }) => {
			const index = row.depth === 0 ? table.getSortedRowModel().rows.findIndex((x) => x.id === row.id) : row.index

			return (
				<span className="flex items-center gap-2 relative">
					<span className="shrink-0">{index + 1}</span>
					<BasicLink
						href={`/oracles/${getValue()}`}
						className="text-sm font-medium text-(--link-text) overflow-hidden whitespace-nowrap text-ellipsis"
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
		cell: ({ getValue, row }) => {
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
