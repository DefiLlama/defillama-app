import * as React from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/router'
import { IBarChartProps, IChartProps } from '~/components/ECharts/types'
import { useDimensionChartInterval } from '~/contexts/LocalStorage'
import { SelectWithCombobox } from '~/components/SelectWithCombobox'
import { ChartType, getChartDataByChainAndInterval, GROUP_CHART_LIST, GROUP_INTERVALS_LIST } from './utils'
import { IJoin2ReturnType } from '~/api/categories/adaptors'
import { BasicLink } from '~/components/Link'

const BarChart2 = dynamic(() => import('~/components/ECharts/BarChart2'), {
	ssr: false,
	loading: () => <div className="flex items-center justify-center m-auto min-h-[360px]" />
}) as React.FC<IBarChartProps>

const AreaChart3 = dynamic(() => import('~/components/ECharts/AreaChart3'), {
	ssr: false,
	loading: () => <div className="flex items-center justify-center m-auto min-h-[360px]" />
}) as React.FC<IChartProps>

export const ChainByAdapterChart = ({
	totalDataChart,
	chartTypes,
	selectedChartType
}: {
	totalDataChart: [IJoin2ReturnType, string[]]
	chartTypes?: Array<string>
	selectedChartType?: string
}) => {
	const router = useRouter()
	const [chartType, setChartType] = React.useState<ChartType>('Volume')
	const [chartInterval, changeChartInterval] = useDimensionChartInterval()

	const [selectedChains, setSelectedChains] = React.useState<string[]>(totalDataChart?.[1] ?? [])

	const {
		chartData: finalChartData,
		stackColors,
		chartOptions
	} = React.useMemo(() => {
		return getChartDataByChainAndInterval({ chartData: totalDataChart, chartInterval, chartType, selectedChains })
	}, [totalDataChart, chartInterval, selectedChains, chartType])

	return (
		<div className="bg-[var(--cards-bg)] rounded-md flex flex-col col-span-2">
			<>
				<div className="flex gap-2 flex-row items-center flex-wrap justify-end p-3">
					<div className="text-xs font-medium flex items-center rounded-md overflow-x-auto flex-nowrap border border-[var(--form-control-border)] text-[#666] dark:text-[#919296] mr-auto">
						{GROUP_INTERVALS_LIST.map((dataInterval) => (
							<a
								key={dataInterval}
								onClick={() => changeChartInterval(dataInterval as 'Daily' | 'Weekly' | 'Monthly')}
								data-active={dataInterval === chartInterval}
								className="cursor-pointer flex-shrink-0 py-2 px-3 whitespace-nowrap hover:bg-[var(--link-hover-bg)] focus-visible:bg-[var(--link-hover-bg)] data-[active=true]:bg-[var(--old-blue)] data-[active=true]:text-white"
							>
								{dataInterval}
							</a>
						))}
					</div>
					{chartTypes && (
						<div className="text-xs font-medium flex items-center rounded-md overflow-x-auto flex-nowrap border border-[var(--form-control-border)] text-[#666] dark:text-[#919296]">
							{chartTypes.map((dataType) => (
								<BasicLink
									href={`${router.asPath.split('?')[0]}?dataType=${dataType}`}
									key={dataType}
									shallow
									data-active={dataType === selectedChartType}
									className="flex-shrink-0 py-2 px-3 whitespace-nowrap hover:bg-[var(--link-hover-bg)] focus-visible:bg-[var(--link-hover-bg)] data-[active=true]:bg-[var(--old-blue)] data-[active=true]:text-white"
								>
									{dataType}
								</BasicLink>
							))}
						</div>
					)}
					{totalDataChart?.[1]?.length > 1 ? (
						<>
							<div className="text-xs font-medium flex items-center rounded-md overflow-x-auto flex-nowrap border border-[var(--form-control-border)] text-[#666] dark:text-[#919296]">
								{GROUP_CHART_LIST.map((dataType) => (
									<button
										className="flex-shrink-0 py-2 px-3 whitespace-nowrap hover:bg-[var(--link-hover-bg)] focus-visible:bg-[var(--link-hover-bg)] data-[active=true]:bg-[var(--old-blue)] data-[active=true]:text-white"
										data-active={dataType === chartType}
										key={dataType}
										onClick={() => setChartType(dataType)}
									>
										{dataType}
									</button>
								))}
							</div>
							<SelectWithCombobox
								allValues={totalDataChart[1]}
								selectedValues={selectedChains}
								setSelectedValues={setSelectedChains}
								label="Chains"
								clearAll={() => setSelectedChains([])}
								toggleAll={() => setSelectedChains(totalDataChart[1])}
								labelType="smol"
								triggerProps={{
									className:
										'flex items-center justify-between gap-2 p-2 text-xs rounded-md cursor-pointer flex-nowrap relative border border-[var(--form-control-border)] text-[#666] dark:text-[#919296] hover:bg-[var(--link-hover-bg)] focus-visible:bg-[var(--link-hover-bg)] font-medium z-10'
								}}
								portal
							/>
						</>
					) : null}
				</div>
			</>
			{totalDataChart ? (
				<div className="min-h-[360px]">
					{chartType === 'Dominance' ? (
						<AreaChart3
							chartData={finalChartData}
							stackColors={stackColors}
							valueSymbol="%"
							expandTo100Percent
							chartOptions={chartOptions}
						/>
					) : (
						<BarChart2
							chartData={finalChartData}
							groupBy={chartInterval.toLowerCase()}
							stackColors={stackColors}
							chartOptions={chartOptions}
						/>
					)}
				</div>
			) : null}
		</div>
	)
}
