import * as React from 'react'
import dynamic from 'next/dynamic'
import { toK } from '~/utils'
import type { IBarChartProps } from '~/components/ECharts/types'
import { TableWithSearch } from '~/components/Table/TableWithSearch'
import { ETFColumn } from '~/components/Table/Defi/columns'
import { withPerformanceLogging } from '~/utils/perf'
import { getETFData } from '~/api/categories/protocols'
import Layout from '~/layout'
import { groupDataByDays } from '~/components/ECharts/ProtocolChart/useFetchAndFormatChartData'

const BarChart = dynamic(() => import('~/components/ECharts/BarChart'), {
	ssr: false
}) as React.FC<IBarChartProps>

interface AssetSectionProps {
	name: string
	iconUrl: string
	flows: number
	aum: number
}

interface TransformedFlow {
	date: string
	[key: string]: string | number
}

interface AssetTotals {
	[key: string]: {
		aum: number
		flows: number
	}
}

const AssetSection = ({ name, iconUrl, flows, aum }: AssetSectionProps) => (
	<div className="flex flex-col gap-6">
		<div className="flex items-center gap-1">
			<img src={iconUrl} alt={name} width={24} height={24} className="rounded-full" />
			<span className="text-lg font-semibold">{name}</span>
		</div>
		<div className="flex flex-col gap-4 pl-2">
			<div className="flex items-center justify-between">
				<span className="font-medium">Flows</span>
				<span className={`font-jetbrains ${flows > 0 ? 'text-green-500' : flows < 0 ? 'text-red-500' : ''}`}>
					{`${flows > 0 ? '+' : ''}$${toK(flows || 0)}`}
				</span>
			</div>
			<div className="flex items-center justify-between">
				<span className="font-medium">AUM</span>
				<span className="font-jetbrains">${toK(aum || 0)}</span>
			</div>
		</div>
	</div>
)

export const getStaticProps = withPerformanceLogging('etfs', async () => {
	const data = await getETFData()

	return {
		props: {
			...data
		},
		revalidate: 5 * 60
	}
})

interface PageViewProps {
	snapshot: Array<{
		asset: string
		aum: number
		flows: number
		ticker: string
	}>
	flows: TransformedFlow[]
	lastUpdated: string
	totalsByAsset: AssetTotals
}

const PageView = ({ snapshot, flows, totalsByAsset, lastUpdated }: PageViewProps) => {
	const [groupBy, setGroupBy] = React.useState<'daily' | 'weekly' | 'monthly' | 'cumulative'>('weekly')
	const tickers = ['Bitcoin', 'Ethereum']

	const chartData = groupDataByDays(flows, groupBy, tickers, true)

	return (
		<>
			<div className="flex flex-col md:flex-row gap-1 min-h-[434px]">
				{/* Left Panel */}
				<div className="w-full md:w-80 flex flex-col bg-[var(--cards-bg)] rounded-md">
					<div className="flex flex-col gap-2 p-3">
						<h1 className="text-xl font-semibold">Daily Stats</h1>
						<span className="text-xs opacity-70">{lastUpdated}</span>
					</div>

					<div className="flex flex-col gap-12 p-3">
						<AssetSection
							name="Bitcoin"
							iconUrl="https://icons.llamao.fi/icons/protocols/bitcoin"
							flows={totalsByAsset.bitcoin?.flows ?? 0}
							aum={totalsByAsset.bitcoin?.aum ?? 0}
						/>

						<AssetSection
							name="Ethereum"
							iconUrl="https://icons.llamao.fi/icons/protocols/ethereum"
							flows={totalsByAsset.ethereum?.flows ?? 0}
							aum={totalsByAsset.ethereum?.aum ?? 0}
						/>
					</div>
				</div>

				{/* Main Chart Area */}
				<div className="flex flex-col flex-1 w-full bg-[var(--cards-bg)] rounded-md [&[role='combobox']]:*:*:-mb-9">
					<div className="text-xs font-medium m-3 ml-auto flex items-center rounded-md overflow-x-auto flex-nowrap border border-[#E6E6E6] dark:border-[#2F3336] text-[#666] dark:text-[#919296]">
						<button
							data-active={groupBy === 'daily'}
							className="flex-shrink-0 py-2 px-3 whitespace-nowrap hover:bg-[var(--link-hover-bg)] focus-visible:bg-[var(--link-hover-bg)] data-[active=true]:bg-[var(--old-blue)] data-[active=true]:text-white"
							onClick={() => setGroupBy('daily')}
						>
							Daily
						</button>

						<button
							data-active={groupBy === 'weekly'}
							className="flex-shrink-0 py-2 px-3 whitespace-nowrap hover:bg-[var(--link-hover-bg)] focus-visible:bg-[var(--link-hover-bg)] data-[active=true]:bg-[var(--old-blue)] data-[active=true]:text-white"
							onClick={() => setGroupBy('weekly')}
						>
							Weekly
						</button>

						<button
							data-active={groupBy === 'monthly'}
							className="flex-shrink-0 py-2 px-3 whitespace-nowrap hover:bg-[var(--link-hover-bg)] focus-visible:bg-[var(--link-hover-bg)] data-[active=true]:bg-[var(--old-blue)] data-[active=true]:text-white"
							onClick={() => setGroupBy('monthly')}
						>
							Monthly
						</button>

						<button
							data-active={groupBy === 'cumulative'}
							className="flex-shrink-0 py-2 px-3 whitespace-nowrap hover:bg-[var(--link-hover-bg)] focus-visible:bg-[var(--link-hover-bg)] data-[active=true]:bg-[var(--old-blue)] data-[active=true]:text-white"
							onClick={() => setGroupBy('cumulative')}
						>
							Cumulative
						</button>
					</div>

					<BarChart
						chartData={chartData}
						hideDefaultLegend
						customLegendName="ETF"
						customLegendOptions={tickers}
						stacks={{ Bitcoin: 'A', Ethereum: 'A' }}
						stackColors={{ Bitcoin: '#F7931A', Ethereum: '#6B7280' }}
						valueSymbol="$"
						title="Flows (Source: Farside)"
					/>
				</div>
			</div>

			<TableWithSearch data={snapshot} columns={ETFColumn} columnToSearch={'ticker'} placeholder={'Search ETF...'} />
		</>
	)
}

export default function ETFs(props: PageViewProps) {
	return (
		<Layout title={`Exchange Traded Funds - DefiLlama`} defaultSEO>
			<PageView {...props} />
		</Layout>
	)
}
