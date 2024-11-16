import * as React from 'react'
import { ProtocolsChainsSearch } from '~/components/Search/ProtocolsChains'
import dynamic from 'next/dynamic'
import { toK } from '~/utils'
import type { IChartProps, IPieChartProps, IBarChartProps } from '~/components/ECharts/types'
import { groupDataByDays } from '~/components/ECharts/ProtocolChart/useFetchAndFormatChartData'
import { TableWithSearch } from '~/components/Table/TableWithSearch'
import { ETFColumn } from '~/components/Table/Defi/columns'

const PieChart = dynamic(() => import('~/components/ECharts/PieChart'), {
	ssr: false
}) as React.FC<IPieChartProps>

const AreaChart = dynamic(() => import('~/components/ECharts/AreaChart'), {
	ssr: false
}) as React.FC<IChartProps>

const BarChart = dynamic(() => import('~/components/ECharts/BarChart'), {
	ssr: false
}) as React.FC<IBarChartProps>

export const ETFContainer = ({
	overview,
	totalAum,
	aumOverview,
	volumeOverview,
	aumHistory,
	volumeHistory,
	flowsHistory,
	barChartStacks,
	tickers,
	tickerColors
}) => {
	const [tab, setTab] = React.useState('volume')
	const [groupBy, setGroupBy] = React.useState<'daily' | 'weekly' | 'monthly' | 'cumulative'>('daily')

	const flowsData = groupDataByDays(flowsHistory, groupBy, tickers, true)

	return (
		<>
			<ProtocolsChainsSearch step={{ category: 'Home', name: 'Exchange Traded Funds' }} />

			<h1 className="text-2xl font-medium -mb-5 flex items-center justify-between flex-wrap gap-4">
				<span>Total AUM</span>
				<span className="font-jetbrains">{`$${toK(totalAum)}`}</span>
			</h1>

			<div className="rounded-xl bg-[var(--bg6)] shadow">
				<div className="flex flex-wrap overflow-x-auto border-b border-black/10 dark:border-white/10">
					<button
						className="py-2 px-6 whitespace-nowrap border-b rounded-tl-xl border-black/10 dark:border-white/10 data-[selected=true]:border-b-[var(--primary1)] hover:bg-[var(--link-hover-bg)] focus-visible:bg-[var(--link-hover-bg)]"
						onClick={() => setTab('volume')}
						data-selected={tab === 'volume'}
					>
						Volume
					</button>
					<button
						className="py-2 px-6 whitespace-nowrap border-b border-l border-black/10 dark:border-white/10 data-[selected=true]:border-b-[var(--primary1)] hover:bg-[var(--link-hover-bg)] focus-visible:bg-[var(--link-hover-bg)]"
						onClick={() => setTab('aum')}
						data-selected={tab === 'aum'}
					>
						AUM
					</button>
					<button
						className="py-2 px-6 whitespace-nowrap border-b border-l border-black/10 dark:border-white/10 data-[selected=true]:border-b-[var(--primary1)] hover:bg-[var(--link-hover-bg)] focus-visible:bg-[var(--link-hover-bg)]"
						onClick={() => setTab('flows')}
						data-selected={tab === 'flows'}
					>
						Flows
					</button>
				</div>

				<div className="flex flex-col p-4 min-h-[392px]">
					{tab === 'aum' ? (
						<div className="grid grid-cols-1 xl:grid-cols-2 *:col-span-1 min-h-[392px]">
							<PieChart chartData={aumOverview} stackColors={tickerColors} usdFormat={false} />

							<AreaChart
								chartData={aumHistory}
								stacks={tickers}
								stackColors={tickerColors}
								customLegendName="Ticker"
								customLegendOptions={tickers}
								hideDefaultLegend
								valueSymbol="%"
								title=""
								expandTo100Percent={true}
							/>
						</div>
					) : tab === 'volume' ? (
						<div className="grid grid-cols-1 xl:grid-cols-2 *:col-span-1 min-h-[392px]">
							<PieChart chartData={volumeOverview} stackColors={tickerColors} usdFormat={false} />

							<AreaChart
								chartData={volumeHistory}
								stacks={tickers}
								stackColors={tickerColors}
								customLegendName="Ticker"
								customLegendOptions={tickers}
								hideDefaultLegend
								valueSymbol="%"
								title=""
								expandTo100Percent={true}
							/>
						</div>
					) : tab === 'flows' ? (
						<div className="flex flex-col w-full gap-1">
							<div className="flex items-center gap-1 p-1 rounded-xl overflow-x-auto w-full max-w-fit bg-[rgba(33,114,229,0.2)] ml-auto">
								<button
									data-active={groupBy === 'daily'}
									className="rounded-xl flex-shrink-0 py-[6px] px-2 data-[active=true]:bg-white/50 dark:data-[active=true]:bg-white/10"
									onClick={() => setGroupBy('daily')}
								>
									Daily
								</button>

								<button
									data-active={groupBy === 'weekly'}
									className="rounded-xl flex-shrink-0 py-[6px] px-2 data-[active=true]:bg-white/50 dark:data-[active=true]:bg-white/10"
									onClick={() => setGroupBy('weekly')}
								>
									Weekly
								</button>

								<button
									data-active={groupBy === 'monthly'}
									className="rounded-xl flex-shrink-0 py-[6px] px-2 data-[active=true]:bg-white/50 dark:data-[active=true]:bg-white/10"
									onClick={() => setGroupBy('monthly')}
								>
									Monthly
								</button>

								<button
									data-active={groupBy === 'cumulative'}
									className="rounded-xl flex-shrink-0 py-[6px] px-2 data-[active=true]:bg-white/50 dark:data-[active=true]:bg-white/10"
									onClick={() => setGroupBy('cumulative')}
								>
									Cumulative
								</button>
							</div>

							<BarChart
								chartData={flowsData}
								hideDefaultLegend
								customLegendName="Ticker"
								customLegendOptions={tickers}
								stacks={barChartStacks}
								stackColors={tickerColors}
								valueSymbol="$"
								title=""
							/>
						</div>
					) : null}
				</div>
			</div>

			<TableWithSearch data={overview} columns={ETFColumn} columnToSearch={'ticker'} placeholder={'Search ETF...'} />
		</>
	)
}
