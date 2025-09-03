import * as React from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { CSVDownloadButton } from '~/components/ButtonStyled/CsvButton'
import type { IChartProps, IPieChartProps } from '~/components/ECharts/types'
import { tvlOptions } from '~/components/Filters/options'
import { IconsRow } from '~/components/IconsRow'
import { BasicLink } from '~/components/Link'
import { RowLinksWithDropdown } from '~/components/RowLinksWithDropdown'
import { TableWithSearch } from '~/components/Table/TableWithSearch'
import { useCalcGroupExtraTvlsByDay } from '~/hooks/data'
import Layout from '~/layout'
import { formattedNum, preparePieChartData } from '~/utils'

const PieChart = React.lazy(() => import('~/components/ECharts/PieChart')) as React.FC<IPieChartProps>

const AreaChart = React.lazy(() => import('~/components/ECharts/AreaChart')) as React.FC<IChartProps>

const pageName = ['Oracles', 'ranked by', 'TVS']

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

	const prepareCsv = React.useCallback(() => {
		const headers = Object.keys(tokensList[0])
		const rows = [headers].concat(
			tokensList.map((row) =>
				headers.map((header) => (Array.isArray(row[header]) ? row[header].join(', ') : row[header]))
			)
		)
		return { filename: 'oracles.csv', rows }
	}, [tokensList])

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
				<div className="relative isolate flex min-h-[408px] flex-1 flex-col rounded-md border border-(--cards-border) bg-(--cards-bg) pt-2">
					<CSVDownloadButton prepareCsv={prepareCsv} smol className="mr-2 ml-auto" />
					<React.Suspense fallback={<></>}>
						<PieChart chartData={tokenTvls} stackColors={oraclesColors} />
					</React.Suspense>
				</div>
				<div className="min-h-[408px] flex-1 rounded-md border border-(--cards-border) bg-(--cards-bg) pt-2">
					<React.Suspense fallback={<></>}>
						<AreaChart
							chartData={chainsWithExtraTvlsAndDominanceByDay}
							stacks={tokens}
							stackColors={oraclesColors}
							hideDefaultLegend
							valueSymbol="%"
							title=""
							expandTo100Percent={true}
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
		cell: ({ getValue, row, table }) => {
			const index = row.depth === 0 ? table.getSortedRowModel().rows.findIndex((x) => x.id === row.id) : row.index

			return (
				<span className="relative flex items-center gap-2">
					<span className="shrink-0">{index + 1}</span>
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
