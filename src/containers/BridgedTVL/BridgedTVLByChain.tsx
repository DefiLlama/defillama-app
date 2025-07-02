import * as React from 'react'
import { ProtocolsChainsSearch } from '~/components/Search/ProtocolsChains'
import { bridgedChainColumns } from '~/components/Table/Defi/columns'
import Layout from '~/layout'
import { SEO } from '~/components/SEO'
import { chainIconUrl, formattedNum } from '~/utils'
import { TokenLogo } from '~/components/TokenLogo'
import { FormattedName } from '~/components/FormattedName'
import dynamic from 'next/dynamic'
import { IBarChartProps, IPieChartProps } from '~/components/ECharts/types'
import useWindowSize from '~/hooks/useWindowSize'
import { SortingState, getCoreRowModel, getSortedRowModel, useReactTable } from '@tanstack/react-table'
import { VirtualTable } from '~/components/Table/Table'
import { RowLinksWithDropdown } from '~/components/RowLinksWithDropdown'
import { Metrics } from '~/components/Metrics'

const PieChart = dynamic(() => import('~/components/ECharts/PieChart'), {
	ssr: false
}) as React.FC<IPieChartProps>
const BarChart = dynamic(() => import('~/components/ECharts/BarChart'), {
	ssr: false
}) as React.FC<IBarChartProps>

export function BridgedTVLByChain({ chainData, chains, chain, inflows, tokenInflowNames, chainName = 'All Chains' }) {
	const [chartType, setChartType] = React.useState('total')

	const { tokens, tableData } = React.useMemo(() => {
		const top10Tokens = Object.entries(chainData?.[chartType]?.breakdown ?? [])
			.sort((a, b) => +b[1] - +a[1])
			.slice(0, 10)
		const otherTokens = Object.entries(chainData?.[chartType]?.breakdown ?? [])
			.sort((a, b) => +b[1] - +a[1])
			.slice(10)
		const otherTotal = otherTokens.reduce((acc, [_, value]) => acc + +value, 0)
		const tokens = [...top10Tokens, ['Other', otherTotal]]

		const tableData = Object.entries(chainData?.[chartType]?.breakdown ?? []).map(([name, value]) => ({
			name: name?.toLowerCase() === name ? name?.toUpperCase() : name,
			value
		}))

		return { tokens, tableData }
	}, [chainData, chartType])

	const screenWidth = useWindowSize()
	const [sorting, setSorting] = React.useState<SortingState>([{ id: 'value', desc: true }])
	const instance = useReactTable({
		data: tableData,
		columns: bridgedChainColumns,
		state: {
			sorting
		},
		onSortingChange: setSorting,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel()
	})

	return (
		<>
			<Layout title={`${chainName} Bridged TVL - DefiLlama`}>
				<ProtocolsChainsSearch />
				<SEO cardName={chainName} token={chain} />
				<Metrics currentMetric="Bridged TVL" isChains={chainName === 'All Chains'} />
				<RowLinksWithDropdown links={chains} activeLink={chainName} />
				<div className="grid grid-cols-2 relative isolate xl:grid-cols-3 gap-1">
					<div className="bg-(--cards-bg) rounded-md flex flex-col gap-3 p-5 col-span-2 w-full xl:col-span-1 overflow-x-auto">
						<h1 className="flex items-center gap-2 text-xl font-semibold mb-3">
							<TokenLogo logo={chainIconUrl(chain)} size={24} />
							<FormattedName text={chainName + ' Bridged TVL'} fontWeight={700} />
						</h1>

						<p className="flex flex-col gap-1 text-base mb-3">
							<span className="text-[#545757] dark:text-[#cccccc]">Total</span>
							<span className="font-jetbrains font-semibold text-2xl">
								{formattedNum(
									+chainData?.total.total + (+chainData?.ownTokens?.total ? +chainData?.ownTokens?.total : 0),
									true
								)}
							</span>
						</p>

						<p className="flex items-center justify-between gap-1 text-base">
							<span className="text-[#545757] dark:text-[#cccccc]">Canonical</span>
							<span className="font-jetbrains">{formattedNum(chainData?.canonical?.total, true)}</span>
						</p>

						<p className="flex items-center justify-between gap-1 text-base">
							<span className="text-[#545757] dark:text-[#cccccc]">Native</span>
							<span className="font-jetbrains">{formattedNum(chainData?.native?.total, true)}</span>
						</p>

						<p className="flex items-center justify-between gap-1 text-base">
							<span className="text-[#545757] dark:text-[#cccccc]">Third Party</span>
							<span className="font-jetbrains">{formattedNum(chainData?.thirdParty?.total, true)}</span>
						</p>

						{chainData?.ownTokens?.total ? (
							<p className="flex items-center justify-between gap-1 text-base">
								<span className="text-[#545757] dark:text-[#cccccc]">Own Tokens</span>
								<span className="font-jetbrains">{formattedNum(chainData?.ownTokens.total, true)}</span>
							</p>
						) : null}
					</div>
					<div className="bg-(--cards-bg) rounded-md col-span-2 flex flex-col items-center gap-4 min-h-[434px]">
						<div className="w-full max-w-fit overflow-x-auto p-3">
							<div className="text-xs font-medium flex items-center rounded-md overflow-x-auto flex-nowrap border border-(--form-control-border) text-[#666] dark:text-[#919296]">
								{chartTypes.map(({ type, name }) =>
									chainData[type]?.total !== '0' ? (
										<button
											className="shrink-0 py-2 px-3 whitespace-nowrap hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) data-[active=true]:bg-(--old-blue) data-[active=true]:text-white"
											data-active={chartType === type}
											onClick={() => setChartType(type)}
											key={'bridged-' + name}
										>
											{name}
										</button>
									) : null
								)}
								{inflows ? (
									<button
										className="shrink-0 py-2 px-3 whitespace-nowrap hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) data-[active=true]:bg-(--old-blue) data-[active=true]:text-white"
										data-active={chartType === 'inflows'}
										onClick={() => setChartType('inflows')}
									>
										Inflows
									</button>
								) : null}
								{chainData?.ownTokens?.total ? (
									<button
										className="shrink-0 py-2 px-3 whitespace-nowrap hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) data-[active=true]:bg-(--old-blue) data-[active=true]:text-white"
										data-active={chartType === 'ownTokens'}
										onClick={() => setChartType('ownTokens')}
									>
										Own Tokens
									</button>
								) : null}
							</div>
						</div>

						{chartType !== 'inflows' ? (
							<div style={{ width: Math.min(+screenWidth.width / 1.5, 600) + 'px' }}>
								<PieChart
									chartData={tokens.map(([name, value]: [string, string]) => ({
										name,
										value: +value
									}))}
									usdFormat={false}
								/>
							</div>
						) : (
							<div className="w-full">
								<BarChart
									chartData={inflows}
									title=""
									hideDefaultLegend={true}
									customLegendName="Token"
									customLegendOptions={tokenInflowNames}
									// chartOptions={inflowsChartOptions}
								/>
							</div>
						)}
					</div>
				</div>
				{chartType !== 'inflows' ? <VirtualTable instance={instance} skipVirtualization /> : null}
			</Layout>
		</>
	)
}

const chartTypes = [
	{ type: 'total', name: 'Total' },
	{ type: 'canonical', name: 'Canonical' },
	{ type: 'native', name: 'Native' },
	{ type: 'thirdParty', name: 'Third Party' }
]
