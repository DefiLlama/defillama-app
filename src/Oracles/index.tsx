import * as React from 'react'
import dynamic from 'next/dynamic'
import { download, formattedNum } from '~/utils'
import { RowLinksWithDropdown } from '~/components/RowLinksWithDropdown'
import { useCalcGroupExtraTvlsByDay } from '~/hooks/data'
import type { IChartProps, IPieChartProps } from '~/components/ECharts/types'
import { TableWithSearch } from '~/components/Table/TableWithSearch'
import Layout from '~/layout'
import { CSVDownloadButton } from '~/components/ButtonStyled/CsvButton'
import { CustomLink } from '~/components/Link'
import { IconsRow } from '~/components/IconsRow'
import type { ColumnDef } from '@tanstack/react-table'

const PieChart = dynamic(() => import('~/components/ECharts/PieChart'), {
	ssr: false
}) as React.FC<IPieChartProps>

const AreaChart = dynamic(() => import('~/components/ECharts/AreaChart'), {
	ssr: false
}) as React.FC<IChartProps>

export const OraclesByChain = ({
	chartData,
	tokensProtocols,
	tokens,
	tokenLinks,
	oraclesColors,
	chainsByOracle,
	chain,
	oracleMonthlyVolumes = {}
}) => {
	const { chainsWithExtraTvlsByDay, chainsWithExtraTvlsAndDominanceByDay } = useCalcGroupExtraTvlsByDay(chartData)
	const { tokenTvls, tokensList } = React.useMemo(() => {
		const tvls = Object.entries(chainsWithExtraTvlsByDay[chainsWithExtraTvlsByDay.length - 1] ?? {})
			.filter((item) => item[0] !== 'date')
			.map((token) => ({ name: token[0], value: token[1] ?? 0 } as { name: string; value: number }))
			.sort((a, b) => b.value - a.value)

		const otherTvl = tvls.slice(5).reduce((total, entry) => {
			return (total += entry.value)
		}, 0)

		const tokenTvls = tvls.slice(0, 5).concat({ name: 'Others', value: otherTvl })

		const tokensList = tvls.map(({ name, value }) => {
			return {
				name,
				protocolsSecured: tokensProtocols[name],
				tvs: value,
				chains: chainsByOracle[name],
				monthlyVolume: oracleMonthlyVolumes[name]
			}
		})

		return { tokenTvls, tokensList }
	}, [chainsWithExtraTvlsByDay, tokensProtocols, chainsByOracle, oracleMonthlyVolumes])

	const downloadCsv = () => {
		const header = Object.keys(tokensList[0]).join(',')
		download('oracles.csv', [header, ...tokensList.map((r) => Object.values(r).join(','))].join('\n'))
	}

	return (
		<Layout title={`Oracles - DefiLlama`} defaultSEO>
			<RowLinksWithDropdown links={tokenLinks} activeLink={chain || 'All'} />

			<div className="flex flex-col gap-1 xl:flex-row">
				<div className="isolate relative rounded-md p-3 bg-[var(--cards-bg)] flex-1 h-[360px] flex flex-col">
					<CSVDownloadButton onClick={downloadCsv} className="ml-auto absolute right-3 top-3 z-10" />
					<React.Suspense fallback={<></>}>
						<PieChart chartData={tokenTvls} stackColors={oraclesColors} />
					</React.Suspense>
				</div>
				<div className="rounded-md p-3 bg-[var(--cards-bg)] flex-1 h-[360px]">
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

			<TableWithSearch
				data={tokensList}
				columns={columns}
				columnToSearch={'name'}
				placeholder={'Search oracles...'}
				header={'Oracle Rankings'}
			/>
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
					<span className="flex-shrink-0">{index + 1}</span>
					<CustomLink
						href={`/oracles/${getValue()}`}
						className="overflow-hidden whitespace-nowrap text-ellipsis hover:underline"
					>
						{getValue() as string}
					</CustomLink>
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
		cell: ({ getValue }) => <>{'$' + formattedNum(getValue())}</>,
		meta: {
			align: 'end',
			headerHelperText: 'Excludes CeFi'
		}
	},
	{
		header: 'Perp DEXs Volume (30d)',
		accessorKey: 'monthlyVolume',
		cell: ({ getValue }) => <>{getValue() ? '$' + formattedNum(getValue()) : null}</>,
		meta: {
			align: 'end',
			headerHelperText: 'Cumulative last 30d volume secured'
		}
	}
]
