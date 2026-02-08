import { ColumnDef, getCoreRowModel, getSortedRowModel, SortingState, useReactTable } from '@tanstack/react-table'
import * as React from 'react'
import { ChartExportButtons } from '~/components/ButtonStyled/ChartExportButtons'
import { createInflowsTooltipFormatter, preparePieChartData } from '~/components/ECharts/formatters'
import { IPieChartProps } from '~/components/ECharts/types'
import { FormattedName } from '~/components/FormattedName'
import { RowLinksWithDropdown } from '~/components/RowLinksWithDropdown'
import { SelectWithCombobox } from '~/components/SelectWithCombobox'
import { LinkPreviewCard } from '~/components/SEO'
import { VirtualTable } from '~/components/Table/Table'
import { TokenLogo } from '~/components/TokenLogo'
import { useGetChartInstance } from '~/hooks/useGetChartInstance'
import { chainIconUrl, formattedNum, slug } from '~/utils'

const PieChart = React.lazy(() => import('~/components/ECharts/PieChart')) as React.FC<IPieChartProps>
const MultiSeriesChart2 = React.lazy(() => import('~/components/ECharts/MultiSeriesChart2'))

const INFLOWS_TOOLTIP_FORMATTER_USD = createInflowsTooltipFormatter({ groupBy: 'daily', valueSymbol: '$' })

const bridgedChainColumns: ColumnDef<any>[] = [
	{
		header: 'Token',
		accessorKey: 'name',
		enableSorting: false
	},
	{
		header: 'Total Bridged',
		accessorKey: 'value',
		accessorFn: (row) => (row.value ? +row.value : undefined),
		cell: ({ getValue }) => {
			return <>{formattedNum(getValue(), true)}</>
		}
	}
]

export function BridgedTVLByChain({ chainData, chains, chain, inflows, tokenInflowNames, chainName = 'All Chains' }) {
	const [chartType, setChartType] = React.useState('total')
	const { chartInstance: exportChartInstance, handleChartReady: onChartReady } = useGetChartInstance()
	const [selectedTokens, setSelectedTokens] = React.useState<string[]>(tokenInflowNames ?? [])
	const selectedChartsSet = React.useMemo(() => new Set(selectedTokens), [selectedTokens])

	const { pieChartData, tableData } = React.useMemo(() => {
		const pieChartData = preparePieChartData({ data: chainData?.[chartType]?.breakdown ?? {}, limit: 10 })

		const tableData = Object.entries(chainData?.[chartType]?.breakdown ?? {}).map(([name, value]) => ({
			name: name?.toLowerCase() === name ? name?.toUpperCase() : name,
			value
		}))

		return { pieChartData, tableData }
	}, [chainData, chartType])

	const { inflowsDataset, inflowsCharts } = React.useMemo(() => {
		if (!tokenInflowNames?.length) return { inflowsDataset: null, inflowsCharts: [] }
		return {
			inflowsDataset: {
				source: inflows.map(({ date, ...rest }) => ({ timestamp: +date * 1e3, ...rest })),
				dimensions: ['timestamp', ...tokenInflowNames]
			},
			inflowsCharts: tokenInflowNames.map((name) => ({
				type: 'bar' as const,
				name,
				encode: { x: 'timestamp', y: name },
				// BarChart auto-assigned all series to stackA when `customLegendOptions` was present.
				// MultiSeriesChart2 requires an explicit stack to preserve stacked rendering.
				stack: 'tokenInflows'
			}))
		}
	}, [inflows, tokenInflowNames])

	const [sorting, setSorting] = React.useState<SortingState>([{ id: 'value', desc: true }])
	const instance = useReactTable({
		data: tableData,
		columns: bridgedChainColumns,
		state: {
			sorting
		},
		defaultColumn: {
			sortUndefined: 'last'
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
				<div className="col-span-2 flex flex-col rounded-md border border-(--cards-border) bg-(--cards-bg)">
					<div className="flex flex-wrap items-center justify-end gap-2 p-2 pb-0">
						<div className="mr-auto flex flex-nowrap items-center overflow-x-auto rounded-md border border-(--form-control-border) text-xs font-medium text-(--text-form)">
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
						{chartType === 'inflows' && tokenInflowNames?.length > 0 ? (
							<SelectWithCombobox
								allValues={tokenInflowNames}
								selectedValues={selectedTokens}
								setSelectedValues={setSelectedTokens}
								label="Token"
								labelType="smol"
								variant="filter"
								portal
							/>
						) : null}
						<ChartExportButtons
							chartInstance={exportChartInstance}
							filename={`${slug(chainName)}-bridged-tvl`}
							title={`${chainName} Bridged TVL`}
						/>
					</div>
					{chartType !== 'inflows' ? (
						<React.Suspense fallback={<div className="min-h-[360px]" />}>
							<PieChart chartData={pieChartData} valueSymbol="" onReady={onChartReady} />
						</React.Suspense>
					) : inflowsDataset ? (
						<React.Suspense fallback={<div className="min-h-[360px]" />}>
							<MultiSeriesChart2
								dataset={inflowsDataset}
								charts={inflowsCharts}
								hideDefaultLegend={true}
								valueSymbol="$"
								selectedCharts={selectedChartsSet}
								chartOptions={
									selectedTokens.length > 1 ? { tooltip: { formatter: INFLOWS_TOOLTIP_FORMATTER_USD } } : undefined
								}
								onReady={onChartReady}
							/>
						</React.Suspense>
					) : null}
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
