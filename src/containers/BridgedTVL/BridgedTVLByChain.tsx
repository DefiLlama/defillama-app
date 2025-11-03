import * as React from 'react'
import { getCoreRowModel, getSortedRowModel, SortingState, useReactTable } from '@tanstack/react-table'
import { IBarChartProps, IPieChartProps } from '~/components/ECharts/types'
import { FormattedName } from '~/components/FormattedName'
import { RowLinksWithDropdown } from '~/components/RowLinksWithDropdown'
import { LinkPreviewCard } from '~/components/SEO'
import { bridgedChainColumns } from '~/components/Table/Defi/columns'
import { VirtualTable } from '~/components/Table/Table'
import { TokenLogo } from '~/components/TokenLogo'
import { chainIconUrl, formattedNum, preparePieChartData } from '~/utils'

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
			<LinkPreviewCard cardName={chainName} token={chain} />
			<RowLinksWithDropdown links={chains} activeLink={chainName} />
			<div className="relative isolate grid grid-cols-2 gap-2 xl:grid-cols-3">
				<div className="col-span-2 flex w-full flex-col gap-3 overflow-x-auto rounded-md border border-(--cards-border) bg-(--cards-bg) p-5 xl:col-span-1">
					<h1 className="mb-3 flex items-center gap-2 text-xl font-semibold">
						<TokenLogo logo={chainIconUrl(chain)} size={24} />
						<FormattedName text={chainName + ' Bridged TVL'} fontWeight={700} />
					</h1>

					<p className="mb-3 flex flex-col gap-1 text-base">
						<span className="text-(--text-label)">Total</span>
						<span className="font-jetbrains text-2xl font-semibold">
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
				<div className="col-span-2 flex min-h-[436px] flex-col items-center gap-4 rounded-md border border-(--cards-border) bg-(--cards-bg)">
					<div className="w-full max-w-fit overflow-x-auto p-3">
						<div className="flex flex-nowrap items-center overflow-x-auto rounded-md border border-(--form-control-border) text-xs font-medium text-(--text-form)">
							{chartTypes.map(({ type, name }) =>
								Boolean(chainData[type]?.total) && chainData[type]?.total !== '0' ? (
									<button
										className="shrink-0 px-3 py-1.5 whitespace-nowrap hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) data-[active=true]:bg-(--old-blue) data-[active=true]:text-white"
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
									className="shrink-0 px-3 py-1.5 whitespace-nowrap hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) data-[active=true]:bg-(--old-blue) data-[active=true]:text-white"
									data-active={chartType === 'inflows'}
									onClick={() => setChartType('inflows')}
								>
									Inflows
								</button>
							) : null}
							{chainData?.ownTokens?.total ? (
								<button
									className="shrink-0 px-3 py-1.5 whitespace-nowrap hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) data-[active=true]:bg-(--old-blue) data-[active=true]:text-white"
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
								<PieChart chartData={pieChartData} valueSymbol="" />
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
		</>
	)
}

const chartTypes = [
	{ type: 'total', name: 'Total' },
	{ type: 'canonical', name: 'Canonical' },
	{ type: 'native', name: 'Native' },
	{ type: 'thirdParty', name: 'Third Party' }
]
