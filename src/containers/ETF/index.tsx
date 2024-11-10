import * as React from 'react'
import { ProtocolsChainsSearch } from '~/components/Search/ProtocolsChains'
import dynamic from 'next/dynamic'
import { toK } from '~/utils'
import { Tab, TabList } from '~/components'
import type { IChartProps, IPieChartProps, IBarChartProps } from '~/components/ECharts/types'
import { groupDataByDays } from '~/components/ECharts/ProtocolChart/useFetchAndFormatChartData'
import { Denomination, Filters } from '~/components/ECharts/ProtocolChart/Misc'
import { primaryColor } from '~/constants/colors'

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
				<TabList>
					<Tab onClick={() => setTab('volume')} aria-selected={tab === 'volume'}>
						Volume
					</Tab>
					<Tab onClick={() => setTab('aum')} aria-selected={tab === 'aum'}>
						AUM
					</Tab>
					<Tab onClick={() => setTab('flows')} aria-selected={tab === 'flows'}>
						Flows
					</Tab>
				</TabList>

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
						<>
							<Filters color={primaryColor} style={{ marginLeft: 'auto' }}>
								<Denomination as="button" active={groupBy === 'daily'} onClick={() => setGroupBy('daily')}>
									Daily
								</Denomination>

								<Denomination as="button" active={groupBy === 'weekly'} onClick={() => setGroupBy('weekly')}>
									Weekly
								</Denomination>

								<Denomination as="button" active={groupBy === 'monthly'} onClick={() => setGroupBy('monthly')}>
									Monthly
								</Denomination>

								<Denomination as="button" active={groupBy === 'cumulative'} onClick={() => setGroupBy('cumulative')}>
									Cumulative
								</Denomination>
							</Filters>

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
						</>
					) : null}
				</div>
			</div>

			<TableWithSearch data={overview} columns={ETFColumn} columnToSearch={'ticker'} placeholder={'Search ETF...'} />
		</>
	)
}
