import * as React from 'react'
import { ProtocolsChainsSearch } from '~/components/Search/ProtocolsChains'
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

const labelClass = 'text-sm text-[#545757] dark:text-[#cccccc]'
const flowValueClass = 'font-jetbrains text-2xl'
const aumValueClass = 'font-jetbrains text-xl'
const headerClass = 'text-xl font-medium text-black dark:text-white'

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
		<div className="flex items-center">
			<img src={iconUrl} alt={name} width={32} height={32} className="rounded-full" />
			<span className="text-lg ml-3 text-[#545757] dark:text-[#cccccc]">{name}</span>
		</div>
		<div className="flex flex-col gap-4 pl-2">
			<div className="flex items-center justify-between">
				<span className={labelClass}>Flows</span>
				<span className={`${flowValueClass} ${flows > 0 ? 'text-green-500' : flows < 0 ? 'text-red-500' : ''}`}>
					{`${flows > 0 ? '+' : ''}$${toK(flows || 0)}`}
				</span>
			</div>
			<div className="flex items-center justify-between">
				<span className={labelClass}>AUM</span>
				<span className={aumValueClass}>${toK(aum || 0)}</span>
			</div>
		</div>
	</div>
)

export const getStaticProps = withPerformanceLogging('etfs', async () => {
	const data = await getETFData()

	const maxDate = Math.max(...data.props.flows.map((item) => new Date(item.day).getTime()))

	const formattedDate = new Date(maxDate).toLocaleDateString('en-US', {
		month: 'long',
		day: 'numeric',
		year: 'numeric'
	})

	const processedSnapshot = data.props.snapshot
		.map((i) => ({
			...i,
			chain: [i.asset.charAt(0).toUpperCase() + i.asset.slice(1)]
		}))
		.sort((a, b) => b.flows - a.flows)

	const processedFlows = data.props.flows.reduce((acc, { gecko_id, day, total_flow_usd }) => {
		const timestamp = (new Date(day).getTime() / 86400 / 1000) * 86400
		acc[timestamp] = {
			date: timestamp,
			...acc[timestamp],
			[gecko_id.charAt(0).toUpperCase() + gecko_id.slice(1)]: total_flow_usd
		}
		return acc
	}, {})

	const totalsByAsset = processedSnapshot.reduce((acc: AssetTotals, item) => {
		acc[item.asset.toLowerCase()] = {
			aum: (acc[item.asset.toLowerCase()]?.aum || 0) + item.aum,
			flows: (acc[item.asset.toLowerCase()]?.flows || 0) + item.flows
		}
		return acc
	}, {})

	return {
		props: {
			snapshot: processedSnapshot,
			flows: processedFlows,
			totalsByAsset,
			lastUpdated: formattedDate
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
			<ProtocolsChainsSearch hideFilters />

			<div className="rounded-xl bg-[var(--bg6)] shadow">
				<div className="flex flex-col md:flex-row p-8 min-h-[392px]">
					{/* Left Panel */}
					<div className="w-full md:w-80 flex flex-col md:pr-12">
						<div className="flex flex-col gap-2 mb-8">
							<span className={headerClass}>Daily Stats</span>
							<span className="text-sm opacity-60">{lastUpdated}</span>
						</div>

						<div className="flex flex-col gap-12">
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

					{/* Mobile Divider */}
					<div className="h-px w-full bg-gray-200 dark:bg-gray-800 my-8 md:hidden" />

					{/* Main Chart Area */}
					<div className="flex flex-col flex-1 w-full gap-1">
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
							chartData={chartData}
							hideDefaultLegend
							customLegendName="ETF"
							customLegendOptions={tickers}
							stacks={{ Bitcoin: 'A', Ethereum: 'A' }}
							stackColors={{ Bitcoin: '#F7931A', Ethereum: '#6B7280' }}
							valueSymbol="$"
							title="Flows"
						/>
					</div>
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
