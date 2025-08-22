import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { Icon } from '~/components/Icon'
import type { ChartConfig, MultiChartConfig, TextConfig } from '../types'
import { CHART_TYPES, getChainChartTypes, getProtocolChartTypes } from '../types'
import { ChartPreview } from './ChartPreview'
import MultiChartCard from './MultiChartCard'
import { ProtocolsByChainTable } from './ProTable'
import { TextCard } from './TextCard'

const AreaChart = React.lazy(() => import('~/components/ECharts/AreaChart'))

const BarChart = React.lazy(() => import('~/components/ECharts/BarChart'))

const MultiSeriesChart = React.lazy(() => import('~/components/ECharts/MultiSeriesChart'))

const PieChart = React.lazy(() => import('~/components/ECharts/PieChart'))

const generateFakeChartData = (baseValue: number, volatility: number = 0.1): [string, number][] => {
	const data: [string, number][] = []
	const now = new Date()
	let currentValue = baseValue

	for (let i = 89; i >= 0; i--) {
		const date = new Date(now)
		date.setDate(date.getDate() - i)

		const change = (Math.random() - 0.5) * 2 * volatility * currentValue
		currentValue = Math.max(0, currentValue + change)

		if (i > 60) currentValue *= 1.0005
		if (i < 30) currentValue *= 1.001

		data.push([Math.floor(date.getTime() / 1000).toString(), Math.round(currentValue)])
	}

	return data
}

const DemoChartCard = ({ chart }: { chart: ChartConfig }) => {
	const chartTypeDetails = CHART_TYPES[chart.type] || {
		title: chart.type.toUpperCase(),
		color: '#2172E5',
		chartType: 'area'
	}
	const itemName = chart.protocol || chart.chain || 'Demo'

	const fakeData = generateFakeChartData(
		chart.type === 'tvl' ? 50000000 : chart.type === 'volume' ? 10000000 : chart.type === 'fees' ? 500000 : 2000000,
		chart.type === 'tvl' ? 0.05 : 0.15
	)

	return (
		<div className="bg-opacity-30 h-full border border-white/30 bg-(--bg-glass)">
			<div className="flex h-full flex-col p-4">
				<div className="mb-2 flex items-center gap-2">
					<div className="flex h-6 w-6 items-center justify-center rounded-full bg-(--primary) text-xs font-bold text-white">
						{itemName.charAt(0).toUpperCase()}
					</div>
					<h2 className="text-lg font-semibold text-(--text-primary)">
						{itemName} {chartTypeDetails.title}
					</h2>
				</div>

				<div style={{ height: '300px', flexGrow: 1 }}>
					{chartTypeDetails.chartType === 'bar' ? (
						<React.Suspense fallback={<></>}>
							<BarChart
								chartData={fakeData}
								valueSymbol="$"
								height="300px"
								color={chartTypeDetails.color}
								hideDataZoom
								hideDownloadButton
							/>
						</React.Suspense>
					) : (
						<React.Suspense fallback={<></>}>
							<AreaChart
								chartData={fakeData}
								valueSymbol="$"
								color={chartTypeDetails.color}
								height="300px"
								hideDataZoom
								hideDownloadButton
							/>
						</React.Suspense>
					)}
				</div>
			</div>
		</div>
	)
}

const DemoMultiChartCard = ({ multi }: { multi: MultiChartConfig }) => {
	const colors = ['#2172E5', '#5CCA93', '#F2994A']

	const series = multi.items.map((item, index) => {
		const fakeData = generateFakeChartData(
			30000000 + index * 10000000, // Different base values for each series
			0.08
		)

		const data: [number, number][] = fakeData.map(([timestamp, value]) => [parseInt(timestamp), value])

		const chartType = CHART_TYPES[item.type] || { title: item.type, chartType: 'line' }

		return {
			name: `${item.chain} ${chartType.title}`,
			type: (chartType.chartType === 'bar' ? 'bar' : 'line') as 'bar' | 'line',
			data,
			color: colors[index] || colors[0]
		}
	})

	return (
		<div className="bg-opacity-30 h-full border border-white/30 bg-(--bg-glass)">
			<div className="flex h-full flex-col p-4">
				<div className="mb-2 flex items-center gap-2">
					<h3 className="text-sm font-medium text-(--text-primary)">{multi.name}</h3>
				</div>

				<div style={{ height: '300px', flexGrow: 1 }}>
					<React.Suspense fallback={<></>}>
						<MultiSeriesChart series={series} valueSymbol="$" hideDataZoom={true} />
					</React.Suspense>
				</div>
			</div>
		</div>
	)
}

const demoCharts: ChartConfig[] = [
	{
		id: 'demo-ethereum-tvl',
		kind: 'chart',
		chain: 'Ethereum',
		type: 'tvl',
		grouping: 'day',
		colSpan: 2
	},
	{
		id: 'demo-ethereum-volume',
		kind: 'chart',
		chain: 'Ethereum',
		type: 'volume',
		grouping: 'day',
		colSpan: 1
	},
	{
		id: 'demo-arbitrum-users',
		kind: 'chart',
		chain: 'Arbitrum',
		type: 'activeUsers',
		grouping: 'day',
		colSpan: 1
	},
	{
		id: 'demo-uniswap-tvl',
		kind: 'chart',
		chain: '',
		protocol: 'Uniswap',
		geckoId: 'uniswap',
		type: 'tvl',
		grouping: 'day',
		colSpan: 1
	},
	{
		id: 'demo-aave-tokenPrice',
		kind: 'chart',
		chain: '',
		protocol: 'Aave',
		geckoId: 'aave',
		type: 'tokenPrice',
		grouping: 'day',
		colSpan: 1
	},
	{
		id: 'demo-ethereum-fees',
		kind: 'chart',
		chain: 'Ethereum',
		type: 'fees',
		grouping: 'week',
		colSpan: 1
	},
	{
		id: 'demo-base-txs',
		kind: 'chart',
		chain: 'Base',
		type: 'txs',
		grouping: 'day',
		colSpan: 1
	},
	{
		id: 'demo-polygon-gasUsed',
		kind: 'chart',
		chain: 'Polygon',
		type: 'gasUsed',
		grouping: 'day',
		colSpan: 1
	},
	{
		id: 'demo-ethereum-perps',
		kind: 'chart',
		chain: 'Ethereum',
		type: 'perps',
		grouping: 'day',
		colSpan: 1
	}
]

const demoMultiCharts: MultiChartConfig[] = [
	{
		id: 'demo-multi-chain-tvl',
		kind: 'multi',
		name: '🔗 L2 TVL Comparison',
		items: [
			{
				id: 'polygon-tvl-multi',
				kind: 'chart',
				chain: 'Polygon',
				type: 'tvl',
				grouping: 'day'
			},
			{
				id: 'arbitrum-tvl-multi',
				kind: 'chart',
				chain: 'Arbitrum',
				type: 'tvl',
				grouping: 'day'
			},
			{
				id: 'base-tvl-multi',
				kind: 'chart',
				chain: 'Base',
				type: 'tvl',
				grouping: 'day'
			}
		],
		grouping: 'day',
		colSpan: 2
	},
	{
		id: 'demo-multi-protocol-comparison',
		kind: 'multi',
		name: '📊 Blue Chip DeFi Protocols',
		items: [
			{
				id: 'uniswap-tvl-multi2',
				kind: 'chart',
				chain: '',
				protocol: 'Uniswap',
				type: 'tvl',
				grouping: 'day'
			},
			{
				id: 'aave-tvl-multi2',
				kind: 'chart',
				chain: '',
				protocol: 'Aave',
				type: 'tvl',
				grouping: 'day'
			},
			{
				id: 'curve-tvl-multi2',
				kind: 'chart',
				chain: '',
				protocol: 'Curve',
				type: 'tvl',
				grouping: 'day'
			}
		],
		grouping: 'day',
		colSpan: 2
	},
	{
		id: 'demo-multi-volume-comparison',
		kind: 'multi',
		name: '💹 DEX Volume Leaders',
		items: [
			{
				id: 'ethereum-volume-multi3',
				kind: 'chart',
				chain: 'Ethereum',
				type: 'volume',
				grouping: 'day'
			},
			{
				id: 'arbitrum-volume-multi3',
				kind: 'chart',
				chain: 'Arbitrum',
				type: 'volume',
				grouping: 'day'
			},
			{
				id: 'solana-volume-multi3',
				kind: 'chart',
				chain: 'Solana',
				type: 'volume',
				grouping: 'day'
			}
		],
		grouping: 'day',
		colSpan: 2
	}
]

const demoTextCard: TextConfig = {
	id: 'demo-text-intro',
	kind: 'text',
	title: '📊 Pro Dashboard Features Showcase',
	content: `This dashboard demonstrates all available Pro Dashboard features including:

- **Chart Types**: TVL, Volume, Fees, Revenue, Users, Transactions
- **Protocol Charts**: Individual protocol metrics and token data
- **Chain Charts**: Ecosystem-wide metrics across different chains
- **Multi-Charts**: Combined visualizations for comparison
- **Tables**: Protocol rankings and data tables
- **Text Cards**: Documentation and insights

*Built with DefiLlama Pro Dashboard*`,
	colSpan: 1
}

const demoTextCard2: TextConfig = {
	id: 'demo-text-metrics',
	kind: 'text',
	title: '📈 Understanding DeFi Metrics',
	content: `**Key DeFi Metrics Explained:**

- **TVL (Total Value Locked)**: The total value of assets locked in DeFi protocols
- **Volume**: Trading volume across DEXs and protocols
- **Fees**: Protocol fees generated from user activity
- **Revenue**: Net revenue earned by protocols
- **Users**: Active user count on the platform
- **Transactions**: Number of on-chain transactions

*These metrics help assess protocol health, adoption, and market trends.*`,
	colSpan: 1
}

const demoTextCard3: TextConfig = {
	id: 'demo-text-protable',
	kind: 'text',
	title: '🔧 Advanced Protocol Rankings',
	content: `**ProTable Features:**

- **Dynamic Columns**: Show/hide columns, reorder as needed
- **Column Presets**: Essential, Fees, Volume, Advanced views
- **Export Capabilities**: Download data as CSV for analysis
- **Real-time Search**: Filter protocols instantly
- **Custom Sorting**: Sort by any metric ascending/descending
- **Pagination**: Handle large datasets efficiently

*Professional-grade data tables for serious DeFi analysis.*`,
	colSpan: 1
}

const demoTextCard4: TextConfig = {
	id: 'demo-text-dashboard',
	kind: 'text',
	title: '🚀 Dashboard Management',
	content: `**Dashboard Capabilities:**

- **Multiple Dashboards**: Create unlimited custom dashboards
- **Auto-save**: Changes saved automatically as you work
- **Sharing**: Share read-only dashboards with your team
- **Flexible Layout**: 1x1 and 2x1 grid spans for optimal viewing
- **Chart Composer**: Combine multiple metrics in single charts
- **Time Controls**: Synchronize time periods across all charts

*Build the perfect analytics workspace for your DeFi research.*`,
	colSpan: 1
}

const features = [
	{
		icon: 'bar-chart-2',
		title: 'Customizable Charts'
	},
	{
		icon: 'activity',
		title: 'Multiple Dashboards'
	},
	{
		icon: 'percent',
		title: 'Advanced Analytics'
	},
	{
		icon: 'layers',
		title: 'Multi-Charts'
	}
]

export const DemoPreview = () => {
	const router = useRouter()

	return (
		<div className="pro-dashboard relative min-h-screen">
			<div className="border-b border-(--divider) bg-(--bg) py-6">
				<div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6">
					<div className="text-center">
						<h1 className="mb-2 text-3xl font-bold text-(--text-primary)">Pro Dashboard Preview</h1>
						<p className="text-lg text-(--text-secondary)">See what you'll get with Pro access:</p>
					</div>

					<div className="flex items-center justify-center">
						<div className="pro-dashboard grid gap-2 sm:grid-cols-2 lg:gap-6 xl:grid-cols-4">
							{features.map((feature, index) => (
								<div
									key={index}
									className="pro-info-card flex flex-wrap items-center justify-center gap-2 px-8 py-15 text-sm text-(--text-secondary)"
								>
									<div className="align-center flex gap-2">
										<Icon name={feature.icon as any} height={32} width={32} className="shrink-0 text-(--primary)" />
										<span className="text-lg leading-[170%] font-bold whitespace-nowrap">{feature.title}</span>
									</div>
								</div>
							))}
						</div>
					</div>

					<div className="mx-auto max-w-5xl">
						<div className="grid items-stretch gap-8 md:grid-cols-2">
							<div className="flex flex-col rounded-sm border border-gray-200 bg-gray-50/50 px-6 py-8 text-center dark:border-(--divider) dark:bg-(--bg-glass)">
								<h3 className="mb-3 text-2xl font-bold text-gray-700 dark:text-(--text-primary)">Free Account</h3>
								<div className="mb-6 text-3xl font-bold text-gray-800 dark:text-(--text-primary)">
									$0<span className="text-base font-normal text-gray-600 dark:text-(--text-secondary)">/month</span>
								</div>
								<ul className="mb-8 flex-1 space-y-3 text-left text-sm">
									<li className="flex items-start gap-2">
										<Icon
											name="check"
											height={14}
											width={14}
											className="mt-0.5 shrink-0 text-green-600 dark:text-green-500"
										/>
										<span className="text-gray-700 dark:text-(--text-secondary)">Access to public dashboards</span>
									</li>
									<li className="flex items-start gap-2">
										<Icon
											name="check"
											height={14}
											width={14}
											className="mt-0.5 shrink-0 text-green-600 dark:text-green-500"
										/>
										<span className="text-gray-700 dark:text-(--text-secondary)">
											View community-created dashboards
										</span>
									</li>
									<li className="flex items-start gap-2">
										<Icon
											name="check"
											height={14}
											width={14}
											className="mt-0.5 shrink-0 text-green-600 dark:text-green-500"
										/>
										<span className="text-gray-700 dark:text-(--text-secondary)">Basic DeFi data access</span>
									</li>
								</ul>
								<Link href={`/subscription?returnUrl=${encodeURIComponent(router.asPath)}`}>
									<span className="inline-block cursor-pointer rounded-sm border border-(--primary) px-6 py-2.5 text-sm font-medium text-(--primary) transition-colors hover:bg-(--primary) hover:text-white">
										Create Free Account
									</span>
								</Link>
							</div>

							<div className="relative flex transform flex-col rounded-sm border-2 border-(--primary) bg-gradient-to-br from-(--primary)/10 to-purple-600/10 px-6 py-8 text-center shadow-(--primary)/10 shadow-xl transition-transform hover:scale-[1.02]">
								<h3 className="mb-3 bg-gradient-to-r from-(--primary) to-purple-600 bg-clip-text text-2xl font-bold text-transparent">
									Pro
								</h3>
								<div className="mb-6 text-4xl font-bold text-(--primary)">
									$49<span className="text-base font-normal text-(--text-secondary)">/month</span>
								</div>
								<ul className="mb-8 flex-1 space-y-3 text-left text-sm">
									<li className="flex items-start gap-2">
										<Icon name="star" height={14} width={14} className="mt-0.5 shrink-0 text-(--primary)" />
										<span className="pro-text1 font-semibold">Everything in Free, plus:</span>
									</li>
									<li className="flex items-start gap-2">
										<Icon name="check" height={14} width={14} className="mt-0.5 shrink-0 text-green-500" />
										<span className="pro-text1">Create unlimited custom dashboards</span>
									</li>
									<li className="flex items-start gap-2">
										<Icon name="check" height={14} width={14} className="mt-0.5 shrink-0 text-green-500" />
										<span className="pro-text1">CSV data downloads</span>
									</li>
									<li className="flex items-start gap-2">
										<Icon name="check" height={14} width={14} className="mt-0.5 shrink-0 text-green-500" />
										<span className="pro-text1">Advanced analytics & custom columns</span>
									</li>
									<li className="flex items-start gap-2">
										<Icon name="check" height={14} width={14} className="mt-0.5 shrink-0 text-green-500" />
										<span className="pro-text1">Full LlamaFeed access with AI summaries</span>
									</li>
									<li className="flex items-start gap-2">
										<Icon name="check" height={14} width={14} className="mt-0.5 shrink-0 text-green-500" />
										<span className="pro-text1">Priority access to new features</span>
									</li>
								</ul>
								<Link href={`/subscription?returnUrl=${encodeURIComponent(router.asPath)}`}>
									<span className="flex inline-flex cursor-pointer items-center gap-2 rounded-sm bg-gradient-to-r from-(--primary) to-purple-600 px-8 py-3 font-semibold text-white shadow-lg transition-opacity hover:opacity-90">
										<Icon name="sparkles" height={16} width={16} />
										Upgrade to Pro
									</span>
								</Link>
							</div>
						</div>
					</div>
				</div>
			</div>

			<div className="bg-opacity-20 border-t border-(--divider) bg-(--bg-glass) py-2 pt-6">
				<div className="mx-auto max-w-7xl px-4 sm:px-6">
					<div className="flex items-center justify-center">
						<span className="text-xs text-(--text-secondary) italic opacity-75">
							Demo Preview - All data shown below is simulated for demonstration purposes
						</span>
					</div>
				</div>
			</div>

			<div className="bg-opacity-30 bg-(--bg-glass) py-6">
				<div className="mx-auto max-w-[1400px]">
					<div className="grid grid-cols-1 gap-2 md:grid-cols-2" style={{ gridAutoFlow: 'dense' }}>
						<div className="min-h-[340px] md:col-span-1">
							<div className="bg-opacity-30 h-full border border-white/30 bg-(--bg-glass)">
								<TextCard text={demoTextCard} />
							</div>
						</div>

						{demoCharts.slice(0, 2).map((chart) => (
							<div key={chart.id} className="min-h-[340px] md:col-span-1">
								<DemoChartCard chart={chart} />
							</div>
						))}

						<div className="min-h-[340px] md:col-span-2">
							<DemoMultiChartCard multi={demoMultiCharts[0]} />
						</div>

						{demoCharts.slice(2, 4).map((chart) => (
							<div key={chart.id} className="min-h-[340px] md:col-span-1">
								<DemoChartCard chart={chart} />
							</div>
						))}

						<div className="min-h-[400px] md:col-span-2">
							<div className="bg-opacity-30 h-full border border-white/30 bg-(--bg-glass)">
								<ProtocolsByChainTable tableId="demo-ethereum-protocols" chains={['Ethereum']} colSpan={2} />
							</div>
						</div>

						<div className="min-h-[340px] md:col-span-1">
							<div className="bg-opacity-30 h-full border border-white/30 bg-(--bg-glass)">
								<TextCard text={demoTextCard2} />
							</div>
						</div>

						<div className="min-h-[340px] md:col-span-1">
							<div className="bg-opacity-30 h-full border border-white/30 bg-(--bg-glass)">
								<TextCard text={demoTextCard3} />
							</div>
						</div>

						<div className="min-h-[340px] md:col-span-2">
							<DemoMultiChartCard multi={demoMultiCharts[1]} />
						</div>

						{demoCharts.slice(4).map((chart) => (
							<div key={chart.id} className="min-h-[340px] md:col-span-1">
								<DemoChartCard chart={chart} />
							</div>
						))}

						<div className="min-h-[340px] md:col-span-1">
							<div className="bg-opacity-30 h-full border border-white/30 bg-(--bg-glass)">
								<TextCard text={demoTextCard4} />
							</div>
						</div>

						<div className="min-h-[340px] md:col-span-1">
							<DemoMultiChartCard multi={demoMultiCharts[2]} />
						</div>
					</div>
				</div>
			</div>
		</div>
	)
}
