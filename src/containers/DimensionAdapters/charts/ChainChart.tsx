import * as React from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { IBarChartProps, IChartProps } from '~/components/ECharts/types'
import { formattedNum } from '~/utils'
import type { IDimensionChainChartProps } from '../types'
import { QuestionHelper } from '~/components/QuestionHelper'
import { useDimensionChartInterval } from '~/contexts/LocalStorage'
import { VOLUME_TYPE_ADAPTORS } from '~/api/categories/adaptors'
import { SelectWithCombobox } from '~/components/SelectWithCombobox'
import { ChartType, getChartDataByChainAndInterval, GROUP_CHART_LIST, GROUP_INTERVALS_LIST } from './utils'

const BarChart2 = dynamic(() => import('~/components/ECharts/BarChart2'), {
	ssr: false,
	loading: () => <div className="flex items-center justify-center m-auto min-h-[360px]" />
}) as React.FC<IBarChartProps>

const AreaChart = dynamic(() => import('~/components/ECharts/AreaChart'), {
	ssr: false,
	loading: () => <div className="flex items-center justify-center m-auto min-h-[360px]" />
}) as React.FC<IChartProps>

export const ChainByAdapterChart: React.FC<IDimensionChainChartProps> = (props) => {
	const router = useRouter()
	const [chartType, setChartType] = React.useState<ChartType>('Volume')
	const [chartInterval, changeChartInterval] = useDimensionChartInterval()
	const dataType = VOLUME_TYPE_ADAPTORS.includes(props.type) ? 'volume' : props.type
	const [selectedChains, setSelectedChains] = React.useState<string[]>(props.chartData?.[1] ?? [])

	const { chartData, stackColors, chartOptions } = React.useMemo(() => {
		return getChartDataByChainAndInterval({ chartData: props.chartData, chartInterval, chartType, selectedChains })
	}, [props.chartData, chartInterval, selectedChains, chartType])

	const valuesExist =
		typeof props.data.total24h === 'number' ||
		typeof props.data.change_1d === 'number' ||
		typeof props.data.change_1m === 'number' ||
		(typeof props.data.dexsDominance === 'number' && props.type === 'dexs') ||
		(typeof props.data.change_7dover7d === 'number' && props.type === 'dexs') ||
		(typeof props.data.total7d === 'number' && props.type === 'dexs')
			? true
			: false

	return (
		<div className={`grid grid-cols-2 ${valuesExist ? 'xl:grid-cols-3' : ''} relative isolate gap-1`}>
			{valuesExist ? (
				<div className="bg-[var(--cards-bg)] rounded-md flex flex-col gap-6 p-5 col-span-2 w-full xl:col-span-1 overflow-x-auto">
					{!Number.isNaN(props.data.total24h) ? (
						<p className="flex flex-col">
							<span className="text-[#545757] dark:text-[#cccccc]">Total {dataType} (24h)</span>
							<span className="font-semibold text-2xl font-jetbrains">{formattedNum(props.data.total24h, true)}</span>
						</p>
					) : null}
					{props.type === 'dexs' && !Number.isNaN(props.data.total7d) ? (
						<p className="flex flex-col">
							<span className="text-[#545757] dark:text-[#cccccc]">Total {dataType} (7d)</span>
							<span className="font-semibold text-2xl font-jetbrains">{formattedNum(props.data.total7d, true)}</span>
						</p>
					) : null}
					{props.type === 'dexs' && !Number.isNaN(props.data.change_7dover7d) ? (
						<p className="hidden md:flex flex-col">
							<span className="flex items-center gap-1 text-[#545757] dark:text-[#cccccc]">
								<span>Weekly change</span>
								<QuestionHelper text={`Change of last 7d volume over the previous 7d volume of all dexs`} />
							</span>
							{props.data.change_7dover7d > 0 ? (
								<span className="font-semibold text-2xl font-jetbrains">{props.data.change_7dover7d || 0}%</span>
							) : (
								<span className="font-semibold text-2xl font-jetbrains">{props.data.change_7dover7d || 0}%</span>
							)}
						</p>
					) : null}
					{props.type !== 'dexs' && !Number.isNaN(props.data.change_1d) ? (
						<p className="hidden md:flex flex-col">
							<span className="text-[#545757] dark:text-[#cccccc]">Change (24h)</span>
							{props.data.change_1d > 0 ? (
								<span className="font-semibold text-2xl font-jetbrains">{props.data.change_1d || 0}%</span>
							) : (
								<span className="font-semibold text-2xl font-jetbrains">{props.data.change_1d || 0}%</span>
							)}
						</p>
					) : null}
					{props.type === 'dexs' && !Number.isNaN(props.data.dexsDominance) ? (
						<>
							{!props.name && (
								<p className="hidden md:flex flex-col">
									<span className="flex items-center gap-1 text-[#545757] dark:text-[#cccccc]">
										<span>DEX vs CEX dominance</span>
										<QuestionHelper text={`Dexs dominance over aggregated dexs and cexs volume (24h)`} />
									</span>
									<span className="font-semibold text-2xl font-jetbrains">{props.data.dexsDominance || 0}%</span>
								</p>
							)}
						</>
					) : !Number.isNaN(props.data.change_1m) ? (
						<p className="hidden md:flex flex-col">
							<span className="text-[#545757] dark:text-[#cccccc]">Change (30d)</span>
							<span className="font-semibold text-2xl font-jetbrains">{props.data.change_1m || 0}%</span>
						</p>
					) : null}
				</div>
			) : (
				<></>
			)}
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
						{props.chartTypes && (
							<div className="text-xs font-medium flex items-center rounded-md overflow-x-auto flex-nowrap border border-[var(--form-control-border)] text-[#666] dark:text-[#919296]">
								{props.chartTypes.map((dataType) => (
									<Link href={`${router.asPath.split('?')[0]}?dataType=${dataType}`} key={dataType} shallow passHref>
										<a
											data-active={dataType === props.selectedType}
											className="flex-shrink-0 py-2 px-3 whitespace-nowrap hover:bg-[var(--link-hover-bg)] focus-visible:bg-[var(--link-hover-bg)] data-[active=true]:bg-[var(--old-blue)] data-[active=true]:text-white"
										>
											{dataType}
										</a>
									</Link>
								))}
							</div>
						)}
						{props.chartData?.[1]?.length > 1 ? (
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
									allValues={props.chartData[1]}
									selectedValues={selectedChains}
									setSelectedValues={setSelectedChains}
									label="Chains"
									clearAll={() => setSelectedChains([])}
									toggleAll={() => setSelectedChains(props.chartData[1])}
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
				{props.chartData ? (
					<div className="min-h-[360px]">
						{chartType === 'Dominance' ? (
							<AreaChart
								title=""
								chartData={chartData}
								stacks={props.chartData[1]}
								expandTo100Percent
								valueSymbol="%"
							/>
						) : (
							<BarChart2
								chartData={chartData}
								groupBy={chartInterval.toLowerCase()}
								stackColors={stackColors}
								chartOptions={chartOptions}
							/>
						)}
					</div>
				) : null}
			</div>
		</div>
	)
}
