import * as React from 'react'
import { bridgedChainColumns } from '~/components/Table/Defi/columns'
import Layout from '~/layout'
import { SEO } from '~/components/SEO'
import { chainIconUrl, formattedNum, preparePieChartData } from '~/utils'
import { TokenLogo } from '~/components/TokenLogo'
import { FormattedName } from '~/components/FormattedName'
import { IBarChartProps, IPieChartProps } from '~/components/ECharts/types'
import { SortingState, getCoreRowModel, getSortedRowModel, useReactTable } from '@tanstack/react-table'
import { VirtualTable } from '~/components/Table/Table'
import { RowLinksWithDropdown } from '~/components/RowLinksWithDropdown'

const PieChart = React.lazy(() => import('~/components/ECharts/PieChart')) as React.FC<IPieChartProps>
const BarChart = React.lazy(() => import('~/components/ECharts/BarChart')) as React.FC<IBarChartProps>

export function BridgedTVLByChain({ chainData, chains, chain, inflows, tokenInflowNames, chainName = 'All Chains' }) {
	const [chartType, setChartType] = React.useState('total')

	const { pieChartData, tableData } = React.useMemo(() => {
		const pieChartData = preparePieChartData({ data: chainData?.[chartType]?.breakdown ?? {}, limit: 10 })

		const tableData = Object.entries(chainData?.[chartType]?.breakdown ?? {}).map(([name, value]) => ({
			name: name?.toLowerCase() === name ? name?.toUpperCase() : name,
			value
		}))

		return { pieChartData, tableData }
	}, [chainData, chartType])

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
				<SEO cardName={chainName} token={chain} />
				<RowLinksWithDropdown links={chains} activeLink={chainName} />
				<div className="grid grid-cols-2 relative isolate xl:grid-cols-3 gap-2">
					<div className="bg-(--cards-bg) border border-(--cards-border) rounded-md flex flex-col gap-3 p-5 col-span-2 w-full xl:col-span-1 overflow-x-auto">
						<h1 className="flex items-center gap-2 text-xl font-semibold mb-3">
							<TokenLogo logo={chainIconUrl(chain)} size={24} />
							<FormattedName text={chainName + ' Bridged TVL'} fontWeight={700} />
						</h1>

						<p className="flex flex-col gap-1 text-base mb-3">
							<span className="text-(--text-label)">Total</span>
							<span className="font-jetbrains font-semibold text-2xl">
								{formattedNum(
									+chainData?.total.total + (+chainData?.ownTokens?.total ? +chainData?.ownTokens?.total : 0),
									true
								)}
							</span>
						</p>

						<p className="flex items-center justify-between gap-1 text-base">
							<span className="text-(--text-label)">Canonical</span>
							<span className="font-jetbrains">{formattedNum(chainData?.canonical?.total, true)}</span>
						</p>

						<p className="flex items-center justify-between gap-1 text-base">
							<span className="text-(--text-label)">Native</span>
							<span className="font-jetbrains">{formattedNum(chainData?.native?.total, true)}</span>
						</p>

						<p className="flex items-center justify-between gap-1 text-base">
							<span className="text-(--text-label)">Third Party</span>
							<span className="font-jetbrains">{formattedNum(chainData?.thirdParty?.total, true)}</span>
						</p>

						{chainData?.ownTokens?.total ? (
							<p className="flex items-center justify-between gap-1 text-base">
								<span className="text-(--text-label)">Own Tokens</span>
								<span className="font-jetbrains">{formattedNum(chainData?.ownTokens.total, true)}</span>
							</p>
						) : null}
					</div>
					<div className="bg-(--cards-bg) border border-(--cards-border) rounded-md col-span-2 flex flex-col items-center gap-4 min-h-[436px]">
						<div className="w-full max-w-fit overflow-x-auto p-3">
							<div className="text-xs font-medium flex items-center rounded-md overflow-x-auto flex-nowrap border border-(--form-control-border) text-(--text-form)">
								{chartTypes.map(({ type, name }) =>
									Boolean(chainData[type]?.total) && chainData[type]?.total !== '0' ? (
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
						<div className="w-full">
							{chartType !== 'inflows' ? (
								<React.Suspense fallback={<></>}>
									<PieChart chartData={pieChartData} usdFormat={false} />
								</React.Suspense>
							) : (
								<React.Suspense fallback={<></>}>
									<BarChart
										chartData={inflows}
										title=""
										hideDefaultLegend={true}
										customLegendName="Token"
										customLegendOptions={tokenInflowNames}
										// chartOptions={inflowsChartOptions}
									/>
								</React.Suspense>
							)}
						</div>
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
